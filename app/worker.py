"""
Background scheduler for watchlists.

Run as a separate container / process alongside the API:
    python -m app.worker

Every SCAN_INTERVAL_SECONDS the worker:
  1. Finds watchlists whose `next_run_at` has passed.
  2. Re-runs a fresh analysis for each (bypassing the in-memory cache).
  3. Asks the Gemini diff engine whether the report materially changed vs
     the most recent prior analysis for that sector+user.
  4. Writes an AlertEvent if the change is confident enough.
  5. Advances `last_run_at` / `next_run_at` based on cadence.

Delivery to email/WhatsApp is intentionally out of scope here — alerts land
in the database as in_app events, which the `/api/v1/alerts` endpoint exposes.
Adding a Resend / Gupshup channel is a drop-in for a future `_dispatch()` call.
"""
from __future__ import annotations

import logging
import os
import signal
import time
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.ai_analyzer import AIAnalyzer
from app.cache import AnalysisCache
from app.data_collector import DataCollector
from app.database import (
    AlertCRUD,
    AnalysisCRUD,
    SessionLocal,
    UserCRUD,
    WatchlistCRUD,
    init_db,
)
from app.diff_engine import diff_reports
from app.notifications import AlertPayload, build_notifiers
from app.report_generator import ReportGenerator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("worker")

SCAN_INTERVAL_SECONDS = int(os.getenv("WORKER_SCAN_INTERVAL", "60"))
ALERT_CONFIDENCE_THRESHOLD = float(os.getenv("WORKER_ALERT_THRESHOLD", "0.6"))

# Notifier registry (email/etc.) is built once at startup so we don't re-read
# env vars on every tick.
NOTIFIERS = build_notifiers()


def _run_analysis(sector: str, dc: DataCollector, analyzer: AIAnalyzer, gen: ReportGenerator) -> tuple[str, int]:
    """Rebuild the analysis pipeline used by /analyze, returning (report, sources_count)."""
    results = dc.search_sector_news(sector, max_results=10)
    if results:
        formatted = dc.format_search_results(results)
    else:
        formatted = (
            f"Note: Real-time search data was unavailable. This analysis is based on "
            f"general market knowledge for the {sector} sector.\n\n"
        )
    report_body = analyzer.analyze_sector(sector, formatted)
    final_report = gen.add_metadata(report_body, sector, len(results))
    return final_report, len(results)


def tick() -> None:
    """One iteration of the scan loop."""
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        due = WatchlistCRUD.due(db, now)
        if not due:
            return

        logger.info("Found %d watchlist(s) due at %s", len(due), now.isoformat())
        dc = DataCollector()
        gen = ReportGenerator()
        try:
            analyzer = AIAnalyzer()
        except Exception as exc:
            logger.error("AIAnalyzer init failed; skipping this tick: %s", exc)
            return

        for wl in due:
            try:
                prior = AnalysisCRUD.get_user_analyses(db, wl.user_id, limit=1)
                previous_report = prior[0].report if prior else ""

                logger.info("Re-analyzing sector=%s for user=%s", wl.sector, wl.user_id)
                new_report, sources_count = _run_analysis(wl.sector, dc, analyzer, gen)

                analysis_row = AnalysisCRUD.create_analysis(
                    db,
                    user_id=wl.user_id,
                    sector=wl.sector,
                    report=new_report,
                    sources_analyzed=sources_count,
                    saved_path=None,
                )

                # Refresh this user's analysis cache so their next API request
                # sees the new report. The cache is scoped per-user to prevent
                # one subscriber's persona-framed content leaking to another.
                AnalysisCache.set_analysis(wl.sector, {
                    "report": new_report,
                    "sources_analyzed": sources_count,
                    "sources": [],
                    "timestamp": datetime.utcnow().isoformat(),
                }, user_id=wl.user_id)

                verdict = diff_reports(wl.sector, previous_report, new_report, ai_analyzer=analyzer)

                if verdict.changed and verdict.confidence >= ALERT_CONFIDENCE_THRESHOLD:
                    alert_row = AlertCRUD.create(
                        db,
                        user_id=wl.user_id,
                        watchlist_id=wl.id,
                        sector=wl.sector,
                        headline=verdict.headline,
                        direction=verdict.direction,
                        confidence=verdict.confidence,
                        summary=verdict.summary,
                        analysis_id=analysis_row.id,
                    )
                    logger.info(
                        "Alert fired: user=%s sector=%s headline=%r confidence=%.2f",
                        wl.user_id, wl.sector, verdict.headline, verdict.confidence,
                    )
                    _dispatch_alert(db, wl, alert_row, verdict)
                else:
                    logger.info(
                        "No material change for user=%s sector=%s (confidence=%.2f)",
                        wl.user_id, wl.sector, verdict.confidence,
                    )

                WatchlistCRUD.mark_ran(db, wl, now)
            except Exception as exc:
                logger.exception("Watchlist %s tick failed: %s", wl.id, exc)
                # Still advance next_run_at so we don't busy-loop on a broken row.
                try:
                    WatchlistCRUD.mark_ran(db, wl, now)
                except Exception:
                    db.rollback()
    finally:
        db.close()


def _dispatch_alert(db, watchlist, alert_row, verdict) -> None:
    """Fan out an AlertEvent to every channel the watchlist opted into."""
    channels = [c.strip() for c in (watchlist.channels or "").split(",") if c.strip()]
    # `in_app` is already covered by writing AlertEvent; nothing else to do.
    channels = [c for c in channels if c != "in_app"]
    if not channels:
        return

    user = UserCRUD.get_user_by_id(db, watchlist.user_id)
    payload = AlertPayload(
        user_email=user.email if user else None,
        user_display_name=(user.full_name or user.username) if user else None,
        sector=watchlist.sector,
        headline=verdict.headline,
        summary=verdict.summary,
        direction=verdict.direction,
        confidence=verdict.confidence,
        alert_id=alert_row.id,
    )

    for channel in channels:
        notifier = NOTIFIERS.get(channel)
        if not notifier:
            logger.info(
                "Channel %s not configured (alert=%s user=%s); no outbound delivery",
                channel, alert_row.id, watchlist.user_id,
            )
            continue
        try:
            notifier.deliver(payload)
        except Exception as exc:  # noqa: BLE001 - never let delivery crash the tick
            logger.exception("Notifier %s failed for alert=%s: %s", channel, alert_row.id, exc)


def main() -> None:
    logger.info("Worker starting (scan interval=%ss, alert threshold=%.2f)", SCAN_INTERVAL_SECONDS, ALERT_CONFIDENCE_THRESHOLD)
    # Make sure tables exist in case the worker boots before the API.
    init_db()

    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        tick,
        trigger=IntervalTrigger(seconds=SCAN_INTERVAL_SECONDS),
        id="watchlist-scan",
        next_run_time=datetime.utcnow(),
        max_instances=1,
        coalesce=True,
    )

    def _graceful(signum, _frame):
        logger.info("Received signal %s — shutting down worker", signum)
        scheduler.shutdown(wait=False)

    signal.signal(signal.SIGINT, _graceful)
    signal.signal(signal.SIGTERM, _graceful)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        pass


if __name__ == "__main__":
    main()

"""
CompareAgent — parallel multi-sector comparison (ROADMAP §4.5).

For each requested sector we fetch news + light market signals concurrently,
then ask a JSON-specialist LLM (via `app/llm_router.py`) to score them all
on opportunity / risk / capital / time-to-ROI axes. The deterministic
heuristic kicks in when every model in the chain fails so demos still return
meaningful numbers.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List

from app.data_collector import DataCollector
from app.llm_router import router
from app.market_data import get_sector_market_data

logger = logging.getLogger(__name__)


_SYSTEM = (
    "You are ranking Indian equity sectors for a retail investor. "
    "You MUST return strict JSON in the schema the caller provides — no markdown, "
    "no code fences, no commentary outside the JSON object."
)

_USER_TEMPLATE = """Rank the {count} sectors below on opportunity vs. risk. For each sector
a short news digest plus a live market-data snapshot is given.

Return JSON with exactly this shape:
{{
  "scores": [
    {{
      "sector": "<name>",
      "opportunity_score": 0-100,
      "risk_score": 0-100,
      "capital_required": "low" | "medium" | "high",
      "time_to_roi": "short" | "medium" | "long",
      "sentiment_score": -1.0 to 1.0,
      "top_opportunity": "<one-sentence>",
      "top_risk": "<one-sentence>"
    }}
  ],
  "winner": "<sector that offers the best opportunity/risk balance>",
  "headline": "<<=120 char summary of why the winner stands out>"
}}

Rules:
- opportunity_score rewards growth signals, policy tailwinds, positive news.
- risk_score rewards regulatory overhang, valuation stretch, bearish news.
- Base numbers on the data below. Do NOT invent sectors not in the input.

--- INPUT ---
{payload}
"""


def _build_sector_payload(sector: str, data_collector: DataCollector) -> Dict:
    """Gather just enough context for the LLM to score a sector."""
    market = get_sector_market_data(sector)
    news_items = data_collector.search_news_articles(sector, max_results=6)

    vitals = market.get("vitals") if market.get("status") == "ok" else None
    trend = market.get("trend") or []
    trend_change = None
    if len(trend) >= 2:
        first = trend[0].get("close") or 0
        last = trend[-1].get("close") or 0
        if first:
            trend_change = round((last / first - 1.0) * 100, 2)

    avg_sentiment = 0.0
    if news_items:
        avg_sentiment = round(
            sum(i.get("sentiment_score", 0) for i in news_items) / len(news_items),
            3,
        )

    return {
        "sector": sector,
        "avg_news_sentiment": avg_sentiment,
        "news_headlines": [i.get("title") for i in news_items[:6] if i.get("title")],
        "ticker": market.get("ticker"),
        "day_change_pct": vitals.get("change_pct") if vitals else None,
        "twelve_month_change_pct": trend_change,
        "volume": vitals.get("volume") if vitals else None,
    }


async def _gather_payloads_async(sectors: List[str]) -> List[Dict]:
    loop = asyncio.get_running_loop()
    dc = DataCollector()
    return await asyncio.gather(*[
        loop.run_in_executor(None, _build_sector_payload, s, dc)
        for s in sectors
    ])


def _heuristic_score(payload: Dict) -> Dict:
    """Deterministic fallback when the LLM chain is exhausted."""
    sentiment = payload.get("avg_news_sentiment") or 0.0
    day = payload.get("day_change_pct") or 0.0
    year = payload.get("twelve_month_change_pct") or 0.0

    opportunity = 50.0 + sentiment * 25 + (year / 2) + day * 2
    opportunity = max(0.0, min(100.0, opportunity))

    risk = 50.0 - sentiment * 20 + max(0.0, -year) + max(0.0, -day * 3)
    risk = max(0.0, min(100.0, risk))

    capital = "high" if (payload.get("volume") or 0) > 1_000_000 else "medium"
    time_to_roi = "short" if year > 15 else "long" if year < -5 else "medium"

    headlines = payload.get("news_headlines") or []
    top_opp = next(
        (h for h in headlines if any(w in h.lower() for w in ["growth", "surge", "record", "approval", "expansion"])),
        headlines[0] if headlines else "Broad market momentum",
    )
    top_risk = next(
        (h for h in headlines if any(w in h.lower() for w in ["risk", "fall", "probe", "decline", "ban"])),
        "General macro uncertainty",
    )

    return {
        "sector": payload["sector"],
        "opportunity_score": round(opportunity, 1),
        "risk_score": round(risk, 1),
        "capital_required": capital,
        "time_to_roi": time_to_roi,
        "sentiment_score": round(sentiment, 3),
        "top_opportunity": top_opp[:140],
        "top_risk": top_risk[:140],
    }


def _looks_valid(payload: Dict) -> bool:
    scores = payload.get("scores")
    return isinstance(scores, list) and len(scores) >= 1


async def compare_sectors(sectors: List[str], *, ai_analyzer=None) -> Dict:
    """
    Rank a set of sectors by opportunity / risk and return a leaderboard.

    `ai_analyzer` is accepted for backwards compatibility but no longer
    consulted — the router decides which model to call.
    """
    del ai_analyzer  # kept for call-site compatibility

    # Normalise and de-dupe while preserving order.
    seen = set()
    cleaned: List[str] = []
    for s in sectors:
        key = s.strip().lower()
        if key and key not in seen:
            seen.add(key)
            cleaned.append(s.strip())
    sectors = cleaned

    payloads = await _gather_payloads_async(sectors)

    user_prompt = _USER_TEMPLATE.format(
        count=len(sectors),
        payload=json.dumps(payloads, indent=2),
    )

    model_used = "heuristic"
    try:
        # The router is synchronous HTTP but compare_sectors is called from an
        # async handler — push it to a thread so we don't block the loop.
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: router.run("compare", system=_SYSTEM, user=user_prompt, validate=_looks_valid),
        )
    except Exception as exc:
        logger.warning("compare router call failed (%s); using heuristic", exc)
        result = None

    if result and result.parsed and isinstance(result.parsed.get("scores"), list):
        llm_scores = result.parsed["scores"]
        # Drop any hallucinated sectors the model may have returned.
        allowed = {s.lower() for s in sectors}
        scores = [s for s in llm_scores if isinstance(s, dict) and str(s.get("sector", "")).lower() in allowed]
        if scores:
            winner = result.parsed.get("winner") or scores[0].get("sector")
            headline = result.parsed.get("headline") or f"{winner} looks best on the current data."
            model_used = result.model_key
        else:
            scores = []
    else:
        scores = []

    if not scores:
        scores = [_heuristic_score(p) for p in payloads]
        winner_row = max(scores, key=lambda s: s["opportunity_score"] - s["risk_score"] / 2)
        winner = winner_row["sector"]
        headline = f"{winner} leads on opportunity-adjusted risk."

    return {
        "winner": winner,
        "headline": headline,
        "scores": scores,
        "model": model_used,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

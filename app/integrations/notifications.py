"""
Alert delivery channels.

Each `Notifier` knows how to deliver an AlertEvent to one transport. The worker
instantiates whichever notifiers have credentials configured and fans out per
watchlist's channels. Missing credentials degrade to a log-only no-op so the
worker never stalls on missing keys.

Transport priorities:
- `in_app`  — always on; writing the `AlertEvent` row is the delivery.
- `email`   — Resend HTTP API. Needs `RESEND_API_KEY` and `ALERT_FROM_EMAIL`.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional, Protocol

import httpx

logger = logging.getLogger(__name__)


@dataclass
class AlertPayload:
    user_email: Optional[str]
    user_display_name: Optional[str]
    sector: str
    headline: str
    summary: Optional[str]
    direction: str
    confidence: float
    alert_id: int
    dashboard_url: Optional[str] = None


class Notifier(Protocol):
    channel: str

    def deliver(self, alert: AlertPayload) -> bool:  # pragma: no cover - interface
        ...


# ---------------------------------------------------------------------------
# Resend (HTTP API)
# ---------------------------------------------------------------------------

RESEND_ENDPOINT = "https://api.resend.com/emails"


class ResendEmailNotifier:
    channel = "email"

    def __init__(self, api_key: str, from_email: str, dashboard_base: Optional[str]) -> None:
        self.api_key = api_key
        self.from_email = from_email
        self.dashboard_base = (dashboard_base or "").rstrip("/")

    def deliver(self, alert: AlertPayload) -> bool:
        if not alert.user_email:
            logger.info("email skipped for alert=%s (no email on file)", alert.alert_id)
            return False

        subject = f"[{alert.sector}] {alert.headline}"
        html = _render_alert_email(alert, self.dashboard_base)

        try:
            resp = httpx.post(
                RESEND_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": self.from_email,
                    "to": [alert.user_email],
                    "subject": subject[:200],
                    "html": html,
                },
                timeout=10.0,
            )
            if resp.status_code >= 400:
                logger.error("Resend rejected alert=%s: %s %s", alert.alert_id, resp.status_code, resp.text[:200])
                return False
            logger.info("Email alert=%s delivered to %s via Resend", alert.alert_id, alert.user_email)
            return True
        except Exception as exc:
            logger.exception("Resend call failed for alert=%s: %s", alert.alert_id, exc)
            return False


def _render_alert_email(alert: AlertPayload, dashboard_base: str) -> str:
    direction_label = {"up": "📈 Upside", "down": "📉 Downside", "neutral": "• Neutral"}.get(alert.direction, alert.direction)
    confidence_pct = int(round(alert.confidence * 100))
    summary_block = f"<p style='color:#444;line-height:1.5'>{_escape(alert.summary)}</p>" if alert.summary else ""
    dashboard_link = f"{dashboard_base}/alerts" if dashboard_base else ""
    cta = (
        f"<a href='{dashboard_link}' "
        "style='display:inline-block;background:#0a7a3b;color:#fff;padding:10px 18px;border-radius:8px;"
        "text-decoration:none;font-weight:600'>Open dashboard</a>"
        if dashboard_link else ""
    )

    return f"""
<!doctype html>
<html><body style='font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;
 background:#f6f7f9;margin:0;padding:24px;color:#111'>
  <div style='max-width:560px;margin:0 auto;background:#fff;border-radius:14px;
   padding:28px;border:1px solid #e5e7eb'>
    <p style='margin:0;color:#0a7a3b;font-weight:600;font-size:12px;letter-spacing:0.08em;
     text-transform:uppercase'>TradeInsight alert · {_escape(alert.sector)}</p>
    <h1 style='margin:10px 0 4px;font-size:22px;line-height:1.3'>{_escape(alert.headline)}</h1>
    <p style='margin:0 0 16px;color:#666;font-size:13px'>
      {_escape(direction_label)} · {confidence_pct}% confidence
    </p>
    {summary_block}
    <p style='margin:24px 0 0'>{cta}</p>
    <p style='margin:18px 0 0;color:#999;font-size:11px'>
      Hi {_escape(alert.user_display_name or 'there')}, this alert was generated because a watched sector's
      latest analysis flagged a material change vs. the previous one.
    </p>
  </div>
</body></html>""".strip()


def _escape(text: Optional[str]) -> str:
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

def build_notifiers() -> dict[str, Notifier]:
    """Inspect env and return a dict of enabled channel → notifier."""
    notifiers: dict[str, Notifier] = {}

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("ALERT_FROM_EMAIL", "").strip()
    dashboard_base = os.getenv("PUBLIC_APP_URL", "").strip()
    if api_key and from_email:
        notifiers["email"] = ResendEmailNotifier(api_key, from_email, dashboard_base)
        logger.info("Email delivery enabled via Resend (from=%s)", from_email)
    else:
        logger.info("Email delivery disabled (RESEND_API_KEY/ALERT_FROM_EMAIL not set)")

    return notifiers

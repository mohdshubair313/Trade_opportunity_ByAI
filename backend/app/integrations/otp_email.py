"""
OTP Email Delivery Service via Resend REST API.
Following official Resend Python documentation (https://resend.com/docs/send-with-python).

Sender: TradeInsight <otp@send.tradeinsight.shubair.in>
"""
import logging
import os
from pathlib import Path
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"
TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "otp_email.html"


def render_otp_email_html(otp_code: str, expires_minutes: int = 5) -> str:
    """Load and render the HTML email template from app/templates/otp_email.html."""
    try:
        if TEMPLATE_PATH.exists():
            template = TEMPLATE_PATH.read_text(encoding="utf-8")
            return template.replace("{{OTP_CODE}}", otp_code).replace("{{EXPIRES_MINUTES}}", str(expires_minutes))
    except Exception as exc:
        logger.warning(f"Failed to load HTML email template file: {exc}")

    # Concise fallback inline HTML string
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #27272a; background-color: #18181b; color: #ffffff; border-radius: 12px;">
      <h2 style="color: #10b981;">TradeInsight AI</h2>
      <p>Your email verification code is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; text-align: center; padding: 16px; background-color: #09090b; border-radius: 8px;">
        {otp_code}
      </div>
      <p style="font-size: 12px; color: #71717a; margin-top: 16px;">This code expires in {expires_minutes} minutes.</p>
    </div>
    """


def send_otp_email(to_email: str, otp_code: str, expires_minutes: int = 5) -> bool:
    """
    Send an OTP verification email using Resend REST API.
    Ref: https://resend.com/docs/api-reference/emails/send-email
    """
    resend_key = getattr(settings, "resend_api_key", None) or os.getenv("RESEND_API_KEY", "")
    from_email = getattr(settings, "alert_from_email", None) or os.getenv(
        "ALERT_FROM_EMAIL", "TradeInsight <otp@send.tradeinsight.shubair.in>"
    )

    clean_to_email = to_email.lower().strip()

    # Only log OTP codes in development — never in production logs.
    if settings.environment.lower() in ("development", "test"):
        logger.info(f"[DEV OTP] Target: {clean_to_email} | Code: {otp_code} (Expires {expires_minutes}m)")
    else:
        logger.info(f"Sending OTP to {clean_to_email}")

    if not resend_key:
        if settings.environment.lower() == "production":
            logger.error("[RESEND] RESEND_API_KEY not configured in production! OTP cannot be delivered.")
            return False
        logger.warning(f"[RESEND] RESEND_API_KEY not configured. Mocking OTP send (dev only).")
        return True

    subject = "Your TradeInsight AI verification code"
    html_content = render_otp_email_html(otp_code=otp_code, expires_minutes=expires_minutes)

    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [clean_to_email],
                "subject": subject,
                "html": html_content,
            },
            timeout=10.0,
        )

        if resp.status_code in (200, 201):
            logger.info(f"[RESEND] OTP email sent successfully to {clean_to_email} from {from_email}")
            return True

        if resp.status_code == 403:
            logger.warning(
                f"[RESEND NOTICE] Status 403: {resp.text}. "
                f"Ensure domain 'send.tradeinsight.shubair.in' is verified on Resend. "
                f"For local dev testing, use terminal OTP code: {otp_code}"
            )
            if settings.environment == "development":
                return True

        logger.error(f"[RESEND] Resend API returned status {resp.status_code}: {resp.text}")
        return False
    except Exception as exc:
        logger.error(f"[RESEND] Exception sending OTP email to {clean_to_email}: {exc}")
        return False

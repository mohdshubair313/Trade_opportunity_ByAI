"""
OTP Email Delivery Service via Resend REST API.
Uses httpx to interact directly with https://api.resend.com/emails.
No external third-party SDK dependencies required.
"""
import logging
import os
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

RESEND_API_URL = "https://api.resend.com/emails"


def send_otp_email(to_email: str, otp_code: str, expires_minutes: int = 5) -> bool:
    """
    Send an OTP verification email using Resend HTTP API.
    Ref: https://resend.com/docs/api-reference/emails/send-email
    """
    resend_key = getattr(settings, "resend_api_key", None) or os.getenv("RESEND_API_KEY", "")
    from_email = getattr(settings, "alert_from_email", None) or os.getenv("ALERT_FROM_EMAIL", "onboarding@resend.dev")

    # Resend requires onboarding@resend.dev for unverified free accounts
    if not from_email or "@gmail.com" in from_email or "@yahoo.com" in from_email or "@outlook.com" in from_email:
        from_email = "onboarding@resend.dev"

    # Always log OTP in dev terminal for instant testing convenience
    logger.info(f"🔑 [DEV OTP LOGGER] Target Email: {to_email} | Verification Code: {otp_code} (Expires in {expires_minutes}m)")

    if not resend_key:
        logger.warning(f"[RESEND] RESEND_API_KEY not configured. Mocking OTP send to {to_email}. OTP Code: {otp_code}")
        return True

    subject = f"Your Verification Code: {otp_code} - TradeInsight AI"
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #10b981; margin-top: 0;">TradeInsight AI</h2>
        <p style="color: #27272a;">Use the following 6-digit verification code to complete your signup:</p>
        <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #09090b; margin: 20px 0;">
            {otp_code}
        </div>
        <p style="font-size: 12px; color: #71717a;">This code will expire in {expires_minutes} minutes. If you did not request this, please ignore this email.</p>
    </div>
    """

    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            },
            timeout=10.0,
        )

        if resp.status_code in (200, 201):
            logger.info(f"[RESEND] OTP email sent successfully to {to_email}")
            return True

        if resp.status_code == 403:
            logger.warning(
                f"[RESEND FREE TIER RESTRICTION] Resend testing domain (onboarding@resend.dev) only delivers inbox emails to your Resend account owner email ({to_email}). "
                f"For other recipients in dev mode, use terminal log code above, or verify a custom domain on https://resend.com/domains"
            )
            # In dev mode, return True so the user can test registration using the terminal logged OTP!
            if settings.environment == "development":
                return True

        logger.error(f"[RESEND] Resend API returned status {resp.status_code}: {resp.text}")
        return False
    except Exception as exc:
        logger.error(f"[RESEND] Exception sending OTP email to {to_email}: {exc}")
        return False

"""CRUD operations for RefreshToken and OTPVerification models."""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.auth import RefreshToken, OTPVerification


class RefreshTokenCRUD:
    """CRUD operations for RefreshToken model."""
    
    @staticmethod
    def create_token(db: Session, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
        """Create a new refresh token."""
        refresh_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        return refresh_token
    
    @staticmethod
    def get_token(db: Session, token: str) -> Optional[RefreshToken]:
        """Get refresh token."""
        return db.query(RefreshToken)\
            .filter(RefreshToken.token == token, RefreshToken.is_revoked == False)\
            .first()
    
    @staticmethod
    def revoke_token(db: Session, token: str):
        """Revoke a refresh token."""
        refresh_token = db.query(RefreshToken)\
            .filter(RefreshToken.token == token)\
            .first()
        if refresh_token:
            refresh_token.is_revoked = True
            db.commit()
    
    @staticmethod
    def revoke_all_user_tokens(db: Session, user_id: int):
        """Revoke all tokens for a user."""
        db.query(RefreshToken)\
            .filter(RefreshToken.user_id == user_id)\
            .update({RefreshToken.is_revoked: True})
        db.commit()


class OTPCrud:
    """CRUD operations for email OTP verification."""

    @staticmethod
    def create_otp(db: Session, email: str, code: str, expires_in_minutes: int = 5) -> OTPVerification:
        clean_email = email.lower().strip()
        # Invalidate/delete prior pending OTPs for this email
        db.query(OTPVerification).filter(
            OTPVerification.email == clean_email,
            OTPVerification.verified == False
        ).delete(synchronize_session=False)

        now = datetime.now(timezone.utc)
        expires_at = datetime.fromtimestamp(now.timestamp() + expires_in_minutes * 60, tz=timezone.utc)

        otp = OTPVerification(
            email=clean_email,
            code=code,
            expires_at=expires_at,
            attempts=0,
            verified=False,
            created_at=now,
        )
        db.add(otp)
        db.commit()
        db.refresh(otp)
        return otp

    @staticmethod
    def get_latest_otp(db: Session, email: str) -> Optional[OTPVerification]:
        clean_email = email.lower().strip()
        return (
            db.query(OTPVerification)
            .filter(OTPVerification.email == clean_email, OTPVerification.verified == False)
            .order_by(OTPVerification.id.desc())
            .first()
        )

    @staticmethod
    def mark_verified(db: Session, otp: OTPVerification):
        otp.verified = True
        db.commit()

    @staticmethod
    def increment_attempts(db: Session, otp: OTPVerification):
        otp.attempts += 1
        db.commit()

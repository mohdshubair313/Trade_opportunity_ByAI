"""
Enhanced authentication module for Trade Opportunities API.
Supports user registration, login, JWT tokens with refresh, and password management.
"""
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db_session, UserCRUD, RefreshTokenCRUD, OTPCrud, User
from app.integrations.otp_email import send_otp_email

settings = get_settings()
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


# ==================== Password Utilities ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using bcrypt."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Generate password hash using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)  # Higher rounds for better security
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


# ==================== Token Management ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(user_id: int, db: Session) -> Tuple[str, datetime]:
    """Create a refresh token and store in database."""
    token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    
    RefreshTokenCRUD.create_token(db, user_id, token, expires_at)
    return token, expires_at


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        return None


def create_token_pair(user: User, db: Session) -> dict:
    """Create both access and refresh tokens."""
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    refresh_token, expires_at = create_refresh_token(user.id, db)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60
    }


# ==================== User Authentication ====================

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate a user with username/email and password.
    Supports login with either username or email.
    """
    # Try to find user by username first
    user = UserCRUD.get_user_by_username(db, username.lower())
    
    # If not found, try by email
    if not user:
        user = UserCRUD.get_user_by_email(db, username.lower())
    
    if not user:
        logger.info(f"Login attempt for non-existent user: {username}")
        return None
    
    if not user.is_active:
        logger.info(f"Login attempt for inactive user: {username}")
        return None
    
    if not verify_password(password, user.hashed_password):
        logger.info(f"Failed login attempt for user: {username}")
        return None
    
    # Update last login
    UserCRUD.update_last_login(db, user)
    logger.info(f"Successful login for user: {username}")
    return user


def create_email_otp(db: Session, email: str) -> str:
    """Generate and deliver a 6-digit OTP to the specified email address."""
    clean_email = email.lower().strip()
    if UserCRUD.get_user_by_email(db, clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please sign in instead."
        )

    # Generate cryptographically secure 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    
    # Store in DB with 5-minute expiry
    OTPCrud.create_otp(db, email=clean_email, code=otp_code, expires_in_minutes=5)
    
    # Send email
    sent = send_otp_email(to_email=clean_email, otp_code=otp_code, expires_minutes=5)
    if not sent:
        logger.warning(f"Failed to dispatch OTP email to {clean_email}, fallback logged")
        
    return otp_code


def verify_email_otp(db: Session, email: str, code: str) -> bool:
    """Verify an email OTP code."""
    clean_email = email.lower().strip()
    otp = OTPCrud.get_latest_otp(db, clean_email)
    
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification code found for this email. Please request a new code."
        )
    
    if otp.attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a new verification code."
        )

    now = datetime.now(timezone.utc)
    # Handle both timezone-aware and naive timestamps
    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )
    
    if otp.code != code.strip():
        OTPCrud.increment_attempts(db, otp)
        remaining = 3 - otp.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )
    
    OTPCrud.mark_verified(db, otp)
    return True


def register_user(db: Session, username: str, email: str, password: str, full_name: str = None, require_otp: bool = True) -> User:
    """Register a new user after email validation."""
    clean_email = email.lower().strip()
    clean_username = username.lower().strip()

    # Check if username exists
    if UserCRUD.get_user_by_username(db, clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    if UserCRUD.get_user_by_email(db, clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if email was verified via OTP
    if require_otp:
        from app.database import OTPVerification
        recent_verified = (
            db.query(OTPVerification)
            .filter(OTPVerification.email == clean_email, OTPVerification.verified == True)
            .order_by(OTPVerification.id.desc())
            .first()
        )
        if not recent_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email has not been verified. Please send and enter the OTP verification code first."
            )
    
    # Create user
    hashed_password = get_password_hash(password)
    user = UserCRUD.create_user(
        db,
        username=clean_username,
        email=clean_email,
        hashed_password=hashed_password,
        full_name=full_name
    )
    
    logger.info(f"New user registered: {clean_username} ({clean_email})")
    return user


def refresh_access_token(refresh_token: str, db: Session) -> dict:
    """Refresh access token using refresh token."""
    token_record = RefreshTokenCRUD.get_token(db, refresh_token)
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Postgres stores `DateTime` columns as `timestamp without time zone`, so
    # when SQLAlchemy reads them back they come out naive even though we wrote
    # an aware datetime. Normalise the read value to UTC-aware before comparing.
    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        RefreshTokenCRUD.revoke_token(db, refresh_token)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    
    user = UserCRUD.get_user_by_id(db, token_record.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Revoke old refresh token
    RefreshTokenCRUD.revoke_token(db, refresh_token)
    
    # Create new token pair
    return create_token_pair(user, db)


def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
    """Change user password."""
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    new_hashed = get_password_hash(new_password)
    UserCRUD.update_user(db, user, hashed_password=new_hashed)
    
    # Revoke all existing refresh tokens for security
    RefreshTokenCRUD.revoke_all_user_tokens(db, user.id)
    
    logger.info(f"Password changed for user: {user.username}")
    return True


# ==================== FastAPI Dependencies ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """
    Validate JWT token and return current user.
    Raises 401 if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        
        if username is None or token_type != "access":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    user = UserCRUD.get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db_session)
) -> Optional[User]:
    """
    Allow both authenticated and guest users.
    Returns None for guests, User object for authenticated users.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_premium_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure user has premium access."""
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required"
        )
    return current_user


# ==================== Seed Demo User ====================

def seed_demo_user(db: Session):
    """Create demo user if not exists."""
    demo_username = "demo_user"
    demo_email = "demo@tradeinsight.ai"
    demo_password = "Demo@123"
    
    if not UserCRUD.get_user_by_username(db, demo_username):
        hashed_password = get_password_hash(demo_password)
        UserCRUD.create_user(
            db,
            username=demo_username,
            email=demo_email,
            hashed_password=hashed_password,
            full_name="Demo User"
        )
        logger.info("Demo user created successfully")
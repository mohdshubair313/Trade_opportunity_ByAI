"""Authentication routes — OTP, register, login, refresh, logout."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db_session, User
from app.core.auth import (
    authenticate_user, register_user,
    create_email_otp, verify_email_otp,
    create_token_pair, refresh_access_token,
    get_current_active_user,
)
from app.core.schemas import (
    UserCreate, UserLogin,
    OTPSendRequest, OTPSendResponse, OTPVerifyRequest, OTPVerifyResponse,
    Token, TokenRefresh,
)
from app.core.rate_limiter import limiter
from app.database import RefreshTokenCRUD

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/send-otp", response_model=OTPSendResponse, operation_id="sendOtp", summary="Send email OTP verification code")
@limiter.limit("5/minute")
async def send_otp(
    request: Request,
    payload: OTPSendRequest,
    db: Session = Depends(get_db_session),
):
    """Send a 6-digit OTP code to the requested email address. Expires in 5 minutes."""
    try:
        create_email_otp(db, payload.email)
        return OTPSendResponse(
            message="Verification code sent to email. Please check your inbox.",
            email=payload.email,
            expires_in_minutes=5,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email",
        )


@router.post("/verify-otp", response_model=OTPVerifyResponse, operation_id="verifyOtp", summary="Verify email OTP code")
@limiter.limit("10/minute")
async def verify_otp(
    request: Request,
    payload: OTPVerifyRequest,
    db: Session = Depends(get_db_session),
):
    """Verify the 6-digit OTP code sent to an email address."""
    try:
        verified = verify_email_otp(db, payload.email, payload.code)
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code",
            )
        return OTPVerifyResponse(message="Email verified successfully", verified=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed",
        )


@router.post("/register", response_model=Token, operation_id="registerUser", summary="Register a new user account")
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db_session),
):
    """
    Register a new user account.

    Password requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    try:
        user = register_user(
            db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
        )
        tokens = create_token_pair(user, db)
        logger.info(f"New user registered: {user.username}")
        return Token(**tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=Token, operation_id="loginUser", summary="Authenticate and get JWT tokens")
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db_session),
):
    """
    Authenticate and get access token.

    You can login with username or email.

    Demo credentials:
    - username: `demo_user`
    - password: `Demo@123`
    """
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    tokens = create_token_pair(user, db)
    return Token(**tokens)


# Legacy login endpoint for backward compatibility
@router.post("/login-legacy", response_model=Token, include_in_schema=False)
@limiter.limit("10/minute")
async def login_legacy(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db_session),
):
    """Legacy login endpoint - use /api/v1/auth/login instead."""
    return await login(request, login_data, db)


@router.post("/refresh", response_model=Token, operation_id="refreshToken", summary="Refresh access token")
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    token_data: TokenRefresh,
    db: Session = Depends(get_db_session),
):
    """Refresh access token using refresh token."""
    tokens = refresh_access_token(token_data.refresh_token, db)
    return Token(**tokens)


@router.post("/logout", operation_id="logoutUser", summary="Logout and revoke active tokens")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Logout and invalidate tokens."""
    RefreshTokenCRUD.revoke_all_user_tokens(db, current_user.id)
    return {"message": "Logged out successfully"}

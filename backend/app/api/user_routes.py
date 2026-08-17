"""User profile routes — profile CRUD, password change, stats."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db_session, User, UserCRUD, AnalysisCRUD, FavoriteCRUD
from app.core.auth import get_current_active_user, change_password
from app.core.schemas import UserResponse, UserUpdate, PasswordChange, UserStats

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Update current user's profile."""
    update_data = user_data.model_dump(exclude_unset=True)

    # Check email uniqueness if changing
    if "email" in update_data and update_data["email"] != current_user.email:
        if UserCRUD.get_user_by_email(db, update_data["email"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )

    UserCRUD.update_user(db, current_user, **update_data)
    return UserResponse.model_validate(current_user)


@router.post("/me/change-password")
async def change_user_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Change current user's password."""
    change_password(db, current_user, password_data.current_password, password_data.new_password)
    return {"message": "Password changed successfully"}


@router.get("/me/stats", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Get current user's statistics."""
    analyses = AnalysisCRUD.get_user_analyses(db, current_user.id, limit=1)
    favorites = FavoriteCRUD.get_user_favorites(db, current_user.id)
    total_analyses = AnalysisCRUD.count_user_analyses(db, current_user.id)

    return UserStats(
        total_analyses=total_analyses,
        favorite_sectors=len(favorites),
        last_analysis=analyses[0].created_at if analyses else None,
        member_since=current_user.created_at,
        is_premium=current_user.is_premium,
    )

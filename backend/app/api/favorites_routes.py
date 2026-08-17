"""Favorites routes — list, add, remove favorite sectors."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db_session, User, FavoriteCRUD
from app.core.auth import get_current_active_user
from app.core.schemas import FavoriteAdd, FavoritesListResponse

router = APIRouter(prefix="/api/v1/favorites", tags=["Favorites"])


@router.get("", response_model=FavoritesListResponse)
async def get_favorites(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Get user's favorite sectors."""
    favorites = FavoriteCRUD.get_user_favorites(db, current_user.id)
    return FavoritesListResponse(favorites=favorites, count=len(favorites))


@router.post("")
async def add_favorite(
    favorite_data: FavoriteAdd,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Add a sector to favorites."""
    FavoriteCRUD.add_favorite(db, current_user.id, favorite_data.sector)
    return {"message": f"Added {favorite_data.sector} to favorites"}


@router.delete("/{sector}")
async def remove_favorite(
    sector: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Remove a sector from favorites."""
    removed = FavoriteCRUD.remove_favorite(db, current_user.id, sector)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sector not in favorites",
        )
    return {"message": f"Removed {sector} from favorites"}

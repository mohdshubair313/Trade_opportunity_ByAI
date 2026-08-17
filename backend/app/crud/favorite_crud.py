"""CRUD operations for FavoriteSector model."""
from typing import List
from sqlalchemy.orm import Session
from app.models.favorite import FavoriteSector


class FavoriteCRUD:
    """CRUD operations for FavoriteSector model."""
    
    @staticmethod
    def add_favorite(db: Session, user_id: int, sector: str) -> FavoriteSector:
        """Add a sector to favorites."""
        existing = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id, FavoriteSector.sector == sector)\
            .first()
        if existing:
            return existing
        
        favorite = FavoriteSector(user_id=user_id, sector=sector)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
        return favorite
    
    @staticmethod
    def remove_favorite(db: Session, user_id: int, sector: str) -> bool:
        """Remove a sector from favorites."""
        favorite = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id, FavoriteSector.sector == sector)\
            .first()
        if favorite:
            db.delete(favorite)
            db.commit()
            return True
        return False
    
    @staticmethod
    def get_user_favorites(db: Session, user_id: int) -> List[str]:
        """Get user's favorite sectors."""
        favorites = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id)\
            .all()
        return [f.sector for f in favorites]

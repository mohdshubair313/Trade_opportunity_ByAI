"""CRUD operations for User model."""
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User

logger = logging.getLogger(__name__)


class UserCRUD:
    """CRUD operations for User model."""
    
    @staticmethod
    def create_user(db: Session, username: str, email: str, hashed_password: str, full_name: str = None) -> User:
        """Create a new user."""
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def update_last_login(db: Session, user: User):
        """Update user's last login timestamp."""
        user.last_login = datetime.now(timezone.utc)
        db.commit()
    
    # Allowlist of fields safe to update via the profile endpoint.
    # Privileged fields (tier, is_premium, is_active, hashed_password)
    # require ``_allow_privileged=True`` from internal callers.
    SAFE_UPDATE_FIELDS = frozenset({
        "full_name", "email", "persona", "capital_range",
        "region", "risk_appetite",
    })

    @staticmethod
    def update_user(db: Session, user: User, _allow_privileged: bool = False, **kwargs):
        """Update user fields with field-level access control."""
        for key, value in kwargs.items():
            if not hasattr(user, key):
                continue
            if not _allow_privileged and key not in UserCRUD.SAFE_UPDATE_FIELDS:
                logger.warning("Blocked update of protected field '%s' on user %s", key, user.id)
                raise ValueError(f"Cannot update protected field: {key}")
            setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

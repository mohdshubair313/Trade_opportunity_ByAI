"""
Database module for Trade Opportunities API.
Uses SQLite for simple deployment, can be upgraded to PostgreSQL.
"""
import logging
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Database configuration - use SQLite for simplicity
DATABASE_URL = "sqlite:///./trade_opportunities_v2.db"

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},  # Needed for SQLite
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    """User model for authentication and profile."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    tier = Column(String(20), default="free")  # free, pro, enterprise
    analysis_count_month = Column(Integer, default=0)
    last_reset_date = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("FavoriteSector", back_populates="user", cascade="all, delete-orphan")


class Analysis(Base):
    """Analysis history model."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String(100), nullable=False, index=True)
    report = Column(Text, nullable=False)
    sources_analyzed = Column(Integer, default=0)
    saved_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="analyses")


class FavoriteSector(Base):
    """User's favorite sectors."""
    __tablename__ = "favorite_sectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="favorites")


class RefreshToken(Base):
    """Refresh tokens for JWT authentication."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# Create all tables
def init_db():
    """Initialize the database and create all tables."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")


@contextmanager
def get_db():
    """Get database session with proper cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CRUD Operations
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
        user.last_login = datetime.utcnow()
        db.commit()
    
    @staticmethod
    def update_user(db: Session, user: User, **kwargs):
        """Update user fields."""
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user


class AnalysisCRUD:
    """CRUD operations for Analysis model."""
    
    @staticmethod
    def create_analysis(db: Session, user_id: int, sector: str, report: str, 
                       sources_analyzed: int, saved_path: str = None) -> Analysis:
        """Create a new analysis record."""
        analysis = Analysis(
            user_id=user_id,
            sector=sector,
            report=report,
            sources_analyzed=sources_analyzed,
            saved_path=saved_path
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
    
    @staticmethod
    def get_user_analyses(db: Session, user_id: int, limit: int = 50, offset: int = 0) -> List[Analysis]:
        """Get user's analysis history."""
        return db.query(Analysis)\
            .filter(Analysis.user_id == user_id)\
            .order_by(Analysis.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int, user_id: int) -> Optional[Analysis]:
        """Get specific analysis by ID for a user."""
        return db.query(Analysis)\
            .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)\
            .first()
    
    @staticmethod
    def delete_analysis(db: Session, analysis: Analysis):
        """Delete an analysis."""
        db.delete(analysis)
        db.commit()


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


# Initialize database on module load
init_db()

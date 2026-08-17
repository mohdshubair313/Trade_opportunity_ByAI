"""User ORM model."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base


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
    last_reset_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Persona fields (§4.3) — drive report framing / voice.
    persona = Column(String(32), nullable=True)  # investor|exporter|sme_owner|student|consultant
    capital_range = Column(String(32), nullable=True)  # under_5L | 5L_50L | 50L_5Cr | 5Cr_plus
    region = Column(String(64), nullable=True)
    risk_appetite = Column(String(16), nullable=True)  # low | medium | high

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("FavoriteSector", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")

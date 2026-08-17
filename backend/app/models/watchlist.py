"""Watchlist ORM model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class Watchlist(Base):
    """A sector the user wants the scheduler to keep re-analyzing."""
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sector = Column(String(100), nullable=False)
    cadence = Column(String(20), nullable=False, default="daily")  # hourly|daily|weekly
    channels = Column(String(100), nullable=False, default="in_app")  # comma-separated: in_app,email
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

"""AlertEvent ORM model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from app.models.base import Base


class AlertEvent(Base):
    """A material change detected by the worker on a watched sector."""
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    sector = Column(String(100), nullable=False)
    headline = Column(String(280), nullable=False)
    direction = Column(String(16), nullable=False, default="neutral")  # up|down|neutral
    confidence = Column(String(8), nullable=False, default="0.0")  # kept as string to avoid float drift
    summary = Column(Text, nullable=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)

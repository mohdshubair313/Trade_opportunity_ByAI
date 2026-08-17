"""CRUD operations for AlertEvent model."""
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.alert import AlertEvent


class AlertCRUD:
    """CRUD for AlertEvent."""

    @staticmethod
    def create(
        db: Session,
        *,
        user_id: int,
        watchlist_id: int,
        sector: str,
        headline: str,
        direction: str,
        confidence: float,
        summary: Optional[str],
        analysis_id: Optional[int],
    ) -> AlertEvent:
        ev = AlertEvent(
            user_id=user_id,
            watchlist_id=watchlist_id,
            sector=sector,
            headline=headline[:280],
            direction=direction,
            confidence=f"{confidence:.2f}",
            summary=summary,
            analysis_id=analysis_id,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return ev

    @staticmethod
    def for_user(db: Session, user_id: int, *, include_seen: bool = False, limit: int = 50) -> List[AlertEvent]:
        q = db.query(AlertEvent).filter(AlertEvent.user_id == user_id)
        if not include_seen:
            q = q.filter(AlertEvent.acknowledged_at == None)  # noqa: E711
        return q.order_by(AlertEvent.triggered_at.desc()).limit(limit).all()

    @staticmethod
    def unread_count(db: Session, user_id: int) -> int:
        return (
            db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.user_id == user_id,
                AlertEvent.acknowledged_at == None,  # noqa: E711
            )
            .scalar()
            or 0
        )

    @staticmethod
    def get(db: Session, alert_id: int, user_id: int) -> Optional[AlertEvent]:
        return (
            db.query(AlertEvent)
            .filter(AlertEvent.id == alert_id, AlertEvent.user_id == user_id)
            .first()
        )

    @staticmethod
    def acknowledge(db: Session, alert: AlertEvent) -> AlertEvent:
        alert.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        return alert

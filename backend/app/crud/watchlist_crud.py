"""CRUD operations for Watchlist model."""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.watchlist import Watchlist


def _next_run_from(cadence: str, base: Optional[datetime] = None) -> datetime:
    base = base or datetime.now(timezone.utc)
    cadence = (cadence or "daily").lower()
    if cadence == "hourly":
        return base + timedelta(hours=1)
    if cadence == "weekly":
        return base + timedelta(days=7)
    return base + timedelta(days=1)


class WatchlistCRUD:
    """CRUD for Watchlist."""

    @staticmethod
    def create(db: Session, *, user_id: int, sector: str, cadence: str, channels: str) -> Watchlist:
        wl = Watchlist(user_id=user_id, sector=sector, cadence=cadence, channels=channels)
        # Schedule the first run slightly in the future so the worker picks it up.
        wl.next_run_at = _next_run_from(cadence)
        db.add(wl)
        db.commit()
        db.refresh(wl)
        return wl

    @staticmethod
    def for_user(db: Session, user_id: int) -> List[Watchlist]:
        return (
            db.query(Watchlist)
            .filter(Watchlist.user_id == user_id, Watchlist.is_active == True)  # noqa: E712
            .order_by(Watchlist.created_at.desc())
            .all()
        )

    @staticmethod
    def count_active(db: Session, user_id: int) -> int:
        return (
            db.query(func.count(Watchlist.id))
            .filter(Watchlist.user_id == user_id, Watchlist.is_active == True)  # noqa: E712
            .scalar()
            or 0
        )

    @staticmethod
    def get(db: Session, watchlist_id: int, user_id: int) -> Optional[Watchlist]:
        return (
            db.query(Watchlist)
            .filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id)
            .first()
        )

    @staticmethod
    def delete(db: Session, watchlist: Watchlist) -> None:
        db.delete(watchlist)
        db.commit()

    @staticmethod
    def due(db: Session, now: datetime) -> List[Watchlist]:
        return (
            db.query(Watchlist)
            .filter(
                Watchlist.is_active == True,  # noqa: E712
                Watchlist.next_run_at != None,  # noqa: E711
                Watchlist.next_run_at <= now,
            )
            .all()
        )

    @staticmethod
    def mark_ran(db: Session, watchlist: Watchlist, ran_at: datetime) -> None:
        watchlist.last_run_at = ran_at
        watchlist.next_run_at = _next_run_from(watchlist.cadence, base=ran_at)
        db.commit()

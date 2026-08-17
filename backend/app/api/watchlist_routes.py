"""Watchlist routes — list, create, delete watchlists."""
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db_session, User, Watchlist, WatchlistCRUD
from app.core.auth import get_current_active_user
from app.core.schemas import WatchlistCreate, WatchlistItem, WatchlistsResponse

router = APIRouter(prefix="/api/v1/watchlists", tags=["Watchlists"])

# Tier-based slot limits for watchlists. Matches the pricing page.
WATCHLIST_SLOTS = {"free": 1, "pro": 20, "enterprise": 999999}


def _watchlist_slot_limit(user: User) -> int:
    tier = (user.tier or "free").lower()
    return WATCHLIST_SLOTS.get(tier, 1)


def _to_watchlist_item(wl: Watchlist) -> WatchlistItem:
    return WatchlistItem(
        id=wl.id, sector=wl.sector, cadence=wl.cadence,
        channels=[c.strip() for c in (wl.channels or "").split(",") if c.strip()],
        is_active=wl.is_active, last_run_at=wl.last_run_at,
        next_run_at=wl.next_run_at, created_at=wl.created_at,
    )


@router.get("", response_model=WatchlistsResponse)
async def list_watchlists(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    items = WatchlistCRUD.for_user(db, current_user.id)
    limit = _watchlist_slot_limit(current_user)
    used = WatchlistCRUD.count_active(db, current_user.id)
    return WatchlistsResponse(
        items=[_to_watchlist_item(w) for w in items],
        count=len(items), slot_limit=limit, slots_used=used,
    )


@router.post("", response_model=WatchlistItem)
async def create_watchlist(
    payload: WatchlistCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    sector = re.sub(r"[^a-zA-Z0-9\s\-]", "", payload.sector).strip()
    if len(sector) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sector name")

    limit = _watchlist_slot_limit(current_user)
    used = WatchlistCRUD.count_active(db, current_user.id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Watchlist slot limit reached for your tier ({used}/{limit}). Upgrade to add more.",
        )

    for existing in WatchlistCRUD.for_user(db, current_user.id):
        if existing.sector.lower() == sector.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"'{sector}' is already on your watchlist.",
            )

    wl = WatchlistCRUD.create(
        db, user_id=current_user.id, sector=sector,
        cadence=payload.cadence, channels=",".join(payload.channels),
    )
    return _to_watchlist_item(wl)


@router.delete("/{watchlist_id}")
async def delete_watchlist(
    watchlist_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    wl = WatchlistCRUD.get(db, watchlist_id, current_user.id)
    if not wl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist not found")
    WatchlistCRUD.delete(db, wl)
    return {"message": "Watchlist removed"}

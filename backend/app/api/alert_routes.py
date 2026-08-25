"""Alert routes — list alerts, acknowledge alert."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db_session, User, AlertEvent, AlertCRUD
from app.core.auth import get_current_active_user
from app.core.schemas import AlertItem, AlertsResponse

router = APIRouter(tags=["Alerts"])


def _to_alert_item(ev: AlertEvent) -> AlertItem:
    try:
        confidence = float(ev.confidence)
    except (TypeError, ValueError):
        confidence = 0.0
    return AlertItem(
        id=ev.id, sector=ev.sector, headline=ev.headline,
        direction=ev.direction, confidence=confidence,
        summary=ev.summary, analysis_id=ev.analysis_id,
        triggered_at=ev.triggered_at, acknowledged_at=ev.acknowledged_at,
    )


@router.get(
    "/api/v1/alerts",
    response_model=AlertsResponse,
    operation_id="listAlerts",
    summary="List user sector alerts with seen/unseen filters",
)
async def list_alerts(
    include_seen: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    items = AlertCRUD.for_user(db, current_user.id, include_seen=include_seen, limit=limit)
    unread = AlertCRUD.unread_count(db, current_user.id)
    return AlertsResponse(items=[_to_alert_item(e) for e in items], unread=unread)


@router.post(
    "/api/v1/alerts/{alert_id}/acknowledge",
    response_model=AlertItem,
    operation_id="acknowledgeAlert",
    summary="Acknowledge and mark an alert as read",
)
async def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    ev = AlertCRUD.get(db, alert_id, current_user.id)
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if not ev.acknowledged_at:
        ev = AlertCRUD.acknowledge(db, ev)
    return _to_alert_item(ev)

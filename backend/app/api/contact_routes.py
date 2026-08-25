"""Contact / sales routes."""
import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db_session, ContactCRUD
from app.core.schemas import ContactRequest, ContactResponse
from app.core.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Contact"])


@router.post(
    "/api/v1/contact",
    response_model=ContactResponse,
    operation_id="submitContact",
    summary="Accept a contact or sales inquiry",
)
@limiter.limit("5/minute")
async def submit_contact(
    request: Request,
    payload: ContactRequest,
    db: Session = Depends(get_db_session),
):
    """Accept a contact / sales inquiry from the landing or pricing page."""
    entry = ContactCRUD.create(
        db, name=payload.name, email=payload.email,
        message=payload.message, company=payload.company,
        plan_interest=payload.plan_interest,
    )
    logger.info(f"Contact message received from {payload.email} (id={entry.id})")
    return ContactResponse(id=entry.id)

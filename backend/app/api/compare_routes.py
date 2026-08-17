"""Multi-sector comparison route (§4.5)."""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.orm import Session

from app.database import get_db_session, User
from app.core.auth import get_current_user_optional
from app.core.schemas import CompareRequest, CompareResponse, CompareSectorScore
from app.core.rate_limiter import limiter
from app.services.ai_analyzer import AIAnalyzer
from app.services.compare_service import compare_sectors

logger = logging.getLogger(__name__)
ai_analyzer = AIAnalyzer()

router = APIRouter(tags=["Analysis"])


@router.post("/api/v1/analyze/compare", response_model=CompareResponse)
@limiter.limit("10/minute")
async def compare_sectors_endpoint(
    request: Request,
    payload: CompareRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """Rank 2-5 sectors on opportunity / risk / capital / time-to-ROI axes."""
    if not current_user:
        allowed = {"technology", "pharmaceuticals"}
        blocked = [s for s in payload.sectors if s.strip().lower() not in allowed]
        if blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guest compare is limited to Technology and Pharmaceuticals. Please sign in.",
            )

    cleaned = [re.sub(r"[^a-zA-Z0-9\s\-]", "", s).strip() for s in payload.sectors]
    cleaned = [s for s in cleaned if len(s) >= 2]
    if len(cleaned) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least two valid sector names.",
        )

    result = await compare_sectors(cleaned, ai_analyzer=ai_analyzer)

    try:
        return CompareResponse(**result)
    except PydanticValidationError as exc:
        logger.warning("CompareResponse validation failed (%s); rebuilding from heuristic", exc)
        try:
            result = await compare_sectors(cleaned, ai_analyzer=ai_analyzer, force_heuristic=True)
            return CompareResponse(**result)
        except (PydanticValidationError, KeyError, TypeError) as exc2:
            logger.error("Heuristic fallback also failed (%s); returning last-resort response", exc2)
            return CompareResponse(
                winner=cleaned[0],
                headline=f"Comparison of {len(cleaned)} sectors (limited data available).",
                scores=[
                    CompareSectorScore(
                        sector=s, opportunity_score=50.0, risk_score=50.0,
                        capital_required="medium", time_to_roi="medium",
                        sentiment_score=0.0,
                        top_opportunity="Data temporarily unavailable.",
                        top_risk="Data temporarily unavailable.",
                    )
                    for s in cleaned
                ],
                generated_at=datetime.now(timezone.utc).isoformat() + "Z",
            )

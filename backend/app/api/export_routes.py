"""Export routes — PDF, XLSX, PPTX, MD export (§3.3 / §4.4)."""
import re
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db_session, User, AnalysisCRUD
from app.core.auth import get_current_active_user
from app.core.cache import AnalysisCache
from app.core.rate_limiter import limiter
from app.services.export_service import export_analysis, CONTENT_TYPES

router = APIRouter(tags=["Analysis"])


@router.get(
    "/api/v1/history/{analysis_id}/export",
    operation_id="exportAnalysis",
    summary="Export a saved analysis report as PDF, PPTX, XLSX, or Markdown",
)
@limiter.limit("20/minute")
async def export_analysis_by_id(
    request: Request,
    analysis_id: int,
    format: str = Query("pdf", description="pdf | xlsx | pptx | md"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Export a previously-saved analysis in the requested format."""
    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    fmt = format.lower().strip()
    if fmt not in CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{format}'. Use one of: {', '.join(CONTENT_TYPES)}",
        )

    # Gate PPTX behind paid tiers
    if fmt == "pptx" and (current_user.tier or "free").lower() == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="PPTX export is a Pro feature. Upgrade to export decks.",
        )

    cached = AnalysisCache.get_analysis(analysis.sector, user_id=current_user.id) or {}
    sources = cached.get("sources") or []

    payload = export_analysis(
        fmt=fmt, report=analysis.report, sector=analysis.sector,
        sources_analyzed=analysis.sources_analyzed,
        generated_at=analysis.created_at, sources=sources,
    )

    safe_sector = re.sub(r"[^a-zA-Z0-9_-]+", "_", analysis.sector).strip("_").lower() or "report"
    filename = f"{safe_sector}_{analysis.created_at.strftime('%Y%m%d')}.{fmt}"

    return Response(
        content=payload,
        media_type=CONTENT_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

"""Analysis routes — sector analysis, history, delete."""
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db_session, User, AnalysisCRUD
from app.core.auth import get_current_user_optional, get_current_active_user
from app.core.schemas import (
    AnalysisResponse, AnalysisSource,
    AnalysisHistoryResponse, AnalysisHistoryItem,
)
from app.core.rate_limiter import limiter
from app.core.cache import AnalysisCache
from app.services.data_collector import DataCollector
from app.services.ai_analyzer import AIAnalyzer
from app.services.report_generator import ReportGenerator
from app.services.research_agent import research_sector, research_sector_offline, ResearchUnavailable

logger = logging.getLogger(__name__)
settings = get_settings()

data_collector = DataCollector()
ai_analyzer = AIAnalyzer()
report_generator = ReportGenerator()

router = APIRouter(tags=["Analysis"])


@router.get("/api/v1/analyze/{sector}", response_model=AnalysisResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def analyze_sector(
    request: Request,
    sector: str,
    save_report: bool = Query(False, description="Save report to file"),
    use_cache: bool = Query(True, description="Use cached results if available"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """
    Analyze a sector and generate trade opportunity report.

    Supports 20+ sectors including:
    - Technology, Pharmaceuticals, Healthcare, Fintech
    - E-commerce, Renewable Energy, Agriculture, Automotive
    - Manufacturing, Textile, Real Estate, Banking, Insurance
    - Telecom, Media, Education, Food Processing, Chemicals
    - Metals & Mining, Infrastructure
    """
    # Validate sector name
    if not sector or len(sector.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name must be at least 2 characters",
        )

    # Sanitize sector name
    validated_sector = re.sub(r'[^a-zA-Z0-9\s\-]', '', sector).strip()
    if len(validated_sector) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sector name")
    if len(validated_sector) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name too long (max 100 characters)",
        )

    # Check cache first (scoped per-user for persona-framed reports)
    cache_user_id = current_user.id if current_user else None
    if use_cache:
        cached_result = AnalysisCache.get_analysis(validated_sector, user_id=cache_user_id)
        if cached_result:
            logger.info(f"Cache hit for sector: {validated_sector}")
            return AnalysisResponse(
                sector=validated_sector,
                report=cached_result["report"],
                sources_analyzed=cached_result["sources_analyzed"],
                sources=cached_result.get("sources", []),
                timestamp=cached_result["timestamp"],
                cached=True,
            )

    try:
        username = current_user.username if current_user else "guest"
        logger.info(f"Analyzing sector '{validated_sector}' for user '{username}'")

        # === Access Control Logic ===
        if not current_user:
            ALLOWED_GUEST_SECTORS = ["technology", "pharmaceuticals"]
            if validated_sector.lower() not in ALLOWED_GUEST_SECTORS:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Guest access is limited to Technology and Pharmaceuticals sectors. Please login to analyze any sector.",
                )
        else:
            # Check/Reset Monthly Counter
            now = datetime.now(timezone.utc)
            if not current_user.last_reset_date or \
               (now.year > current_user.last_reset_date.year) or \
               (now.month > current_user.last_reset_date.month):
                current_user.analysis_count_month = 0
                current_user.last_reset_date = now

            tier = current_user.tier.lower() if current_user.tier else "free"
            limits = {"free": 50, "pro": 100, "enterprise": 999999}
            limit = limits.get(tier, 5)

            if current_user.analysis_count_month >= limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Monthly analysis limit reached for {tier} tier ({limit}). Please upgrade your plan.",
                )

        # Persona context
        persona_context = None
        if current_user and current_user.persona:
            persona_context = {
                "persona": current_user.persona,
                "capital_range": current_user.capital_range,
                "region": current_user.region,
                "risk_appetite": current_user.risk_appetite,
            }

        # Primary path: Grounded research agent
        analysis_report = ""
        search_results: list = []
        grounded_sources: list = []

        try:
            logger.info(f"[research] grounded agent → {validated_sector}")
            grounded = research_sector(validated_sector, persona=persona_context)
            analysis_report = grounded.report
            for s in grounded.sources:
                grounded_sources.append({
                    "n": s.n, "title": s.title or s.url,
                    "url": s.url, "snippet": s.snippet,
                })
            search_results = [{"title": s["title"], "body": s.get("snippet") or "", "url": s["url"]} for s in grounded_sources]
        except ResearchUnavailable as exc:
            logger.warning(f"[research] grounded agent unavailable ({exc}); falling back to DDG + AIAnalyzer")

        # Fallback path #2: DDG search + non-grounded Gemini
        if not analysis_report:
            logger.info(f"[research] fallback DDG + Gemini → {validated_sector}")
            try:
                search_results = data_collector.search_sector_news(
                    validated_sector, max_results=settings.max_search_results,
                )
                if search_results:
                    formatted_data = data_collector.format_search_results(search_results)
                    analysis_report = ai_analyzer.analyze_sector(
                        validated_sector, formatted_data, persona=persona_context,
                    )
                else:
                    logger.warning("[research] DDG returned 0 results")
                    search_results = []
            except Exception as exc:
                logger.warning(f"[research] DDG + Gemini path failed ({exc}); trying DDG + OpenRouter")
                if search_results:
                    try:
                        offline = research_sector_offline(
                            validated_sector, persona=persona_context, search_context=search_results,
                        )
                        analysis_report = offline.report
                        grounded_sources = [
                            {"n": i + 1, "title": s.get("title", ""), "url": s.get("url", ""), "snippet": s.get("body", "")}
                            for i, s in enumerate(search_results)
                        ]
                        logger.info("[research] DDG + OpenRouter succeeded")
                    except ResearchUnavailable as or_exc:
                        logger.warning(f"[research] DDG + OpenRouter also failed ({or_exc})")
                        search_results = []
                else:
                    search_results = []

        # Fallback path #3: OpenRouter offline
        if not analysis_report:
            logger.info(f"[research] fallback OpenRouter offline → {validated_sector}")
            try:
                offline = research_sector_offline(validated_sector, persona=persona_context)
                analysis_report = offline.report
                search_results = []
                grounded_sources = []
            except ResearchUnavailable as exc:
                logger.error(f"[research] all paths exhausted for {validated_sector}: {exc}")

        # Last resort: mock report
        if not analysis_report:
            analysis_report = ai_analyzer._generate_mock_report(validated_sector)
            search_results = []
            grounded_sources = []

        # Add metadata
        final_report = report_generator.add_metadata(analysis_report, validated_sector, len(search_results))

        # Save report if requested
        saved_path = None
        saved_url: Optional[str] = None
        if save_report:
            try:
                result = report_generator.save_report(
                    validated_sector, final_report,
                    user_id=current_user.id if current_user else None,
                )
                saved_path = result.path
                saved_url = result.url
            except Exception as exc:
                logger.warning("Report persistence failed (%s); continuing without saved copy", exc)

        timestamp = datetime.now().isoformat()

        # Build source list
        if grounded_sources:
            source_list = [
                AnalysisSource(n=s["n"], title=s["title"], url=s["url"], snippet=s.get("snippet"))
                for s in grounded_sources if s.get("url")
            ]
        else:
            source_list = [
                AnalysisSource(
                    n=i + 1,
                    title=r.get("title") or r.get("url") or f"Source {i + 1}",
                    url=r.get("url") or "",
                    snippet=(r.get("body") or "")[:240] or None,
                )
                for i, r in enumerate(search_results) if r.get("url")
            ]

        # Cache the result
        AnalysisCache.set_analysis(validated_sector, {
            "report": final_report,
            "sources_analyzed": len(search_results),
            "sources": [s.model_dump() for s in source_list],
            "timestamp": timestamp,
        }, user_id=cache_user_id)

        # Save to database if authenticated
        analysis_id = None
        if current_user:
            analysis = AnalysisCRUD.create_analysis(
                db, user_id=current_user.id, sector=validated_sector,
                report=final_report, sources_analyzed=len(search_results),
                saved_path=saved_path,
            )
            analysis_id = analysis.id
            current_user.analysis_count_month += 1
            db.commit()

        logger.info(f"Analysis completed for sector: {validated_sector}")
        return AnalysisResponse(
            id=analysis_id, sector=validated_sector, report=final_report,
            sources_analyzed=len(search_results), sources=source_list,
            saved_to=saved_path, saved_url=saved_url,
            timestamp=timestamp, cached=False,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing sector {sector}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed. Please try again later.",
        )


# Legacy analyze endpoint
@router.get("/analyze/{sector}", response_model=AnalysisResponse, include_in_schema=False)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def analyze_sector_legacy(
    request: Request,
    sector: str,
    save_report: bool = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """Legacy endpoint - use /api/v1/analyze/{sector} instead."""
    return await analyze_sector(request, sector, save_report, True, current_user, db)


@router.get("/api/v1/history", response_model=AnalysisHistoryResponse)
async def get_analysis_history(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Get user's analysis history with pagination."""
    offset = (page - 1) * per_page
    analyses = AnalysisCRUD.get_user_analyses(db, current_user.id, limit=per_page, offset=offset)
    total = AnalysisCRUD.count_user_analyses(db, current_user.id)

    return AnalysisHistoryResponse(
        items=[AnalysisHistoryItem(
            id=a.id, sector=a.sector,
            sources_analyzed=a.sources_analyzed, created_at=a.created_at,
        ) for a in analyses],
        total=total, page=page, per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/api/v1/history/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_by_id(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Get a specific analysis by ID."""
    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return AnalysisResponse(
        id=analysis.id, sector=analysis.sector, report=analysis.report,
        sources_analyzed=analysis.sources_analyzed, saved_to=analysis.saved_path,
        timestamp=analysis.created_at.isoformat(), cached=False,
    )


@router.delete("/api/v1/history/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Delete an analysis from history."""
    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    AnalysisCRUD.delete_analysis(db, analysis)
    return {"message": "Analysis deleted successfully"}

"""
Trade Opportunities API - Production Ready Backend
Version 2.0.0

A comprehensive API for analyzing market data and providing trade opportunity insights
for Indian sectors, powered by agentic AI.
"""
import logging
import re
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load environment variables
load_dotenv()

from app.config import get_settings, get_environment_info
from app.database import (
    get_db_session, init_db,
    UserCRUD, AnalysisCRUD, FavoriteCRUD, ContactCRUD, WatchlistCRUD, AlertCRUD,
    User, Analysis, Watchlist, AlertEvent,
)
from app.auth import (
    authenticate_user,
    register_user,
    create_token_pair,
    refresh_access_token,
    change_password,
    get_current_user,
    get_current_user_optional,
    get_current_active_user,
    seed_demo_user
)
from app.schemas import (
    UserCreate, UserLogin, UserResponse, UserUpdate, PasswordChange,
    Token, TokenRefresh,
    AnalysisRequest, AnalysisResponse, AnalysisSource, AnalysisHistoryResponse, AnalysisHistoryItem,
    FavoriteAdd, FavoritesListResponse,
    ContactRequest, ContactResponse,
    WatchlistCreate, WatchlistItem, WatchlistsResponse, AlertItem, AlertsResponse,
    CompareRequest, CompareResponse,
    HealthResponse, APIInfoResponse, ErrorResponse, UserStats
)
from app.rate_limiter import limiter, rate_limit_exceeded_handler
from app.cache import get_cache, AnalysisCache
from app.data_collector import DataCollector
from app.ai_analyzer import AIAnalyzer
from app.report_generator import ReportGenerator
from app.research_agent import research_sector, research_sector_offline, ResearchUnavailable
from app.market_data import (
    get_sector_market_data,
    get_sector_relative_strength,
    get_sector_correlation_matrix,
)
from app.export_service import export_analysis, CONTENT_TYPES
from app.compare_service import compare_sectors

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize settings
settings = get_settings()


# ==================== Application Lifespan ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.version}")
    logger.info(f"Environment: {settings.environment}")
    
    # Initialize database
    init_db()
    
    # Seed demo user
    with next(get_db_session()) as db:
        seed_demo_user(db)
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Application shutdown")


# ==================== FastAPI App ====================

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="""
## Trade Opportunities API

A comprehensive API for analyzing market data and providing trade opportunity insights
for Indian sectors, powered by agentic AI.

### Features
- 🔐 **Authentication**: Secure JWT-based authentication with refresh tokens
- 📊 **Sector Analysis**: AI-powered analysis of 20+ sectors
- 📈 **History Tracking**: Store and retrieve past analyses
- ⭐ **Favorites**: Save favorite sectors for quick access
- ⚡ **Caching**: Intelligent caching for faster responses
- 🚦 **Rate Limiting**: Fair usage policies

### Quick Start
1. Register or use demo credentials: `demo_user` / `Demo@123`
2. Get your access token via `/api/v1/auth/login`
3. Analyze sectors via `/api/v1/analyze/{sector}`
    """,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# ==================== Middleware ====================

# CORS — always use an explicit allow-list. Combining allow_origins=["*"]
# with allow_credentials=True is invalid per the CORS spec; browsers reject
# the response and every authenticated request fails. The allow-list is
# built in config.Settings.cors_origins_list and ALWAYS includes localhost
# for dev + whatever is set in the CORS_ORIGINS env var for prod. An
# optional regex (CORS_ORIGIN_REGEX) covers Vercel preview URLs without
# listing every branch manually.
_allowed_origins = settings.cors_origins_list
logger.info(
    "CORS configured — allow_origins=%s allow_origin_regex=%r",
    _allowed_origins,
    settings.cors_origin_regex or None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ==================== Initialize Components ====================

data_collector = DataCollector()
ai_analyzer = AIAnalyzer()
report_generator = ReportGenerator()


# ==================== Exception Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "message": str(exc.detail),
            "code": f"HTTP_{exc.status_code}"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred" if settings.is_production else str(exc),
            "code": "INTERNAL_ERROR"
        }
    )


# ==================== Root & Health Endpoints ====================

@app.get("/", response_model=APIInfoResponse, tags=["Info"])
async def root():
    """Root endpoint - API information."""
    return APIInfoResponse(
        message=f"Welcome to {settings.app_name}",
        version=settings.version,
        environment=settings.environment,
        endpoints={
            "docs": "/docs",
            "health": "/health",
            "auth": {
                "register": "/api/v1/auth/register",
                "login": "/api/v1/auth/login",
                "refresh": "/api/v1/auth/refresh"
            },
            "analysis": {
                "analyze": "/api/v1/analyze/{sector}",
                "history": "/api/v1/history",
                "favorites": "/api/v1/favorites"
            },
            "user": {
                "profile": "/api/v1/users/me",
                "stats": "/api/v1/users/me/stats"
            }
        }
    )


@app.get("/health", response_model=HealthResponse, tags=["Info"])
async def health_check():
    """Health check endpoint with system status."""
    cache = get_cache()
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.version,
        timestamp=datetime.now().isoformat(),
        database="connected",
        cache=cache.get_stats()
    )


# ==================== Authentication Endpoints ====================

@app.post("/api/v1/auth/register", response_model=Token, tags=["Authentication"])
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db_session)
):
    """
    Register a new user account.
    
    Password requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    try:
        user = register_user(
            db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        tokens = create_token_pair(user, db)
        logger.info(f"New user registered: {user.username}")
        return Token(**tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@app.post("/api/v1/auth/login", response_model=Token, tags=["Authentication"])
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db_session)
):
    """
    Authenticate and get access token.
    
    You can login with username or email.
    
    Demo credentials:
    - username: `demo_user`
    - password: `Demo@123`
    """
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = create_token_pair(user, db)
    return Token(**tokens)


# Legacy login endpoint for backward compatibility
@app.post("/login", response_model=Token, tags=["Authentication"], include_in_schema=False)
@limiter.limit("10/minute")
async def login_legacy(
    request: Request,
    login_data: UserLogin,
    db: Session = Depends(get_db_session)
):
    """Legacy login endpoint - use /api/v1/auth/login instead."""
    return await login(request, login_data, db)


@app.post("/api/v1/auth/refresh", response_model=Token, tags=["Authentication"])
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    token_data: TokenRefresh,
    db: Session = Depends(get_db_session)
):
    """Refresh access token using refresh token."""
    tokens = refresh_access_token(token_data.refresh_token, db)
    return Token(**tokens)


@app.post("/api/v1/auth/logout", tags=["Authentication"])
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Logout and invalidate tokens."""
    from app.database import RefreshTokenCRUD
    RefreshTokenCRUD.revoke_all_user_tokens(db, current_user.id)
    return {"message": "Logged out successfully"}


# ==================== User Endpoints ====================

@app.get("/api/v1/users/me", response_model=UserResponse, tags=["Users"])
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile."""
    return UserResponse.model_validate(current_user)


@app.put("/api/v1/users/me", response_model=UserResponse, tags=["Users"])
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Update current user's profile."""
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Check email uniqueness if changing
    if "email" in update_data and update_data["email"] != current_user.email:
        if UserCRUD.get_user_by_email(db, update_data["email"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
    
    UserCRUD.update_user(db, current_user, **update_data)
    return UserResponse.model_validate(current_user)


@app.post("/api/v1/users/me/change-password", tags=["Users"])
async def change_user_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Change current user's password."""
    change_password(db, current_user, password_data.current_password, password_data.new_password)
    return {"message": "Password changed successfully"}


@app.get("/api/v1/users/me/stats", response_model=UserStats, tags=["Users"])
async def get_user_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get current user's statistics."""
    analyses = AnalysisCRUD.get_user_analyses(db, current_user.id, limit=1)
    favorites = FavoriteCRUD.get_user_favorites(db, current_user.id)
    total_analyses = AnalysisCRUD.count_user_analyses(db, current_user.id)
    
    return UserStats(
        total_analyses=total_analyses,
        favorite_sectors=len(favorites),
        last_analysis=analyses[0].created_at if analyses else None,
        member_since=current_user.created_at,
        is_premium=current_user.is_premium
    )


# ==================== Analysis Endpoints ====================

@app.get("/api/v1/analyze/{sector}", response_model=AnalysisResponse, tags=["Analysis"])
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def analyze_sector(
    request: Request,
    sector: str,
    save_report: bool = Query(False, description="Save report to file"),
    use_cache: bool = Query(True, description="Use cached results if available"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session)
):
    """
    Analyze a sector and generate trade opportunity report.
    
    Supports 20+ sectors including:
    - Technology, Pharmaceuticals, Healthcare, Fintech
    - E-commerce, Renewable Energy, Agriculture, Automotive
    - Manufacturing, Textile, Real Estate, Banking, Insurance
    - Telecom, Media, Education, Food Processing, Chemicals
    - Metals & Mining, Infrastructure
    
    Args:
        sector: Name of the sector to analyze
        save_report: Whether to save the report as a markdown file
        use_cache: Whether to use cached results (speeds up requests)
    
    Returns:
        Comprehensive trade opportunities analysis report
    """
    import re
    
    # Validate sector name
    if not sector or len(sector.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name must be at least 2 characters"
        )
    
    # Sanitize sector name
    validated_sector = re.sub(r'[^a-zA-Z0-9\s\-]', '', sector).strip()
    if len(validated_sector) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sector name"
        )
    
    if len(validated_sector) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name too long (max 100 characters)"
        )
    
    # Check cache first. Scoped per-user because reports are persona-framed —
    # returning another user's cached result would leak their persona content.
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
                cached=True
            )
    
    try:
        username = current_user.username if current_user else "guest"
        logger.info(f"Analyzing sector '{validated_sector}' for user '{username}'")
        
        # === Access Control Logic ===
        if not current_user:
            # Guest Limit: Only allowed specific sectors
            ALLOWED_GUEST_SECTORS = ["technology", "pharmaceuticals"]
            if validated_sector.lower() not in ALLOWED_GUEST_SECTORS:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Guest access is limited to Technology and Pharmaceuticals sectors. Please login to analyze any sector."
                )
        else:
            # Authenticated User Limits
            # Check/Reset Monthly Counter
            now = datetime.utcnow()
            if not current_user.last_reset_date or \
               (now.year > current_user.last_reset_date.year) or \
               (now.month > current_user.last_reset_date.month):
                current_user.analysis_count_month = 0
                current_user.last_reset_date = now
                # We'll commit this update along with the analysis later
            
            # Define limits
            tier = current_user.tier.lower() if current_user.tier else "free"
            limits = {"free": 5, "pro": 100, "enterprise": 999999}
            limit = limits.get(tier, 5)
            
            if current_user.analysis_count_month >= limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Monthly analysis limit reached for {tier} tier ({limit}). Please upgrade your plan."
                )

        # Persona context (shared between both research paths).
        persona_context = None
        if current_user and current_user.persona:
            persona_context = {
                "persona": current_user.persona,
                "capital_range": current_user.capital_range,
                "region": current_user.region,
                "risk_appetite": current_user.risk_appetite,
            }

        # Primary path: Gemini does its own grounded web research via the
        # google_search tool. Gives us full article bodies + structured source
        # metadata instead of thin DDG snippets.
        analysis_report = ""
        search_results: list = []
        grounded_sources: list = []

        try:
            logger.info(f"[research] grounded agent → {validated_sector}")
            grounded = research_sector(validated_sector, persona=persona_context)
            analysis_report = grounded.report
            for s in grounded.sources:
                grounded_sources.append({
                    "n": s.n,
                    "title": s.title or s.url,
                    "url": s.url,
                    "snippet": s.snippet,
                })
            # Mirror the grounded sources into the shape `search_results` uses
            # elsewhere so downstream code (counts, persistence) stays identical.
            search_results = [{"title": s["title"], "body": s.get("snippet") or "", "url": s["url"]} for s in grounded_sources]
        except ResearchUnavailable as exc:
            logger.warning(f"[research] grounded agent unavailable ({exc}); falling back to DDG + AIAnalyzer")

        # Fallback path #2: legacy DDG search + non-grounded Gemini. DDG 429s
        # from shared Docker IPs frequently, but when it works we still get
        # snippet-quality sources cheaply.
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
                    logger.warning("[research] DDG returned 0 results; skipping Gemini-only path")
                    search_results = []
            except Exception as exc:
                logger.warning(f"[research] DDG + Gemini path failed ({exc}); trying OpenRouter offline")
                search_results = []

        # Fallback path #3: OpenRouter prose chain (no web access, model's
        # training knowledge only). Always returns SOMETHING useful when API
        # keys are configured — never drops the user on mock data.
        if not analysis_report:
            logger.info(f"[research] fallback OpenRouter offline → {validated_sector}")
            try:
                offline = research_sector_offline(validated_sector, persona=persona_context)
                analysis_report = offline.report
                search_results = []
                grounded_sources = []
            except ResearchUnavailable as exc:
                logger.error(f"[research] all paths exhausted for {validated_sector}: {exc}")

        # Last resort: mock report with an explicit "Demo Mode" banner. Only
        # reached when Gemini + OpenRouter + DDG are all down simultaneously.
        if not analysis_report:
            analysis_report = ai_analyzer._generate_mock_report(validated_sector)
            search_results = []
            grounded_sources = []
        
        # Step 3: Add metadata
        final_report = report_generator.add_metadata(
            analysis_report, 
            validated_sector, 
            len(search_results)
        )
        
        # Step 4: Save report if requested. Storage is Supabase (cloud) when
        # SUPABASE_* creds are set, or local disk otherwise — see app/storage.py.
        # `saved_path` stores the locator for later retrieval; `saved_url` is
        # the shareable download URL when the cloud backend accepted the upload.
        saved_path = None
        saved_url: Optional[str] = None
        if save_report:
            try:
                result = report_generator.save_report(
                    validated_sector,
                    final_report,
                    user_id=current_user.id if current_user else None,
                )
                saved_path = result.path
                saved_url = result.url
            except Exception as exc:
                logger.warning("Report persistence failed (%s); continuing without saved copy", exc)

        timestamp = datetime.now().isoformat()
        
        # Build the cited-source list. Grounded research already numbers its
        # sources; we use that order as-is. Fallback path numbers DDG results.
        if grounded_sources:
            source_list = [
                AnalysisSource(
                    n=s["n"],
                    title=s["title"],
                    url=s["url"],
                    snippet=s.get("snippet"),
                )
                for s in grounded_sources
                if s.get("url")
            ]
        else:
            source_list = [
                AnalysisSource(
                    n=i + 1,
                    title=r.get("title") or r.get("url") or f"Source {i + 1}",
                    url=r.get("url") or "",
                    snippet=(r.get("body") or "")[:240] or None,
                )
                for i, r in enumerate(search_results)
                if r.get("url")
            ]

        # Cache the result (scoped to this user — see note above).
        AnalysisCache.set_analysis(validated_sector, {
            "report": final_report,
            "sources_analyzed": len(search_results),
            "sources": [s.model_dump() for s in source_list],
            "timestamp": timestamp,
        }, user_id=cache_user_id)
        
        # Save to database if user is authenticated
        analysis_id = None
        if current_user:
            analysis = AnalysisCRUD.create_analysis(
                db,
                user_id=current_user.id,
                sector=validated_sector,
                report=final_report,
                sources_analyzed=len(search_results),
                saved_path=saved_path
            )
            analysis_id = analysis.id
            
            # Increment usage
            current_user.analysis_count_month += 1
            db.commit()
        
        logger.info(f"Analysis completed for sector: {validated_sector}")
        return AnalysisResponse(
            id=analysis_id,
            sector=validated_sector,
            report=final_report,
            sources_analyzed=len(search_results),
            sources=source_list,
            saved_to=saved_path,
            saved_url=saved_url,
            timestamp=timestamp,
            cached=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing sector {sector}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


# Legacy analyze endpoint for backward compatibility
@app.get("/analyze/{sector}", response_model=AnalysisResponse, tags=["Analysis"], include_in_schema=False)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def analyze_sector_legacy(
    request: Request,
    sector: str,
    save_report: bool = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session)
):
    """Legacy endpoint - use /api/v1/analyze/{sector} instead."""
    return await analyze_sector(request, sector, save_report, True, current_user, db)


@app.get("/api/v1/history", response_model=AnalysisHistoryResponse, tags=["Analysis"])
async def get_analysis_history(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get user's analysis history with pagination."""
    offset = (page - 1) * per_page
    analyses = AnalysisCRUD.get_user_analyses(db, current_user.id, limit=per_page, offset=offset)
    total = AnalysisCRUD.count_user_analyses(db, current_user.id)
    
    return AnalysisHistoryResponse(
        items=[AnalysisHistoryItem(
            id=a.id,
            sector=a.sector,
            sources_analyzed=a.sources_analyzed,
            created_at=a.created_at
        ) for a in analyses],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page
    )


@app.get("/api/v1/history/{analysis_id}", response_model=AnalysisResponse, tags=["Analysis"])
async def get_analysis_by_id(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get a specific analysis by ID."""
    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return AnalysisResponse(
        id=analysis.id,
        sector=analysis.sector,
        report=analysis.report,
        sources_analyzed=analysis.sources_analyzed,
        saved_to=analysis.saved_path,
        timestamp=analysis.created_at.isoformat(),
        cached=False
    )


@app.delete("/api/v1/history/{analysis_id}", tags=["Analysis"])
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Delete an analysis from history."""
    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    AnalysisCRUD.delete_analysis(db, analysis)
    return {"message": "Analysis deleted successfully"}


# ==================== Favorites Endpoints ====================

@app.get("/api/v1/favorites", response_model=FavoritesListResponse, tags=["Favorites"])
async def get_favorites(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get user's favorite sectors."""
    favorites = FavoriteCRUD.get_user_favorites(db, current_user.id)
    return FavoritesListResponse(favorites=favorites, count=len(favorites))


@app.post("/api/v1/favorites", tags=["Favorites"])
async def add_favorite(
    favorite_data: FavoriteAdd,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Add a sector to favorites."""
    FavoriteCRUD.add_favorite(db, current_user.id, favorite_data.sector)
    return {"message": f"Added {favorite_data.sector} to favorites"}


@app.delete("/api/v1/favorites/{sector}", tags=["Favorites"])
async def remove_favorite(
    sector: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Remove a sector from favorites."""
    removed = FavoriteCRUD.remove_favorite(db, current_user.id, sector)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sector not in favorites"
        )
    return {"message": f"Removed {sector} from favorites"}


# ==================== Multi-sector Compare (§4.5) ====================

@app.post("/api/v1/analyze/compare", response_model=CompareResponse, tags=["Analysis"])
@limiter.limit("10/minute")
async def compare_sectors_endpoint(
    request: Request,
    payload: CompareRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """Rank 2-5 sectors on opportunity / risk / capital / time-to-ROI axes."""
    # Guests only get to compare the two free sectors.
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
    return CompareResponse(**result)


# ==================== Export Endpoints (§3.3 / §4.4) ====================

@app.get("/api/v1/history/{analysis_id}/export", tags=["Analysis"])
@limiter.limit("20/minute")
async def export_analysis_by_id(
    request: Request,
    analysis_id: int,
    format: str = Query("pdf", description="pdf | xlsx | pptx | md"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    """Export a previously-saved analysis in the requested format."""
    from fastapi.responses import Response

    analysis = AnalysisCRUD.get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    fmt = format.lower().strip()
    if fmt not in CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{format}'. Use one of: {', '.join(CONTENT_TYPES)}",
        )

    # Gate PPTX behind paid tiers — it's the consultant killer feature.
    if fmt == "pptx" and (current_user.tier or "free").lower() == "free":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="PPTX export is a Pro feature. Upgrade to export decks.",
        )

    # We don't persist the source list on disk, so reconstruct what we can from
    # the cached version (if it's still warm). Otherwise export without sources.
    # Cache is scoped per-user — see AnalysisCache docstring.
    cached = AnalysisCache.get_analysis(analysis.sector, user_id=current_user.id) or {}
    sources = cached.get("sources") or []

    payload = export_analysis(
        fmt=fmt,
        report=analysis.report,
        sector=analysis.sector,
        sources_analyzed=analysis.sources_analyzed,
        generated_at=analysis.created_at,
        sources=sources,
    )

    safe_sector = re.sub(r"[^a-zA-Z0-9_-]+", "_", analysis.sector).strip("_").lower() or "report"
    filename = f"{safe_sector}_{analysis.created_at.strftime('%Y%m%d')}.{fmt}"

    return Response(
        content=payload,
        media_type=CONTENT_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==================== Market Data Endpoints (§4.1) ====================

@app.get("/api/v1/sectors/{sector}/market-data", tags=["Market Data"])
@limiter.limit("30/minute")
async def get_market_data(request: Request, sector: str):
    """Live sector index snapshot + 12-month trend for the /results charts."""
    return get_sector_market_data(sector)


@app.get("/api/v1/sectors/{sector}/relative-strength", tags=["Market Data"])
@limiter.limit("30/minute")
async def get_relative_strength(request: Request, sector: str):
    """
    Sector index vs Nifty 50 over the last 6 months, normalised to 100 at the
    start so both series can share a single axis on the frontend.
    """
    return get_sector_relative_strength(sector)


@app.get("/api/v1/sectors/correlations", tags=["Market Data"])
@limiter.limit("10/minute")
async def get_correlations(request: Request):
    """90-day pairwise correlation across all mapped NSE sector indices."""
    return get_sector_correlation_matrix()


@app.get("/api/v1/sectors/{sector}/news", tags=["Market Data"])
@limiter.limit("30/minute")
async def get_sector_news(
    request: Request,
    sector: str,
    limit: int = Query(10, ge=1, le=25, description="Max articles to return")
):
    """Recent news items scored with VADER sentiment."""
    items = data_collector.search_news_articles(sector, max_results=limit)
    return {
        "sector": sector,
        "count": len(items),
        "items": items,
    }


# ==================== Sectors Info Endpoints ====================

@app.get("/api/v1/sectors", tags=["Info"])
async def get_available_sectors():
    """Get list of popular sectors available for analysis."""
    sectors = [
        {"name": "Technology", "icon": "💻", "description": "IT, Software, Hardware"},
        {"name": "Pharmaceuticals", "icon": "💊", "description": "Drugs, Healthcare products"},
        {"name": "Healthcare", "icon": "🏥", "description": "Hospitals, Medical services"},
        {"name": "Fintech", "icon": "💳", "description": "Digital payments, Banking tech"},
        {"name": "E-commerce", "icon": "🛒", "description": "Online retail, Marketplaces"},
        {"name": "Renewable Energy", "icon": "☀️", "description": "Solar, Wind, Clean tech"},
        {"name": "Agriculture", "icon": "🌾", "description": "Farming, Agri-tech"},
        {"name": "Automotive", "icon": "🚗", "description": "Vehicles, Auto parts"},
        {"name": "Manufacturing", "icon": "🏭", "description": "Industrial production"},
        {"name": "Textile", "icon": "👔", "description": "Clothing, Fabrics"},
        {"name": "Real Estate", "icon": "🏢", "description": "Property, Construction"},
        {"name": "Banking", "icon": "🏦", "description": "Financial services"},
        {"name": "Insurance", "icon": "🛡️", "description": "Life, Health, General"},
        {"name": "Telecom", "icon": "📱", "description": "Communications, 5G"},
        {"name": "Media", "icon": "📺", "description": "Entertainment, Broadcasting"},
        {"name": "Education", "icon": "📚", "description": "EdTech, Training"},
        {"name": "Food Processing", "icon": "🍽️", "description": "Food products, FMCG"},
        {"name": "Chemicals", "icon": "🧪", "description": "Industrial chemicals"},
        {"name": "Metals & Mining", "icon": "⛏️", "description": "Steel, Mining"},
        {"name": "Infrastructure", "icon": "🏗️", "description": "Roads, Ports, Railways"},
    ]
    return {"sectors": sectors, "count": len(sectors)}


# ==================== Watchlists + Alerts (Sprint 3) ====================

# Tier-based slot limits for watchlists. Matches the pricing page.
WATCHLIST_SLOTS = {"free": 1, "pro": 20, "enterprise": 999999}


def _watchlist_slot_limit(user: User) -> int:
    tier = (user.tier or "free").lower()
    return WATCHLIST_SLOTS.get(tier, 1)


def _to_watchlist_item(wl: Watchlist) -> WatchlistItem:
    return WatchlistItem(
        id=wl.id,
        sector=wl.sector,
        cadence=wl.cadence,
        channels=[c.strip() for c in (wl.channels or "").split(",") if c.strip()],
        is_active=wl.is_active,
        last_run_at=wl.last_run_at,
        next_run_at=wl.next_run_at,
        created_at=wl.created_at,
    )


def _to_alert_item(ev: AlertEvent) -> AlertItem:
    try:
        confidence = float(ev.confidence)
    except (TypeError, ValueError):
        confidence = 0.0
    return AlertItem(
        id=ev.id,
        sector=ev.sector,
        headline=ev.headline,
        direction=ev.direction,
        confidence=confidence,
        summary=ev.summary,
        analysis_id=ev.analysis_id,
        triggered_at=ev.triggered_at,
        acknowledged_at=ev.acknowledged_at,
    )


@app.get("/api/v1/watchlists", response_model=WatchlistsResponse, tags=["Watchlists"])
async def list_watchlists(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    items = WatchlistCRUD.for_user(db, current_user.id)
    limit = _watchlist_slot_limit(current_user)
    used = WatchlistCRUD.count_active(db, current_user.id)
    return WatchlistsResponse(
        items=[_to_watchlist_item(w) for w in items],
        count=len(items),
        slot_limit=limit,
        slots_used=used,
    )


@app.post("/api/v1/watchlists", response_model=WatchlistItem, tags=["Watchlists"])
async def create_watchlist(
    payload: WatchlistCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    import re

    # Sanitise sector name the same way analyze_sector does.
    sector = re.sub(r"[^a-zA-Z0-9\s\-]", "", payload.sector).strip()
    if len(sector) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sector name")

    # Enforce tier-based slot limit.
    limit = _watchlist_slot_limit(current_user)
    used = WatchlistCRUD.count_active(db, current_user.id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Watchlist slot limit reached for your tier ({used}/{limit}). Upgrade to add more.",
        )

    # Guard against duplicates per user.
    for existing in WatchlistCRUD.for_user(db, current_user.id):
        if existing.sector.lower() == sector.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"'{sector}' is already on your watchlist.",
            )

    wl = WatchlistCRUD.create(
        db,
        user_id=current_user.id,
        sector=sector,
        cadence=payload.cadence,
        channels=",".join(payload.channels),
    )
    return _to_watchlist_item(wl)


@app.delete("/api/v1/watchlists/{watchlist_id}", tags=["Watchlists"])
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


@app.get("/api/v1/alerts", response_model=AlertsResponse, tags=["Alerts"])
async def list_alerts(
    include_seen: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session),
):
    items = AlertCRUD.for_user(db, current_user.id, include_seen=include_seen, limit=limit)
    unread = AlertCRUD.unread_count(db, current_user.id)
    return AlertsResponse(items=[_to_alert_item(e) for e in items], unread=unread)


@app.post("/api/v1/alerts/{alert_id}/acknowledge", response_model=AlertItem, tags=["Alerts"])
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


# ==================== Contact / Sales Endpoints ====================

@app.post("/api/v1/contact", response_model=ContactResponse, tags=["Contact"])
@limiter.limit("5/minute")
async def submit_contact(
    request: Request,
    payload: ContactRequest,
    db: Session = Depends(get_db_session)
):
    """Accept a contact / sales inquiry from the landing or pricing page."""
    entry = ContactCRUD.create(
        db,
        name=payload.name,
        email=payload.email,
        message=payload.message,
        company=payload.company,
        plan_interest=payload.plan_interest,
    )
    logger.info(f"Contact message received from {payload.email} (id={entry.id})")
    return ContactResponse(id=entry.id)


# ==================== Cache Management Endpoints ====================

@app.get("/api/v1/cache/stats", tags=["Admin"])
async def get_cache_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get cache statistics (requires authentication)."""
    cache = get_cache()
    return cache.get_stats()


@app.delete("/api/v1/cache/clear", tags=["Admin"])
async def clear_cache(
    current_user: User = Depends(get_current_active_user)
):
    """Clear analysis cache (requires authentication)."""
    AnalysisCache.invalidate_all()
    return {"message": "Cache cleared successfully"}


# ==================== Run Application ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

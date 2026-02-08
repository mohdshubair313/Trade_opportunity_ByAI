"""
Trade Opportunities API - Production Ready Backend
Version 2.0.0

A comprehensive API for analyzing market data and providing trade opportunity insights
for Indian sectors, powered by Google Gemini AI.
"""
import logging
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
from app.database import get_db_session, init_db, UserCRUD, AnalysisCRUD, FavoriteCRUD, User
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
    AnalysisRequest, AnalysisResponse, AnalysisHistoryResponse, AnalysisHistoryItem,
    FavoriteAdd, FavoritesListResponse,
    HealthResponse, APIInfoResponse, ErrorResponse, UserStats
)
from app.rate_limiter import limiter, rate_limit_exceeded_handler
from app.cache import get_cache, AnalysisCache
from app.data_collector import DataCollector
from app.ai_analyzer import AIAnalyzer
from app.report_generator import ReportGenerator

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
for Indian sectors, powered by Google Gemini AI.

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    total_analyses = len(AnalysisCRUD.get_user_analyses(db, current_user.id, limit=1000))
    
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
    
    # Check cache first
    if use_cache:
        cached_result = AnalysisCache.get_analysis(validated_sector)
        if cached_result:
            logger.info(f"Cache hit for sector: {validated_sector}")
            return AnalysisResponse(
                sector=validated_sector,
                report=cached_result["report"],
                sources_analyzed=cached_result["sources_analyzed"],
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

        # Step 1: Collect market data
        logger.info(f"Collecting market data for {validated_sector}...")
        search_results = data_collector.search_sector_news(validated_sector, max_results=settings.max_search_results)
        
        if not search_results:
            logger.warning(f"No market data found from search for {validated_sector}. Proceeding with AI internal knowledge.")
            formatted_data = f"Note: Real-time search data was unavailable. The following analysis is based on general market knowledge for the {validated_sector} sector and may not reflect the absolute latest news.\n\n"
        else:
            formatted_data = data_collector.format_search_results(search_results)
        
        # Step 2: AI Analysis
        logger.info(f"Analyzing data with AI for {validated_sector}...")
        analysis_report = ai_analyzer.analyze_sector(validated_sector, formatted_data)
        
        # Step 3: Add metadata
        final_report = report_generator.add_metadata(
            analysis_report, 
            validated_sector, 
            len(search_results)
        )
        
        # Step 4: Save report if requested
        saved_path = None
        if save_report:
            saved_path = report_generator.save_report(validated_sector, final_report)
        
        timestamp = datetime.now().isoformat()
        
        # Cache the result
        AnalysisCache.set_analysis(validated_sector, {
            "report": final_report,
            "sources_analyzed": len(search_results),
            "timestamp": timestamp
        })
        
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
            saved_to=saved_path,
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
    total = len(AnalysisCRUD.get_user_analyses(db, current_user.id, limit=10000))
    
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

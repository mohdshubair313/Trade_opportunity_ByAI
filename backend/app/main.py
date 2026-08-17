"""
Trade Opportunities API - Production Ready Backend
Version 2.0.0

A comprehensive API for analyzing market data and providing trade opportunity insights
for Indian sectors, powered by agentic AI.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv, find_dotenv

# Load environment variables (auto-discovers .env in current or parent directories)
load_dotenv(find_dotenv(usecwd=True))

from app.core.config import get_settings
from app.database import get_db_session, init_db
from app.core.auth import seed_demo_user
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.api import all_routers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logging.getLogger("watchfiles.main").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Initialize settings
settings = get_settings()


# ==================== Application Lifespan ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting {settings.app_name} v{settings.version}")
    logger.info(f"Environment: {settings.environment}")

    # Initialize database
    init_db()

    # Seed demo user
    with next(get_db_session()) as db:
        seed_demo_user(db)

    logger.info("Application startup complete")

    yield

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
    """,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# ==================== Middleware ====================

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-AI-Provider", "X-AI-Model", "X-Cache-Hit", "X-Latency-Ms", "X-Char-Count"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Security headers middleware."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# ==================== Exception Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "message": str(exc.detail),
            "code": f"HTTP_{exc.status_code}",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler — never leak internal details to clients."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "code": "INTERNAL_ERROR",
        },
    )


# ==================== Register Routers ====================

for router in all_routers:
    app.include_router(router)


# ==================== Run Application ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )

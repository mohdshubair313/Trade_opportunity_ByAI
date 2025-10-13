import logging
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from slowapi.errors import RateLimitExceeded
import re
from dotenv import load_dotenv
import os

load_dotenv()  # loads environment variables from .env to os.environ

print(os.getenv("GEMINI_API_KEY")) 

from app.config import get_settings
from app.auth import (
    authenticate_user, 
    create_access_token, 
    get_current_user_optional
)
from app.rate_limiter import limiter
from app.rate_limiter import rate_limit_exceeded_handler
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

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="API for analyzing market data and providing trade opportunity insights for Indian sectors"
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Initialize components
data_collector = DataCollector()
ai_analyzer = AIAnalyzer()
report_generator = ReportGenerator()

# In-memory session tracking
sessions = {}


# Pydantic Models
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class Token(BaseModel):
    access_token: str
    token_type: str


class AnalysisResponse(BaseModel):
    sector: str
    report: str
    sources_analyzed: int
    saved_to: Optional[str] = None
    timestamp: str


class ErrorResponse(BaseModel):
    error: str
    message: str


# Input validation
def validate_sector_name(sector: str) -> str:
    """Validate and sanitize sector name."""
    if not sector or len(sector.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name cannot be empty"
        )
    
    # Remove special characters except spaces and hyphens
    cleaned_sector = re.sub(r'[^a-zA-Z0-9\s\-]', '', sector)
    
    if len(cleaned_sector) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name must be at least 3 characters long"
        )
    
    if len(cleaned_sector) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector name too long (max 100 characters)"
        )
    
    return cleaned_sector.strip()


# Routes
@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "message": "Welcome to Trade Opportunities API",
        "version": settings.version,
        "endpoints": {
            "login": "/login",
            "analyze": "/analyze/{sector}",
            "health": "/health"
        }
    }


@app.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, login_data: LoginRequest):
    """
    Authenticate and get access token.
    
    Demo credentials:
    - username: demo_user
    - password: demo_password
    """
    user = authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    logger.info(f"User {login_data.username} logged in successfully")
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/analyze/{sector}", response_model=AnalysisResponse)
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def analyze_sector(
    request: Request,
    sector: str,
    save_report: bool = False,
    current_user: dict = Depends(get_current_user_optional)
):
    """
    Analyze a sector and generate trade opportunity report.
    
    Args:
        sector: Name of the sector (e.g., "pharmaceuticals", "technology", "agriculture")
        save_report: Whether to save the report as a markdown file (default: False)
    
    Returns:
        Structured markdown report with trade opportunities
    
    Example sectors:
    - pharmaceuticals
    - technology
    - agriculture
    - textile
    - automotive
    - renewable energy
    """
    try:
        # Validate sector name
        validated_sector = validate_sector_name(sector)
        
        # Track session
        username = current_user.get("username", "guest")
        if username not in sessions:
            sessions[username] = {"requests": 0}
        sessions[username]["requests"] += 1
        
        logger.info(f"Analyzing sector '{validated_sector}' for user '{username}'")
        
        # Step 1: Collect market data
        logger.info(f"Collecting market data for {validated_sector}...")
        search_results = data_collector.search_sector_news(validated_sector, max_results=10)
        
        if not search_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No market data found for sector: {validated_sector}"
            )
        
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
        
        from datetime import datetime
        
        logger.info(f"Analysis completed for sector: {validated_sector}")
        return AnalysisResponse(
            sector=validated_sector,
            report=final_report,
            sources_analyzed=len(search_results),
            saved_to=saved_path,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing sector {sector}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.version
    }


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "message": str(exc.detail)}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

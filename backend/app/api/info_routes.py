"""Info routes — root, health, sectors list."""
from datetime import datetime
from fastapi import APIRouter

from app.core.config import get_settings
from app.core.cache import get_cache
from app.core.schemas import HealthResponse, APIInfoResponse

settings = get_settings()

router = APIRouter(tags=["Info"])


@router.get(
    "/",
    response_model=APIInfoResponse,
    operation_id="getApiInfo",
    summary="Get API information and available endpoints",
)
async def root():
    """Root endpoint - API information."""
    return APIInfoResponse(
        message=f"Welcome to {settings.app_name}",
        version=settings.version,
        environment=settings.environment,
        endpoints={
            "docs": "/docs",
            "health": "/health",
            "openapi": "/openapi.json",
            "auth": {"register": "/api/v1/auth/register", "login": "/api/v1/auth/login", "refresh": "/api/v1/auth/refresh"},
            "analysis": {"analyze": "/api/v1/analyze/{sector}", "history": "/api/v1/history", "favorites": "/api/v1/favorites"},
            "payments": {"create_order": "/api/v1/payments/create-order", "verify": "/api/v1/payments/verify", "webhook": "/api/v1/payments/razorpay-webhook"},
            "ai": {"vision": "/api/v1/ai/vision/analyze", "tts": "/api/v1/ai/tts", "stt": "/api/v1/ai/stt"},
            "voice": {"agent": "/api/v1/voice/agent", "query": "/api/v1/voice/query", "voices": "/api/v1/voice/voices", "cache_stats": "/api/v1/voice/cache/stats"},
            "user": {"profile": "/api/v1/users/me", "stats": "/api/v1/users/me/stats"},
        },
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    operation_id="healthCheck",
    summary="Health check with system status",
)
async def health_check():
    """Health check endpoint with system status."""
    cache = get_cache()
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.version,
        timestamp=datetime.now().isoformat(),
        database="connected",
        cache=cache.get_stats(),
    )


@router.get(
    "/api/v1/sectors",
    operation_id="listAvailableSectors",
    summary="List all sectors available for analysis",
)
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

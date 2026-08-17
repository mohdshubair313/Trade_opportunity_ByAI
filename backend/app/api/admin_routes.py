"""Admin routes — cache stats, cache clear."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import User
from app.core.auth import get_current_active_user
from app.core.cache import get_cache, AnalysisCache

router = APIRouter(prefix="/api/v1/cache", tags=["Admin"])


@router.get("/stats")
async def get_cache_stats(current_user: User = Depends(get_current_active_user)):
    """Get cache statistics (requires enterprise tier)."""
    if (current_user.tier or "free").lower() not in ("enterprise",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin endpoints require enterprise tier.",
        )
    cache = get_cache()
    return cache.get_stats()


@router.delete("/clear")
async def clear_cache(current_user: User = Depends(get_current_active_user)):
    """Clear analysis cache (requires enterprise tier)."""
    if (current_user.tier or "free").lower() not in ("enterprise",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin endpoints require enterprise tier.",
        )
    AnalysisCache.invalidate_all()
    return {"message": "Cache cleared successfully"}

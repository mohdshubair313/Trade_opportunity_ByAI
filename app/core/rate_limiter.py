from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging
import os

logger = logging.getLogger(__name__)

# Use Redis for production (multi-worker safe). Falls back to memory (single-worker only).
# Set REDIS_URL env var to enable Redis-backed rate limiting.
_redis_url = os.getenv("REDIS_URL")
if _redis_url:
    try:
        from slowapi.util import build_middleware
        import redis
    except ImportError:
        logger.warning("REDIS_URL is set but redis-py is not installed. Using in-memory rate limiter.")
        _redis_url = None

# Initialize limiter (uses Redis when REDIS_URL is present, in-memory otherwise)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/hour"],
    storage_uri=_redis_url if _redis_url else None,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom handler for rate limit exceeded errors."""
    logger.warning(f"Rate limit exceeded for IP: {get_remote_address(request)}")
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail
        }
    )

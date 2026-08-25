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
    """Custom handler for rate limit exceeded errors with RFC headers & resolution hints."""
    logger.warning(f"Rate limit exceeded for IP: {get_remote_address(request)}")
    return JSONResponse(
        status_code=429,
        headers={
            "Retry-After": "60",
            "RateLimit-Limit": "100",
            "RateLimit-Remaining": "0",
            "RateLimit-Reset": "60",
            "RateLimit-Policy": "100;w=60",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "60",
        },
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please throttle your calls.",
            "code": "RATE_LIMITED",
            "retry_after": 60,
            "hint": "Please wait for the duration specified in the Retry-After header before sending more requests, or upgrade to Pro for higher limits.",
        }
    )


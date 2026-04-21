"""
Caching module for Trade Opportunities API.
Implements in-memory caching with TTL support.
Can be extended to use Redis in production.
"""
import logging
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
from functools import wraps
from collections import OrderedDict
import threading

logger = logging.getLogger(__name__)


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL and LRU eviction.
    Used as fallback when Redis is not available.
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of items to store
            default_ttl: Default time-to-live in seconds
        """
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.RLock()
        logger.info(f"Initialized in-memory cache with max_size={max_size}, default_ttl={default_ttl}s")

    def _generate_key(self, *args, **kwargs) -> str:
        """Generate a cache key from arguments."""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()

    def _is_expired(self, item: Dict[str, Any]) -> bool:
        """Check if a cache item is expired."""
        return datetime.utcnow() > item["expires_at"]

    def _evict_expired(self):
        """Remove expired items from cache."""
        with self._lock:
            expired_keys = [
                key for key, item in self._cache.items()
                if self._is_expired(item)
            ]
            for key in expired_keys:
                del self._cache[key]

    def _evict_lru(self):
        """Remove least recently used items if cache is full."""
        with self._lock:
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)

    def get(self, key: str) -> Optional[Any]:
        """
        Get an item from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key not in self._cache:
                return None

            item = self._cache[key]
            if self._is_expired(item):
                del self._cache[key]
                return None

            # Move to end for LRU
            self._cache.move_to_end(key)
            return item["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Set an item in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not specified)
        """
        with self._lock:
            self._evict_expired()
            self._evict_lru()

            expires_at = datetime.utcnow() + timedelta(seconds=ttl or self._default_ttl)
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.utcnow()
            }
            self._cache.move_to_end(key)

    def delete(self, key: str) -> bool:
        """
        Delete an item from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if item was deleted, False if not found
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self):
        """Clear all items from cache."""
        with self._lock:
            self._cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            self._evict_expired()
            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "default_ttl": self._default_ttl
            }


# Global cache instance
_cache = InMemoryCache(max_size=500, default_ttl=600)  # 10 minute default TTL


def get_cache() -> InMemoryCache:
    """Get the global cache instance."""
    return _cache


def cache_key(*args, **kwargs) -> str:
    """Generate a cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()


def cached(ttl: int = 300, prefix: str = ""):
    """
    Decorator to cache function results.
    
    Args:
        ttl: Time-to-live in seconds
        prefix: Key prefix for namespacing
    
    Usage:
        @cached(ttl=600, prefix="analysis")
        async def analyze_sector(sector: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{prefix}:{func.__name__}:" + cache_key(*args, **kwargs)
            
            # Try to get from cache
            cached_value = _cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache hit for key: {key}")
                return cached_value
            
            # Call function and cache result
            logger.debug(f"Cache miss for key: {key}")
            result = await func(*args, **kwargs)
            _cache.set(key, result, ttl)
            return result
        
        return wrapper
    return decorator


def cached_sync(ttl: int = 300, prefix: str = ""):
    """
    Decorator to cache synchronous function results.
    
    Args:
        ttl: Time-to-live in seconds
        prefix: Key prefix for namespacing
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{prefix}:{func.__name__}:" + cache_key(*args, **kwargs)
            
            # Try to get from cache
            cached_value = _cache.get(key)
            if cached_value is not None:
                logger.debug(f"Cache hit for key: {key}")
                return cached_value
            
            # Call function and cache result
            logger.debug(f"Cache miss for key: {key}")
            result = func(*args, **kwargs)
            _cache.set(key, result, ttl)
            return result
        
        return wrapper
    return decorator


# Sector analysis specific cache
class AnalysisCache:
    """
    Specialized cache for sector analysis results.

    Cache keys are scoped to ``(sector, user_id)`` because reports are
    persona-framed — capital range, region, and risk appetite change the
    actual prose. Sharing a cache entry between users leaks another user's
    persona-framed content into the reader's dashboard. Guest requests (no
    user) share a single ``guest`` bucket, which is safe because guests are
    strictly capped to a fixed persona-less path.
    """

    CACHE_PREFIX = "sector_analysis"
    DEFAULT_TTL = 1800  # 30 minutes for analysis results

    @classmethod
    def _key(cls, sector: str, user_id: Optional[int]) -> str:
        bucket = f"u{user_id}" if user_id is not None else "guest"
        return f"{cls.CACHE_PREFIX}:{bucket}:{sector.lower().strip()}"

    @classmethod
    def get_analysis(cls, sector: str, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Get cached analysis for a sector + user."""
        return _cache.get(cls._key(sector, user_id))

    @classmethod
    def set_analysis(cls, sector: str, analysis: Dict[str, Any],
                     user_id: Optional[int] = None, ttl: int = None):
        """Cache analysis result for a sector + user."""
        key = cls._key(sector, user_id)
        _cache.set(key, analysis, ttl or cls.DEFAULT_TTL)
        logger.info("Cached analysis for sector=%s user=%s", sector, user_id or "guest")

    @classmethod
    def invalidate(cls, sector: str, user_id: Optional[int] = None):
        """Invalidate cached analysis for a sector + user."""
        _cache.delete(cls._key(sector, user_id))
        logger.info("Invalidated cache for sector=%s user=%s", sector, user_id or "guest")

    @classmethod
    def invalidate_all(cls):
        """Invalidate all cached analyses."""
        _cache.clear()
        logger.info("Cleared all analysis cache")


# Rate limiting cache
class RateLimitCache:
    """
    Cache for rate limiting tracking.
    """
    
    CACHE_PREFIX = "rate_limit"
    
    @classmethod
    def get_request_count(cls, identifier: str, window: str) -> int:
        """Get current request count for an identifier."""
        key = f"{cls.CACHE_PREFIX}:{identifier}:{window}"
        count = _cache.get(key)
        return count if count is not None else 0
    
    @classmethod
    def increment_request_count(cls, identifier: str, window: str, ttl: int = 60) -> int:
        """Increment request count and return new value."""
        key = f"{cls.CACHE_PREFIX}:{identifier}:{window}"
        current = cls.get_request_count(identifier, window)
        new_count = current + 1
        _cache.set(key, new_count, ttl)
        return new_count

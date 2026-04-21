"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # ==================== API Keys ====================
    gemini_api_key: str = ""
    
    # ==================== Security ====================
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # ==================== Rate Limiting ====================
    rate_limit_per_minute: int = 10
    rate_limit_per_hour: int = 100
    
    # ==================== Application ====================
    app_name: str = "Trade Opportunities API"
    version: str = "2.0.0"
    environment: str = "development"  # development, staging, production
    debug: bool = True
    
    # ==================== CORS ====================
    # Comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # ==================== Database ====================
    database_url: str = "sqlite:///./trade_opportunities.db"
    
    # ==================== Caching ====================
    cache_ttl_seconds: int = 600  # 10 minutes
    cache_max_size: int = 500
    
    # ==================== Analysis ====================
    max_search_results: int = 10
    analysis_cache_ttl: int = 1800  # 30 minutes
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        if not self.cors_origins:
            return []
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment.lower() == "development"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses LRU cache to avoid re-reading .env file on every call.
    """
    return Settings()


def get_environment_info() -> dict:
    """Get current environment information."""
    settings = get_settings()
    return {
        "environment": settings.environment,
        "version": settings.version,
        "debug": settings.debug,
        "is_production": settings.is_production
    }

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
    openrouter_api_key: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    
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
    public_app_url: str = "http://localhost:3000"
    
    # ==================== CORS ====================
    # Comma-separated list of allowed origins for production. Local dev origins
    # (http://localhost:3000, http://127.0.0.1:3000) are always included at
    # runtime so you can hit the deployed backend from your dev machine for
    # debugging without changing this value.
    cors_origins: str = ""
    # Optional regex matched against the request Origin. Use this to allow
    # Vercel preview URLs without listing every branch manually, e.g.:
    #   cors_origin_regex = r"https://tradeinsight-.*\.vercel\.app"
    cors_origin_regex: str = ""
    
    # ==================== Database ====================
    database_url: str = "sqlite:///./trade_opportunities.db"

    # ==================== Payments ====================
    razorpay_api_base_url: str = "https://api.razorpay.com/v1"
    razorpay_currency: str = "INR"
    razorpay_timeout_seconds: float = 15.0
    webhook_dead_letter_path: str = "./reports/failed_webhooks/razorpay_dead_letters.jsonl"

    # ==================== AI Multimodal ====================
    ai_vision_provider: str = "openrouter"
    ai_vision_max_bytes: int = 10 * 1024 * 1024
    openrouter_vision_model: str = "google/gemma-4-31b-it:free"
    openrouter_vision_fallback_models: str = "google/gemma-4-26b-a4b-it:free,baidu/qianfan-ocr-fast:free,openrouter/free"
    gemini_vision_model: str = "gemini-2.5-flash"
    openrouter_tts_model: str = "openai/gpt-4o-mini-tts-2025-12-15"
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    tts_default_voice: str = "nova"
    tts_default_format: str = "mp3"

    # ==================== Voice Agent ====================
    # Disk + memory TTS cache. Repeated phrases ("hello", "let me check that
    # for you") get re-synthesised every time without this — pure waste.
    voice_cache_enabled: bool = True
    voice_cache_dir: str = "./reports/voice_cache"
    voice_cache_ttl_seconds: int = 60 * 60 * 24 * 30  # 30 days on disk
    voice_cache_max_entries: int = 2000
    # Hard upper bound for synthesized text. Voice agents that ramble are
    # expensive — every extra token compounds into more TTS audio. Tuned to
    # fit a 60-90s briefing comfortably.
    voice_response_max_chars: int = 1500
    # Silence detector — RMS energy threshold (0..1) and minimum voice frames
    # to count as a real utterance. Empty audio is rejected before STT runs.
    voice_vad_rms_threshold: float = 0.012
    voice_vad_min_voice_ms: int = 240
    voice_vad_pad_ms: int = 160
    # Regional arbitrage — pick fastest healthy provider per request. The
    # router keeps a rolling average and degrades providers that 4xx/5xx.
    voice_arbitrage_enabled: bool = True
    # Speech-to-text — Gemini multimodal handles audio natively without an
    # extra provider. Override to "openrouter" if you wire a Whisper-style
    # endpoint later.
    stt_provider: str = "gemini"
    stt_model: str = "gemini-2.5-flash"
    stt_max_bytes: int = 20 * 1024 * 1024
    # Voice agent system prompt is sent on every conversational turn. Static
    # prefix → eligible for upstream prompt caching (Anthropic, OpenAI > 1024
    # tokens, Gemini cached_content). Keeping this in config means it's the
    # cache key, not buried in code.
    voice_agent_system_prompt: str = (
        "You are TradeInsight Voice — a calm, premium AI market operator for "
        "Indian equity sectors. Reply in spoken English suitable for text-to-"
        "speech: short sentences, no markdown, no bullet points, no lists, "
        "no emoji. Keep replies under 90 seconds when read aloud (roughly 220 "
        "words). When you don't know something, say so plainly. Never invent "
        "prices, tickers, or news. End every reply with the single most "
        "important next move for the listener."
    )

    # ==================== Caching ====================
    cache_ttl_seconds: int = 600  # 10 minutes
    cache_max_size: int = 500
    
    # ==================== Analysis ====================
    max_search_results: int = 10
    analysis_cache_ttl: int = 1800  # 30 minutes
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from the comma-separated env value.

        Normalises each entry so small mistakes in Render's dashboard don't
        break auth: strips whitespace, strips a single trailing slash, and
        lowercases the scheme+host (origin matching is case-insensitive in
        HTTP, but Starlette does a raw string compare). Local dev origins are
        always appended so you can hit the deployed backend from `npm run
        dev` without editing the env var.
        """
        raw_entries = [e.strip() for e in (self.cors_origins or "").split(",")]
        normalised: List[str] = []
        for entry in raw_entries:
            if not entry:
                continue
            # Drop a single trailing slash — "https://x.com/" and "https://x.com"
            # should match the same browser origin.
            if entry.endswith("/"):
                entry = entry[:-1]
            normalised.append(entry)

        # Always allow local dev — makes debugging the live backend trivial.
        for dev_origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
            if dev_origin not in normalised:
                normalised.append(dev_origin)

        return normalised
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment.lower() == "development"

    @property
    def openrouter_vision_models(self) -> List[str]:
        """Parse the configured OpenRouter multimodal model chain."""
        models = [self.openrouter_vision_model]
        models.extend(
            model.strip()
            for model in self.openrouter_vision_fallback_models.split(",")
            if model.strip()
        )
        deduped: List[str] = []
        for model in models:
            if model not in deduped:
                deduped.append(model)
        return deduped
    
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

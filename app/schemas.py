"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, validator
import re


# ==================== Authentication Schemas ====================

class UserCreate(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username must be alphanumeric with underscores only')
        return v.lower()
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


PERSONA_VALUES = {"investor", "exporter", "sme_owner", "student", "consultant"}
CAPITAL_VALUES = {"under_5L", "5L_50L", "50L_5Cr", "5Cr_plus"}
RISK_VALUES = {"low", "medium", "high"}


class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)."""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_premium: bool
    tier: str
    analysis_count_month: int
    persona: Optional[str] = None
    capital_range: Optional[str] = None
    region: Optional[str] = None
    risk_appetite: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    persona: Optional[str] = Field(None, description=" | ".join(sorted(PERSONA_VALUES)))
    capital_range: Optional[str] = Field(None, description=" | ".join(sorted(CAPITAL_VALUES)))
    region: Optional[str] = Field(None, max_length=64)
    risk_appetite: Optional[str] = Field(None, description=" | ".join(sorted(RISK_VALUES)))

    @validator("persona")
    def _valid_persona(cls, v):
        if v is None or v == "":
            return None
        if v not in PERSONA_VALUES:
            raise ValueError(f"persona must be one of {sorted(PERSONA_VALUES)}")
        return v

    @validator("capital_range")
    def _valid_capital(cls, v):
        if v is None or v == "":
            return None
        if v not in CAPITAL_VALUES:
            raise ValueError(f"capital_range must be one of {sorted(CAPITAL_VALUES)}")
        return v

    @validator("risk_appetite")
    def _valid_risk(cls, v):
        if v is None or v == "":
            return None
        if v not in RISK_VALUES:
            raise ValueError(f"risk_appetite must be one of {sorted(RISK_VALUES)}")
        return v


class PasswordChange(BaseModel):
    """Schema for password change."""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


# ==================== Token Schemas ====================

class Token(BaseModel):
    """Schema for access token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Token expiry time in seconds")


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class TokenData(BaseModel):
    """Schema for decoded token data."""
    username: Optional[str] = None
    user_id: Optional[int] = None


# ==================== Analysis Schemas ====================

class AnalysisRequest(BaseModel):
    """Schema for analysis request."""
    sector: str = Field(..., min_length=2, max_length=100, description="Sector to analyze")
    save_report: bool = Field(default=False, description="Whether to save report to file")
    use_cache: bool = Field(default=True, description="Whether to use cached results if available")


class AnalysisSource(BaseModel):
    """A single cited source used to build an analysis report."""
    n: int = Field(..., description="1-indexed citation number, matches [N] in the report body")
    title: str
    url: str
    snippet: Optional[str] = None


class AnalysisResponse(BaseModel):
    """Schema for analysis response."""
    id: Optional[int] = None
    sector: str
    report: str
    sources_analyzed: int
    sources: List[AnalysisSource] = Field(default_factory=list)
    saved_to: Optional[str] = None
    timestamp: str
    cached: bool = False

    class Config:
        from_attributes = True


class AnalysisHistoryItem(BaseModel):
    """Schema for analysis history item."""
    id: int
    sector: str
    sources_analyzed: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AnalysisHistoryResponse(BaseModel):
    """Schema for paginated analysis history."""
    items: List[AnalysisHistoryItem]
    total: int
    page: int
    per_page: int
    pages: int


# ==================== Favorites Schemas ====================

class FavoriteAdd(BaseModel):
    """Schema for adding a favorite sector."""
    sector: str = Field(..., min_length=2, max_length=100)


class FavoriteResponse(BaseModel):
    """Schema for favorite sector response."""
    sector: str
    added_at: datetime
    
    class Config:
        from_attributes = True


class FavoritesListResponse(BaseModel):
    """Schema for list of favorites."""
    favorites: List[str]
    count: int


# ==================== Health & Info Schemas ====================

class HealthResponse(BaseModel):
    """Schema for health check response."""
    status: str
    service: str
    version: str
    timestamp: str
    database: str
    cache: dict


class APIInfoResponse(BaseModel):
    """Schema for API info response."""
    message: str
    version: str
    environment: str
    endpoints: dict


# ==================== Compare Schemas (§4.5) ====================

class CompareRequest(BaseModel):
    """Request to compare 2-5 sectors side by side."""
    sectors: List[str] = Field(..., min_length=2, max_length=5)


class CompareSectorScore(BaseModel):
    sector: str
    opportunity_score: float = Field(..., ge=0, le=100)
    risk_score: float = Field(..., ge=0, le=100)
    capital_required: str  # "low" | "medium" | "high"
    time_to_roi: str  # "short" | "medium" | "long"
    sentiment_score: float  # -1.0 .. 1.0 from news corpus
    top_opportunity: str
    top_risk: str


class CompareResponse(BaseModel):
    winner: str = Field(..., description="Sector with the best opportunity/risk ratio")
    headline: str
    scores: List[CompareSectorScore]
    generated_at: str


# ==================== Watchlist / Alert Schemas (Sprint 3) ====================

ALLOWED_CADENCES = {"hourly", "daily", "weekly"}
ALLOWED_CHANNELS = {"in_app", "email"}


class WatchlistCreate(BaseModel):
    sector: str = Field(..., min_length=2, max_length=100)
    cadence: str = Field("daily", description="hourly | daily | weekly")
    channels: List[str] = Field(default_factory=lambda: ["in_app"])

    @validator("cadence")
    def _valid_cadence(cls, v):
        v = v.lower()
        if v not in ALLOWED_CADENCES:
            raise ValueError(f"cadence must be one of {sorted(ALLOWED_CADENCES)}")
        return v

    @validator("channels")
    def _valid_channels(cls, v):
        if not v:
            raise ValueError("at least one channel is required")
        bad = [c for c in v if c not in ALLOWED_CHANNELS]
        if bad:
            raise ValueError(f"unknown channel(s): {bad}")
        return v


class WatchlistItem(BaseModel):
    id: int
    sector: str
    cadence: str
    channels: List[str]
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WatchlistsResponse(BaseModel):
    items: List[WatchlistItem]
    count: int
    slot_limit: int
    slots_used: int


class AlertItem(BaseModel):
    id: int
    sector: str
    headline: str
    direction: str
    confidence: float
    summary: Optional[str]
    analysis_id: Optional[int]
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertsResponse(BaseModel):
    items: List[AlertItem]
    unread: int


# ==================== Contact Schemas ====================

class ContactRequest(BaseModel):
    """Schema for a contact / sales inquiry submission."""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    company: Optional[str] = Field(None, max_length=150)
    plan_interest: Optional[str] = Field(None, max_length=50, description="free | pro | enterprise")
    message: str = Field(..., min_length=10, max_length=2000)


class ContactResponse(BaseModel):
    """Response after accepting a contact submission."""
    id: int
    message: str = "Thanks — we'll be in touch within one business day."


# ==================== Error Schemas ====================

class ErrorResponse(BaseModel):
    """Schema for error response."""
    error: str
    message: str
    code: Optional[str] = None
    details: Optional[dict] = None


class ValidationErrorResponse(BaseModel):
    """Schema for validation error response."""
    error: str = "Validation Error"
    message: str
    details: List[dict]


# ==================== Stats Schemas ====================

class UserStats(BaseModel):
    """Schema for user statistics."""
    total_analyses: int
    favorite_sectors: int
    last_analysis: Optional[datetime]
    member_since: datetime
    is_premium: bool


class SectorStats(BaseModel):
    """Schema for sector statistics."""
    sector: str
    analysis_count: int
    last_analyzed: Optional[datetime]
    avg_sources: float


class GlobalStats(BaseModel):
    """Schema for global API statistics."""
    total_users: int
    total_analyses: int
    popular_sectors: List[dict]
    api_version: str

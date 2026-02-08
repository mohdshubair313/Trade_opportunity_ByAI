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
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None


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


class AnalysisResponse(BaseModel):
    """Schema for analysis response."""
    id: Optional[int] = None
    sector: str
    report: str
    sources_analyzed: int
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

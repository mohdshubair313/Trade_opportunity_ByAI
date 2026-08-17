"""Unit tests for Pydantic request/response schemas."""
import pytest
from pydantic import ValidationError
from app.core.schemas import (
    UserCreate, UserLogin, UserUpdate, PasswordChange,
    AnalysisRequest, CompareRequest, ContactRequest,
    WatchlistCreate,
)


def test_user_create_validation():
    """Test valid and invalid user registration schemas."""
    # Valid
    user = UserCreate(username="validuser", email="test@example.com", password="Password@123", full_name="Valid User")
    assert user.username == "validuser"
    assert user.email == "test@example.com"

    # Short password
    with pytest.raises(ValidationError):
        UserCreate(username="validuser", email="test@example.com", password="123")

    # Invalid email
    with pytest.raises(ValidationError):
        UserCreate(username="validuser", email="not-an-email", password="Password@123")


def test_user_login_validation():
    """Test login schema."""
    login = UserLogin(username="testuser", password="Password@123")
    assert login.username == "testuser"


def test_compare_request_validation():
    """Test multi-sector compare payload validation."""
    compare = CompareRequest(sectors=["Technology", "Pharmaceuticals"])
    assert len(compare.sectors) == 2

    # Empty list should raise ValidationError
    with pytest.raises(ValidationError):
        CompareRequest(sectors=[])


def test_contact_request_validation():
    """Test contact form schema."""
    req = ContactRequest(name="John Doe", email="john@example.com", message="Interested in Enterprise plan")
    assert req.name == "John Doe"
    assert req.email == "john@example.com"


def test_watchlist_create_validation():
    """Test watchlist create schema."""
    wl = WatchlistCreate(sector="Technology", cadence="daily", channels=["in_app", "email"])
    assert wl.sector == "Technology"
    assert wl.cadence == "daily"
    assert "in_app" in wl.channels

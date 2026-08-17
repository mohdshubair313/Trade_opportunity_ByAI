"""Unit tests for authentication and security functions."""
import pytest
from app.core.auth import (
    get_password_hash, verify_password,
    create_access_token, verify_token,
)


def test_password_hashing():
    """Verify password hashing and verification."""
    password = "SuperSecretPassword@123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword@123", hashed) is False


def test_jwt_token_generation_and_decoding():
    """Verify JWT creation and decoding."""
    payload = {"sub": "testuser", "user_id": 42}
    access_token = create_access_token(payload)
    assert isinstance(access_token, str)

    decoded = verify_token(access_token)
    assert decoded is not None
    assert decoded["sub"] == "testuser"
    assert decoded["user_id"] == 42
    assert decoded["type"] == "access"


def test_invalid_token_returns_none():
    """Verify corrupted token returns None."""
    assert verify_token("invalid.token.payload") is None

"""Integration tests for authentication endpoints."""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.crud import OTPCrud


def test_register_and_login_flow(client: TestClient, db: Session):
    """Test complete user registration with OTP verification and login flow."""
    email = "newtrader@example.com"
    
    # 1. Send OTP
    otp_res = client.post("/api/v1/auth/send-otp", json={"email": email})
    assert otp_res.status_code == 200

    # Retrieve generated OTP from DB for testing
    otp_record = OTPCrud.get_latest_otp(db, email)
    assert otp_record is not None
    otp_code = otp_record.code

    # 2. Verify OTP
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "email": email,
        "code": otp_code,
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["verified"] is True

    # 3. Register user
    reg_payload = {
        "username": "newtrader",
        "email": email,
        "password": "SecurePassword@123",
        "full_name": "New Trader",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    tokens = reg_res.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 4. Login with username
    login_res = client.post("/api/v1/auth/login", json={
        "username": "newtrader",
        "password": "SecurePassword@123",
    })
    assert login_res.status_code == 200
    login_tokens = login_res.json()
    assert "access_token" in login_tokens

    # 5. Login with email
    login_email_res = client.post("/api/v1/auth/login", json={
        "username": "newtrader@example.com",
        "password": "SecurePassword@123",
    })
    assert login_email_res.status_code == 200

    # 6. Refresh Token
    ref_res = client.post("/api/v1/auth/refresh", json={
        "refresh_token": login_tokens["refresh_token"]
    })
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()


def test_invalid_login_rejected(client: TestClient):
    """Test that wrong password returns 401."""
    res = client.post("/api/v1/auth/login", json={
        "username": "demo_user",
        "password": "WrongPassword@999",
    })
    assert res.status_code == 401

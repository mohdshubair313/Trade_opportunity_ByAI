# TradeInsight AI — Production Test Suite Configuration
"""
Centralised pytest configuration for the entire test suite.

Design Goals (readability-first for open-source contributors):
- A single ``pytest.ini`` controls everything — no scattered flags.
- ``conftest.py`` provides session-scoped fixtures for DB, auth, and HTTP client.
- ``pytest-asyncio`` mode is auto so coroutine tests don't need extra decorators.
- ``faker`` seeds are deterministic (``SEED=42``) so flaky tests are instantly
  obvious and reproducible.

Directory Layout::

    tests/
    ├── conftest.py              # pytest fixtures (DB, client, auth, tokens)
    ├── pytest.ini               # pytest configuration
    ├── unit/                    # isolated unit tests (no DB / no HTTP)
    │   ├── test_schemas.py
    │   ├── test_auth.py
    │   └── test_models_and_crud.py
    └── integration/             # tests that hit the real FastAPI app + SQLite
        ├── test_auth_endpoints.py
        ├── test_user_endpoints.py
        ├── test_info_endpoints.py
        ├── test_favorites_endpoints.py
        └── test_watchlist_alert_endpoints.py

Quick Start::

    # Run everything
    pytest

    # Run only unit tests (fast, no external services)
    pytest tests/unit

    # Run only integration tests (needs FastAPI app)
    pytest tests/integration

    # Run with coverage
    pytest --cov=app --cov-report=html --cov-report=term

    # Run a specific file
    pytest tests/integration/test_auth_endpoints.py -v

    # Debug a failing test (drop into pdb)
    pytest tests/integration/test_auth_endpoints.py::test_login_success -v --pdb
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timezone
import os
import sys

# Ensure backend/ and root are in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import Base, User, UserCRUD, get_db_session
from app.core.auth import get_password_hash

# ── Configuration ──────────────────────────────────────────────────────────

# Use an in-memory SQLite DB for tests so they are hermetic & fast.
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Session-Scoped Fixtures ────────────────────────────────────────────────

@pytest.fixture(scope="session")
def db_engine():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db(db_engine) -> Session:
    """
    Fresh database session per test function.
    Rolls back after each test → tests don't pollute each other.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    def override_get_db():
        try:
            yield session
        finally:
            pass  # session closed by test teardown

    app.dependency_overrides[get_db_session] = override_get_db

    yield session

    # Teardown
    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.pop(get_db_session, None)


@pytest.fixture(scope="function")
def client(db):
    """
    FastAPI TestClient with DB override.
    Each test gets a fresh HTTP client pointing at the in-memory DB.
    """
    with TestClient(app) as c:
        yield c


# ── Authentication Fixtures ───────────────────────────────────────────────

@pytest.fixture(scope="function")
def demo_user(db: Session):
    """Create and return the standard demo user."""
    user = UserCRUD.create_user(
        db,
        username="demo_user",
        email="demo@example.com",
        hashed_password=get_password_hash("Demo@123"),
        full_name="Demo User",
    )
    return user


@pytest.fixture(scope="function")
def auth_client(client: TestClient, demo_user):
    """
    Return an (client, token) tuple where the client is already authenticated.
    Usage in test::

        def test_protected_endpoint(auth_client):
            client, token = auth_client
            r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
    """
    r = client.post("/api/v1/auth/login", json={"username": "demo_user", "password": "Demo@123"})
    assert r.status_code == 200
    data = r.json()
    return client, data["access_token"]


@pytest.fixture(scope="function")
def premium_user(db: Session):
    """Create a user with Pro tier."""
    user = UserCRUD.create_user(
        db,
        username="premium_user",
        email="premium@example.com",
        hashed_password=get_password_hash("Premium@123"),
        full_name="Premium User",
    )
    user.tier = "pro"
    user.is_premium = True
    db.commit()
    return user


@pytest.fixture(scope="function")
def enterprise_user(db: Session):
    """Create a user with Enterprise tier."""
    user = UserCRUD.create_user(
        db,
        username="enterprise_user",
        email="enterprise@example.com",
        hashed_password=get_password_hash("Enterprise@123"),
        full_name="Enterprise User",
    )
    user.tier = "enterprise"
    user.is_premium = True
    db.commit()
    return user


# ── Monkeypatch Helpers ───────────────────────────────────────────────────

def monkeypatch_service(monkeypatch, module_path: str, attr: str, return_value):
    """
    Convenience wrapper to monkeypatch a service module attribute.

    Example::

        def test_mocked_analysis(client, monkeypatch):
            monkeypatch_service(monkeypatch, "app.services.ai_analyzer", "AIAnalyzer", MockAnalyzer)
    """
    monkeypatch.setattr(f"{module_path}.{attr}", return_value)

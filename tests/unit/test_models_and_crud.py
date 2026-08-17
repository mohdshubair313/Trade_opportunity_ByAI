"""Unit tests for split ORM models and CRUD classes."""
import pytest
from sqlalchemy.orm import Session
from app.models import User, Analysis, FavoriteSector, Watchlist, AlertEvent, ContactMessage
from app.crud import UserCRUD, AnalysisCRUD, FavoriteCRUD, WatchlistCRUD, AlertCRUD, ContactCRUD
from app.core.auth import get_password_hash


def test_user_crud(db: Session):
    """Test UserCRUD creation and retrieval."""
    user = UserCRUD.create_user(
        db,
        username="crud_user",
        email="crud@example.com",
        hashed_password=get_password_hash("Pass@123"),
        full_name="CRUD Tester",
    )
    assert user.id is not None
    assert user.username == "crud_user"

    found = UserCRUD.get_user_by_username(db, "crud_user")
    assert found is not None
    assert found.email == "crud@example.com"

    by_email = UserCRUD.get_user_by_email(db, "crud@example.com")
    assert by_email is not None
    assert by_email.id == user.id


def test_analysis_crud(db: Session, demo_user: User):
    """Test AnalysisCRUD operations."""
    analysis = AnalysisCRUD.create_analysis(
        db,
        user_id=demo_user.id,
        sector="Technology",
        report="# Technology Report Content",
        sources_analyzed=5,
    )
    assert analysis.id is not None
    assert analysis.sector == "Technology"

    user_analyses = AnalysisCRUD.get_user_analyses(db, demo_user.id)
    assert len(user_analyses) >= 1
    assert user_analyses[0].sector == "Technology"

    count = AnalysisCRUD.count_user_analyses(db, demo_user.id)
    assert count >= 1

    fetched = AnalysisCRUD.get_analysis_by_id(db, analysis.id, demo_user.id)
    assert fetched is not None

    AnalysisCRUD.delete_analysis(db, fetched)
    assert AnalysisCRUD.get_analysis_by_id(db, analysis.id, demo_user.id) is None


def test_favorite_crud(db: Session, demo_user: User):
    """Test FavoriteCRUD operations."""
    FavoriteCRUD.add_favorite(db, demo_user.id, "Fintech")
    favorites = FavoriteCRUD.get_user_favorites(db, demo_user.id)
    assert "Fintech" in favorites

    removed = FavoriteCRUD.remove_favorite(db, demo_user.id, "Fintech")
    assert removed is True
    assert "Fintech" not in FavoriteCRUD.get_user_favorites(db, demo_user.id)


def test_contact_crud(db: Session):
    """Test ContactCRUD operations."""
    msg = ContactCRUD.create(
        db,
        name="Alice",
        email="alice@example.com",
        message="Hello TradeInsight",
        company="Alice Corp",
        plan_interest="pro",
    )
    assert msg.id is not None
    assert msg.name == "Alice"

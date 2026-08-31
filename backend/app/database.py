"""
Database module for Trade Opportunities API.
Supports SQLite (local dev) and PostgreSQL via Neon.

This is the slim DB layer — engine, session, init logic, and backwards-compatible
re-exports. ORM models live in ``app.models`` and CRUD classes in ``app.crud``.
"""
import logging
import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trade_opportunities_v2.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL (Neon / Supabase etc.)
    # Force psycopg v3 (installed via psycopg[binary]) instead of v2.
    pg_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    try:
        engine = create_engine(
            pg_url,
            pool_size=5,
            max_overflow=2,
            pool_recycle=300,
            pool_pre_ping=True,
            pool_timeout=30,
        )
    except Exception as exc:
        logger.warning(
            "PostgreSQL engine creation failed (%s) — falling back to local SQLite engine.", exc
        )
        engine = create_engine(
            "sqlite:///./trade_opportunities_v2.db",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------------------------------------------------------------------------
# Re-export models and CRUDs so existing ``from app.database import ...``
# statements continue to work without modification across the codebase.
# ---------------------------------------------------------------------------
from app.models import (  # noqa: E402, F401
    Base,
    User, Analysis, FavoriteSector, Watchlist, AlertEvent,
    ContactMessage, RefreshToken, OTPVerification,
    InventoryItem, Order, OrderItem, PaymentTransaction,
)
from app.crud import (  # noqa: E402, F401
    UserCRUD, AnalysisCRUD, FavoriteCRUD, WatchlistCRUD, AlertCRUD,
    ContactCRUD, RefreshTokenCRUD, OTPCrud,
    InventoryCRUD, OrderCRUD, PaymentTransactionCRUD,
)

# ---------------------------------------------------------------------------
# Plan catalog seed data
# ---------------------------------------------------------------------------
PLAN_CATALOG_SEED = [
    {
        "sku": "plan_pro_monthly",
        "name": "Pro Monthly",
        "description": "TradeInsight AI Pro plan billed monthly.",
        "price_paise": 2900,
        "currency": "INR",
        "stock_quantity": 999999,
    },
    {
        "sku": "plan_pro_annual",
        "name": "Pro Annual",
        "description": "TradeInsight AI Pro plan billed annually.",
        "price_paise": 24000,
        "currency": "INR",
        "stock_quantity": 999999,
    },
    {
        "sku": "plan_enterprise_monthly",
        "name": "Enterprise Monthly",
        "description": "TradeInsight AI Enterprise plan billed monthly.",
        "price_paise": 9900,
        "currency": "INR",
        "stock_quantity": 999999,
    },
    {
        "sku": "plan_enterprise_annual",
        "name": "Enterprise Annual",
        "description": "TradeInsight AI Enterprise plan billed annually.",
        "price_paise": 79000,
        "currency": "INR",
        "stock_quantity": 999999,
    },
]


# ---------------------------------------------------------------------------
# Database initialization
# ---------------------------------------------------------------------------
def init_db():
    """Initialize the database and create all tables."""
    Base.metadata.create_all(bind=engine)

    # Lightweight forward-only migration for Postgres. SQLAlchemy's
    # create_all() does not ALTER existing tables, so columns added to
    # existing models need an explicit ADD COLUMN IF NOT EXISTS on Postgres.
    if not DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text as _text
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS persona VARCHAR(32)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS capital_range VARCHAR(32)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(64)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_appetite VARCHAR(16)",
        ]
        with engine.begin() as conn:
            for stmt in migrations:
                try:
                    conn.execute(_text(stmt))
                except Exception as exc:
                    logger.warning("Schema patch failed (non-fatal): %s → %s", stmt, exc)

    with SessionLocal() as db:
        for item in PLAN_CATALOG_SEED:
            existing = db.query(InventoryItem).filter(InventoryItem.sku == item["sku"]).first()
            if existing:
                existing.name = item["name"]
                existing.description = item["description"]
                existing.price_paise = item["price_paise"]
                existing.currency = item["currency"]
                existing.is_active = True
                if existing.stock_quantity < item["stock_quantity"]:
                    existing.stock_quantity = item["stock_quantity"]
            else:
                db.add(InventoryItem(**item, is_active=True))
        db.commit()
    logger.info("Database initialized successfully")


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------
@contextmanager
def get_db():
    """Get database session with proper cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

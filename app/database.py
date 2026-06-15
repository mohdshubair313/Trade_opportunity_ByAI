"""
Database module for Trade Opportunities API.
Supports SQLite (local dev) and PostgreSQL via Neon.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.pool import StaticPool, NullPool
from contextlib import contextmanager

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
    # Neon's serverless Postgres has connection limits; keep the pool small.
    # The pooled connection string (-pooler) uses PgBouncer transaction mode.
    # pool_recycle=300 prevents holding connections past Neon's 5min idle drop.
    pg_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(
        pg_url,
        pool_size=5,
        max_overflow=2,
        pool_recycle=300,
        pool_pre_ping=True,
        pool_timeout=30,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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


class User(Base):
    """User model for authentication and profile."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    tier = Column(String(20), default="free")  # free, pro, enterprise
    analysis_count_month = Column(Integer, default=0)
    last_reset_date = Column(DateTime, default=datetime.utcnow)

    # Persona fields (§4.3) — drive report framing / voice.
    persona = Column(String(32), nullable=True)  # investor|exporter|sme_owner|student|consultant
    capital_range = Column(String(32), nullable=True)  # under_5L | 5L_50L | 50L_5Cr | 5Cr_plus
    region = Column(String(64), nullable=True)
    risk_appetite = Column(String(16), nullable=True)  # low | medium | high

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("FavoriteSector", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")


class Analysis(Base):
    """Analysis history model."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String(100), nullable=False, index=True)
    report = Column(Text, nullable=False)
    sources_analyzed = Column(Integer, default=0)
    saved_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="analyses")


class FavoriteSector(Base):
    """User's favorite sectors."""
    __tablename__ = "favorite_sectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sector = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="favorites")


class Watchlist(Base):
    """A sector the user wants the scheduler to keep re-analyzing."""
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sector = Column(String(100), nullable=False)
    cadence = Column(String(20), nullable=False, default="daily")  # hourly|daily|weekly
    channels = Column(String(100), nullable=False, default="in_app")  # comma-separated: in_app,email
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class AlertEvent(Base):
    """A material change detected by the worker on a watched sector."""
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    sector = Column(String(100), nullable=False)
    headline = Column(String(280), nullable=False)
    direction = Column(String(16), nullable=False, default="neutral")  # up|down|neutral
    confidence = Column(String(8), nullable=False, default="0.0")  # kept as string to avoid float drift
    summary = Column(Text, nullable=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    triggered_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)


class ContactMessage(Base):
    """Inbound contact form submissions (sales / support)."""
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(150), nullable=True)
    plan_interest = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RefreshToken(Base):
    """Refresh tokens for JWT authentication."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryItem(Base):
    """Inventory master used by payment fulfilment."""
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    price_paise = Column(Integer, nullable=False)
    currency = Column(String(8), nullable=False, default="INR")
    stock_quantity = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order_items = relationship("OrderItem", back_populates="inventory_item")


class Order(Base):
    """Local order record mapped to a Razorpay order."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    receipt = Column(String(40), unique=True, index=True, nullable=False)
    status = Column(String(40), nullable=False, default="created", index=True)
    currency = Column(String(8), nullable=False, default="INR")
    amount_paise = Column(Integer, nullable=False)
    notes_json = Column(Text, nullable=True)
    razorpay_order_id = Column(String(64), unique=True, nullable=True, index=True)
    razorpay_payment_id = Column(String(64), unique=True, nullable=True, index=True)
    client_payment_signature = Column(String(255), nullable=True)
    payment_verified_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    inventory_applied_at = Column(DateTime, nullable=True)
    verification_source = Column(String(32), nullable=True)
    last_payment_event = Column(String(64), nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    transactions = relationship("PaymentTransaction", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Snapshot of inventory and pricing captured at order creation."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False, index=True)
    sku = Column(String(64), nullable=False, index=True)
    item_name = Column(String(150), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_amount_paise = Column(Integer, nullable=False)
    total_amount_paise = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")
    inventory_item = relationship("InventoryItem", back_populates="order_items")


class PaymentTransaction(Base):
    """Processed Razorpay webhook / verification events."""
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    razorpay_event_id = Column(String(128), unique=True, nullable=False, index=True)
    razorpay_payment_id = Column(String(64), nullable=True, index=True)
    razorpay_order_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    source = Column(String(32), nullable=False, default="webhook")
    status = Column(String(40), nullable=False, default="received")
    signature_valid = Column(Boolean, default=False)
    processed = Column(Boolean, default=False)
    raw_payload = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="transactions")


# Create all tables
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


# CRUD Operations
class UserCRUD:
    """CRUD operations for User model."""
    
    @staticmethod
    def create_user(db: Session, username: str, email: str, hashed_password: str, full_name: str = None) -> User:
        """Create a new user."""
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def update_last_login(db: Session, user: User):
        """Update user's last login timestamp."""
        user.last_login = datetime.now(timezone.utc)
        db.commit()
    
    @staticmethod
    def update_user(db: Session, user: User, **kwargs):
        """Update user fields."""
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user


class AnalysisCRUD:
    """CRUD operations for Analysis model."""
    
    @staticmethod
    def create_analysis(db: Session, user_id: int, sector: str, report: str, 
                       sources_analyzed: int, saved_path: str = None) -> Analysis:
        """Create a new analysis record."""
        analysis = Analysis(
            user_id=user_id,
            sector=sector,
            report=report,
            sources_analyzed=sources_analyzed,
            saved_path=saved_path
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
    
    @staticmethod
    def get_user_analyses(db: Session, user_id: int, limit: int = 50, offset: int = 0) -> List[Analysis]:
        """Get user's analysis history."""
        return db.query(Analysis)\
            .filter(Analysis.user_id == user_id)\
            .order_by(Analysis.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def count_user_analyses(db: Session, user_id: int) -> int:
        """Count total analyses for a user."""
        return db.query(func.count(Analysis.id)).filter(Analysis.user_id == user_id).scalar() or 0

    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int, user_id: int) -> Optional[Analysis]:
        """Get specific analysis by ID for a user."""
        return db.query(Analysis)\
            .filter(Analysis.id == analysis_id, Analysis.user_id == user_id)\
            .first()
    
    @staticmethod
    def delete_analysis(db: Session, analysis: Analysis):
        """Delete an analysis."""
        db.delete(analysis)
        db.commit()


class FavoriteCRUD:
    """CRUD operations for FavoriteSector model."""
    
    @staticmethod
    def add_favorite(db: Session, user_id: int, sector: str) -> FavoriteSector:
        """Add a sector to favorites."""
        existing = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id, FavoriteSector.sector == sector)\
            .first()
        if existing:
            return existing
        
        favorite = FavoriteSector(user_id=user_id, sector=sector)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
        return favorite
    
    @staticmethod
    def remove_favorite(db: Session, user_id: int, sector: str) -> bool:
        """Remove a sector from favorites."""
        favorite = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id, FavoriteSector.sector == sector)\
            .first()
        if favorite:
            db.delete(favorite)
            db.commit()
            return True
        return False
    
    @staticmethod
    def get_user_favorites(db: Session, user_id: int) -> List[str]:
        """Get user's favorite sectors."""
        favorites = db.query(FavoriteSector)\
            .filter(FavoriteSector.user_id == user_id)\
            .all()
        return [f.sector for f in favorites]


class WatchlistCRUD:
    """CRUD for Watchlist."""

    @staticmethod
    def create(db: Session, *, user_id: int, sector: str, cadence: str, channels: str) -> Watchlist:
        wl = Watchlist(user_id=user_id, sector=sector, cadence=cadence, channels=channels)
        # Schedule the first run slightly in the future so the worker picks it up.
        wl.next_run_at = _next_run_from(cadence)
        db.add(wl)
        db.commit()
        db.refresh(wl)
        return wl

    @staticmethod
    def for_user(db: Session, user_id: int) -> List["Watchlist"]:
        return (
            db.query(Watchlist)
            .filter(Watchlist.user_id == user_id, Watchlist.is_active == True)  # noqa: E712
            .order_by(Watchlist.created_at.desc())
            .all()
        )

    @staticmethod
    def count_active(db: Session, user_id: int) -> int:
        return (
            db.query(func.count(Watchlist.id))
            .filter(Watchlist.user_id == user_id, Watchlist.is_active == True)  # noqa: E712
            .scalar()
            or 0
        )

    @staticmethod
    def get(db: Session, watchlist_id: int, user_id: int) -> Optional["Watchlist"]:
        return (
            db.query(Watchlist)
            .filter(Watchlist.id == watchlist_id, Watchlist.user_id == user_id)
            .first()
        )

    @staticmethod
    def delete(db: Session, watchlist: "Watchlist") -> None:
        db.delete(watchlist)
        db.commit()

    @staticmethod
    def due(db: Session, now: datetime) -> List["Watchlist"]:
        return (
            db.query(Watchlist)
            .filter(
                Watchlist.is_active == True,  # noqa: E712
                Watchlist.next_run_at != None,  # noqa: E711
                Watchlist.next_run_at <= now,
            )
            .all()
        )

    @staticmethod
    def mark_ran(db: Session, watchlist: "Watchlist", ran_at: datetime) -> None:
        watchlist.last_run_at = ran_at
        watchlist.next_run_at = _next_run_from(watchlist.cadence, base=ran_at)
        db.commit()


class AlertCRUD:
    """CRUD for AlertEvent."""

    @staticmethod
    def create(
        db: Session,
        *,
        user_id: int,
        watchlist_id: int,
        sector: str,
        headline: str,
        direction: str,
        confidence: float,
        summary: Optional[str],
        analysis_id: Optional[int],
    ) -> AlertEvent:
        ev = AlertEvent(
            user_id=user_id,
            watchlist_id=watchlist_id,
            sector=sector,
            headline=headline[:280],
            direction=direction,
            confidence=f"{confidence:.2f}",
            summary=summary,
            analysis_id=analysis_id,
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return ev

    @staticmethod
    def for_user(db: Session, user_id: int, *, include_seen: bool = False, limit: int = 50) -> List["AlertEvent"]:
        q = db.query(AlertEvent).filter(AlertEvent.user_id == user_id)
        if not include_seen:
            q = q.filter(AlertEvent.acknowledged_at == None)  # noqa: E711
        return q.order_by(AlertEvent.triggered_at.desc()).limit(limit).all()

    @staticmethod
    def unread_count(db: Session, user_id: int) -> int:
        return (
            db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.user_id == user_id,
                AlertEvent.acknowledged_at == None,  # noqa: E711
            )
            .scalar()
            or 0
        )

    @staticmethod
    def get(db: Session, alert_id: int, user_id: int) -> Optional["AlertEvent"]:
        return (
            db.query(AlertEvent)
            .filter(AlertEvent.id == alert_id, AlertEvent.user_id == user_id)
            .first()
        )

    @staticmethod
    def acknowledge(db: Session, alert: "AlertEvent") -> "AlertEvent":
        alert.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        return alert


def _next_run_from(cadence: str, base: Optional[datetime] = None) -> datetime:
    from datetime import timedelta
    base = base or datetime.now(timezone.utc)
    cadence = (cadence or "daily").lower()
    if cadence == "hourly":
        return base + timedelta(hours=1)
    if cadence == "weekly":
        return base + timedelta(days=7)
    return base + timedelta(days=1)


class ContactCRUD:
    """CRUD operations for ContactMessage model."""

    @staticmethod
    def create(db: Session, *, name: str, email: str, message: str,
               company: Optional[str] = None, plan_interest: Optional[str] = None) -> ContactMessage:
        entry = ContactMessage(
            name=name, email=email, message=message,
            company=company, plan_interest=plan_interest,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry


class RefreshTokenCRUD:
    """CRUD operations for RefreshToken model."""
    
    @staticmethod
    def create_token(db: Session, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
        """Create a new refresh token."""
        refresh_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(refresh_token)
        db.commit()
        db.refresh(refresh_token)
        return refresh_token
    
    @staticmethod
    def get_token(db: Session, token: str) -> Optional[RefreshToken]:
        """Get refresh token."""
        return db.query(RefreshToken)\
            .filter(RefreshToken.token == token, RefreshToken.is_revoked == False)\
            .first()
    
    @staticmethod
    def revoke_token(db: Session, token: str):
        """Revoke a refresh token."""
        refresh_token = db.query(RefreshToken)\
            .filter(RefreshToken.token == token)\
            .first()
        if refresh_token:
            refresh_token.is_revoked = True
            db.commit()
    
    @staticmethod
    def revoke_all_user_tokens(db: Session, user_id: int):
        """Revoke all tokens for a user."""
        db.query(RefreshToken)\
            .filter(RefreshToken.user_id == user_id)\
            .update({RefreshToken.is_revoked: True})
        db.commit()


class InventoryCRUD:
    """CRUD helpers for inventory-backed checkout."""

    @staticmethod
    def get_by_sku(db: Session, sku: str) -> Optional[InventoryItem]:
        return db.query(InventoryItem).filter(InventoryItem.sku == sku).first()

    @staticmethod
    def list_active(db: Session) -> List[InventoryItem]:
        return (
            db.query(InventoryItem)
            .filter(InventoryItem.is_active == True)  # noqa: E712
            .order_by(InventoryItem.sku.asc())
            .all()
        )


class OrderCRUD:
    """CRUD helpers for local payment orders."""

    @staticmethod
    def create(
        db: Session,
        *,
        user_id: Optional[int],
        receipt: str,
        currency: str,
        amount_paise: int,
        notes_json: Optional[str],
        items: List[dict],
    ) -> Order:
        order = Order(
            user_id=user_id,
            receipt=receipt,
            currency=currency,
            amount_paise=amount_paise,
            notes_json=notes_json,
            status="initiated",
        )
        db.add(order)
        db.flush()
        for item in items:
            db.add(
                OrderItem(
                    order_id=order.id,
                    inventory_item_id=item["inventory_item_id"],
                    sku=item["sku"],
                    item_name=item["item_name"],
                    quantity=item["quantity"],
                    unit_amount_paise=item["unit_amount_paise"],
                    total_amount_paise=item["total_amount_paise"],
                )
            )
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def get_by_id(db: Session, order_id: int) -> Optional[Order]:
        return db.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def get_by_receipt(db: Session, receipt: str) -> Optional[Order]:
        return db.query(Order).filter(Order.receipt == receipt).first()

    @staticmethod
    def get_by_razorpay_order_id(db: Session, razorpay_order_id: str) -> Optional[Order]:
        return db.query(Order).filter(Order.razorpay_order_id == razorpay_order_id).first()


class PaymentTransactionCRUD:
    """CRUD helpers for webhook idempotency and audit records."""

    @staticmethod
    def get_by_event_id(db: Session, razorpay_event_id: str) -> Optional[PaymentTransaction]:
        return (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.razorpay_event_id == razorpay_event_id)
            .first()
        )


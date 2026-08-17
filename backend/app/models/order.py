"""Order and OrderItem ORM models."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


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

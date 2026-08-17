"""PaymentTransaction ORM model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


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

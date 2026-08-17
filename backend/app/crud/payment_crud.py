"""CRUD operations for PaymentTransaction model."""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.payment import PaymentTransaction


class PaymentTransactionCRUD:
    """CRUD helpers for webhook idempotency and audit records."""

    @staticmethod
    def get_by_event_id(db: Session, razorpay_event_id: str) -> Optional[PaymentTransaction]:
        return (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.razorpay_event_id == razorpay_event_id)
            .first()
        )

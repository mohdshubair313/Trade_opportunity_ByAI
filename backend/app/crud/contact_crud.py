"""CRUD operations for ContactMessage model."""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.contact import ContactMessage


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

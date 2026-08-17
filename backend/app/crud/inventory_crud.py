"""CRUD operations for InventoryItem model."""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.inventory import InventoryItem


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

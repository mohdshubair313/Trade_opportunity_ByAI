"""CRUD operations for Order model."""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.order import Order, OrderItem


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

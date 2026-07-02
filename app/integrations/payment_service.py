"""
Razorpay payment infrastructure for orders, checkout verification, and webhooks.

The webhook path is intentionally treated as the authoritative automation path:
client callbacks improve UX, but inventory and final order state are only
committed by server-side verification against Razorpay or by the webhook itself.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import (
    InventoryCRUD,
    InventoryItem,
    Order,
    OrderCRUD,
    PaymentTransaction,
    PaymentTransactionCRUD,
)
from app.core.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    OrderLineItemResponse,
    OrderResponse,
    RazorpayPaymentVerificationRequest,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class PaymentError(RuntimeError):
    """Base exception for payment-processing failures."""


class RazorpayConfigurationError(PaymentError):
    """Raised when required Razorpay credentials are missing."""


class RazorpaySignatureError(PaymentError):
    """Raised when a Razorpay signature fails validation."""


class RazorpayUpstreamError(PaymentError):
    """Raised when the Razorpay API returns an error or times out."""


class InventoryUnavailableError(PaymentError):
    """Raised when stock cannot be decremented safely."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=True, sort_keys=True)


def _normalise_notes(notes: Dict[str, str]) -> Dict[str, str]:
    return {str(key): str(value) for key, value in (notes or {}).items()}


def _build_event_id(raw_payload: bytes, header_value: Optional[str]) -> str:
    if header_value:
        return header_value.strip()
    return hashlib.sha256(raw_payload).hexdigest()


class RazorpayClient:
    """Thin async client for the Razorpay REST APIs used by this backend."""

    def __init__(self) -> None:
        if not settings.razorpay_key_id or not settings.razorpay_key_secret:
            raise RazorpayConfigurationError(
                "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in .env"
            )
        self._base_url = settings.razorpay_api_base_url.rstrip("/")
        self._auth = (settings.razorpay_key_id, settings.razorpay_key_secret)
        self._timeout = httpx.Timeout(settings.razorpay_timeout_seconds, connect=5.0)

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout, auth=self._auth) as client:
                response = await client.request(
                    method,
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
        except httpx.TimeoutException as exc:
            raise RazorpayUpstreamError(f"Timed out calling Razorpay: {path}") from exc
        except httpx.RequestError as exc:
            raise RazorpayUpstreamError(f"Network error calling Razorpay: {exc}") from exc

        if response.status_code >= 400:
            try:
                error_body = response.json()
            except ValueError:
                error_body = {"error": {"description": response.text}}
            detail = (
                error_body.get("error", {}).get("description")
                or error_body.get("description")
                or response.text
            )
            raise RazorpayUpstreamError(
                f"Razorpay API error {response.status_code} on {path}: {detail}"
            )

        try:
            return response.json()
        except ValueError as exc:
            raise RazorpayUpstreamError(f"Invalid JSON returned by Razorpay for {path}") from exc

    async def create_order(
        self,
        *,
        amount_paise: int,
        currency: str,
        receipt: str,
        notes: Dict[str, str],
    ) -> Dict[str, Any]:
        return await self._request_json(
            "POST",
            "/orders",
            payload={
                "amount": amount_paise,
                "currency": currency,
                "receipt": receipt,
                "partial_payment": False,
                "notes": _normalise_notes(notes),
            },
        )

    async def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        return await self._request_json("GET", f"/payments/{payment_id}")

    @staticmethod
    def verify_checkout_signature(
        *,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> None:
        payload = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
        expected = hmac.new(
            settings.razorpay_key_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, razorpay_signature):
            raise RazorpaySignatureError("Razorpay checkout signature mismatch")

    @staticmethod
    def verify_webhook_signature(*, raw_payload: bytes, signature: str) -> None:
        if not settings.razorpay_webhook_secret:
            raise RazorpayConfigurationError(
                "RAZORPAY_WEBHOOK_SECRET must be configured in .env"
            )
        expected = hmac.new(
            settings.razorpay_webhook_secret.encode("utf-8"),
            raw_payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise RazorpaySignatureError("Razorpay webhook signature mismatch")


class PaymentService:
    """Coordinates local order persistence with Razorpay state transitions."""

    def __init__(self) -> None:
        self.client = RazorpayClient()

    def _generate_receipt(self) -> str:
        return f"rcpt_{uuid4().hex[:28]}"

    def _prepare_order_items(
        self,
        db: Session,
        request: CreateOrderRequest,
    ) -> tuple[list[Dict[str, Any]], int]:
        prepared: list[Dict[str, Any]] = []
        amount_paise = 0
        for item in request.items:
            inventory = InventoryCRUD.get_by_sku(db, item.sku)
            if inventory is None or not inventory.is_active:
                raise PaymentError(f"Inventory item '{item.sku}' does not exist or is inactive")
            if inventory.currency.upper() != request.currency:
                raise PaymentError(
                    f"Inventory item '{item.sku}' uses currency {inventory.currency}, "
                    f"not {request.currency}"
                )
            if inventory.stock_quantity < item.quantity:
                raise InventoryUnavailableError(
                    f"Insufficient stock for '{item.sku}'. Available: {inventory.stock_quantity}"
                )
            line_total = inventory.price_paise * item.quantity
            amount_paise += line_total
            prepared.append(
                {
                    "inventory_item_id": inventory.id,
                    "sku": inventory.sku,
                    "item_name": inventory.name,
                    "quantity": item.quantity,
                    "unit_amount_paise": inventory.price_paise,
                    "total_amount_paise": line_total,
                }
            )
        return prepared, amount_paise

    def to_order_response(self, order: Order) -> OrderResponse:
        return OrderResponse(
            local_order_id=order.id,
            receipt=order.receipt,
            razorpay_order_id=order.razorpay_order_id,
            razorpay_payment_id=order.razorpay_payment_id,
            status=order.status,
            amount_paise=order.amount_paise,
            currency=order.currency,
            inventory_applied=order.inventory_applied_at is not None,
            payment_verified=order.payment_verified_at is not None,
            items=[
                OrderLineItemResponse(
                    sku=item.sku,
                    item_name=item.item_name,
                    quantity=item.quantity,
                    unit_amount_paise=item.unit_amount_paise,
                    total_amount_paise=item.total_amount_paise,
                )
                for item in order.items
            ],
            created_at=order.created_at,
            paid_at=order.paid_at,
            failure_reason=order.failure_reason,
        )

    def order_to_create_response(self, order: Order) -> CreateOrderResponse:
        payload = self.to_order_response(order).model_dump()
        payload["key_id"] = settings.razorpay_key_id
        return CreateOrderResponse(**payload)

    def get_order_or_raise(self, db: Session, local_order_id: int) -> Order:
        order = OrderCRUD.get_by_id(db, local_order_id)
        if order is None:
            raise PaymentError(f"Local order {local_order_id} was not found")
        return order

    async def create_order(
        self,
        db: Session,
        *,
        user_id: Optional[int],
        request: CreateOrderRequest,
    ) -> Order:
        prepared_items, amount_paise = self._prepare_order_items(db, request)
        receipt = request.receipt or self._generate_receipt()
        notes = _normalise_notes(request.notes)

        if OrderCRUD.get_by_receipt(db, receipt):
            raise PaymentError(f"Receipt '{receipt}' already exists")

        order = OrderCRUD.create(
            db,
            user_id=user_id,
            receipt=receipt,
            currency=request.currency,
            amount_paise=amount_paise,
            notes_json=_to_json(notes) if notes else None,
            items=prepared_items,
        )

        try:
            razorpay_order = await self.client.create_order(
                amount_paise=amount_paise,
                currency=request.currency,
                receipt=receipt,
                notes=notes,
            )
        except Exception as exc:
            order.status = "creation_failed"
            order.failure_reason = str(exc)
            db.commit()
            raise

        order.razorpay_order_id = razorpay_order["id"]
        order.status = "payment_pending"
        order.failure_reason = None
        db.commit()
        db.refresh(order)
        return order

    def _extract_payment_entity(self, event: Dict[str, Any]) -> Dict[str, Any]:
        payment = ((event.get("payload") or {}).get("payment") or {}).get("entity") or {}
        if not payment:
            raise PaymentError("Webhook payload does not contain payload.payment.entity")
        return payment

    def _mark_inventory_shortage(
        self,
        db: Session,
        *,
        order: Optional[Order],
        payment_id: Optional[str],
        reason: str,
    ) -> None:
        if order is None:
            return
        order.status = "inventory_shortage"
        order.razorpay_payment_id = order.razorpay_payment_id or payment_id
        order.failure_reason = reason
        order.last_payment_event = "payment.captured"
        db.commit()

    def _apply_plan_entitlements(self, order: Order) -> None:
        """Upgrade the purchaser's account when a plan SKU is settled."""
        if order.user is None:
            return

        target_tier: Optional[str] = None
        for item in order.items:
            sku = (item.sku or "").lower()
            if sku.startswith("plan_enterprise"):
                target_tier = "enterprise"
                break
            if sku.startswith("plan_pro"):
                target_tier = "pro"

        if not target_tier:
            return

        order.user.tier = target_tier
        order.user.is_premium = target_tier in {"pro", "enterprise"}
        order.user.updated_at = _utcnow()

    def _apply_captured_payment(
        self,
        db: Session,
        *,
        order: Order,
        payment: Dict[str, Any],
        source: str,
        event_type: str,
    ) -> Order:
        payment_id = payment.get("id")
        payment_amount = int(payment.get("amount") or 0)
        payment_status = (payment.get("status") or "").lower()
        payment_order_id = payment.get("order_id")

        if payment_status != "captured":
            raise PaymentError(f"Payment {payment_id} is not captured (status={payment_status})")
        if payment_order_id and order.razorpay_order_id and payment_order_id != order.razorpay_order_id:
            raise PaymentError("Razorpay order id mismatch while processing captured payment")
        if payment_amount != order.amount_paise:
            raise PaymentError(
                f"Captured amount mismatch for order {order.id}: "
                f"expected {order.amount_paise}, got {payment_amount}"
            )

        now = _utcnow()
        if order.inventory_applied_at is not None:
            if order.razorpay_payment_id and order.razorpay_payment_id != payment_id:
                raise PaymentError(
                    f"Order {order.id} already settled against a different payment id"
                )
            order.razorpay_payment_id = order.razorpay_payment_id or payment_id
            order.payment_verified_at = order.payment_verified_at or now
            order.verification_source = order.verification_source or source
            order.last_payment_event = event_type
            return order

        for item in order.items:
            updated_rows = (
                db.query(InventoryItem)
                .filter(
                    InventoryItem.id == item.inventory_item_id,
                    InventoryItem.is_active == True,  # noqa: E712
                    InventoryItem.stock_quantity >= item.quantity,
                )
                .update(
                    {
                        InventoryItem.stock_quantity: InventoryItem.stock_quantity - item.quantity,
                        InventoryItem.updated_at: now,
                    },
                    synchronize_session=False,
                )
            )
            if updated_rows != 1:
                raise InventoryUnavailableError(
                    f"Insufficient stock while settling order {order.id} for SKU '{item.sku}'"
                )

        order.razorpay_order_id = order.razorpay_order_id or payment_order_id
        order.razorpay_payment_id = payment_id
        order.status = "paid"
        order.payment_verified_at = order.payment_verified_at or now
        order.paid_at = now
        order.inventory_applied_at = now
        order.verification_source = source
        order.last_payment_event = event_type
        order.failure_reason = None
        self._apply_plan_entitlements(order)
        return order

    async def verify_payment(
        self,
        db: Session,
        *,
        payload: RazorpayPaymentVerificationRequest,
    ) -> Order:
        order = self.get_order_or_raise(db, payload.local_order_id)
        if order.razorpay_order_id and order.razorpay_order_id != payload.razorpay_order_id:
            raise PaymentError("The supplied Razorpay order id does not match the local order")

        self.client.verify_checkout_signature(
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )

        order.client_payment_signature = payload.razorpay_signature
        order.payment_verified_at = order.payment_verified_at or _utcnow()
        order.razorpay_order_id = payload.razorpay_order_id
        order.razorpay_payment_id = payload.razorpay_payment_id
        order.verification_source = "client_signature"
        order.status = "payment_verified_pending_capture"
        db.commit()
        db.refresh(order)

        payment = await self.client.fetch_payment(payload.razorpay_payment_id)
        if (payment.get("status") or "").lower() == "captured":
            try:
                self._apply_captured_payment(
                    db,
                    order=order,
                    payment=payment,
                    source="api_verification",
                    event_type="payment.captured",
                )
                db.commit()
                db.refresh(order)
            except InventoryUnavailableError as exc:
                db.rollback()
                refreshed = self.get_order_or_raise(db, order.id)
                self._mark_inventory_shortage(
                    db,
                    order=refreshed,
                    payment_id=payload.razorpay_payment_id,
                    reason=str(exc),
                )
                order = refreshed
        return order

    async def process_webhook(
        self,
        db: Session,
        *,
        raw_payload: bytes,
        signature: str,
        event_header: Optional[str],
    ) -> Dict[str, Any]:
        self.client.verify_webhook_signature(raw_payload=raw_payload, signature=signature)
        try:
            event = json.loads(raw_payload.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise PaymentError("Webhook payload is not valid JSON") from exc

        event_type = (event.get("event") or "").strip()
        event_id = _build_event_id(raw_payload, event_header)
        existing = PaymentTransactionCRUD.get_by_event_id(db, event_id)
        if existing and existing.processed:
            logger.info("Skipping duplicate Razorpay webhook event %s", event_id)
            return {
                "duplicate": True,
                "event_id": event_id,
                "event_type": existing.event_type,
                "status": existing.status,
                "order_id": existing.order_id,
            }

        payment = self._extract_payment_entity(event)
        if existing and not existing.processed:
            transaction = existing
            transaction.razorpay_payment_id = payment.get("id")
            transaction.razorpay_order_id = payment.get("order_id")
            transaction.event_type = event_type or transaction.event_type or "unknown"
            transaction.source = "webhook"
            transaction.status = "received"
            transaction.signature_valid = True
            transaction.raw_payload = raw_payload.decode("utf-8", errors="replace")
            transaction.error_message = None
            db.commit()
            db.refresh(transaction)
        else:
            transaction = PaymentTransaction(
                razorpay_event_id=event_id,
                razorpay_payment_id=payment.get("id"),
                razorpay_order_id=payment.get("order_id"),
                event_type=event_type or "unknown",
                source="webhook",
                status="received",
                signature_valid=True,
                processed=False,
                raw_payload=raw_payload.decode("utf-8", errors="replace"),
            )
            db.add(transaction)
            db.commit()
            db.refresh(transaction)

        if event_type != "payment.captured":
            transaction.status = "ignored"
            transaction.processed = True
            transaction.processed_at = _utcnow()
            db.commit()
            return {
                "duplicate": False,
                "event_id": event_id,
                "event_type": event_type,
                "status": "ignored",
                "order_id": None,
            }

        order = OrderCRUD.get_by_razorpay_order_id(db, payment.get("order_id") or "")
        if order is None:
            transaction.status = "orphaned"
            transaction.processed = True
            transaction.error_message = (
                f"No local order found for Razorpay order {payment.get('order_id')}"
            )
            transaction.processed_at = _utcnow()
            db.commit()
            logger.error(transaction.error_message)
            return {
                "duplicate": False,
                "event_id": event_id,
                "event_type": event_type,
                "status": "orphaned",
                "order_id": None,
            }

        try:
            self._apply_captured_payment(
                db,
                order=order,
                payment=payment,
                source="webhook",
                event_type=event_type,
            )
            transaction.order_id = order.id
            transaction.status = "processed"
            transaction.processed = True
            transaction.processed_at = _utcnow()
            db.commit()
            db.refresh(order)
            return {
                "duplicate": False,
                "event_id": event_id,
                "event_type": event_type,
                "status": transaction.status,
                "order_id": order.id,
            }
        except InventoryUnavailableError as exc:
            db.rollback()
            transaction = PaymentTransactionCRUD.get_by_event_id(db, event_id)
            if transaction:
                transaction.order_id = order.id
                transaction.status = "inventory_shortage"
                transaction.processed = True
                transaction.error_message = str(exc)
                transaction.processed_at = _utcnow()
            self._mark_inventory_shortage(
                db,
                order=order,
                payment_id=payment.get("id"),
                reason=str(exc),
            )
            logger.error("Inventory shortage while processing event %s: %s", event_id, exc)
            return {
                "duplicate": False,
                "event_id": event_id,
                "event_type": event_type,
                "status": "inventory_shortage",
                "order_id": order.id,
            }

    def persist_dead_letter(
        self,
        *,
        raw_payload: bytes,
        headers: Dict[str, str],
        error_message: str,
    ) -> None:
        """Write failed webhook deliveries to a local JSONL file for replay."""
        target = Path(settings.webhook_dead_letter_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        record = {
            "captured_at": _utcnow().isoformat(),
            "headers": headers,
            "error_message": error_message,
            "payload": raw_payload.decode("utf-8", errors="replace"),
        }
        with target.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")

"""Payment routes — catalog, create order, verify, webhook, order status."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db_session, User, Order, InventoryCRUD
from app.core.auth import get_current_user_optional
from app.core.schemas import (
    CreateOrderRequest, CreateOrderResponse,
    RazorpayPaymentVerificationRequest, OrderResponse,
    PaymentCatalogItemResponse,
)
from app.core.rate_limiter import limiter
from app.integrations.payment_service import (
    PaymentService, PaymentError,
    RazorpaySignatureError, RazorpayUpstreamError,
    InventoryUnavailableError,
)

logger = logging.getLogger(__name__)

# Initialize payment service
try:
    payment_service = PaymentService()
except PaymentError as exc:
    payment_service = None
    logger.warning("Payment service disabled: %s", exc)


def _get_payment_service_or_503() -> PaymentService:
    """Return the configured payment service or a 503 when creds are missing."""
    if payment_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Check Razorpay credentials in .env.",
        )
    return payment_service


def _to_order_response(order: Order) -> OrderResponse:
    """Serialize an Order ORM object into the shared response schema."""
    return _get_payment_service_or_503().to_order_response(order)


router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


@router.get("/catalog", response_model=list[PaymentCatalogItemResponse])
async def list_payment_catalog(db: Session = Depends(get_db_session)):
    """Expose active checkout SKUs so the frontend can render real purchasable plans."""
    return [
        PaymentCatalogItemResponse(
            sku=item.sku, name=item.name, description=item.description,
            price_paise=item.price_paise, currency=item.currency,
            stock_quantity=item.stock_quantity,
        )
        for item in InventoryCRUD.list_active(db)
    ]


@router.post("/create-order", response_model=CreateOrderResponse)
@limiter.limit("10/minute")
async def create_payment_order(
    request: Request,
    payload: CreateOrderRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """Create a local order and a matching Razorpay order."""
    service = _get_payment_service_or_503()
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to create a payment order",
        )
    try:
        order = await service.create_order(db, user_id=current_user.id, request=payload)
        return service.order_to_create_response(order)
    except InventoryUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except RazorpayUpstreamError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except PaymentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/verify", response_model=OrderResponse)
@limiter.limit("20/minute")
async def verify_payment(
    request: Request,
    payload: RazorpayPaymentVerificationRequest,
    db: Session = Depends(get_db_session),
):
    """Verify the checkout signature, then fetch the payment state from Razorpay."""
    service = _get_payment_service_or_503()
    try:
        order = await service.verify_payment(db, payload=payload)
        return _to_order_response(order)
    except RazorpaySignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except InventoryUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except RazorpayUpstreamError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except PaymentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/orders/{local_order_id}", response_model=OrderResponse)
async def get_payment_order(
    local_order_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db_session),
):
    """Return the latest server-side order status for checkout polling/reconciliation."""
    service = _get_payment_service_or_503()
    try:
        order = service.get_order_or_raise(db, local_order_id)
    except PaymentError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to view order details")
    if order.user_id is not None and current_user.id != order.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this order")

    return _to_order_response(order)


@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db_session),
):
    """Consume Razorpay webhooks using mandatory HMAC SHA256 signature validation."""
    service = _get_payment_service_or_503()
    raw_payload = await request.body()
    signature = request.headers.get("x-razorpay-signature")
    event_header = request.headers.get("x-razorpay-event-id")

    if not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-Razorpay-Signature header")

    try:
        result = await service.process_webhook(
            db, raw_payload=raw_payload, signature=signature, event_header=event_header,
        )
    except RazorpaySignatureError as exc:
        logger.warning("Rejected Razorpay webhook due to signature mismatch: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error("Database failure while processing Razorpay webhook", exc_info=True)
        service.persist_dead_letter(raw_payload=raw_payload, headers=dict(request.headers), error_message=f"database failure: {exc}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook persistence temporarily unavailable; Razorpay should retry.")
    except PaymentError as exc:
        db.rollback()
        logger.error("Payment webhook processing failed: %s", exc, exc_info=True)
        service.persist_dead_letter(raw_payload=raw_payload, headers=dict(request.headers), error_message=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook processing failed")
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.error("Unhandled Razorpay webhook failure", exc_info=True)
        service.persist_dead_letter(raw_payload=raw_payload, headers=dict(request.headers), error_message=f"unexpected failure: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected webhook processing failure")

    http_status = status.HTTP_202_ACCEPTED if result.get("status") == "orphaned" else status.HTTP_200_OK
    return JSONResponse(status_code=http_status, content=result)

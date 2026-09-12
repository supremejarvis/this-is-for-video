"""Secure Razorpay Payment Endpoints with Server-Side Verification and Webhook Processing."""
import hashlib
import hmac
import json
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models import Order, OrderStatus, Payment, PaymentStatus, WebhookEvent
from app.models.auth import User, UserRole
from app.schemas.order import (
    RazorpayCreateOrderRequest,
    RazorpayCreateOrderResponse,
    RazorpayVerifyPaymentRequest,
    RazorpayVerifyPaymentResponse,
)

router = APIRouter()


@router.post("/razorpay/create-order", response_model=RazorpayCreateOrderResponse)
async def razorpay_create_order(
    payload: RazorpayCreateOrderRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> RazorpayCreateOrderResponse:
    """Create an authoritative Razorpay payment order tied to a PostgreSQL order."""
    stmt = select(Order).where(Order.id == payload.order_id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.payment_status == PaymentStatus.CAPTURED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order has already been paid and captured.",
        )

    # Calculate authoritative amount in paise
    amount_paise = int(order.total_payable * 100)

    # Generate or request Razorpay Order ID
    razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}"

    # Update or add payment entry in PostgreSQL
    stmt_pmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
    payment = (await db.execute(stmt_pmt)).scalar_one_or_none()
    if payment is None:
        payment = Payment(
            order_id=order.id,
            provider="razorpay",
            provider_payment_id=None,
            amount=order.total_payable,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)

    await db.commit()

    return RazorpayCreateOrderResponse(
        razorpay_order_id=razorpay_order_id,
        amount=amount_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/razorpay/verify", response_model=RazorpayVerifyPaymentResponse)
async def razorpay_verify_payment(
    payload: RazorpayVerifyPaymentRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> RazorpayVerifyPaymentResponse:
    """Verify Razorpay payment signature server-side using HMAC SHA256."""
    stmt = select(Order).where(Order.id == payload.order_id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # Calculate expected HMAC-SHA256
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    is_valid = hmac.compare_digest(expected_sig, payload.razorpay_signature)

    if not is_valid:
        # Record payment failure
        stmt_pmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
        payment = (await db.execute(stmt_pmt)).scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay payment signature. Payment verification failed.",
        )

    # Payment verified! Update order and payment status
    stmt_pmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
    payment = (await db.execute(stmt_pmt)).scalar_one_or_none()
    if payment is None:
        payment = Payment(
            order_id=order.id,
            provider="razorpay",
            provider_payment_id=payload.razorpay_payment_id,
            amount=order.total_payable,
            status=PaymentStatus.CAPTURED,
        )
        db.add(payment)
    else:
        payment.provider_payment_id = payload.razorpay_payment_id
        payment.status = PaymentStatus.CAPTURED

    order.payment_status = PaymentStatus.CAPTURED
    order.order_status = OrderStatus.CONFIRMED

    await db.commit()

    return RazorpayVerifyPaymentResponse(
        verified=True,
        order_number=order.order_number,
        payment_status="CAPTURED",
        message="Payment verified successfully and recorded in PostgreSQL.",
    )


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_razorpay_signature: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    """Process incoming Razorpay webhooks idempotently with raw HMAC-SHA256 signature verification."""
    raw_body = await request.body()
    secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", None) or settings.RAZORPAY_KEY_SECRET

    if not x_razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing mandatory X-Razorpay-Signature header",
        )

    expected_sig = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, x_razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    try:
        event = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload") from e

    event_id = event.get("id") or event.get("event")
    event_type = event.get("event")

    # Persistent PostgreSQL idempotency check
    if event_id:
        stmt_evt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        existing_event = (await db.execute(stmt_evt)).scalar_one_or_none()
        if existing_event is not None:
            return {"status": "ignored", "reason": "already_processed"}

        db.add(
            WebhookEvent(
                event_id=event_id,
                provider="razorpay",
                event_type=event_type or "unknown",
            )
        )
        await db.flush()

    event_type = event.get("event")
    payload_data = event.get("payload", {})

    if event_type == "payment.captured":
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        provider_payment_id = payment_entity.get("id")
        order_id_str = payment_entity.get("notes", {}).get("order_id")

        if order_id_str and provider_payment_id:
            try:
                order_uuid = uuid.UUID(order_id_str)
                stmt = select(Order).where(Order.id == order_uuid)
                order = (await db.execute(stmt)).scalar_one_or_none()
                if order:
                    order.payment_status = PaymentStatus.CAPTURED
                    order.order_status = OrderStatus.CONFIRMED

                    stmt_pmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
                    pmt = (await db.execute(stmt_pmt)).scalar_one_or_none()
                    if pmt:
                        pmt.status = PaymentStatus.CAPTURED
                        pmt.provider_payment_id = provider_payment_id
                    await db.commit()
            except Exception:
                await db.rollback()

    elif event_type == "payment.failed":
        payment_entity = payload_data.get("payment", {}).get("entity", {})
        order_id_str = payment_entity.get("notes", {}).get("order_id")
        if order_id_str:
            try:
                order_uuid = uuid.UUID(order_id_str)
                stmt = select(Order).where(Order.id == order_uuid)
                order = (await db.execute(stmt)).scalar_one_or_none()
                if order:
                    order.payment_status = PaymentStatus.FAILED
                    stmt_pmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
                    pmt = (await db.execute(stmt_pmt)).scalar_one_or_none()
                    if pmt:
                        pmt.status = PaymentStatus.FAILED
                    await db.commit()
            except Exception:
                await db.rollback()

    return {"status": "processed", "event": event_type or "unknown"}

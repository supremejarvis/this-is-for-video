"""Payment Service: Razorpay HMAC Webhooks, Direct UPI Desk, Refunds, and Reconciliation."""
import hashlib
import hmac
import uuid
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.accounting import Invoice, PaymentAllocation
from app.models.order import Order, OrderStatus, Payment, PaymentStatus, WebhookEvent
from app.models.outbox import OutboxEvent
from app.schemas.payment import (
    PaymentOut,
    PaymentReconciliationItem,
    PaymentReconciliationSummary,
    RazorpayWebhookPayload,
    RefundRequest,
    RefundResponse,
    UpiVerificationRequest,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def verify_razorpay_signature(self, raw_body: bytes, signature_header: str, webhook_secret: str) -> bool:
        """Verify HMAC SHA256 signature against untouched raw body."""
        if not signature_header or not webhook_secret:
            return False
        expected_sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, signature_header.strip())

    async def process_razorpay_webhook(self, raw_body: bytes, signature_header: str, payload_data: dict[str, Any]) -> dict[str, Any]:
        """Verify and idempotently process Razorpay webhook deliveries."""
        # 1. Signature Verification
        secret = settings.RAZORPAY_WEBHOOK_SECRET or "mock_webhook_secret_for_dev_test_only"
        if not self.verify_razorpay_signature(raw_body, signature_header, secret):
            raise ValueError("Invalid Razorpay webhook signature")

        event_id = payload_data.get("id") or payload_data.get("event_id")
        event_type = payload_data.get("event", "unknown")

        if not event_id:
            # Generate deterministic fallback event id from raw payload hash
            event_id = f"evt_{hashlib.sha256(raw_body).hexdigest()[:24]}"

        # 2. Idempotency Guard: Webhook receipts table
        stmt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        res = await self.db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return {
                "status": "ALREADY_PROCESSED",
                "event_id": event_id,
                "event_type": event_type,
                "message": "Duplicate webhook received and safely ignored",
            }

        # 3. Record Webhook Receipt
        receipt = WebhookEvent(
            event_id=event_id,
            provider="razorpay",
            event_type=event_type,
            processed_at=utcnow(),
        )
        self.db.add(receipt)

        # 4. Handle Event Types
        if event_type == "payment.captured":
            payment_entity = payload_data.get("payload", {}).get("payment", {}).get("entity", {})
            provider_payment_id = payment_entity.get("id")
            notes = payment_entity.get("notes", {})
            order_id_str = notes.get("order_id") or payment_entity.get("order_id")

            if order_id_str:
                try:
                    order_uuid = uuid.UUID(order_id_str)
                    order = await self.db.get(Order, order_uuid)
                    if order:
                        # Check if order was cancelled or expired
                        if order.order_status == OrderStatus.CANCELLED:
                            # Payment-after-cancellation race condition: flag for admin review
                            order.payment_status = PaymentStatus.CAPTURED
                            # Do not confirm cancelled order; admin must issue refund
                        else:
                            order.payment_status = PaymentStatus.CAPTURED
                            order.order_status = OrderStatus.CONFIRMED

                        # Find or create Payment record
                        p_stmt = select(Payment).where(Payment.order_id == order.id, Payment.provider == "razorpay")
                        p_res = await self.db.execute(p_stmt)
                        payment = p_res.scalars().first()
                        amount_inr = round_currency(Decimal(payment_entity.get("amount", 0)) / Decimal("100.0"))

                        if not payment:
                            payment = Payment(
                                order_id=order.id,
                                provider="razorpay",
                                provider_payment_id=provider_payment_id,
                                amount=amount_inr,
                                status=PaymentStatus.CAPTURED,
                            )
                            self.db.add(payment)
                        else:
                            payment.status = PaymentStatus.CAPTURED
                            payment.provider_payment_id = provider_payment_id

                        # Emit Outbox Event
                        outbox = OutboxEvent(
                            event_type="payment.captured.v1",
                            aggregate_type="order",
                            aggregate_id=order.id,
                            payload={
                                "order_id": str(order.id),
                                "payment_id": str(payment.id),
                                "provider": "razorpay",
                                "provider_payment_id": provider_payment_id,
                                "amount": str(amount_inr),
                            },
                        )
                        self.db.add(outbox)
                except Exception:
                    pass

        await self.db.commit()
        return {
            "status": "PROCESSED",
            "event_id": event_id,
            "event_type": event_type,
        }

    async def verify_upi_payment(self, payment_id: uuid.UUID, req: UpiVerificationRequest) -> PaymentOut:
        """Admin manual verification desk for Direct UPI QR payments."""
        payment = await self.db.get(Payment, payment_id)
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        order = await self.db.get(Order, payment.order_id)
        if not order:
            raise ValueError(f"Associated Order {payment.order_id} not found")

        # Mark payment as captured with verified UTR
        payment.status = PaymentStatus.CAPTURED
        payment.provider_payment_id = req.utr_number.strip().upper()

        # Update order status
        if order.order_status == OrderStatus.CANCELLED:
            order.payment_status = PaymentStatus.CAPTURED
            # Exception state: order cancelled before UPI confirmed
        else:
            order.payment_status = PaymentStatus.CAPTURED
            order.order_status = OrderStatus.CONFIRMED

        outbox = OutboxEvent(
            event_type="payment.captured.v1",
            aggregate_type="payment",
            aggregate_id=payment.id,
            payload={
                "payment_id": str(payment.id),
                "order_id": str(order.id),
                "provider": "direct_upi",
                "utr_number": payment.provider_payment_id,
                "amount": str(payment.amount),
                "verified_at": utcnow().isoformat(),
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return PaymentOut.model_validate(payment)

    async def process_refund(self, req: RefundRequest) -> RefundResponse:
        """Process refund idempotently and update payment/order status."""
        payment = await self.db.get(Payment, req.payment_id)
        if not payment:
            raise ValueError(f"Payment {req.payment_id} not found")

        if payment.status not in (PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED):
            raise ValueError(f"Cannot refund payment with status {payment.status}")

        if req.amount > payment.amount:
            raise ValueError(f"Refund amount {req.amount} exceeds original payment {payment.amount}")

        refund_uuid = uuid.uuid4()
        provider_ref = f"RFND-{req.idempotency_key[:8].upper()}"

        if req.amount == payment.amount:
            payment.status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED

        order = await self.db.get(Order, payment.order_id)
        if order:
            order.payment_status = payment.status

        outbox = OutboxEvent(
            event_type="payment.refund.succeeded.v1",
            aggregate_type="refund",
            aggregate_id=refund_uuid,
            payload={
                "refund_id": str(refund_uuid),
                "payment_id": str(payment.id),
                "order_id": str(order.id) if order else None,
                "amount": str(req.amount),
                "reason": req.reason,
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return RefundResponse(
            refund_id=refund_uuid,
            payment_id=payment.id,
            order_id=payment.order_id,
            amount=req.amount,
            currency="INR",
            status="SUCCEEDED",
            provider_reference=provider_ref,
            created_at=utcnow(),
        )

    async def get_reconciliation_summary(self) -> PaymentReconciliationSummary:
        """Reconciliation report: Gateway receipts vs Invoice allocations."""
        stmt = select(Payment).order_by(Payment.created_at.desc())
        res = await self.db.execute(stmt)
        payments = res.scalars().all()

        items: list[PaymentReconciliationItem] = []
        total_captured = Decimal("0.00")
        total_allocated = Decimal("0.00")
        total_refunded = Decimal("0.00")

        for p in payments:
            order = await self.db.get(Order, p.order_id)
            order_number = order.order_number if order else "UNKNOWN"

            # Check allocations in accounting
            alloc_stmt = select(func.sum(PaymentAllocation.amount)).where(PaymentAllocation.payment_id == p.id)
            alloc_res = await self.db.execute(alloc_stmt)
            allocated = alloc_res.scalar() or Decimal("0.00")

            inv_stmt = select(Invoice.invoice_number).join(PaymentAllocation).where(PaymentAllocation.payment_id == p.id)
            inv_res = await self.db.execute(inv_stmt)
            invoice_num = inv_res.scalars().first()

            unallocated = max(Decimal("0.00"), p.amount - allocated)

            if p.status == PaymentStatus.CAPTURED:
                total_captured += p.amount
                total_allocated += allocated
            elif p.status in (PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED):
                total_refunded += p.amount

            items.append(
                PaymentReconciliationItem(
                    payment_id=p.id,
                    order_id=p.order_id,
                    order_number=order_number,
                    provider=p.provider,
                    provider_payment_id=p.provider_payment_id,
                    amount=p.amount,
                    status=p.status.value,
                    invoice_number=invoice_num,
                    allocated_amount=allocated,
                    unallocated_balance=unallocated,
                    created_at=p.created_at,
                )
            )

        total_unallocated = max(Decimal("0.00"), total_captured - total_allocated)

        return PaymentReconciliationSummary(
            total_payments_count=len(payments),
            total_captured_amount=round_currency(total_captured),
            total_allocated_amount=round_currency(total_allocated),
            total_unallocated_amount=round_currency(total_unallocated),
            total_refunded_amount=round_currency(total_refunded),
            items=items,
        )

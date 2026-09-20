"""Pydantic schemas for Payments, Razorpay Webhooks, Direct UPI Verification, and Refunds."""
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    provider: str
    provider_payment_id: str | None
    amount: Decimal
    status: str
    created_at: datetime


class UpiVerificationRequest(BaseModel):
    utr_number: str = Field(min_length=6, max_length=50, description="Bank UTR / UPI Transaction Reference")
    notes: str | None = None


class RefundRequest(BaseModel):
    order_id: UUID
    payment_id: UUID
    amount: Decimal = Field(gt=0, description="Authoritative refund amount in INR")
    reason: str = Field(min_length=3, max_length=255)
    idempotency_key: str = Field(min_length=8, max_length=128)


class RefundResponse(BaseModel):
    refund_id: UUID
    payment_id: UUID
    order_id: UUID
    amount: Decimal
    currency: str = "INR"
    status: str
    provider_reference: str
    created_at: datetime


class RazorpayWebhookPayload(BaseModel):
    entity: str | None = None
    account_id: str | None = None
    event: str
    contains: list[str] = []
    payload: dict[str, Any]
    created_at: int | None = None


class WebhookReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: str
    provider: str
    event_type: str
    processed_at: datetime


class PaymentReconciliationItem(BaseModel):
    payment_id: UUID
    order_id: UUID
    order_number: str
    provider: str
    provider_payment_id: str | None
    amount: Decimal
    status: str
    invoice_number: str | None
    allocated_amount: Decimal
    unallocated_balance: Decimal
    created_at: datetime


class PaymentReconciliationSummary(BaseModel):
    total_payments_count: int
    total_captured_amount: Decimal
    total_allocated_amount: Decimal
    total_unallocated_amount: Decimal
    total_refunded_amount: Decimal
    items: list[PaymentReconciliationItem]

"""Pydantic Schemas for Admin Order Management, Snapshots, and Saga State."""
from datetime import datetime
from decimal import Decimal
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import FulfilmentStatus, OrderStatus, PaymentStatus, ReplacementStatus
from app.models.saga import SagaStatus, SagaStepStatus


class AdminOrderItemSnapshot(BaseModel):
    id: uuid.UUID
    sku: str
    quantity: int
    unit_price: Decimal
    line_gross: Decimal
    taxable_base: Decimal
    product_gst: Decimal
    gst_rate: Decimal

    model_config = ConfigDict(from_attributes=True)


class AdminOrderAddressSnapshot(BaseModel):
    id: uuid.UUID
    address_type: str
    full_name: str
    phone: str
    email: str | None = None
    address_line1: str
    address_line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    company_name: str | None = None
    gstin: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SagaStepItem(BaseModel):
    id: uuid.UUID
    step_name: str
    command_id: str
    status: SagaStepStatus
    attempts: int
    result_reference: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SagaInstanceDetail(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    state: SagaStatus
    current_step: str
    version: int
    deadline: datetime
    last_error: str | None = None
    steps: list[SagaStepItem] = []

    model_config = ConfigDict(from_attributes=True)


class AdminOrderListItem(BaseModel):
    id: uuid.UUID
    order_number: str
    order_status: OrderStatus
    payment_status: PaymentStatus
    fulfilment_status: FulfilmentStatus
    subtotal_taxable: Decimal
    product_gst: Decimal
    shipping_base: Decimal
    shipping_gst: Decimal
    cod_surcharge: Decimal
    total_payable: Decimal
    currency: str
    customer_name: str | None = None
    customer_phone: str | None = None
    company_name: str | None = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminOrderListResponse(BaseModel):
    items: list[AdminOrderListItem]
    total: int
    page: int
    page_size: int


class AdminOrderDetailResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    quote_id: uuid.UUID | None = None
    version: int
    order_status: OrderStatus
    payment_status: PaymentStatus
    fulfilment_status: FulfilmentStatus
    replacement_status: ReplacementStatus
    subtotal_taxable: Decimal
    product_gst: Decimal
    shipping_base: Decimal
    shipping_gst: Decimal
    cod_surcharge: Decimal
    total_payable: Decimal
    currency: str
    user_id: uuid.UUID | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    company_name: str | None = None
    gstin: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[AdminOrderItemSnapshot] = []
    address: AdminOrderAddressSnapshot | None = None
    saga: SagaInstanceDetail | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminOrderCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255, description="Audited cancellation reason")


class AdminOrderConfirmRequest(BaseModel):
    payment_reference: str | None = Field(None, max_length=100, description="Optional manual or bank payment reference")
    notes: str | None = Field(None, max_length=255)

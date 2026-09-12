"""Order and Payment Schemas for Authoritative Persistence."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OrderItemInput(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    quantity: int = Field(..., gt=0, le=100000)
    variant_id: uuid.UUID | None = None


class CustomerInfoInput(BaseModel):
    name: str = Field(default="Valued Customer", max_length=100)
    phone: str = Field(default="9825012345", max_length=20)
    email: str | None = Field(default=None, max_length=100)


class AddressInput(BaseModel):
    address_line1: str = Field(default="", max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str = Field(default="Ahmedabad", max_length=100)
    state: str = Field(default="Gujarat", max_length=100)
    pincode: str = Field(default="382430", min_length=6, max_length=6)
    state_code: str | None = Field(default="24", max_length=10)


class CreateOrderRequest(BaseModel):
    idempotency_key: str | None = Field(default=None, max_length=100)
    quote_id: uuid.UUID | None = None
    items: list[OrderItemInput] = Field(default_factory=list)
    destination_pincode: str = Field(default="382430", min_length=6, max_length=6)
    customer: CustomerInfoInput = Field(default_factory=CustomerInfoInput)
    shipping_address: AddressInput = Field(default_factory=AddressInput)
    payment_method: str = Field(default="RAZORPAY", max_length=50)
    claim_gst: bool = False
    gstin: str | None = Field(default=None, max_length=20)
    company_name: str | None = Field(default=None, max_length=150)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    quantity: int
    unit_price: Decimal
    line_gross: Decimal
    taxable_base: Decimal
    product_gst: Decimal
    gst_rate: Decimal


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    quote_id: uuid.UUID | None = None
    order_status: str
    payment_status: str
    fulfilment_status: str
    replacement_status: str
    subtotal_taxable: Decimal
    product_gst: Decimal
    shipping_base: Decimal
    shipping_gst: Decimal
    cod_surcharge: Decimal
    total_payable: Decimal
    currency: str
    items: list[OrderItemResponse] = Field(default_factory=list)
    created_at: datetime


class UpdateOrderStatusRequest(BaseModel):
    order_status: str | None = None
    fulfilment_status: str | None = None
    awb_number: str | None = None
    carrier: str | None = None
    notes: str | None = None


class RazorpayCreateOrderRequest(BaseModel):
    order_id: uuid.UUID


class RazorpayCreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int  # in paise
    currency: str
    key_id: str


class RazorpayVerifyPaymentRequest(BaseModel):
    order_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RazorpayVerifyPaymentResponse(BaseModel):
    verified: bool
    order_number: str
    payment_status: str
    message: str

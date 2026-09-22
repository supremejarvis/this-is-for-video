"""Order and Payment Schemas for Authoritative Persistence."""
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrderItemInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sku: str = Field(..., min_length=1, max_length=50)
    quantity: int = Field(..., gt=0, le=100000)
    variant_id: uuid.UUID | None = None

    @field_validator("variant_id", mode="before")
    @classmethod
    def sanitize_variant_id(cls, v: object) -> uuid.UUID | None:
        if not v:
            return None
        if isinstance(v, uuid.UUID):
            return v
        if isinstance(v, str):
            try:
                return uuid.UUID(v.strip())
            except ValueError:
                return None
        return None


class CustomerInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=2, max_length=100, description="Customer full name")
    phone: str = Field(..., min_length=10, max_length=20, description="10-digit Indian phone number")
    email: str | None = Field(default=None, max_length=100, description="Customer email address")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Customer name must be at least 2 characters.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = "".join(c for c in v if c.isdigit())
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        elif len(clean) == 11 and clean.startswith("0"):
            clean = clean[1:]
        if len(clean) != 10 or clean[0] not in "6789":
            raise ValueError("Phone must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if "@" not in v or "." not in v:
                raise ValueError("Invalid email format.")
        return v


class AddressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address_line1: str = Field(..., min_length=3, max_length=255, description="Street / premises / building address")
    address_line2: str | None = Field(default=None, max_length=255, description="Apartment, suite, unit, etc.")
    landmark: str | None = Field(default=None, max_length=255, description="Nearby landmark")
    city: str = Field(..., min_length=2, max_length=100, description="City / District")
    state: str = Field(..., min_length=2, max_length=100, description="State / Province")
    pincode: str = Field(..., pattern=r"^[1-9][0-9]{5}$", description="Valid 6-digit Indian PIN code")
    state_code: str | None = Field(default=None, max_length=10, description="Statutory GST State Code")
    country: str = Field(default="India", max_length=50, description="Country")

    @field_validator("address_line1", "city", "state")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Address fields cannot be blank or whitespace.")
        return v


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    idempotency_key: str | None = Field(default=None, max_length=100)
    quote_id: uuid.UUID | None = None
    items: list[OrderItemInput] = Field(default_factory=list)
    destination_pincode: str | None = Field(default=None, pattern=r"^[1-9][0-9]{5}$")
    customer: CustomerInfoInput
    shipping_address: AddressInput
    payment_method: str = Field(default="RAZORPAY", max_length=50)
    claim_gst: bool = False
    gstin: str | None = Field(default=None, max_length=20)
    company_name: str | None = Field(default=None, max_length=150)


class OrderPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OrderItemInput] = Field(default_factory=list, min_length=1)
    destination_pincode: str | None = Field(default=None, pattern=r"^[1-9][0-9]{5}$")
    shipping_address: AddressInput | None = None
    payment_method: str = Field(default="PREPAID", max_length=50)
    channel: str = Field(default="B2C")
    idempotency_key: str | None = None


class OrderAddressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    address_type: str
    full_name: str
    phone: str
    email: str | None = None
    address_line1: str
    address_line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    state_code: str | None = None
    pincode: str
    country: str = "India"
    company_name: str | None = None
    gstin: str | None = None
    created_at: datetime


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
    user_id: uuid.UUID | None = None
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
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    company_name: str | None = None
    gstin: str | None = None
    items: list[OrderItemResponse] = Field(default_factory=list)
    address: OrderAddressResponse | None = None
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


class InitiateReplacementRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    caliper_photo_url: str = Field(..., min_length=1, max_length=500, description="URL to vernier caliper photo showing frame thickness")
    verified_frame_thickness: str = Field(..., min_length=1, max_length=50, description="Verified frame thickness in mm (e.g., '30mm')")


class InitiateReplacementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: uuid.UUID
    original_order_id: uuid.UUID
    status: str
    replacement_shipment_id: uuid.UUID
    message: str

"""Quote API Request and Response Schemas."""
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.pricing import PricingLineResult


class QuoteItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_\-\.]+$",
        description="Stock Keeping Unit (alphanumeric, dash, underscore, dot)"
    )
    variant_id: uuid.UUID | None = Field(
        default=None,
        description="ProductVariant UUID identifier"
    )
    quantity: int = Field(..., gt=0, description="Ordered quantity, must be positive integer")
    unit_price: Decimal | None = Field(
        default=None,
        description="Client-supplied price is forbidden; authoritative catalog price is loaded from database"
    )

    @model_validator(mode="after")
    def validate_identifier(self) -> "QuoteItemRequest":
        if not self.sku and not self.variant_id:
            raise ValueError("Either 'sku' or 'variant_id' must be provided.")
        return self


class CreateQuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[QuoteItemRequest] = Field(..., min_length=1)
    destination_pincode: str = Field(
        ...,
        pattern=r"^[1-9][0-9]{5}$",
        description="Valid 6-digit Indian PIN code (cannot begin with 0)"
    )
    channel: str = Field(
        default="B2C",
        description="Sales channel: B2C or B2B"
    )
    payment_method: str = Field(
        default="PREPAID",
        description="Payment method: PREPAID (UPI) or COD"
    )
    base_shipping: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    rounding_multiple: int = Field(default=5, ge=1, le=10)
    idempotency_key: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=r"^[a-zA-Z0-9_\-\.:]+$"
    )

    @field_validator("channel", mode="before")
    @classmethod
    def normalize_channel(cls, v: object) -> str:
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in ("B2C", "B2B"):
                return v_upper
        return "B2C"


class QuoteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quote_id: uuid.UUID
    quote_number: str
    idempotency_key: str | None = None
    calculation_version: str = "1.0.0"
    catalog_version: str = "1.0.0"
    destination_pincode: str
    items: list[PricingLineResult]
    subtotal_taxable: Decimal
    total_product_gst: Decimal
    total_product_gross: Decimal
    base_shipping: Decimal
    shipping_gst: Decimal
    shipping_total: Decimal
    shipping_gst_rate: Decimal = Field(default=Decimal("0.1800"))
    prepaid_total: Decimal
    cod_surcharge: Decimal
    cod_raw_total: Decimal
    cod_total: Decimal
    rounding_multiple: int
    cod_charge_rate: Decimal = Field(default=Decimal("0.0250"))
    cod_charge_raw: Decimal = Field(default=Decimal("0.00"))
    cod_rounding_adjustment: Decimal = Field(default=Decimal("0.00"))
    cod_payable_total: Decimal = Field(default=Decimal("0.00"))
    shipping_provider: str = Field(default="India Post")
    service_code: str = Field(default="Speed Post")
    rate_source: str = Field(default="Fallback Rate Table")
    rate_version: str = Field(default="v2025.1")
    is_live_rate: bool = Field(default=False)
    calculated_at: datetime
    server_time: datetime
    expires_at: datetime
    created_at: datetime

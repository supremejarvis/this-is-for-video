"""Statutory Pricing & Calculation Pydantic Schemas."""
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaxMode(StrEnum):
    GST_INCLUSIVE = "GST_INCLUSIVE"
    GST_EXCLUSIVE = "GST_EXCLUSIVE"


class PricingItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(..., min_length=1, max_length=50, description="Stock Keeping Unit")
    quantity: int = Field(..., gt=0, le=10000000, description="Ordered quantity, must be positive integer")
    unit_price: Decimal = Field(..., ge=Decimal("0.00"), le=Decimal("999999999999.99"), description="Configured unit price (NUMERIC 14,2)")
    gst_rate: Decimal = Field(
        default=Decimal("0.1800"),
        ge=Decimal("0.0000"),
        le=Decimal("0.2800"),
        description="Statutory GST rate as fraction (e.g. 0.1800 for 18%)"
    )
    hsn_code: str = Field(
        default="73269099",
        min_length=4,
        max_length=20,
        description="Statutory HSN code"
    )
    tax_mode: TaxMode = Field(
        default=TaxMode.GST_INCLUSIVE,
        description="B2C GST_INCLUSIVE or B2B GST_EXCLUSIVE"
    )


class PricingLineResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str
    quantity: int
    unit_price: Decimal
    line_gross: Decimal
    taxable_base: Decimal
    product_gst: Decimal
    tax_mode: TaxMode
    gst_rate: Decimal
    hsn_code: str = "73269099"


class OrderCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[PricingItemInput] = Field(..., min_length=1, description="Cart / order items")
    base_shipping: Decimal = Field(
        default=Decimal("0.00"),
        ge=Decimal("0.00"),
        le=Decimal("1000000.00"),
        description="Pre-tax base shipping fee"
    )
    rounding_multiple: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Admin upward rounding multiple for COD (e.g. 1 or 5)"
    )

    @field_validator("rounding_multiple")
    @classmethod
    def validate_rounding_multiple(cls, v: int) -> int:
        if v not in (1, 5, 10):
            raise ValueError("Rounding multiple must be 1, 5, or 10")
        return v


class OrderCalculationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lines: list[PricingLineResult]
    subtotal_taxable: Decimal
    total_product_gst: Decimal
    total_product_gross: Decimal
    base_shipping: Decimal
    shipping_gst: Decimal
    shipping_total: Decimal
    prepaid_total: Decimal
    cod_surcharge: Decimal
    cod_raw_total: Decimal
    cod_total: Decimal
    rounding_multiple: int
    shipping_gst_rate: Decimal = Decimal("0.1800")
    cod_charge_rate: Decimal = Decimal("0.0250")
    cod_charge_raw: Decimal = Decimal("0.00")
    cod_rounding_adjustment: Decimal = Decimal("0.00")
    cod_payable_total: Decimal = Decimal("0.00")


class PriceVersionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    variant_id: UUID
    product_id: UUID | None = Field(default=None, description="Optional parent product ID")
    currency: str = Field(default="INR", min_length=3, max_length=3)
    channel: str = Field(default="B2C", description="Sales channel / customer segment: B2C or B2B")
    min_quantity: int = Field(default=1, ge=1, le=10000000, description="Minimum order quantity / MOQ tier")
    unit_price: Decimal = Field(..., ge=Decimal("0.00"), le=Decimal("999999999999.99"), description="Configured unit price (NUMERIC 14,2)")
    gst_rate: Decimal = Field(
        default=Decimal("0.1800"),
        ge=Decimal("0.0000"),
        le=Decimal("0.2800"),
        description="Statutory GST rate fraction",
    )
    hsn_code: str = Field(default="73269099", min_length=4, max_length=20, description="Statutory HSN code")
    tax_mode: TaxMode = Field(default=TaxMode.GST_INCLUSIVE)
    valid_from: datetime | None = Field(default=None, description="Start timestamp of price interval")
    valid_to: datetime | None = Field(default=None, description="End timestamp of price interval")
    reason: str = Field(default="Standard price", min_length=2, max_length=255, description="Audit reason")


class PriceVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    variant_id: UUID | None = None
    product_id: UUID | None = None
    currency: str
    channel: str = "B2C"
    min_quantity: int = 1
    unit_price: Decimal
    gst_rate: Decimal
    hsn_code: str = "73269099"
    tax_mode: TaxMode
    valid_from: datetime
    valid_to: datetime | None
    reason: str = "Standard price"
    is_active_now: bool = False



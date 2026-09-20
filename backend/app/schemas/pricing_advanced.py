"""Pydantic schemas for Price Lists, Quantity Slabs, Tax Profiles, and Pricing Preview."""
import re
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.pricing_advanced import PriceListStatus, TaxProfileStatus


# ─────────────────────────────────────────────────────────────────────────────
# 1. CUSTOMER GROUP SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class CustomerGroupBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Unique code (e.g. RETAIL_B2C, CONTRACTOR_B2B)")
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        clean = v.strip().upper()
        if not re.match(r"^[A-Z0-9_]+$", clean):
            raise ValueError("Customer group code must contain only uppercase letters, digits, and underscores")
        return clean


class CustomerGroupCreate(CustomerGroupBase):
    company_id: UUID | None = None


class CustomerGroupResponse(CustomerGroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID


# ─────────────────────────────────────────────────────────────────────────────
# 2. PRICE LIST & PRICE RULE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class PriceRuleBase(BaseModel):
    variant_id: UUID
    min_qty: int = Field(default=1, ge=1, description="Inclusive minimum quantity slab")
    max_qty_exclusive: int | None = Field(default=None, ge=2, description="Exclusive maximum quantity slab (None for infinity)")
    unit_price: Decimal = Field(..., ge=Decimal("0.00"), description="Authoritative unit price in rupees")
    price_basis: str = Field(default="PER_UNIT", description="PER_UNIT or PER_PACK")
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_to: datetime | None = None

    @model_validator(mode="after")
    def validate_slabs_and_dates(self) -> "PriceRuleBase":
        if self.max_qty_exclusive is not None and self.max_qty_exclusive <= self.min_qty:
            raise ValueError("max_qty_exclusive must be strictly greater than min_qty")
        if self.valid_to is not None and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must be strictly after valid_from")
        return self


class PriceRuleCreate(PriceRuleBase):
    pass


class PriceRuleUpdate(BaseModel):
    min_qty: int | None = Field(default=None, ge=1)
    max_qty_exclusive: int | None = Field(default=None, ge=2)
    unit_price: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class PriceRuleResponse(PriceRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    price_list_id: UUID
    version: int


class PriceListBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    customer_group_id: UUID | None = None
    priority: int = Field(default=0, ge=0, description="Higher priority price list takes precedence")
    status: PriceListStatus = Field(default=PriceListStatus.ACTIVE)
    is_default: bool = Field(default=False)


class PriceListCreate(PriceListBase):
    company_id: UUID | None = None
    rules: list[PriceRuleCreate] = []


class PriceListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    customer_group_id: UUID | None = None
    priority: int | None = Field(default=None, ge=0)
    status: PriceListStatus | None = None
    is_default: bool | None = None


class PriceListResponse(PriceListBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_at: datetime
    rules: list[PriceRuleResponse] = []


# ─────────────────────────────────────────────────────────────────────────────
# 3. TAX PROFILE & TAX RULE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class TaxRuleBase(BaseModel):
    jurisdiction: str = Field(default="IN", max_length=50)
    component: str = Field(..., max_length=20, description="CGST, SGST, IGST")
    rate: Decimal = Field(..., ge=Decimal("0.0000"), le=Decimal("0.4000"), description="Tax rate fraction, e.g. 0.0900 (9%)")
    effective_from: datetime = Field(default_factory=datetime.utcnow)
    effective_to: datetime | None = None


class TaxRuleCreate(TaxRuleBase):
    pass


class TaxRuleResponse(TaxRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tax_profile_id: UUID


class TaxProfileBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    hsn_code: str = Field(..., min_length=4, max_length=20, description="Statutory HSN code e.g. 73269099")
    status: TaxProfileStatus = Field(default=TaxProfileStatus.ACTIVE)


class TaxProfileCreate(TaxProfileBase):
    company_id: UUID | None = None
    rules: list[TaxRuleCreate] = []


class TaxProfileResponse(TaxProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_at: datetime
    rules: list[TaxRuleResponse] = []


# ─────────────────────────────────────────────────────────────────────────────
# 4. PRICING PREVIEW SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class PricingPreviewRequest(BaseModel):
    variant_id: UUID
    quantity: int = Field(..., ge=1)
    customer_group_code: str | None = Field(default="RETAIL_B2C")
    customer_state_code: str = Field(default="24", description="GST State Code e.g. 24 for Gujarat")
    is_tax_inclusive: bool = Field(default=True, description="True for B2C inclusive, False for B2B taxable base")


class PricingPreviewResponse(BaseModel):
    variant_id: UUID
    quantity: int
    applied_unit_price: Decimal
    gross_amount: Decimal
    taxable_base: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    is_interstate: bool
    price_list_name: str
    rule_slab: str

"""Product and Variant Schemas with Structured Sizing."""
import re
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.product import FitMode


class ProductVariantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(..., min_length=2, max_length=50, description="SKU identifier (e.g. APE-SC-28MM-P1)")
    fit_mode: FitMode = Field(default=FitMode.EXACT, description="Sizing mode (EXACT, RANGE, UNIVERSAL, NOT_APPLICABLE)")
    frame_thickness_mm: Decimal | None = Field(default=None, ge=Decimal("1.00"), le=Decimal("150.00"), description="Thickness in mm for EXACT fit")
    min_thickness_mm: Decimal | None = Field(default=None, ge=Decimal("1.00"), le=Decimal("150.00"), description="Min thickness for RANGE fit")
    max_thickness_mm: Decimal | None = Field(default=None, ge=Decimal("1.00"), le=Decimal("150.00"), description="Max thickness for RANGE fit")
    display_label: str = Field(default="", max_length=100, description="Human readable display label")
    frame_thickness: str | None = Field(default=None, max_length=50, description="Optional raw text input to auto-parse (e.g. 28mm, 30 mm, universal)")
    pack_size: int = Field(default=1, gt=0, description="Pack quantity")
    initial_stock: int = Field(default=0, ge=0, description="Initial quantity on hand")

    @model_validator(mode="after")
    def validate_and_normalize_sizing(self) -> "ProductVariantCreate":
        # If raw frame_thickness string was passed, normalize and parse into structured fields
        if self.frame_thickness and (self.frame_thickness_mm is None and self.fit_mode == FitMode.EXACT):
            clean_str = self.frame_thickness.strip().lower()
            if clean_str in ("univ", "universal"):
                self.fit_mode = FitMode.UNIVERSAL
            elif clean_str in ("not_applicable", "not applicable", "n/a", "na", "none"):
                self.fit_mode = FitMode.NOT_APPLICABLE
            elif "-" in clean_str:
                match = re.match(r"([0-9.]+)\s*-\s*([0-9.]+)", clean_str)
                if match:
                    self.fit_mode = FitMode.RANGE
                    self.min_thickness_mm = Decimal(match.group(1))
                    self.max_thickness_mm = Decimal(match.group(2))
                else:
                    raise ValueError(f"Invalid range frame thickness string: '{self.frame_thickness}'")
            else:
                match = re.match(r"([0-9.]+)", clean_str)
                if match:
                    self.frame_thickness_mm = Decimal(match.group(1))
                    self.fit_mode = FitMode.EXACT
                else:
                    raise ValueError(f"Invalid frame thickness string: '{self.frame_thickness}'")

        # Validate invariants per fit_mode strictly
        if self.fit_mode == FitMode.EXACT:
            if self.frame_thickness_mm is None or self.frame_thickness_mm <= 0:
                raise ValueError("frame_thickness_mm > 0 is required when fit_mode is EXACT.")
            if self.min_thickness_mm is not None or self.max_thickness_mm is not None:
                raise ValueError("min_thickness_mm and max_thickness_mm must be null when fit_mode is EXACT.")
            if not self.display_label:
                self.display_label = f"{self.frame_thickness_mm:g} mm"
            self.frame_thickness = f"{self.frame_thickness_mm:g}mm"

        elif self.fit_mode == FitMode.RANGE:
            if self.frame_thickness_mm is not None:
                raise ValueError("frame_thickness_mm must be null when fit_mode is RANGE.")
            if self.min_thickness_mm is None or self.min_thickness_mm <= 0 or self.max_thickness_mm is None or self.max_thickness_mm <= 0:
                raise ValueError("min_thickness_mm > 0 and max_thickness_mm > 0 are required when fit_mode is RANGE.")
            if self.min_thickness_mm > self.max_thickness_mm:
                raise ValueError("min_thickness_mm must be less than or equal to max_thickness_mm.")
            if not self.display_label:
                self.display_label = f"{self.min_thickness_mm:g}-{self.max_thickness_mm:g} mm"
            self.frame_thickness = f"{self.min_thickness_mm:g}-{self.max_thickness_mm:g}mm"

        elif self.fit_mode in (FitMode.UNIVERSAL, FitMode.NOT_APPLICABLE):
            if self.frame_thickness_mm is not None or self.min_thickness_mm is not None or self.max_thickness_mm is not None:
                raise ValueError(f"{self.fit_mode.value} variants must not have thickness values (frame_thickness_mm, min_thickness_mm, max_thickness_mm must all be null).")
            if self.fit_mode == FitMode.UNIVERSAL:
                if not self.display_label:
                    self.display_label = "Universal"
                self.frame_thickness = "universal"
            else:
                if not self.display_label:
                    self.display_label = "Not Applicable"
                self.frame_thickness = "N/A"

        return self


class ProductVariantUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pack_size: int | None = Field(default=None, gt=0)
    is_active: bool | None = Field(default=None)
    display_label: str | None = Field(default=None, max_length=100)
    version: int | None = Field(default=None, ge=1, description="Expected entity version for optimistic concurrency control")


class ProductVariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    sku: str
    fit_mode: FitMode
    frame_thickness_mm: Decimal | None
    min_thickness_mm: Decimal | None
    max_thickness_mm: Decimal | None
    display_label: str
    frame_thickness: str
    pack_size: int
    is_active: bool
    is_archived: bool
    version: int = 1
    available_stock: int = 0
    unit_price: Decimal | None = None
    tax_mode: str | None = None
    created_at: datetime


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku_prefix: str = Field(..., min_length=2, max_length=50, description="SKU prefix (e.g. APE-SC)")
    name: str = Field(..., min_length=2, max_length=255, description="Product title")
    description: str | None = Field(default=None, description="Detailed product description")
    hsn_code: str = Field(default="73269099", min_length=4, max_length=20, description="Statutory HSN code")
    variants: list[ProductVariantCreate] = Field(default_factory=list, description="Initial variants to configure")


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None)
    hsn_code: str | None = Field(default=None, min_length=4, max_length=20)
    is_active: bool | None = Field(default=None)
    version: int | None = Field(default=None, ge=1, description="Expected entity version for optimistic concurrency control")


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku_prefix: str
    name: str
    description: str | None
    hsn_code: str
    is_active: bool
    is_archived: bool
    version: int = 1
    variants: list[ProductVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

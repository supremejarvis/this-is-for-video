"""Pydantic schemas for Category DAG taxonomy, Attribute Axes, Variant Generation, and Media."""
import re
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.catalog_advanced import AttributeDataType, CategoryStatus, MediaStatus


# ─────────────────────────────────────────────────────────────────────────────
# 1. CATEGORY SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Category name")
    slug: str = Field(..., min_length=2, max_length=100, description="URL-friendly slug")
    parent_id: UUID | None = Field(default=None, description="Parent category UUID or None for root")
    status: CategoryStatus = Field(default=CategoryStatus.ACTIVE)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", clean):
            raise ValueError("Slug must contain only lowercase alphanumeric characters and hyphens")
        return clean


class CategoryCreate(CategoryBase):
    company_id: UUID | None = Field(default=None)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    slug: str | None = Field(default=None, min_length=2, max_length=100)
    parent_id: UUID | None = Field(default=None)
    status: CategoryStatus | None = Field(default=None)


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    parent_id: UUID | None
    name: str
    slug: str
    status: CategoryStatus
    created_at: datetime
    updated_at: datetime


class CategoryTreeResponse(CategoryResponse):
    children: list["CategoryTreeResponse"] = []


# ─────────────────────────────────────────────────────────────────────────────
# 2. ATTRIBUTE & VALUE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class AttributeValueBase(BaseModel):
    normalized_value: str = Field(..., min_length=1, max_length=100, description="Unique normalized value (e.g. 28mm, SS304)")
    label: str = Field(..., min_length=1, max_length=100, description="Human readable display label")
    sort_order: int = Field(default=0, ge=0)


class AttributeValueCreate(AttributeValueBase):
    pass


class AttributeValueResponse(AttributeValueBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    attribute_id: UUID


class AttributeBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Attribute code (e.g. frame_thickness)")
    label: str = Field(..., min_length=2, max_length=100, description="Attribute label (e.g. Frame Thickness)")
    data_type: AttributeDataType = Field(default=AttributeDataType.SELECT)
    unit: str | None = Field(default=None, max_length=20, description="Measurement unit (e.g. mm, g)")
    is_variant_axis: bool = Field(default=False, description="Whether this attribute forms a variant axis")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        clean = v.strip().lower()
        if not re.match(r"^[a-z0-9_]+$", clean):
            raise ValueError("Attribute code must contain only lowercase letters, digits, and underscores")
        return clean


class AttributeCreate(AttributeBase):
    company_id: UUID | None = Field(default=None)
    initial_values: list[AttributeValueCreate] = []


class AttributeUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=100)
    unit: str | None = Field(default=None, max_length=20)
    is_variant_axis: bool | None = Field(default=None)


class AttributeResponse(AttributeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_at: datetime
    values: list[AttributeValueResponse] = []


# ─────────────────────────────────────────────────────────────────────────────
# 3. VARIANT COMBINATION PREVIEW & BATCH GENERATION SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class AxisOptionSelection(BaseModel):
    attribute_id: UUID
    value_ids: list[UUID] = Field(..., min_length=1, description="Selected values for this axis")


class VariantCombinationPreviewRequest(BaseModel):
    axes: list[AxisOptionSelection] = Field(..., min_length=1, max_length=5, description="Selected variant axes and values")
    excluded_combinations: list[list[UUID]] = Field(default=[], description="List of value_id tuples to exclude")


class VariantCombinationPreviewItem(BaseModel):
    combination_key: str
    options: list[dict[str, Any]]  # [{"attribute_code": "frame_thickness", "value_id": "...", "label": "30mm"}]
    suggested_sku: str
    suggested_label: str
    already_exists: bool = False


class VariantCombinationPreviewResponse(BaseModel):
    total_combinations: int
    new_combinations_count: int
    existing_combinations_count: int
    items: list[VariantCombinationPreviewItem]


class VariantBatchGenerateItem(BaseModel):
    combination_key: str
    sku: str = Field(..., min_length=2, max_length=50)
    display_label: str = Field(..., min_length=1, max_length=100)
    option_value_ids: list[UUID] = Field(..., min_length=1)
    pack_size: int = Field(default=1, gt=0)
    initial_stock: int = Field(default=0, ge=0)
    initial_b2c_price: Decimal = Field(..., ge=Decimal("0.01"))
    weight_g: int = Field(default=20, ge=1)
    length_mm: int = Field(default=45, ge=1)
    width_mm: int = Field(default=35, ge=1)
    height_mm: int = Field(default=20, ge=1)


class VariantBatchGenerateRequest(BaseModel):
    variants: list[VariantBatchGenerateItem] = Field(..., min_length=1, max_length=100)


class VariantBatchGenerateResponse(BaseModel):
    created_count: int
    created_variants: list[dict[str, Any]]
    skipped_count: int


# ─────────────────────────────────────────────────────────────────────────────
# 4. BULK EXPORT / IMPORT SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class VariantImportRow(BaseModel):
    row_number: int
    sku: str
    name: str
    display_label: str
    pack_size: int
    price: Decimal
    stock: int
    weight_g: int | None = None
    status: str = "ACTIVE"


class VariantImportReport(BaseModel):
    dry_run: bool
    total_rows: int
    valid_rows: int
    error_count: int
    errors: list[str]
    applied_count: int


# ─────────────────────────────────────────────────────────────────────────────
# 5. MEDIA ASSET SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class MediaAssetCreate(BaseModel):
    storage_key: str = Field(..., min_length=5, max_length=255)
    url: str = Field(..., min_length=5, max_length=500)
    mime_type: str = Field(..., max_length=100)
    size_bytes: int = Field(..., gt=0)
    checksum: str = Field(..., min_length=32, max_length=64)


class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    storage_key: str
    url: str
    mime_type: str
    size_bytes: int
    checksum: str
    status: MediaStatus
    created_at: datetime

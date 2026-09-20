"""Pydantic schemas for Returns Management, Caliper Verification, and Item Disposition."""
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ReturnItemCreate(BaseModel):
    order_item_id: UUID
    requested_qty: int = Field(gt=0)


class ReturnCreateRequest(BaseModel):
    order_id: UUID
    reason: str = Field(min_length=3, max_length=255)
    caliper_photo_url: str | None = None
    items: list[ReturnItemCreate] = Field(min_length=1)


class CaliperInspectionRequest(BaseModel):
    verified_frame_thickness_mm: Decimal = Field(gt=0, description="Measured thickness in mm, e.g. 28.00, 30.00, 35.00, 40.00")
    approval: bool
    notes: str | None = None


class ItemInspectionDetail(BaseModel):
    return_item_id: UUID
    received_qty: int = Field(ge=0)
    accepted_qty: int = Field(ge=0)
    disposition: str = Field(default="RESTOCK_INVENTORY")  # RESTOCK_INVENTORY, SCRAP_DEFECTIVE, REFURBISH


class ReturnReceiveRequest(BaseModel):
    warehouse_id: UUID = Field(description="Target warehouse receiving the physical restock")
    inspection_items: list[ItemInspectionDetail] = Field(min_length=1)
    inspector_notes: str | None = None


class ReturnItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    return_id: UUID
    order_item_id: UUID
    requested_qty: int
    received_qty: int
    accepted_qty: int
    disposition: str
    inspected_at: datetime | None = None
    inspector_id: UUID | None = None


class ReturnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    order_id: UUID
    reason: str
    status: str
    caliper_photo_url: str | None = None
    verified_frame_thickness_mm: Decimal | None = None
    created_at: datetime
    updated_at: datetime
    items: list[ReturnItemOut] = []

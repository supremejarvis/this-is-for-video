"""Pydantic Schemas for Multi-Warehouse Inventory, Balances, Transfers, and Counts."""
from datetime import datetime
from decimal import Decimal
from typing import Any
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.warehouse import StockCountStatus, TransferStatus, WarehouseStatus


class WarehouseBase(BaseModel):
    code: str = Field(..., max_length=50, description="Unique code e.g. KATHWADA_GIDC_MAIN")
    name: str = Field(..., max_length=100)
    pincode: str = Field("382430", min_length=6, max_length=6)
    city: str = Field("Ahmedabad", max_length=100)
    state: str = Field("Gujarat", max_length=100)
    address_line: str = Field("Plot 108, Kathwada GIDC", max_length=255)
    is_default: bool = False


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseResponse(WarehouseBase):
    id: uuid.UUID
    company_id: uuid.UUID
    status: WarehouseStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockBalanceItem(BaseModel):
    id: uuid.UUID  # stock_item_id
    warehouse_id: uuid.UUID
    warehouse_code: str
    warehouse_name: str
    variant_id: uuid.UUID
    sku: str
    product_name: str | None = None
    location_code: str | None = None
    on_hand: int
    reserved: int
    quarantined: int
    available: int
    version: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockBalanceListResponse(BaseModel):
    items: list[StockBalanceItem]
    total: int


class StockAdjustmentRequest(BaseModel):
    warehouse_id: uuid.UUID
    variant_id: uuid.UUID
    sku: str
    quantity_delta: int = Field(..., description="Positive for addition, negative for reduction")
    reason: str = Field(..., min_length=3, max_length=255)
    idempotency_key: str | None = None


class StockAdjustmentResponse(BaseModel):
    stock_item_id: uuid.UUID
    warehouse_id: uuid.UUID
    variant_id: uuid.UUID
    sku: str
    quantity_delta: int
    resulting_on_hand: int
    resulting_reserved: int
    resulting_available: int
    reason: str
    idempotency_key: str
    adjusted_at: datetime


class TransferItemCreate(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(..., gt=0)


class TransferItemResponse(BaseModel):
    id: uuid.UUID
    variant_id: uuid.UUID
    sku: str | None = None
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class StockTransferCreate(BaseModel):
    from_warehouse_id: uuid.UUID
    to_warehouse_id: uuid.UUID
    items: list[TransferItemCreate] = Field(..., min_length=1)
    notes: str | None = None


class StockTransferResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    from_warehouse_id: uuid.UUID
    to_warehouse_id: uuid.UUID
    status: TransferStatus
    notes: str | None = None
    created_at: datetime
    received_at: datetime | None = None
    items: list[TransferItemResponse]

    model_config = ConfigDict(from_attributes=True)


class StockCountCreate(BaseModel):
    warehouse_id: uuid.UUID


class CountItemReconcile(BaseModel):
    stock_item_id: uuid.UUID
    counted_qty: int = Field(..., ge=0)


class StockCountReconcileRequest(BaseModel):
    items: list[CountItemReconcile] = Field(..., min_length=1)


class StockCountItemResponse(BaseModel):
    id: uuid.UUID
    stock_item_id: uuid.UUID
    sku: str | None = None
    expected_qty: int
    counted_qty: int | None = None
    variance: int | None = None

    model_config = ConfigDict(from_attributes=True)


class StockCountResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    warehouse_id: uuid.UUID
    status: StockCountStatus
    count_date: datetime
    items: list[StockCountItemResponse]

    model_config = ConfigDict(from_attributes=True)

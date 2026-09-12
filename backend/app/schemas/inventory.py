"""Inventory & Stock Ledger Schemas with Idempotency and Signed Deltas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.inventory import MovementType


class InventoryStockReceiptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(..., min_length=2, max_length=50, description="SKU identifier")
    quantity: int = Field(..., gt=0, description="Stock receipt quantity, must be positive")
    idempotency_key: str | None = Field(default=None, max_length=100, description="Unique idempotency key")
    reference_id: str | None = Field(default=None, max_length=100, description="PO/Batch reference number")
    source_reference_type: str = Field(default="PO", max_length=50, description="Source reference type")
    reason: str | None = Field(default="Stock receipt from manufacturing", max_length=255)


class InventoryAdjustmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str = Field(..., min_length=2, max_length=50, description="SKU identifier")
    quantity_delta: int = Field(..., description="Quantity delta (positive or negative, non-zero)")
    idempotency_key: str | None = Field(default=None, max_length=100, description="Unique idempotency key")
    reference_id: str | None = Field(default=None, max_length=100, description="Adjustment ticket or RMA ID")
    source_reference_type: str = Field(default="MANUAL_ADJUSTMENT", max_length=50, description="Source reference type")
    reason: str = Field(..., min_length=3, max_length=255, description="Mandatory reason for audit trail")


class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    variant_id: UUID
    sku: str
    quantity_on_hand: int
    quantity_reserved: int
    available_stock: int
    updated_at: datetime


class InventoryMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inventory_item_id: UUID
    variant_id: UUID
    sku: str = ""
    movement_type: MovementType
    idempotency_key: str
    quantity_delta_on_hand: int
    quantity_delta_reserved: int
    resulting_quantity_on_hand: int
    resulting_quantity_reserved: int
    source_reference_type: str
    source_reference_id: str | None
    # Compatibility fields
    quantity_delta: int
    quantity_on_hand_after: int
    quantity_reserved_after: int
    reference_id: str | None
    reason: str | None
    actor_id: UUID | None
    created_by_user_id: UUID | None
    created_at: datetime

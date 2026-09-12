"""Inventory and Stock Ledger Endpoints."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.schemas.inventory import (
    InventoryAdjustmentRequest,
    InventoryItemResponse,
    InventoryMovementResponse,
    InventoryStockReceiptRequest,
)
from app.services.inventory import DuplicateIdempotencyKeyError, InventoryService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/items", response_model=list[InventoryItemResponse])
async def list_inventory_items(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InventoryItemResponse]:
    """List stock levels across all variants."""
    items = await InventoryService.list_inventory_items(db, limit=limit, offset=offset)
    return [
        InventoryItemResponse(
            id=item.id,
            variant_id=item.variant_id,
            sku=item.sku,
            quantity_on_hand=item.quantity_on_hand,
            quantity_reserved=item.quantity_reserved,
            available_stock=max(0, item.quantity_on_hand - item.quantity_reserved),
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.post("/receipt", response_model=InventoryMovementResponse, status_code=status.HTTP_201_CREATED)
async def receive_stock(
    data: InventoryStockReceiptRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InventoryMovementResponse:
    """Record stock arrival and append receipt transaction to immutable ledger."""
    try:
        _item, movement = await InventoryService.receive_stock(
            session=db,
            sku=data.sku,
            quantity=data.quantity,
            idempotency_key=data.idempotency_key,
            reference_id=data.reference_id,
            source_reference_type=data.source_reference_type,
            reason=data.reason,
            user_id=current_user.id,
        )
        await db.commit()
        return InventoryMovementResponse(
            id=movement.id,
            inventory_item_id=movement.inventory_item_id,
            variant_id=movement.variant_id,
            sku=data.sku,
            movement_type=movement.movement_type,
            idempotency_key=movement.idempotency_key,
            quantity_delta_on_hand=movement.quantity_delta_on_hand,
            quantity_delta_reserved=movement.quantity_delta_reserved,
            resulting_quantity_on_hand=movement.resulting_quantity_on_hand,
            resulting_quantity_reserved=movement.resulting_quantity_reserved,
            source_reference_type=movement.source_reference_type,
            source_reference_id=movement.source_reference_id,
            quantity_delta=movement.quantity_delta,
            quantity_on_hand_after=movement.quantity_on_hand_after,
            quantity_reserved_after=movement.quantity_reserved_after,
            reference_id=movement.reference_id,
            reason=movement.reason,
            actor_id=movement.actor_id,
            created_by_user_id=movement.created_by_user_id,
            created_at=movement.created_at,
        )
    except DuplicateIdempotencyKeyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.post("/adjustment", response_model=InventoryMovementResponse, status_code=status.HTTP_201_CREATED)
async def adjust_stock(
    data: InventoryAdjustmentRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InventoryMovementResponse:
    """Record stock adjustment and append audit record to immutable ledger."""
    try:
        _item, movement = await InventoryService.adjust_stock(
            session=db,
            sku=data.sku,
            quantity_delta=data.quantity_delta,
            reason=data.reason,
            idempotency_key=data.idempotency_key,
            reference_id=data.reference_id,
            source_reference_type=data.source_reference_type,
            user_id=current_user.id,
        )
        await db.commit()
        return InventoryMovementResponse(
            id=movement.id,
            inventory_item_id=movement.inventory_item_id,
            variant_id=movement.variant_id,
            sku=data.sku,
            movement_type=movement.movement_type,
            idempotency_key=movement.idempotency_key,
            quantity_delta_on_hand=movement.quantity_delta_on_hand,
            quantity_delta_reserved=movement.quantity_delta_reserved,
            resulting_quantity_on_hand=movement.resulting_quantity_on_hand,
            resulting_quantity_reserved=movement.resulting_quantity_reserved,
            source_reference_type=movement.source_reference_type,
            source_reference_id=movement.source_reference_id,
            quantity_delta=movement.quantity_delta,
            quantity_on_hand_after=movement.quantity_on_hand_after,
            quantity_reserved_after=movement.quantity_reserved_after,
            reference_id=movement.reference_id,
            reason=movement.reason,
            actor_id=movement.actor_id,
            created_by_user_id=movement.created_by_user_id,
            created_at=movement.created_at,
        )
    except DuplicateIdempotencyKeyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.get("/movements", response_model=list[InventoryMovementResponse])
async def list_movements(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    variant_id: Annotated[uuid.UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InventoryMovementResponse]:
    """Retrieve immutable audit ledger of stock movements."""
    movements = await InventoryService.list_movements(
        session=db, variant_id=variant_id, limit=limit, offset=offset
    )
    return [
        InventoryMovementResponse(
            id=m.id,
            inventory_item_id=m.inventory_item_id,
            variant_id=m.variant_id,
            sku="",
            movement_type=m.movement_type,
            idempotency_key=m.idempotency_key,
            quantity_delta_on_hand=m.quantity_delta_on_hand,
            quantity_delta_reserved=m.quantity_delta_reserved,
            resulting_quantity_on_hand=m.resulting_quantity_on_hand,
            resulting_quantity_reserved=m.resulting_quantity_reserved,
            source_reference_type=m.source_reference_type,
            source_reference_id=m.source_reference_id,
            quantity_delta=m.quantity_delta,
            quantity_on_hand_after=m.quantity_on_hand_after,
            quantity_reserved_after=m.quantity_reserved_after,
            reference_id=m.reference_id,
            reason=m.reason,
            actor_id=m.actor_id,
            created_by_user_id=m.created_by_user_id,
            created_at=m.created_at,
        )
        for m in movements
    ]

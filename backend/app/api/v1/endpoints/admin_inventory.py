"""Multi-Warehouse Inventory, Stock Balances, Transfers & Cycle Count Admin Endpoints."""
from collections.abc import Sequence
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.warehouse import StockCount, StockTransfer, Warehouse
from app.schemas.warehouse import (
    StockAdjustmentRequest,
    StockAdjustmentResponse,
    StockBalanceItem,
    StockBalanceListResponse,
    StockCountCreate,
    StockCountItemResponse,
    StockCountReconcileRequest,
    StockCountResponse,
    StockTransferCreate,
    StockTransferResponse,
    TransferItemResponse,
    WarehouseCreate,
    WarehouseResponse,
)
from app.services.warehouse_service import WarehouseService

router = APIRouter(prefix="/admin/inventory", tags=["admin-inventory"])

DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.get("/warehouses", response_model=list[WarehouseResponse])
async def list_warehouses(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[WarehouseResponse]:
    """List all active warehouses for the seller organization."""
    warehouses = await WarehouseService.list_warehouses(db, DEFAULT_COMPANY_ID)
    return [WarehouseResponse.model_validate(wh) for wh in warehouses]


@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    payload: WarehouseCreate,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WarehouseResponse:
    """Create a new warehouse location."""
    try:
        wh = await WarehouseService.create_warehouse(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            code=payload.code,
            name=payload.name,
            pincode=payload.pincode,
            city=payload.city,
            state=payload.state,
            address_line=payload.address_line,
            is_default=payload.is_default,
        )
        await db.commit()
        return WarehouseResponse.model_validate(wh)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/balances", response_model=StockBalanceListResponse)
async def list_balances(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    warehouse_id: uuid.UUID | None = Query(None),
    variant_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> StockBalanceListResponse:
    """List physical stock item balances across warehouses with filtering and pagination."""
    items, total = await WarehouseService.list_balances(
        session=db,
        company_id=DEFAULT_COMPANY_ID,
        warehouse_id=warehouse_id,
        variant_id=variant_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    return StockBalanceListResponse(
        items=[StockBalanceItem(**it) for it in items],
        total=total,
    )


@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def adjust_stock(
    payload: StockAdjustmentRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockAdjustmentResponse:
    """Make an audited manual stock adjustment on a warehouse stock item."""
    try:
        stock_item = await WarehouseService.adjust_warehouse_stock(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            warehouse_id=payload.warehouse_id,
            variant_id=payload.variant_id,
            sku=payload.sku,
            quantity_delta=payload.quantity_delta,
            reason=payload.reason,
            idempotency_key=payload.idempotency_key,
            actor_id=current_user.id,
        )
        await db.commit()
        return StockAdjustmentResponse(
            stock_item_id=stock_item.id,
            warehouse_id=stock_item.warehouse_id,
            variant_id=stock_item.variant_id,
            sku=payload.sku,
            quantity_delta=payload.quantity_delta,
            resulting_on_hand=stock_item.on_hand,
            resulting_reserved=stock_item.reserved,
            resulting_available=stock_item.available,
            reason=payload.reason,
            idempotency_key=payload.idempotency_key or "",
            adjusted_at=stock_item.updated_at,
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/transfers", response_model=list[StockTransferResponse])
async def list_transfers(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[StockTransferResponse]:
    """List stock transfers between warehouses."""
    stmt = (
        select(StockTransfer)
        .options(selectinload(StockTransfer.items))
        .where(StockTransfer.company_id == DEFAULT_COMPANY_ID)
        .order_by(StockTransfer.created_at.desc())
    )
    transfers = (await db.execute(stmt)).scalars().all()
    return [
        StockTransferResponse(
            id=t.id,
            company_id=t.company_id,
            from_warehouse_id=t.from_warehouse_id,
            to_warehouse_id=t.to_warehouse_id,
            status=t.status,
            notes=t.notes,
            created_at=t.created_at,
            received_at=t.received_at,
            items=[TransferItemResponse(id=i.id, variant_id=i.variant_id, quantity=i.quantity) for i in t.items],
        )
        for t in transfers
    ]


@router.post("/transfers", response_model=StockTransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    payload: StockTransferCreate,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockTransferResponse:
    """Create a new draft stock transfer."""
    try:
        transfer = await WarehouseService.create_stock_transfer(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            from_warehouse_id=payload.from_warehouse_id,
            to_warehouse_id=payload.to_warehouse_id,
            items=[it.model_dump() for it in payload.items],
            notes=payload.notes,
            user_id=current_user.id,
        )
        await db.commit()
        return StockTransferResponse(
            id=transfer.id,
            company_id=transfer.company_id,
            from_warehouse_id=transfer.from_warehouse_id,
            to_warehouse_id=transfer.to_warehouse_id,
            status=transfer.status,
            notes=transfer.notes,
            created_at=transfer.created_at,
            received_at=transfer.received_at,
            items=[TransferItemResponse(id=i.id, variant_id=i.variant_id, quantity=i.quantity) for i in transfer.items],
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.put("/transfers/{transfer_id}/dispatch", response_model=StockTransferResponse)
async def dispatch_transfer(
    transfer_id: uuid.UUID,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockTransferResponse:
    """Dispatch a stock transfer, deducting inventory from the origin warehouse."""
    try:
        transfer = await WarehouseService.dispatch_stock_transfer(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            transfer_id=transfer_id,
            user_id=current_user.id,
        )
        await db.commit()
        return StockTransferResponse(
            id=transfer.id,
            company_id=transfer.company_id,
            from_warehouse_id=transfer.from_warehouse_id,
            to_warehouse_id=transfer.to_warehouse_id,
            status=transfer.status,
            notes=transfer.notes,
            created_at=transfer.created_at,
            received_at=transfer.received_at,
            items=[TransferItemResponse(id=i.id, variant_id=i.variant_id, quantity=i.quantity) for i in transfer.items],
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.put("/transfers/{transfer_id}/receive", response_model=StockTransferResponse)
async def receive_transfer(
    transfer_id: uuid.UUID,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockTransferResponse:
    """Receive a stock transfer, incrementing inventory at the destination warehouse."""
    try:
        transfer = await WarehouseService.receive_stock_transfer(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            transfer_id=transfer_id,
            user_id=current_user.id,
        )
        await db.commit()
        return StockTransferResponse(
            id=transfer.id,
            company_id=transfer.company_id,
            from_warehouse_id=transfer.from_warehouse_id,
            to_warehouse_id=transfer.to_warehouse_id,
            status=transfer.status,
            notes=transfer.notes,
            created_at=transfer.created_at,
            received_at=transfer.received_at,
            items=[TransferItemResponse(id=i.id, variant_id=i.variant_id, quantity=i.quantity) for i in transfer.items],
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("/counts", response_model=list[StockCountResponse])
async def list_stock_counts(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[StockCountResponse]:
    """List physical stock counts."""
    stmt = (
        select(StockCount)
        .options(selectinload(StockCount.items))
        .where(StockCount.company_id == DEFAULT_COMPANY_ID)
        .order_by(StockCount.count_date.desc())
    )
    counts = (await db.execute(stmt)).scalars().all()
    return [
        StockCountResponse(
            id=c.id,
            company_id=c.company_id,
            warehouse_id=c.warehouse_id,
            status=c.status,
            count_date=c.count_date,
            items=[
                StockCountItemResponse(
                    id=i.id,
                    stock_item_id=i.stock_item_id,
                    expected_qty=i.expected_qty,
                    counted_qty=i.counted_qty,
                    variance=i.variance,
                )
                for i in c.items
            ],
        )
        for c in counts
    ]


@router.post("/counts", response_model=StockCountResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_count(
    payload: StockCountCreate,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockCountResponse:
    """Create a new physical count snapshot for a warehouse."""
    try:
        count = await WarehouseService.create_stock_count(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            warehouse_id=payload.warehouse_id,
            user_id=current_user.id,
        )
        await db.commit()
        return StockCountResponse(
            id=count.id,
            company_id=count.company_id,
            warehouse_id=count.warehouse_id,
            status=count.status,
            count_date=count.count_date,
            items=[
                StockCountItemResponse(
                    id=i.id,
                    stock_item_id=i.stock_item_id,
                    expected_qty=i.expected_qty,
                    counted_qty=i.counted_qty,
                    variance=i.variance,
                )
                for i in count.items
            ],
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/counts/{count_id}/reconcile", response_model=StockCountResponse)
async def reconcile_stock_count(
    count_id: uuid.UUID,
    payload: StockCountReconcileRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.INVENTORY_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StockCountResponse:
    """Submit counted quantities and reconcile inventory variance."""
    try:
        count = await WarehouseService.reconcile_stock_count(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            stock_count_id=count_id,
            counted_items=[it.model_dump() for it in payload.items],
            user_id=current_user.id,
        )
        await db.commit()
        return StockCountResponse(
            id=count.id,
            company_id=count.company_id,
            warehouse_id=count.warehouse_id,
            status=count.status,
            count_date=count.count_date,
            items=[
                StockCountItemResponse(
                    id=i.id,
                    stock_item_id=i.stock_item_id,
                    expected_qty=i.expected_qty,
                    counted_qty=i.counted_qty,
                    variance=i.variance,
                )
                for i in count.items
            ],
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

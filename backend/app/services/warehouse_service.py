"""Enterprise Multi-Warehouse, Stock Item Balances, Transfers & Cycle Count Reconciliation Service."""
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.product import Product, ProductVariant
from app.models.warehouse import (
    StockCount,
    StockCountItem,
    StockCountStatus,
    StockItem,
    StockTransfer,
    TransferItem,
    TransferStatus,
    Warehouse,
    WarehouseStatus,
)
from app.services.outbox import OutboxService


class WarehouseService:
    """Multi-warehouse stock allocation, transfers, and inventory balance service."""

    @staticmethod
    async def list_warehouses(
        session: AsyncSession, company_id: uuid.UUID
    ) -> Sequence[Warehouse]:
        stmt = (
            select(Warehouse)
            .where(Warehouse.company_id == company_id, Warehouse.status != WarehouseStatus.ARCHIVED)
            .order_by(Warehouse.is_default.desc(), Warehouse.name.asc())
        )
        return (await session.execute(stmt)).scalars().all()

    @staticmethod
    async def create_warehouse(
        session: AsyncSession,
        company_id: uuid.UUID,
        code: str,
        name: str,
        pincode: str = "382430",
        city: str = "Ahmedabad",
        state: str = "Gujarat",
        address_line: str = "Plot 108, Kathwada GIDC",
        is_default: bool = False,
    ) -> Warehouse:
        clean_code = code.strip().upper()
        # Verify unique code
        existing = (
            await session.execute(
                select(Warehouse).where(
                    Warehouse.company_id == company_id, Warehouse.code == clean_code
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise ValueError(f"Warehouse with code '{clean_code}' already exists.")

        if is_default:
            # Unset default on others
            other_defaults = (
                await session.execute(
                    select(Warehouse).where(
                        Warehouse.company_id == company_id, Warehouse.is_default.is_(True)
                    )
                )
            ).scalars().all()
            for wh in other_defaults:
                wh.is_default = False

        warehouse = Warehouse(
            id=uuid.uuid4(),
            company_id=company_id,
            code=clean_code,
            name=name.strip(),
            pincode=pincode.strip(),
            city=city.strip(),
            state=state.strip(),
            address_line=address_line.strip(),
            status=WarehouseStatus.ACTIVE,
            is_default=is_default,
            created_at=datetime.now(UTC),
        )
        session.add(warehouse)
        await session.flush()
        return warehouse

    @staticmethod
    async def list_balances(
        session: AsyncSession,
        company_id: uuid.UUID,
        warehouse_id: uuid.UUID | None = None,
        variant_id: uuid.UUID | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        stmt = (
            select(
                StockItem,
                Warehouse.code.label("warehouse_code"),
                Warehouse.name.label("warehouse_name"),
                ProductVariant.sku.label("variant_sku"),
                Product.name.label("product_name"),
            )
            .join(Warehouse, StockItem.warehouse_id == Warehouse.id)
            .join(ProductVariant, StockItem.variant_id == ProductVariant.id)
            .outerjoin(Product, ProductVariant.product_id == Product.id)
            .where(StockItem.company_id == company_id)
        )

        if warehouse_id:
            stmt = stmt.where(StockItem.warehouse_id == warehouse_id)
        if variant_id:
            stmt = stmt.where(StockItem.variant_id == variant_id)
        if search:
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                (ProductVariant.sku.ilike(q)) | (Product.name.ilike(q))
            )

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.execute(count_stmt)).scalar() or 0

        # Paged results
        stmt = stmt.order_by(ProductVariant.sku.asc(), Warehouse.code.asc()).limit(limit).offset(offset)
        rows = (await session.execute(stmt)).all()

        items: list[dict[str, Any]] = []
        for stock_item, wh_code, wh_name, sku, prod_name in rows:
            items.append({
                "id": stock_item.id,
                "warehouse_id": stock_item.warehouse_id,
                "warehouse_code": wh_code,
                "warehouse_name": wh_name,
                "variant_id": stock_item.variant_id,
                "sku": sku,
                "product_name": prod_name,
                "location_code": stock_item.location_code,
                "on_hand": stock_item.on_hand,
                "reserved": stock_item.reserved,
                "quarantined": stock_item.quarantined,
                "available": stock_item.available,
                "version": stock_item.version,
                "updated_at": stock_item.updated_at,
            })
        return items, total

    @classmethod
    async def adjust_warehouse_stock(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        warehouse_id: uuid.UUID,
        variant_id: uuid.UUID,
        sku: str,
        quantity_delta: int,
        reason: str,
        idempotency_key: str | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> StockItem:
        if quantity_delta == 0:
            raise ValueError("Adjustment quantity delta cannot be zero.")
        if not reason or len(reason.strip()) < 3:
            raise ValueError("Mandatory adjustment reason is required for audit trail.")

        clean_idemp = idempotency_key or f"wh-adj-{warehouse_id}-{variant_id}-{uuid.uuid4()}"

        # 1. Lock StockItem row
        stmt = (
            select(StockItem)
            .where(
                StockItem.company_id == company_id,
                StockItem.warehouse_id == warehouse_id,
                StockItem.variant_id == variant_id,
            )
            .with_for_update()
        )
        stock_item = (await session.execute(stmt)).scalar_one_or_none()

        if stock_item is None:
            # Create if does not exist and delta is positive
            if quantity_delta < 0:
                raise ValueError("Cannot perform negative adjustment on non-existent stock item.")
            stock_item = StockItem(
                id=uuid.uuid4(),
                company_id=company_id,
                warehouse_id=warehouse_id,
                variant_id=variant_id,
                on_hand=0,
                reserved=0,
                quarantined=0,
                version=1,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            session.add(stock_item)
            await session.flush()

        # Invariant checks
        new_on_hand = stock_item.on_hand + quantity_delta
        if new_on_hand < 0:
            raise ValueError(f"Adjustment would result in negative on-hand stock ({new_on_hand}).")
        if new_on_hand < (stock_item.reserved + stock_item.quarantined):
            raise ValueError(
                f"Adjustment violates reservation invariant: on-hand ({new_on_hand}) < "
                f"reserved ({stock_item.reserved}) + quarantined ({stock_item.quarantined})."
            )

        stock_item.on_hand = new_on_hand
        stock_item.version += 1
        stock_item.updated_at = datetime.now(UTC)

        # 2. Sync legacy single-warehouse inventory_item if present
        legacy_stmt = (
            select(InventoryItem)
            .where(InventoryItem.variant_id == variant_id)
            .with_for_update()
        )
        legacy_item = (await session.execute(legacy_stmt)).scalar_one_or_none()
        if legacy_item:
            legacy_item.quantity_on_hand = max(0, legacy_item.quantity_on_hand + quantity_delta)
            legacy_item.updated_at = datetime.now(UTC)
            inv_item_id = legacy_item.id
        else:
            # Fallback UUID for movement FK
            inv_item_id = stock_item.id

        # 3. Append to immutable inventory movements ledger
        movement = InventoryMovement(
            id=uuid.uuid4(),
            inventory_item_id=inv_item_id if legacy_item else None,
            variant_id=variant_id,
            movement_type=MovementType.ADJUSTMENT,
            idempotency_key=clean_idemp,
            quantity_delta_on_hand=quantity_delta,
            quantity_delta_reserved=0,
            resulting_quantity_on_hand=stock_item.on_hand,
            resulting_quantity_reserved=stock_item.reserved,
            source_reference_type="WAREHOUSE_ADJUSTMENT",
            source_reference_id=str(warehouse_id),
            actor_id=actor_id,
            quantity_delta=quantity_delta,
            quantity_on_hand_after=stock_item.on_hand,
            quantity_reserved_after=stock_item.reserved,
            reason=reason.strip(),
            created_by_user_id=actor_id,
            created_at=datetime.now(UTC),
        )
        if legacy_item:
            movement.inventory_item_id = legacy_item.id
            session.add(movement)

        # 4. Outbox event
        OutboxService.emit_event(
            session=session,
            event_type="inventory.adjusted.v1",
            aggregate_type="stock_item",
            aggregate_id=stock_item.id,
            payload={
                "company_id": str(company_id),
                "stock_item_id": str(stock_item.id),
                "warehouse_id": str(warehouse_id),
                "variant_id": str(variant_id),
                "sku": sku,
                "quantity_delta": quantity_delta,
                "resulting_on_hand": stock_item.on_hand,
                "reason": reason,
            },
        )

        await session.flush()
        return stock_item

    @classmethod
    async def create_stock_transfer(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        from_warehouse_id: uuid.UUID,
        to_warehouse_id: uuid.UUID,
        items: list[dict[str, Any]],
        notes: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> StockTransfer:
        if from_warehouse_id == to_warehouse_id:
            raise ValueError("Origin and destination warehouses cannot be the same.")

        transfer = StockTransfer(
            id=uuid.uuid4(),
            company_id=company_id,
            from_warehouse_id=from_warehouse_id,
            to_warehouse_id=to_warehouse_id,
            status=TransferStatus.DRAFT,
            created_by=user_id,
            notes=notes,
            created_at=datetime.now(UTC),
        )
        session.add(transfer)

        for it in items:
            transfer_item = TransferItem(
                id=uuid.uuid4(),
                transfer_id=transfer.id,
                variant_id=uuid.UUID(str(it["variant_id"])),
                quantity=int(it["quantity"]),
            )
            session.add(transfer_item)

        await session.flush()
        return transfer

    @classmethod
    async def dispatch_stock_transfer(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        transfer_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> StockTransfer:
        stmt = (
            select(StockTransfer)
            .options(selectinload(StockTransfer.items))
            .where(StockTransfer.id == transfer_id, StockTransfer.company_id == company_id)
            .with_for_update()
        )
        transfer = (await session.execute(stmt)).scalar_one_or_none()
        if not transfer:
            raise ValueError(f"Stock transfer '{transfer_id}' not found.")
        if transfer.status != TransferStatus.DRAFT:
            raise ValueError(f"Cannot dispatch transfer in status '{transfer.status.value}'.")

        # Deduct from origin warehouse
        for it in transfer.items:
            stock_stmt = (
                select(StockItem)
                .where(
                    StockItem.company_id == company_id,
                    StockItem.warehouse_id == transfer.from_warehouse_id,
                    StockItem.variant_id == it.variant_id,
                )
                .with_for_update()
            )
            stock_item = (await session.execute(stock_stmt)).scalar_one_or_none()
            if not stock_item or stock_item.available < it.quantity:
                avail = stock_item.available if stock_item else 0
                raise ValueError(
                    f"Insufficient stock at origin warehouse for variant '{it.variant_id}'. "
                    f"Available: {avail}, Required: {it.quantity}"
                )
            stock_item.on_hand -= it.quantity
            stock_item.version += 1
            stock_item.updated_at = datetime.now(UTC)

        transfer.status = TransferStatus.IN_TRANSIT
        await session.flush()
        return transfer

    @classmethod
    async def receive_stock_transfer(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        transfer_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> StockTransfer:
        stmt = (
            select(StockTransfer)
            .options(selectinload(StockTransfer.items))
            .where(StockTransfer.id == transfer_id, StockTransfer.company_id == company_id)
            .with_for_update()
        )
        transfer = (await session.execute(stmt)).scalar_one_or_none()
        if not transfer:
            raise ValueError(f"Stock transfer '{transfer_id}' not found.")
        if transfer.status != TransferStatus.IN_TRANSIT:
            raise ValueError(f"Cannot receive transfer in status '{transfer.status.value}'. Must be IN_TRANSIT.")

        # Add to destination warehouse
        for it in transfer.items:
            stock_stmt = (
                select(StockItem)
                .where(
                    StockItem.company_id == company_id,
                    StockItem.warehouse_id == transfer.to_warehouse_id,
                    StockItem.variant_id == it.variant_id,
                )
                .with_for_update()
            )
            dest_item = (await session.execute(stock_stmt)).scalar_one_or_none()
            if not dest_item:
                dest_item = StockItem(
                    id=uuid.uuid4(),
                    company_id=company_id,
                    warehouse_id=transfer.to_warehouse_id,
                    variant_id=it.variant_id,
                    on_hand=it.quantity,
                    reserved=0,
                    quarantined=0,
                    version=1,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
                session.add(dest_item)
            else:
                dest_item.on_hand += it.quantity
                dest_item.version += 1
                dest_item.updated_at = datetime.now(UTC)

        transfer.status = TransferStatus.RECEIVED
        transfer.received_at = datetime.now(UTC)
        await session.flush()
        return transfer

    @classmethod
    async def create_stock_count(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        warehouse_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> StockCount:
        """Create physical count record with expected stock item quantities snapshot."""
        stock_count = StockCount(
            id=uuid.uuid4(),
            company_id=company_id,
            warehouse_id=warehouse_id,
            status=StockCountStatus.PLANNED,
            count_date=datetime.now(UTC),
            approved_by=user_id,
        )
        session.add(stock_count)

        # Snapshot all stock items in this warehouse
        stock_items = (
            await session.execute(
                select(StockItem).where(
                    StockItem.company_id == company_id, StockItem.warehouse_id == warehouse_id
                )
            )
        ).scalars().all()

        for s_item in stock_items:
            count_item = StockCountItem(
                id=uuid.uuid4(),
                stock_count_id=stock_count.id,
                stock_item_id=s_item.id,
                expected_qty=s_item.on_hand,
                counted_qty=None,
                variance=None,
            )
            session.add(count_item)

        await session.flush()
        return stock_count

    @classmethod
    async def reconcile_stock_count(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        stock_count_id: uuid.UUID,
        counted_items: list[dict[str, Any]],
        user_id: uuid.UUID | None = None,
    ) -> StockCount:
        stmt = (
            select(StockCount)
            .options(selectinload(StockCount.items))
            .where(StockCount.id == stock_count_id, StockCount.company_id == company_id)
            .with_for_update()
        )
        stock_count = (await session.execute(stmt)).scalar_one_or_none()
        if not stock_count:
            raise ValueError(f"Stock count '{stock_count_id}' not found.")
        if stock_count.status == StockCountStatus.RECONCILED:
            raise ValueError("Stock count is already reconciled.")

        item_map = {item.stock_item_id: item for item in stock_count.items}

        for c_input in counted_items:
            s_item_id = uuid.UUID(str(c_input["stock_item_id"]))
            counted_qty = int(c_input["counted_qty"])
            c_item = item_map.get(s_item_id)
            if not c_item:
                continue

            variance = counted_qty - c_item.expected_qty
            c_item.counted_qty = counted_qty
            c_item.variance = variance

            # Reconcile on_hand on stock_item
            if variance != 0:
                s_item = (
                    await session.execute(
                        select(StockItem).where(StockItem.id == s_item_id).with_for_update()
                    )
                ).scalar_one()

                new_on_hand = s_item.on_hand + variance
                if new_on_hand < (s_item.reserved + s_item.quarantined):
                    raise ValueError(
                        f"Reconciliation variance {variance} would violate reserved/quarantined stock constraint."
                    )
                s_item.on_hand = new_on_hand
                s_item.version += 1
                s_item.updated_at = datetime.now(UTC)

        stock_count.status = StockCountStatus.RECONCILED
        stock_count.approved_by = user_id
        await session.flush()
        return stock_count

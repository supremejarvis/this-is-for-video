"""Returns Management Service: Caliper Photo Verification, Item Inspection, and Warehouse Restock."""
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.models.outbox import OutboxEvent
from app.models.shipping_advanced import ItemDisposition, Return, ReturnItem, ReturnStatus
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.product import ProductVariant
from app.models.warehouse import StockItem, Warehouse
from app.schemas.returns import (
    CaliperInspectionRequest,
    ReturnCreateRequest,
    ReturnOut,
    ReturnReceiveRequest,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


class ReturnsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_return(self, req: ReturnCreateRequest, company_id: uuid.UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")) -> ReturnOut:
        """Create return case with requested line items."""
        order = await self.db.get(Order, req.order_id)
        if not order:
            raise ValueError(f"Order {req.order_id} not found")

        initial_status = ReturnStatus.EVIDENCE_SUBMITTED if req.caliper_photo_url else ReturnStatus.REQUESTED

        return_case = Return(
            company_id=company_id,
            order_id=req.order_id,
            reason=req.reason,
            status=initial_status,
            caliper_photo_url=req.caliper_photo_url,
        )
        self.db.add(return_case)
        await self.db.flush()

        for item_req in req.items:
            # Verify order item belongs to order
            order_item = await self.db.get(OrderItem, item_req.order_item_id)
            if not order_item or order_item.order_id != order.id:
                raise ValueError(f"Order item {item_req.order_item_id} does not belong to order {order.id}")

            if item_req.requested_qty > order_item.quantity:
                raise ValueError(f"Requested return qty {item_req.requested_qty} exceeds order item qty {order_item.quantity}")

            ret_item = ReturnItem(
                return_id=return_case.id,
                order_item_id=item_req.order_item_id,
                requested_qty=item_req.requested_qty,
                received_qty=0,
                accepted_qty=0,
                disposition=ItemDisposition.RESTOCK_INVENTORY,
            )
            self.db.add(ret_item)

        await self.db.commit()

        # Reload with items
        stmt = select(Return).where(Return.id == return_case.id).options(selectinload(Return.items))
        res = await self.db.execute(stmt)
        return ReturnOut.model_validate(res.scalars().first())

    async def inspect_caliper_evidence(self, return_id: uuid.UUID, req: CaliperInspectionRequest) -> ReturnOut:
        """Inspect and verify caliper photo evidence for frame thickness."""
        stmt = select(Return).where(Return.id == return_id).options(selectinload(Return.items))
        res = await self.db.execute(stmt)
        return_case = res.scalars().first()
        if not return_case:
            raise ValueError(f"Return case {return_id} not found")

        return_case.verified_frame_thickness_mm = req.verified_frame_thickness_mm
        if req.approval:
            return_case.status = ReturnStatus.APPROVED
        else:
            return_case.status = ReturnStatus.REJECTED

        outbox = OutboxEvent(
            event_type="return.inspected.v1",
            aggregate_type="return",
            aggregate_id=return_case.id,
            payload={
                "return_id": str(return_case.id),
                "order_id": str(return_case.order_id),
                "status": return_case.status.value,
                "verified_thickness_mm": str(req.verified_frame_thickness_mm),
                "approved": req.approval,
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return ReturnOut.model_validate(return_case)

    async def receive_and_restock(self, return_id: uuid.UUID, req: ReturnReceiveRequest) -> ReturnOut:
        """Receive physical items at warehouse and restock ONLY accepted items with RESTOCK_INVENTORY disposition."""
        stmt = select(Return).where(Return.id == return_id).options(selectinload(Return.items))
        res = await self.db.execute(stmt)
        return_case = res.scalars().first()
        if not return_case:
            raise ValueError(f"Return case {return_id} not found")

        items_map = {item.id: item for item in return_case.items}

        for insp in req.inspection_items:
            ret_item = items_map.get(insp.return_item_id)
            if not ret_item:
                continue

            ret_item.received_qty = insp.received_qty
            ret_item.accepted_qty = insp.accepted_qty
            try:
                ret_item.disposition = ItemDisposition(insp.disposition)
            except ValueError:
                ret_item.disposition = ItemDisposition.RESTOCK_INVENTORY

            ret_item.inspected_at = utcnow()

            # Statutory / Physical Stock Invariant: Restock ONLY accepted units with RESTOCK_INVENTORY
            if ret_item.disposition == ItemDisposition.RESTOCK_INVENTORY and ret_item.accepted_qty > 0:
                # Find SKU from order item
                order_item = await self.db.get(OrderItem, ret_item.order_item_id)
                if order_item:
                    sku_clean = order_item.sku.strip().upper()
                    # 1. Update multi-warehouse StockItem
                    var_stmt = select(ProductVariant).where(func.upper(ProductVariant.sku) == sku_clean)
                    var_res = await self.db.execute(var_stmt)
                    variant = var_res.scalars().first()

                    if variant:
                        stock_stmt = (
                            select(StockItem)
                            .where(
                                StockItem.warehouse_id == req.warehouse_id,
                                StockItem.variant_id == variant.id,
                            )
                            .with_for_update()
                        )
                        stock_res = await self.db.execute(stock_stmt)
                        stock_item = stock_res.scalars().first()
                        if not stock_item:
                            stock_item = StockItem(
                                company_id=return_case.company_id,
                                warehouse_id=req.warehouse_id,
                                variant_id=variant.id,
                                on_hand=ret_item.accepted_qty,
                                reserved=0,
                                quarantined=0,
                            )
                            self.db.add(stock_item)
                        else:
                            stock_item.on_hand += ret_item.accepted_qty

                        # 2. Update global InventoryItem
                        inv_stmt = select(InventoryItem).where(InventoryItem.variant_id == variant.id).with_for_update()
                        inv_res = await self.db.execute(inv_stmt)
                        inv_item = inv_res.scalars().first()
                        if inv_item:
                            inv_item.quantity_on_hand += ret_item.accepted_qty

        return_case.status = ReturnStatus.COMPLETED

        outbox = OutboxEvent(
            event_type="return.received.v1",
            aggregate_type="return",
            aggregate_id=return_case.id,
            payload={
                "return_id": str(return_case.id),
                "order_id": str(return_case.order_id),
                "warehouse_id": str(req.warehouse_id),
                "status": return_case.status.value,
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return ReturnOut.model_validate(return_case)

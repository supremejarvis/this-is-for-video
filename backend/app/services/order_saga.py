"""Distributed Order Saga State Machine, Row-Level Lock Ordering & Concurrency Orchestrator."""
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog_advanced import BundleComponent
from app.models.inventory import (
    InventoryItem,
    InventoryMovement,
    InventoryReservation,
    MovementType,
    ReservationStatus,
)
from app.models.order import (
    FulfilmentStatus,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentStatus,
)
from app.models.product import ProductVariant
from app.models.saga import (
    SagaInstance,
    SagaStatus,
    SagaStep,
    SagaStepStatus,
)
from app.models.warehouse import StockItem
from app.services.outbox import OutboxService


class InsufficientStockSagaError(Exception):
    """Raised when available inventory is insufficient during saga reservation step."""
    pass


class OrderSagaOrchestrator:
    """Orchestrates order lifecycle, deterministic lock order, reservation, and compensation."""

    @classmethod
    async def get_or_create_saga(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        order_id: uuid.UUID,
        ttl_minutes: int = 15,
    ) -> SagaInstance:
        stmt = (
            select(SagaInstance)
            .options(selectinload(SagaInstance.steps))
            .where(SagaInstance.order_id == order_id)
        )
        saga = (await session.execute(stmt)).scalar_one_or_none()
        if saga:
            return saga

        now = datetime.now(UTC)
        saga = SagaInstance(
            id=uuid.uuid4(),
            company_id=company_id,
            order_id=order_id,
            state=SagaStatus.IN_PROGRESS,
            current_step="RESERVE_STOCK",
            version=1,
            deadline=now + timedelta(minutes=ttl_minutes),
            created_at=now,
            updated_at=now,
        )
        session.add(saga)
        await session.flush()
        return saga

    @classmethod
    async def reserve_order_inventory(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        order: Order,
        ttl_minutes: int = 15,
        actor_id: uuid.UUID | None = None,
    ) -> SagaInstance:
        """Reserve order inventory with deterministic row-lock order to prevent deadlocks."""
        saga = await cls.get_or_create_saga(session, company_id, order.id, ttl_minutes)
        now = datetime.now(UTC)

        # Explicitly query order items asynchronously to avoid greenlet lazy-load issues
        stmt_items = select(OrderItem).where(OrderItem.order_id == order.id)
        order_items = (await session.execute(stmt_items)).scalars().all()

        step = SagaStep(
            id=uuid.uuid4(),
            saga_id=saga.id,
            step_name="RESERVE_STOCK",
            command_id=f"cmd-res-{order.id}-{uuid.uuid4().hex[:8]}",
            status=SagaStepStatus.EXECUTING,
            attempts=1,
            payload_snapshot={"order_id": str(order.id), "items_count": len(order_items)},
            created_at=now,
            updated_at=now,
        )
        session.add(step)
        await session.flush()

        # 1. Deterministic sort of items by SKU to eliminate deadlock risk across concurrent checkouts
        sorted_items = sorted(order_items, key=lambda it: it.sku.strip().upper())

        reservations_created: list[InventoryReservation] = []

        try:
            for item in sorted_items:
                clean_sku = item.sku.strip().upper()

                # Find product variant to inspect pack quantity or bundle components
                var_stmt = select(ProductVariant).where(func.upper(ProductVariant.sku) == clean_sku)
                variant = (await session.execute(var_stmt)).scalar_one_or_none()

                base_qty = item.quantity
                if variant:
                    pack_mult = getattr(variant, "pack_size", 1) or getattr(variant, "pack_quantity", 1) or 1
                    if pack_mult > 1:
                        base_qty = item.quantity * pack_mult

                # Lock stock item / inventory item with FOR UPDATE
                inv_stmt = (
                    select(InventoryItem)
                    .where(func.upper(InventoryItem.sku) == clean_sku)
                    .with_for_update()
                )
                inv_item = (await session.execute(inv_stmt)).scalar_one_or_none()

                if not inv_item:
                    raise InsufficientStockSagaError(f"SKU '{clean_sku}' not found in inventory ledger.")

                avail = inv_item.quantity_on_hand - inv_item.quantity_reserved
                if avail < base_qty:
                    raise InsufficientStockSagaError(
                        f"Insufficient stock for SKU '{clean_sku}'. Available: {avail}, Required: {base_qty}"
                    )

                # Reserve stock
                inv_item.quantity_reserved += base_qty

                reservation = InventoryReservation(
                    id=uuid.uuid4(),
                    inventory_item_id=inv_item.id,
                    order_id=order.id,
                    sku=clean_sku,
                    quantity=base_qty,
                    status=ReservationStatus.ACTIVE,
                    expires_at=now + timedelta(minutes=ttl_minutes),
                    created_at=now,
                )
                session.add(reservation)
                reservations_created.append(reservation)

                # Record movement
                movement = InventoryMovement(
                    id=uuid.uuid4(),
                    inventory_item_id=inv_item.id,
                    variant_id=inv_item.variant_id,
                    movement_type=MovementType.RESERVATION_HOLD,
                    idempotency_key=f"res-hold-{order.id}-{clean_sku}",
                    quantity_delta_on_hand=0,
                    quantity_delta_reserved=base_qty,
                    resulting_quantity_on_hand=inv_item.quantity_on_hand,
                    resulting_quantity_reserved=inv_item.quantity_reserved,
                    source_reference_type="ORDER_SAGA_RESERVATION",
                    source_reference_id=str(order.id),
                    actor_id=actor_id,
                    quantity_delta=-base_qty,
                    quantity_on_hand_after=inv_item.quantity_on_hand,
                    quantity_reserved_after=inv_item.quantity_reserved,
                    reason=f"Saga hold for Order {order.order_number}",
                    created_by_user_id=actor_id,
                    created_at=now,
                )
                session.add(movement)

            # Mark step and saga as successful
            step.status = SagaStepStatus.SUCCEEDED
            step.result_reference = f"RESERVED_{len(reservations_created)}_ITEMS"
            saga.current_step = "AWAIT_PAYMENT"
            saga.version += 1
            saga.updated_at = now

            # Emit Outbox Event
            OutboxService.emit_event(
                session=session,
                event_type="inventory.reserved.v1",
                aggregate_type="order",
                aggregate_id=order.id,
                payload={
                    "company_id": str(company_id),
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "reservation_ids": [str(r.id) for r in reservations_created],
                    "expires_at": (now + timedelta(minutes=ttl_minutes)).isoformat(),
                },
            )

        except InsufficientStockSagaError as err:
            step.status = SagaStepStatus.FAILED
            step.result_reference = str(err)
            saga.state = SagaStatus.FAILED
            saga.last_error = str(err)
            saga.version += 1
            saga.updated_at = now
            raise

        await session.flush()
        return saga

    @classmethod
    async def confirm_payment_and_allocate(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        order: Order,
        payment_reference: str | None = None,
        actor_id: uuid.UUID | None = None,
    ) -> SagaInstance:
        """Confirm order after payment capture or COD verification with race condition guard."""
        saga = await cls.get_or_create_saga(session, company_id, order.id)
        now = datetime.now(UTC)

        step = SagaStep(
            id=uuid.uuid4(),
            saga_id=saga.id,
            step_name="PAYMENT_CONFIRMATION",
            command_id=f"cmd-pay-{order.id}-{uuid.uuid4().hex[:8]}",
            status=SagaStepStatus.EXECUTING,
            attempts=1,
            payload_snapshot={"order_id": str(order.id), "payment_reference": payment_reference},
            created_at=now,
            updated_at=now,
        )
        session.add(step)
        await session.flush()

        # Check active reservations
        res_stmt = (
            select(InventoryReservation)
            .where(
                InventoryReservation.order_id == order.id,
                InventoryReservation.status == ReservationStatus.ACTIVE,
            )
            .with_for_update()
        )
        reservations = (await session.execute(res_stmt)).scalars().all()

        if reservations:
            # Normal path: commit active reservations into on_hand deductions
            for res in reservations:
                inv_stmt = (
                    select(InventoryItem)
                    .where(InventoryItem.id == res.inventory_item_id)
                    .with_for_update()
                )
                inv_item = (await session.execute(inv_stmt)).scalar_one()

                inv_item.quantity_on_hand -= res.quantity
                inv_item.quantity_reserved = max(0, inv_item.quantity_reserved - res.quantity)
                inv_item.updated_at = now

                res.status = ReservationStatus.COMMITTED

                movement = InventoryMovement(
                    id=uuid.uuid4(),
                    inventory_item_id=inv_item.id,
                    variant_id=inv_item.variant_id,
                    movement_type=MovementType.DISPATCH,
                    idempotency_key=f"commit-{order.id}-{res.sku}-{uuid.uuid4().hex[:6]}",
                    quantity_delta_on_hand=-res.quantity,
                    quantity_delta_reserved=-res.quantity,
                    resulting_quantity_on_hand=inv_item.quantity_on_hand,
                    resulting_quantity_reserved=inv_item.quantity_reserved,
                    source_reference_type="ORDER_PAYMENT_CONFIRMED",
                    source_reference_id=str(order.id),
                    actor_id=actor_id,
                    quantity_delta=-res.quantity,
                    quantity_on_hand_after=inv_item.quantity_on_hand,
                    quantity_reserved_after=inv_item.quantity_reserved,
                    reason=f"Payment confirmed for Order {order.order_number}",
                    created_by_user_id=actor_id,
                    created_at=now,
                )
                session.add(movement)

            order.order_status = OrderStatus.CONFIRMED
            order.payment_status = PaymentStatus.CAPTURED
            order.fulfilment_status = FulfilmentStatus.PROCESSING
            order.version += 1
            order.updated_at = now

            step.status = SagaStepStatus.SUCCEEDED
            step.result_reference = "ALLOCATED_FROM_RESERVATION"
            saga.state = SagaStatus.SUCCEEDED
            saga.current_step = "CONFIRMED"
            saga.version += 1
            saga.updated_at = now

            OutboxService.emit_event(
                session=session,
                event_type="order.confirmed.v1",
                aggregate_type="order",
                aggregate_id=order.id,
                payload={
                    "company_id": str(company_id),
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "total_payable": str(order.total_payable),
                    "payment_reference": payment_reference,
                },
            )
        else:
            # Reservation expired before payment confirmation! Check if stock is still available
            stmt_items = select(OrderItem).where(OrderItem.order_id == order.id)
            order_items = (await session.execute(stmt_items)).scalars().all()

            can_reallocate = True
            for item in order_items:
                inv_stmt = select(InventoryItem).where(func.upper(InventoryItem.sku) == item.sku.strip().upper()).with_for_update()
                inv_item = (await session.execute(inv_stmt)).scalar_one_or_none()
                if not inv_item or (inv_item.quantity_on_hand - inv_item.quantity_reserved) < item.quantity:
                    can_reallocate = False
                    break

            if can_reallocate:
                for item in order_items:
                    inv_stmt = select(InventoryItem).where(func.upper(InventoryItem.sku) == item.sku.strip().upper()).with_for_update()
                    inv_item = (await session.execute(inv_stmt)).scalar_one()
                    inv_item.quantity_on_hand -= item.quantity
                    inv_item.updated_at = now

                order.order_status = OrderStatus.CONFIRMED
                order.payment_status = PaymentStatus.CAPTURED
                order.fulfilment_status = FulfilmentStatus.PROCESSING
                order.version += 1
                order.updated_at = now

                step.status = SagaStepStatus.SUCCEEDED
                step.result_reference = "REALLOCATED_AFTER_EXPIRY"
                saga.state = SagaStatus.SUCCEEDED
                saga.current_step = "CONFIRMED"
                saga.version += 1
                saga.updated_at = now
            else:
                # Stock depleted! Mark PAID_UNALLOCATED_EXCEPTION
                step.status = SagaStepStatus.FAILED
                step.result_reference = "PAID_UNALLOCATED_EXCEPTION: Stock depleted post-expiry"
                saga.state = SagaStatus.FAILED
                saga.last_error = "PAID_UNALLOCATED_EXCEPTION: Payment received but stock is exhausted"
                saga.version += 1
                saga.updated_at = now

                order.payment_status = PaymentStatus.CAPTURED
                # Do not falsely confirm fulfillment
                order.fulfilment_status = FulfilmentStatus.UNFULFILLED

        await session.flush()
        return saga

    @classmethod
    async def cancel_order_and_compensate(
        cls,
        session: AsyncSession,
        company_id: uuid.UUID,
        order: Order,
        reason: str,
        actor_id: uuid.UUID | None = None,
    ) -> SagaInstance:
        """Compensate order by releasing active reservations and queuing refund if captured."""
        saga = await cls.get_or_create_saga(session, company_id, order.id)
        now = datetime.now(UTC)

        step = SagaStep(
            id=uuid.uuid4(),
            saga_id=saga.id,
            step_name="CANCEL_AND_COMPENSATE",
            command_id=f"cmd-cnc-{order.id}-{uuid.uuid4().hex[:8]}",
            status=SagaStepStatus.EXECUTING,
            attempts=1,
            payload_snapshot={"order_id": str(order.id), "reason": reason},
            created_at=now,
            updated_at=now,
        )
        session.add(step)
        await session.flush()

        # 1. Release active reservations
        res_stmt = (
            select(InventoryReservation)
            .where(
                InventoryReservation.order_id == order.id,
                InventoryReservation.status == ReservationStatus.ACTIVE,
            )
            .with_for_update()
        )
        reservations = (await session.execute(res_stmt)).scalars().all()

        released_count = 0
        for res in reservations:
            inv_stmt = select(InventoryItem).where(InventoryItem.id == res.inventory_item_id).with_for_update()
            inv_item = (await session.execute(inv_stmt)).scalar_one_or_none()
            if inv_item:
                inv_item.quantity_reserved = max(0, inv_item.quantity_reserved - res.quantity)
                inv_item.updated_at = now

            res.status = ReservationStatus.RELEASED
            released_count += 1

            if inv_item:
                movement = InventoryMovement(
                    id=uuid.uuid4(),
                    inventory_item_id=inv_item.id,
                    variant_id=inv_item.variant_id,
                    movement_type=MovementType.RESERVATION_RELEASE,
                    idempotency_key=f"cnc-rel-{res.id}",
                    quantity_delta_on_hand=0,
                    quantity_delta_reserved=-res.quantity,
                    resulting_quantity_on_hand=inv_item.quantity_on_hand,
                    resulting_quantity_reserved=inv_item.quantity_reserved,
                    source_reference_type="ORDER_CANCELLATION",
                    source_reference_id=str(order.id),
                    actor_id=actor_id,
                    quantity_delta=res.quantity,
                    quantity_on_hand_after=inv_item.quantity_on_hand,
                    quantity_reserved_after=inv_item.quantity_reserved,
                    reason=f"Order {order.order_number} cancelled: {reason}",
                    created_by_user_id=actor_id,
                    created_at=now,
                )
                session.add(movement)

        # 2. Update order statuses
        order.order_status = OrderStatus.CANCELLED
        if order.payment_status == PaymentStatus.CAPTURED:
            order.payment_status = PaymentStatus.REFUND_PENDING
        order.version += 1
        order.updated_at = now

        step.status = SagaStepStatus.COMPENSATED
        step.result_reference = f"RELEASED_{released_count}_RESERVATIONS"
        saga.state = SagaStatus.COMPENSATING
        saga.current_step = "CANCELLED"
        saga.version += 1
        saga.updated_at = now

        OutboxService.emit_event(
            session=session,
            event_type="order.cancelled.v1",
            aggregate_type="order",
            aggregate_id=order.id,
            payload={
                "company_id": str(company_id),
                "order_id": str(order.id),
                "order_number": order.order_number,
                "reason": reason,
                "released_count": released_count,
            },
        )

        await session.flush()
        return saga

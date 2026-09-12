"""Authoritative Inventory Service with Append-Only Ledger & Concurrency Control."""
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import (
    InventoryItem,
    InventoryMovement,
    InventoryReservation,
    MovementType,
    ReservationStatus,
)
from app.services.outbox import OutboxService


class InsufficientStockError(Exception):
    """Raised when available stock is less than requested quantity."""
    pass


class StockUnavailablePostExpiryError(Exception):
    """Raised when late payment arrives after reservation expiry and stock was depleted."""
    pass


class DuplicateIdempotencyKeyError(Exception):
    """Raised when an inventory movement with the same idempotency key already exists."""
    pass


class InventoryService:
    """Thread-safe and transaction-safe inventory reservation and append-only stock ledger."""

    @staticmethod
    async def _check_idempotency(session: AsyncSession, idempotency_key: str | None) -> None:
        if not idempotency_key:
            return
        stmt = select(InventoryMovement).where(InventoryMovement.idempotency_key == idempotency_key)
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            raise DuplicateIdempotencyKeyError(
                f"Duplicate inventory movement idempotency key '{idempotency_key}'."
            )

    @staticmethod
    def _emit_balance_changed(session: AsyncSession, item: InventoryItem) -> None:
        OutboxService.emit_event(
            session=session,
            event_type="inventory.balance.changed",
            aggregate_type="inventory_item",
            aggregate_id=item.id,
            payload={
                "item_id": str(item.id),
                "variant_id": str(item.variant_id),
                "sku": item.sku,
                "quantity_on_hand": item.quantity_on_hand,
                "quantity_reserved": item.quantity_reserved,
                "available_quantity": item.quantity_on_hand - item.quantity_reserved,
            },
        )

    @classmethod
    async def receive_stock(
        cls,
        session: AsyncSession,
        sku: str,
        quantity: int,
        idempotency_key: str | None = None,
        reference_id: str | None = None,
        source_reference_type: str = "PO",
        reason: str | None = "Stock receipt from manufacturing",
        user_id: UUID | None = None,
    ) -> tuple[InventoryItem, InventoryMovement]:
        """Record stock arrival into inventory and write to immutable append-only ledger."""
        if quantity <= 0:
            raise ValueError("Receipt quantity must be strictly positive.")

        clean_idempotency_key = idempotency_key or f"rcv-{sku.strip().upper()}-{uuid.uuid4()}"
        await cls._check_idempotency(session, clean_idempotency_key)

        stmt = select(InventoryItem).where(InventoryItem.sku == sku.strip().upper()).with_for_update()
        item = (await session.execute(stmt)).scalar_one_or_none()
        if item is None:
            raise ValueError(f"SKU '{sku}' not found in inventory.")

        item.quantity_on_hand += quantity
        item.updated_at = datetime.now(UTC)

        movement = InventoryMovement(
            id=uuid.uuid4(),
            inventory_item_id=item.id,
            variant_id=item.variant_id,
            movement_type=MovementType.RECEIPT,
            idempotency_key=clean_idempotency_key,
            quantity_delta_on_hand=quantity,
            quantity_delta_reserved=0,
            resulting_quantity_on_hand=item.quantity_on_hand,
            resulting_quantity_reserved=item.quantity_reserved,
            source_reference_type=source_reference_type,
            source_reference_id=reference_id,
            actor_id=user_id,
            # Backward compatibility fields
            quantity_delta=quantity,
            quantity_on_hand_after=item.quantity_on_hand,
            quantity_reserved_after=item.quantity_reserved,
            reference_id=reference_id,
            reason=reason,
            created_by_user_id=user_id,
            created_at=datetime.now(UTC),
        )
        session.add(movement)
        cls._emit_balance_changed(session, item)

        try:
            await session.flush()
        except IntegrityError as err:
            err_str = str(err).lower()
            if "uq_inventory_movements_idempotency_key" in err_str or "idempotency_key" in err_str:
                raise DuplicateIdempotencyKeyError(
                    f"Duplicate inventory movement idempotency key '{clean_idempotency_key}'."
                ) from err
            raise

        return item, movement

    @classmethod
    async def adjust_stock(
        cls,
        session: AsyncSession,
        sku: str,
        quantity_delta: int,
        reason: str,
        idempotency_key: str | None = None,
        reference_id: str | None = None,
        source_reference_type: str = "MANUAL_ADJUSTMENT",
        user_id: UUID | None = None,
    ) -> tuple[InventoryItem, InventoryMovement]:
        """Record manual stock adjustment and enforce database invariants."""
        if quantity_delta == 0:
            raise ValueError("Adjustment quantity delta cannot be zero.")
        if not reason or len(reason.strip()) < 3:
            raise ValueError("Mandatory adjustment reason is required for audit trail.")

        clean_idempotency_key = idempotency_key or f"adj-{sku.strip().upper()}-{uuid.uuid4()}"
        await cls._check_idempotency(session, clean_idempotency_key)

        stmt = select(InventoryItem).where(InventoryItem.sku == sku.strip().upper()).with_for_update()
        item = (await session.execute(stmt)).scalar_one_or_none()
        if item is None:
            raise ValueError(f"SKU '{sku}' not found in inventory.")

        new_on_hand = item.quantity_on_hand + quantity_delta
        if new_on_hand < 0:
            raise ValueError(f"Adjustment would result in negative on-hand stock ({new_on_hand}).")
        if new_on_hand < item.quantity_reserved:
            raise ValueError(
                f"Adjustment would violate reservation constraint: "
                f"on-hand ({new_on_hand}) < reserved ({item.quantity_reserved})."
            )

        item.quantity_on_hand = new_on_hand
        item.updated_at = datetime.now(UTC)

        movement = InventoryMovement(
            id=uuid.uuid4(),
            inventory_item_id=item.id,
            variant_id=item.variant_id,
            movement_type=MovementType.ADJUSTMENT,
            idempotency_key=clean_idempotency_key,
            quantity_delta_on_hand=quantity_delta,
            quantity_delta_reserved=0,
            resulting_quantity_on_hand=item.quantity_on_hand,
            resulting_quantity_reserved=item.quantity_reserved,
            source_reference_type=source_reference_type,
            source_reference_id=reference_id,
            actor_id=user_id,
            # Backward compatibility fields
            quantity_delta=quantity_delta,
            quantity_on_hand_after=item.quantity_on_hand,
            quantity_reserved_after=item.quantity_reserved,
            reference_id=reference_id,
            reason=reason.strip(),
            created_by_user_id=user_id,
            created_at=datetime.now(UTC),
        )
        session.add(movement)
        cls._emit_balance_changed(session, item)

        try:
            await session.flush()
        except IntegrityError as err:
            err_str = str(err).lower()
            if "uq_inventory_movements_idempotency_key" in err_str or "idempotency_key" in err_str:
                raise DuplicateIdempotencyKeyError(
                    f"Duplicate inventory movement idempotency key '{clean_idempotency_key}'."
                ) from err
            raise

        return item, movement

    @classmethod
    async def reserve_stock(
        cls,
        session: AsyncSession,
        sku: str,
        quantity: int,
        order_id: UUID,
        ttl_minutes: int = 15,
        user_id: UUID | None = None,
    ) -> InventoryReservation:
        """Reserve stock atomically using pessimistic row-level locking and record ledger hold."""
        # 1. Check idempotency: if reservation already exists for this order & sku
        stmt_existing = select(InventoryReservation).where(
            InventoryReservation.order_id == order_id,
            InventoryReservation.sku == sku,
            InventoryReservation.status == ReservationStatus.ACTIVE,
        )
        existing = (await session.execute(stmt_existing)).scalar_one_or_none()
        if existing is not None:
            return existing

        # 2. Acquire pessimistic row-lock on inventory_item
        stmt_item = (
            select(InventoryItem)
            .where(InventoryItem.sku == sku)
            .with_for_update()
        )
        item = (await session.execute(stmt_item)).scalar_one_or_none()
        if item is None:
            raise ValueError(f"SKU {sku} not found in inventory")

        available = item.quantity_on_hand - item.quantity_reserved
        if available < quantity:
            raise InsufficientStockError(
                f"Insufficient stock for {sku}. Available: {available}, Requested: {quantity}"
            )

        # 3. Atomically increment reserved quantity
        item.quantity_reserved += quantity

        now = datetime.now(UTC)
        reservation = InventoryReservation(
            inventory_item_id=item.id,
            order_id=order_id,
            sku=sku,
            quantity=quantity,
            status=ReservationStatus.ACTIVE,
            expires_at=now + timedelta(minutes=ttl_minutes),
            created_at=now,
        )
        session.add(reservation)

        # Append RESERVATION_HOLD to ledger
        idempotency_key = f"res-hold-{order_id}-{sku}"
        movement = InventoryMovement(
            id=uuid.uuid4(),
            inventory_item_id=item.id,
            variant_id=item.variant_id,
            movement_type=MovementType.RESERVATION_HOLD,
            idempotency_key=idempotency_key,
            quantity_delta_on_hand=0,
            quantity_delta_reserved=quantity,
            resulting_quantity_on_hand=item.quantity_on_hand,
            resulting_quantity_reserved=item.quantity_reserved,
            source_reference_type="ORDER_RESERVATION",
            source_reference_id=str(order_id),
            actor_id=user_id,
            # Backward compatibility
            quantity_delta=-quantity,
            quantity_on_hand_after=item.quantity_on_hand,
            quantity_reserved_after=item.quantity_reserved,
            reference_id=str(order_id),
            reason=f"Hold for Order {order_id}",
            created_by_user_id=user_id,
            created_at=now,
        )
        session.add(movement)
        cls._emit_balance_changed(session, item)

        await session.flush()
        return reservation

    @classmethod
    async def release_expired_reservations(
        cls,
        session: AsyncSession,
        user_id: UUID | None = None,
    ) -> list[tuple[str, int]]:
        """Find and release all expired reservations exactly once and record ledger releases."""
        now = datetime.now(UTC)
        stmt_expired = (
            select(InventoryReservation)
            .where(
                InventoryReservation.status == ReservationStatus.ACTIVE,
                InventoryReservation.expires_at < now,
            )
            .with_for_update()
        )
        expired_reservations = (await session.execute(stmt_expired)).scalars().all()
        released_summary: list[tuple[str, int]] = []

        for res in expired_reservations:
            stmt_item = select(InventoryItem).where(InventoryItem.id == res.inventory_item_id).with_for_update()
            item = (await session.execute(stmt_item)).scalar_one()

            # Decrement reserved count
            item.quantity_reserved = max(0, item.quantity_reserved - res.quantity)
            res.status = ReservationStatus.RELEASED
            released_summary.append((res.sku, res.quantity))

            movement = InventoryMovement(
                id=uuid.uuid4(),
                inventory_item_id=item.id,
                variant_id=item.variant_id,
                movement_type=MovementType.RESERVATION_RELEASE,
                idempotency_key=f"res-rel-{res.id}",
                quantity_delta_on_hand=0,
                quantity_delta_reserved=-res.quantity,
                resulting_quantity_on_hand=item.quantity_on_hand,
                resulting_quantity_reserved=item.quantity_reserved,
                source_reference_type="RESERVATION_EXPIRY",
                source_reference_id=str(res.order_id) if res.order_id else str(res.id),
                actor_id=user_id,
                # Backward compatibility
                quantity_delta=res.quantity,
                quantity_on_hand_after=item.quantity_on_hand,
                quantity_reserved_after=item.quantity_reserved,
                reference_id=str(res.order_id) if res.order_id else None,
                reason=f"Expired reservation release for {res.sku}",
                created_by_user_id=user_id,
                created_at=now,
            )
            session.add(movement)
            cls._emit_balance_changed(session, item)

        await session.flush()
        return released_summary

    @classmethod
    async def confirm_payment_and_commit_stock(
        cls,
        session: AsyncSession,
        order_id: UUID,
        sku: str,
        quantity: int,
        user_id: UUID | None = None,
    ) -> bool:
        """Confirm payment and commit reserved stock, recording DISPATCH in ledger."""
        now = datetime.now(UTC)
        stmt_res = select(InventoryReservation).where(
            InventoryReservation.order_id == order_id,
            InventoryReservation.sku == sku,
            InventoryReservation.status == ReservationStatus.ACTIVE,
        ).with_for_update()
        reservation = (await session.execute(stmt_res)).scalar_one_or_none()

        stmt_item = select(InventoryItem).where(InventoryItem.sku == sku).with_for_update()
        item = (await session.execute(stmt_item)).scalar_one()

        if reservation is not None:
            # Normal flow: active reservation committed
            reservation.status = ReservationStatus.COMMITTED
            item.quantity_on_hand -= quantity
            item.quantity_reserved -= quantity

            movement = InventoryMovement(
                id=uuid.uuid4(),
                inventory_item_id=item.id,
                variant_id=item.variant_id,
                movement_type=MovementType.DISPATCH,
                idempotency_key=f"dispatch-commit-{order_id}-{sku}",
                quantity_delta_on_hand=-quantity,
                quantity_delta_reserved=-quantity,
                resulting_quantity_on_hand=item.quantity_on_hand,
                resulting_quantity_reserved=item.quantity_reserved,
                source_reference_type="ORDER_PAYMENT_CAPTURED",
                source_reference_id=str(order_id),
                actor_id=user_id,
                # Backward compatibility
                quantity_delta=-quantity,
                quantity_on_hand_after=item.quantity_on_hand,
                quantity_reserved_after=item.quantity_reserved,
                reference_id=str(order_id),
                reason=f"Payment captured: dispatch commit for Order {order_id}",
                created_by_user_id=user_id,
                created_at=now,
            )
            session.add(movement)
            cls._emit_balance_changed(session, item)
            await session.flush()
            return True

        # Late Payment Arrival: reservation expired before webhook arrived
        available = item.quantity_on_hand - item.quantity_reserved
        if available >= quantity:
            item.quantity_on_hand -= quantity
            movement = InventoryMovement(
                id=uuid.uuid4(),
                inventory_item_id=item.id,
                variant_id=item.variant_id,
                movement_type=MovementType.DISPATCH,
                idempotency_key=f"dispatch-commit-late-{order_id}-{sku}-{uuid.uuid4()}",
                quantity_delta_on_hand=-quantity,
                quantity_delta_reserved=0,
                resulting_quantity_on_hand=item.quantity_on_hand,
                resulting_quantity_reserved=item.quantity_reserved,
                source_reference_type="ORDER_PAYMENT_LATE_CAPTURED",
                source_reference_id=str(order_id),
                actor_id=user_id,
                # Backward compatibility
                quantity_delta=-quantity,
                quantity_on_hand_after=item.quantity_on_hand,
                quantity_reserved_after=item.quantity_reserved,
                reference_id=str(order_id),
                reason=f"Late capture dispatch commit for Order {order_id}",
                created_by_user_id=user_id,
                created_at=now,
            )
            session.add(movement)
            cls._emit_balance_changed(session, item)
            await session.flush()
            return True

        # Stock was depleted during gap -> must trigger automated refund
        raise StockUnavailablePostExpiryError(
            f"Stock for {sku} depleted after reservation expiry. Full refund required."
        )

    @staticmethod
    async def list_inventory_items(
        session: AsyncSession,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[InventoryItem]:
        """List inventory levels for all active variants."""
        stmt = (
            select(InventoryItem)
            .order_by(InventoryItem.sku.asc())
            .limit(limit)
            .offset(offset)
        )
        return (await session.execute(stmt)).scalars().all()

    @staticmethod
    async def list_movements(
        session: AsyncSession,
        variant_id: UUID | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[InventoryMovement]:
        """Fetch audit log of inventory movements."""
        stmt = (
            select(InventoryMovement)
            .order_by(InventoryMovement.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if variant_id is not None:
            stmt = stmt.where(InventoryMovement.variant_id == variant_id)

        return (await session.execute(stmt)).scalars().all()

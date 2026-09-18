"""Integration tests for inventory concurrency, pessimistic locking, and late-payment fallback.

Proves:
- Two buyers cannot reserve the same final stock unit (Pessimistic locking race test)
- Available stock never becomes negative
- Duplicate idempotency key creates only one reservation
- Expired reservation is released exactly once
- Late payment arrival after reservation expiry with depleted stock raises StockUnavailablePostExpiryError
- Payment confirmation revalidates or atomically commits stock ownership
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import InventoryItem, InventoryReservation, Product, ProductVariant
from app.models.inventory import ReservationStatus
from app.services.inventory import (
    InsufficientStockError,
    InventoryService,
    StockUnavailablePostExpiryError,
)

DATABASE_URL = "postgresql+asyncpg://postgres_test:postgres@localhost:5432/apollo_disposable_test"


@pytest.fixture
async def engine():
    eng = create_async_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
    yield eng
    await eng.dispose()


@pytest.fixture
def session_factory(engine):
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.mark.asyncio
async def test_concurrent_buyers_cannot_reserve_same_final_stock(session_factory):
    """Two concurrent buyers compete for 1 available stock unit.
    Exactly one must succeed, one must fail with InsufficientStockError.
    Available stock must remain >= 0."""
    sku = f"CONCUR-SKU-{uuid.uuid4().hex[:6]}"

    # Seed product and 1 stock unit
    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip 35mm", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()

        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
        session.add(var)
        await session.flush()

        inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=1, quantity_reserved=0)
        session.add(inv)
        await session.commit()

    order_id_buyer1 = uuid.uuid4()
    order_id_buyer2 = uuid.uuid4()

    async def buyer_attempt(order_id):
        async with session_factory() as session, session.begin():
            try:
                res = await InventoryService.reserve_stock(
                    session=session,
                    sku=sku,
                    quantity=1,
                    order_id=order_id,
                    ttl_minutes=15,
                )
                return ("SUCCESS", res.id)
            except InsufficientStockError:
                return ("INSUFFICIENT_STOCK", None)

    # Execute both reservation attempts concurrently
    results = await asyncio.gather(
        buyer_attempt(order_id_buyer1),
        buyer_attempt(order_id_buyer2),
    )

    statuses = [r[0] for r in results]
    assert statuses.count("SUCCESS") == 1
    assert statuses.count("INSUFFICIENT_STOCK") == 1

    # Verify inventory invariants in database
    async with session_factory() as session:
        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert item.quantity_on_hand == 1
        assert item.quantity_reserved == 1
        assert item.quantity_on_hand - item.quantity_reserved == 0  # stock never negative


@pytest.mark.asyncio
async def test_duplicate_idempotency_creates_only_one_reservation(session_factory):
    """Calling reserve_stock with the same order_id returns the existing reservation without duplicate."""
    sku = f"IDEMP-SKU-{uuid.uuid4().hex[:6]}"

    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip 30mm", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()
        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="30mm", is_active=True)
        session.add(var)
        await session.flush()
        inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=10, quantity_reserved=0)
        session.add(inv)
        await session.commit()

    order_id = uuid.uuid4()

    async with session_factory() as session, session.begin():
        res1 = await InventoryService.reserve_stock(session, sku, 3, order_id)
        res2 = await InventoryService.reserve_stock(session, sku, 3, order_id)
        assert res1.id == res2.id

    async with session_factory() as session:
        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert item.quantity_reserved == 3  # reserved only once, not 6


@pytest.mark.asyncio
async def test_expired_reservation_is_released_exactly_once(session_factory):
    """Expired reservations are released and returned to available stock."""
    sku = f"EXP-SKU-{uuid.uuid4().hex[:6]}"

    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip 40mm", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()
        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="40mm", is_active=True)
        session.add(var)
        await session.flush()
        inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=5, quantity_reserved=2)
        session.add(inv)
        await session.flush()

        # Create expired reservation
        past = datetime.now(UTC) - timedelta(minutes=5)
        res = InventoryReservation(
            inventory_item_id=inv.id,
            order_id=uuid.uuid4(),
            sku=sku,
            quantity=2,
            status=ReservationStatus.ACTIVE,
            expires_at=past,
            created_at=past - timedelta(minutes=15),
        )
        session.add(res)
        await session.commit()

    # First release
    async with session_factory() as session, session.begin():
        released = await InventoryService.release_expired_reservations(session)
        assert any(r == (sku, 2) for r in released)

    # Second release immediately after: must release 0 items for this sku (idempotent, exactly once)
    async with session_factory() as session, session.begin():
        released_again = await InventoryService.release_expired_reservations(session)
        assert not any(r[0] == sku for r in released_again)

    # Verify inventory item
    async with session_factory() as session:
        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert item.quantity_reserved == 0
        assert item.quantity_on_hand == 5


@pytest.mark.asyncio
async def test_late_payment_depleted_stock_triggers_refund_error(session_factory):
    """When a late payment arrives after reservation expiry and stock was taken by another buyer,
    StockUnavailablePostExpiryError is raised to trigger automated refund."""
    sku = f"LATE-SKU-{uuid.uuid4().hex[:6]}"

    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip Universal", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()
        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="universal", is_active=True)
        session.add(var)
        await session.flush()
        # Stock is 0 because another buyer bought it
        inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=0, quantity_reserved=0)
        session.add(inv)
        await session.commit()

    order_id = uuid.uuid4()
    async with session_factory() as session, session.begin():
        with pytest.raises(StockUnavailablePostExpiryError):
            await InventoryService.confirm_payment_and_commit_stock(
                session=session,
                order_id=order_id,
                sku=sku,
                quantity=1,
            )


@pytest.mark.asyncio
async def test_payment_confirmation_atomically_commits_stock(session_factory):
    """Payment confirmation transitions active reservation to committed stock atomically."""
    sku = f"COMMIT-SKU-{uuid.uuid4().hex[:6]}"
    order_id = uuid.uuid4()

    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip 35mm", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()
        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
        session.add(var)
        await session.flush()
        inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=10, quantity_reserved=0)
        session.add(inv)
        await session.commit()

    # Reserve 2 units
    async with session_factory() as session, session.begin():
        await InventoryService.reserve_stock(session, sku, 2, order_id)

    # Confirm payment & commit
    async with session_factory() as session, session.begin():
        committed = await InventoryService.confirm_payment_and_commit_stock(session, order_id, sku, 2)
        assert committed is True

    # Verify inventory state
    async with session_factory() as session:
        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert item.quantity_on_hand == 8
        assert item.quantity_reserved == 0

        res = (await session.execute(
            select(InventoryReservation).where(InventoryReservation.order_id == order_id)
        )).scalar_one()
        assert res.status == ReservationStatus.COMMITTED

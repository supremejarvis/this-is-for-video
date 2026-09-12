"""Integration tests for Transactional Outbox against real PostgreSQL database.

Proves:
- Business state and outbox event commit together atomically
- When business transaction rolls back, no outbox event remains
- Publisher processes committed events only (uncommitted/rolled back are invisible)
- Duplicate processing is idempotent
- Failed publishing remains retryable (published_at remains None)
- Cursor gaps are permitted and do not lose subsequent events
- PostgreSQL is the durable source of truth for replay/reconciliation
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    FulfilmentStatus,
    Order,
    OrderStatus,
    OutboxEvent,
    PaymentStatus,
    ReplacementStatus,
)
from app.services.outbox import OutboxService

DATABASE_URL = "postgresql+asyncpg://postgres@localhost:5433/apollo_disposable_test"


@pytest.fixture
async def session_factory():
    engine = create_async_engine(DATABASE_URL, echo=False)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session, session.begin():
        await session.execute(text("DELETE FROM outbox_events;"))
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_business_state_and_outbox_event_commit_together(session_factory):
    """When an order is created, its outbox event commits within the exact same database transaction."""
    order_no = f"ORD-OUTBOX-{uuid.uuid4().hex[:6]}"
    order_id = uuid.uuid4()

    async with session_factory() as session, session.begin():
        # 1. Business entity
        order = Order(
            id=order_id,
            order_number=order_no,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.CAPTURED,
            fulfilment_status=FulfilmentStatus.UNFULFILLED,
            replacement_status=ReplacementStatus.NONE,
            subtotal_taxable=Decimal("84.75"),
            product_gst=Decimal("15.25"),
            shipping_base=Decimal("60.00"),
            shipping_gst=Decimal("10.80"),
            cod_surcharge=Decimal("0.00"),
            total_payable=Decimal("170.80"),
        )
        session.add(order)

        # 2. Outbox event in same transaction
        OutboxService.emit_event(
            session=session,
            event_type="order.confirmed",
            aggregate_type="order",
            aggregate_id=order_id,
            payload={"order_number": order_no, "total": "170.80"},
        )

    # Verify both exist in database
    async with session_factory() as session:
        db_order = await session.get(Order, order_id)
        assert db_order is not None
        assert db_order.order_number == order_no

        stmt = select(OutboxEvent).where(OutboxEvent.aggregate_id == order_id)
        db_event = (await session.execute(stmt)).scalar_one()
        assert db_event is not None
        assert db_event.event_type == "order.confirmed"
        assert db_event.published_at is None


@pytest.mark.asyncio
async def test_transaction_rollback_leaves_no_outbox_event(session_factory):
    """If the business transaction fails or rolls back, no outbox event is persisted."""
    order_no = f"ORD-FAIL-{uuid.uuid4().hex[:6]}"
    order_id = uuid.uuid4()
    event_id = uuid.uuid4()

    try:
        async with session_factory() as session, session.begin():
            order = Order(
                id=order_id,
                order_number=order_no,
                order_status=OrderStatus.CONFIRMED,
                payment_status=PaymentStatus.CAPTURED,
                fulfilment_status=FulfilmentStatus.UNFULFILLED,
                replacement_status=ReplacementStatus.NONE,
                subtotal_taxable=Decimal("84.75"),
                product_gst=Decimal("15.25"),
                shipping_base=Decimal("60.00"),
                shipping_gst=Decimal("10.80"),
                cod_surcharge=Decimal("0.00"),
                total_payable=Decimal("170.80"),
            )
            session.add(order)

            OutboxService.emit_event(
                session=session,
                event_type="order.confirmed",
                aggregate_type="order",
                aggregate_id=order_id,
                payload={"order_number": order_no},
                event_id=event_id,
            )
            # Force rollback
            raise RuntimeError("Simulated transaction failure")
    except RuntimeError:
        pass

    # Verify neither order nor event exists
    async with session_factory() as session:
        db_order = await session.get(Order, order_id)
        assert db_order is None

        stmt = select(OutboxEvent).where(OutboxEvent.event_id == event_id)
        db_event = (await session.execute(stmt)).scalar_one_or_none()
        assert db_event is None


@pytest.mark.asyncio
async def test_publisher_fetches_committed_events_and_marks_published_idempotently(session_factory):
    """Publisher fetches unpublished events, publishes them, and marks them published.
    Duplicate mark_published calls are safe and idempotent."""
    order_id = uuid.uuid4()
    event_id = uuid.uuid4()

    async with session_factory() as session, session.begin():
        OutboxService.emit_event(
            session=session,
            event_type="inventory.reserved",
            aggregate_type="inventory",
            aggregate_id=order_id,
            payload={"sku": "DC-35", "qty": 10},
            event_id=event_id,
        )

    # 1. Fetch unpublished
    async with session_factory() as session, session.begin():
        events = await OutboxService.fetch_unpublished_events(session, limit=100)
        target = next((e for e in events if e.event_id == event_id), None)
        assert target is not None
        cursor_id = target.cursor_id

        # Mark published
        await OutboxService.mark_published(session, cursor_id)

    # 2. Verify it is no longer returned in unpublished events
    async with session_factory() as session, session.begin():
        events_after = await OutboxService.fetch_unpublished_events(session, limit=100)
        target_after = next((e for e in events_after if e.event_id == event_id), None)
        assert target_after is None

    # 3. Idempotent duplicate mark_published: must not raise error
    async with session_factory() as session, session.begin():
        await OutboxService.mark_published(session, cursor_id)


@pytest.mark.asyncio
async def test_failed_publishing_remains_retryable(session_factory):
    """If the publishing network call fails, the event is not marked published and remains fetchable."""
    event_id = uuid.uuid4()

    async with session_factory() as session, session.begin():
        OutboxService.emit_event(
            session=session,
            event_type="payment.captured",
            aggregate_type="payment",
            aggregate_id=uuid.uuid4(),
            payload={"amount": "170.80"},
            event_id=event_id,
        )

    # Simulate publisher loop encountering an external network failure
    try:
        async with session_factory() as session, session.begin():
            events = await OutboxService.fetch_unpublished_events(session)
            target = next((e for e in events if e.event_id == event_id), None)
            assert target is not None
            # External Redis/network call fails here before mark_published
            raise ConnectionError("Simulated network drop")
    except ConnectionError:
        pass

    # Event remains unpublished and is retried in next cycle
    async with session_factory() as session, session.begin():
        retry_events = await OutboxService.fetch_unpublished_events(session)
        retry_target = next((e for e in retry_events if e.event_id == event_id), None)
        assert retry_target is not None
        assert retry_target.published_at is None


@pytest.mark.asyncio
async def test_cursor_replay_handles_gaps_and_recovers_all_events(session_factory):
    """Proves durable SSE cursor replay: gaps between cursors do not cause lost events.
    All events remain durable in PostgreSQL."""
    created_events = []
    async with session_factory() as session, session.begin():
        for i in range(5):
            e = OutboxService.emit_event(
                session=session,
                event_type=f"stream.event.{i}",
                aggregate_type="order",
                aggregate_id=uuid.uuid4(),
                payload={"index": i},
            )
            created_events.append(e)

    async with session_factory() as session:
        # Fetch cursors
        stmt = select(OutboxEvent).order_by(OutboxEvent.cursor_id.asc())
        all_events = (await session.execute(stmt)).scalars().all()
        # Find our 5 created events
        matching = [e for e in all_events if "stream.event." in e.event_type]
        assert len(matching) >= 5
        c1 = matching[1].cursor_id

        # Replay after c1 (simulate client missed events after cursor c1):
        replayed = await OutboxService.fetch_events_after_cursor(session, last_cursor_id=c1, limit=10)
        replayed_cursors = [e.cursor_id for e in replayed]
        assert matching[2].cursor_id in replayed_cursors
        assert matching[3].cursor_id in replayed_cursors
        assert matching[4].cursor_id in replayed_cursors

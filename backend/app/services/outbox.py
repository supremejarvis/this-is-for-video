"""Transactional Outbox Service ensuring Atomic Commitment and Durable Event Streaming."""
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import OutboxEvent


class OutboxService:
    """Manages transactional outbox emission, publishing checkpoints, and cursor replay."""

    @staticmethod
    def emit_event(
        session: AsyncSession,
        event_type: str,
        aggregate_type: str,
        aggregate_id: UUID,
        payload: dict[str, Any],
        event_id: UUID | None = None,
    ) -> OutboxEvent:
        """Add outbox event to current session.
        Commits atomically with the business transaction; rolls back if business transaction rolls back.
        """
        event = OutboxEvent(
            event_id=event_id or uuid4(),
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            payload=payload,
            created_at=datetime.now(UTC),
            published_at=None,
        )
        session.add(event)
        return event

    @staticmethod
    async def fetch_unpublished_events(
        session: AsyncSession,
        limit: int = 50,
    ) -> list[OutboxEvent]:
        """Fetch un-published events ordered by monotonic cursor."""
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.published_at.is_(None))
            .order_by(OutboxEvent.cursor_id.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list((await session.execute(stmt)).scalars().all())

    @staticmethod
    async def mark_published(
        session: AsyncSession,
        cursor_id: int,
    ) -> None:
        """Mark event as published idempotently."""
        stmt = select(OutboxEvent).where(OutboxEvent.cursor_id == cursor_id).with_for_update()
        event = (await session.execute(stmt)).scalar_one_or_none()
        if event is not None:
            event.published_at = datetime.now(UTC)
            await session.flush()

    @staticmethod
    async def fetch_events_after_cursor(
        session: AsyncSession,
        last_cursor_id: int,
        limit: int = 50,
    ) -> list[OutboxEvent]:
        """Fetch events strictly after last_cursor_id for durable SSE recovery.
        Permits cursor gaps without losing subsequent events.
        """
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.cursor_id > last_cursor_id)
            .order_by(OutboxEvent.cursor_id.asc())
            .limit(limit)
        )
        return list((await session.execute(stmt)).scalars().all())

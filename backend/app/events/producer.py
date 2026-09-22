"""Event Producer for Transactional Outbox & External Message Brokers (Kafka/RabbitMQ)."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import OutboxEvent
from app.services.outbox import OutboxService

logger = logging.getLogger("apollo.events.producer")


class EventProducer:
    """Publishes domain events idempotently into PostgreSQL Outbox / Message Broker."""

    @staticmethod
    async def publish_event(
        session: AsyncSession,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str | uuid.UUID,
        payload: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> OutboxEvent:
        """Persist event to transactional outbox within current database transaction."""
        logger.info(
            "[EventProducer] Recording event %s for %s (%s)",
            event_type,
            aggregate_type,
            aggregate_id,
        )
        agg_uuid: uuid.UUID
        if isinstance(aggregate_id, uuid.UUID):
            agg_uuid = aggregate_id
        else:
            try:
                agg_uuid = uuid.UUID(str(aggregate_id))
            except ValueError:
                agg_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, str(aggregate_id))

        return OutboxService.emit_event(
            session=session,
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=agg_uuid,
            payload=payload,
        )


event_producer = EventProducer()

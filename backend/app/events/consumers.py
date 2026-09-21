"""Event Consumers for Apollo Engineering Platform."""
import logging
from typing import Any

from app.workers.invoice_worker import invoice_worker
from app.workers.notification_worker import notification_worker

logger = logging.getLogger("apollo.events.consumers")


class EventConsumer:
    """Dispatches domain events to appropriate background workers."""

    async def handle_event(self, event_type: str, aggregate_id: str, payload: dict[str, Any]) -> None:
        """Route event to dedicated worker."""
        logger.info("[EventConsumer] Handling event %s for %s", event_type, aggregate_id)

        from app.core.websocket import ws_manager

        # Broadcast real-time domain event to WebSocket subscribers
        try:
            await ws_manager.broadcast("orders", {
                "type": event_type,
                "order_id": aggregate_id,
                "payload": payload,
            })
            await ws_manager.broadcast("admin_alerts", {
                "type": event_type,
                "order_id": aggregate_id,
                "payload": payload,
            })
        except Exception as ws_err:
            logger.warning("[EventConsumer] Failed to broadcast WebSocket event: %s", ws_err)

        if event_type in ("ORDER_CREATED", "ORDER_PLACED"):
            # Enqueue invoice generation and notification
            customer_id = payload.get("customer_id", "guest")
            customer_phone = payload.get("customer_phone")

            await invoice_worker.enqueue_invoice_job(order_id=aggregate_id, customer_id=customer_id)

            if customer_phone:
                await notification_worker.enqueue_notification(
                    recipient=customer_phone,
                    channel="WHATSAPP",
                    template="order_confirmation",
                    params={"order_id": aggregate_id, "amount": payload.get("grand_total")},
                )

        elif event_type == "PAYMENT_VERIFIED":
            logger.info("[EventConsumer] Payment verified for order %s", aggregate_id)
            # Trigger dispatch queue
            try:
                await ws_manager.broadcast(f"tracking:{aggregate_id}", {
                    "type": "PAYMENT_CONFIRMED",
                    "order_id": aggregate_id,
                    "status": "PROCESSING",
                })
            except Exception as ws_err:
                logger.warning("[EventConsumer] Failed to broadcast tracking update: %s", ws_err)


event_consumer = EventConsumer()

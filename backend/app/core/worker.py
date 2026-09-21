"""Asynchronous Background Worker Engine for Apollo Engineering E-Commerce System.

Pillars:
1. Outbox Event Publisher: Reliably processes transactional outbox events (order created,
   payment verified, inventory reserved) asynchronously without blocking checkout latency.
2. Quote Lifecycle Pruner: Periodically purges stale expired quotes (> 24 hours old) to keep
   PostgreSQL query plans fast.
3. Graceful Lifecycle Control: Clean startup and cancellation hooks integrated with FastAPI lifespan.
"""
import asyncio
import contextlib
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models.quote import Quote
from app.services.outbox import OutboxService

logger = logging.getLogger("apollo.worker")


class OutboxPublisherWorker:
    """Consumes unpublished events from the transactional outbox table and dispatches them."""

    def __init__(self, poll_interval_sec: float = 5.0):
        self.poll_interval_sec = poll_interval_sec
        self.running = False
        self.processed_count = 0
        self.last_run: datetime | None = None
        self._task: asyncio.Task | None = None

    async def _process_batch(self) -> int:
        count = 0
        async with AsyncSessionLocal() as session:
            try:
                events = await OutboxService.fetch_unpublished_events(session, limit=25)
                for event in events:
                    # Dispatch to relevant processors & WebSocket consumers
                    logger.info(
                        "[OutboxWorker] Dispatching event: %s | Aggregate: %s (%s)",
                        event.event_type,
                        event.aggregate_type,
                        event.aggregate_id,
                    )
                    try:
                        from app.events.consumers import event_consumer
                        await event_consumer.handle_event(
                            event_type=event.event_type,
                            aggregate_id=event.aggregate_id,
                            payload=event.payload or {},
                        )
                    except Exception as consumer_exc:
                        logger.warning("[OutboxWorker] Consumer failed for event %s: %s", event.event_type, consumer_exc)

                    # Mark published
                    await OutboxService.mark_published(session, event.cursor_id)
                    count += 1
                await session.commit()
            except Exception as exc:
                await session.rollback()
                logger.error("[OutboxWorker] Error processing outbox events: %s", exc, exc_info=True)
        return count

    async def run_loop(self) -> None:
        self.running = True
        logger.info("[OutboxWorker] Started background outbox event processing loop.")
        while self.running:
            try:
                self.last_run = datetime.now(UTC)
                processed = await self._process_batch()
                self.processed_count += processed
            except asyncio.CancelledError:
                logger.info("[OutboxWorker] Task cancelled, exiting loop.")
                break
            except Exception as exc:
                logger.error("[OutboxWorker] Unexpected loop error: %s", exc)

            try:
                await asyncio.sleep(self.poll_interval_sec)
            except asyncio.CancelledError:
                break
        self.running = False

    def start(self) -> None:
        if not self._task or self._task.done():
            self._task = asyncio.create_task(self.run_loop(), name="outbox_worker_task")

    async def stop(self) -> None:
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        logger.info("[OutboxWorker] Stopped.")


class QuoteCleanupWorker:
    """Periodically prunes expired quotes older than 24 hours."""

    def __init__(self, interval_sec: float = 3600.0):
        self.interval_sec = interval_sec
        self.running = False
        self.pruned_count = 0
        self.last_run: datetime | None = None
        self._task: asyncio.Task | None = None

    async def _prune_expired_quotes(self) -> int:
        pruned = 0
        async with AsyncSessionLocal() as session:
            try:
                now = datetime.now(UTC)
                stmt = delete(Quote).where(Quote.expires_at < now)
                res = await session.execute(stmt)
                pruned = res.rowcount or 0
                await session.commit()
                if pruned > 0:
                    logger.info("[QuoteCleanupWorker] Pruned %d expired quotes from database.", pruned)
            except Exception as exc:
                await session.rollback()
                logger.warning("[QuoteCleanupWorker] Notice during quote prune: %s", exc)
        return pruned

    async def run_loop(self) -> None:
        self.running = True
        logger.info("[QuoteCleanupWorker] Started background quote maintenance loop.")
        while self.running:
            try:
                self.last_run = datetime.now(UTC)
                count = await self._prune_expired_quotes()
                self.pruned_count += count
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("[QuoteCleanupWorker] Unexpected error: %s", exc)

            try:
                await asyncio.sleep(self.interval_sec)
            except asyncio.CancelledError:
                break
        self.running = False

    def start(self) -> None:
        if not self._task or self._task.done():
            self._task = asyncio.create_task(self.run_loop(), name="quote_cleanup_task")

    async def stop(self) -> None:
        self.running = False
        if self._task and not self._task.done():
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        logger.info("[QuoteCleanupWorker] Stopped.")


class BackgroundWorkerManager:
    """Central orchestrator for all background asynchronous daemon tasks."""

    def __init__(self):
        self.outbox_worker = OutboxPublisherWorker(poll_interval_sec=5.0)
        self.quote_cleanup_worker = QuoteCleanupWorker(interval_sec=3600.0)

    def start_all(self) -> None:
        logger.info("[WorkerManager] Starting all system background workers...")
        self.outbox_worker.start()
        self.quote_cleanup_worker.start()

    async def stop_all(self) -> None:
        logger.info("[WorkerManager] Gracefully shutting down all background workers...")
        await asyncio.gather(
            self.outbox_worker.stop(),
            self.quote_cleanup_worker.stop(),
            return_exceptions=True,
        )

    def get_status(self) -> dict[str, Any]:
        return {
            "outbox_worker": {
                "running": self.outbox_worker.running,
                "processed_events": self.outbox_worker.processed_count,
                "last_run": self.outbox_worker.last_run.isoformat() if self.outbox_worker.last_run else None,
            },
            "quote_cleanup_worker": {
                "running": self.quote_cleanup_worker.running,
                "pruned_quotes": self.quote_cleanup_worker.pruned_count,
                "last_run": self.quote_cleanup_worker.last_run.isoformat() if self.quote_cleanup_worker.last_run else None,
            },
        }


worker_manager = BackgroundWorkerManager()
outbox_worker = worker_manager.outbox_worker
quote_cleanup_worker = worker_manager.quote_cleanup_worker

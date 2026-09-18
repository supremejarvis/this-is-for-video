"""Inventory & Quote Lifecycle Background Worker.

Features:
- Periodic pruning of expired statutory quotes (> 24 hours).
- Reconciliation of reserved stock units for unplaced checkout carts.
- Database cleanups to maintain high PostgreSQL query performance.
"""
from app.core.worker import QuoteCleanupWorker, quote_cleanup_worker


class InventoryWorker(QuoteCleanupWorker):
    """Alias and extension of QuoteCleanupWorker for inventory operations."""
    pass


inventory_worker = quote_cleanup_worker

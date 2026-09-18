"""High-Throughput Load Optimizer, In-Memory TTL Cache & Concurrency Control.

Pillars:
1. In-Memory TTL & LRU Caching: Drastically reduces database roundtrips on hot read queries
   (product catalog, pincode lookup, price versions).
2. Concurrency Throttling / Load Shedding: Protects PostgreSQL connection pool from exhaustion
   under sudden high-traffic spikes.
3. Performance Metrics: Tracks cache hits, misses, evictions, and active concurrency.
"""
import asyncio
import collections
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("apollo.load_optimizer")


@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    accessed_at: float


class MemoryCache:
    """Thread-safe and async-safe In-Memory Cache with TTL and LRU Eviction."""

    def __init__(self, name: str, default_ttl: float = 60.0, max_size: int = 1000):
        self.name = name
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._cache: collections.OrderedDict[str, CacheEntry] = collections.OrderedDict()
        self._lock = asyncio.Lock()
        self.hits = 0
        self.misses = 0
        self.evictions = 0

    async def get(self, key: str) -> Any | None:
        """Retrieve item if present and non-expired."""
        async with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self.misses += 1
                return None

            now = time.monotonic()
            if now > entry.expires_at:
                # Expired
                del self._cache[key]
                self.misses += 1
                return None

            # Mark recently used
            entry.accessed_at = now
            self._cache.move_to_end(key)
            self.hits += 1
            return entry.value

    async def set(self, key: str, value: Any, ttl: float | None = None) -> None:
        """Store item with TTL. Evicts oldest if cache exceeds max_size."""
        effective_ttl = ttl if ttl is not None else self.default_ttl
        now = time.monotonic()
        entry = CacheEntry(
            value=value,
            expires_at=now + effective_ttl,
            accessed_at=now,
        )

        async with self._lock:
            # Evict oldest if full
            if key not in self._cache and len(self._cache) >= self.max_size:
                oldest_key, _ = self._cache.popitem(last=False)
                self.evictions += 1
                logger.debug("Cache '%s' evicted oldest key '%s'", self.name, oldest_key)

            self._cache[key] = entry
            self._cache.move_to_end(key)

    async def delete(self, key: str) -> bool:
        """Delete specific key."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> None:
        """Clear all keys."""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache '%s' cleared", self.name)

    def get_stats(self) -> dict[str, Any]:
        """Return diagnostic metrics."""
        total = self.hits + self.misses
        hit_ratio = (self.hits / total) if total > 0 else 0.0
        return {
            "name": self.name,
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_percent": round(hit_ratio * 100, 1),
            "evictions": self.evictions,
        }


class ConcurrencyLimiterMiddleware(BaseHTTPMiddleware):
    """Protects backend from cascading thread/connection exhaustion by bounding concurrent requests."""

    def __init__(self, app: Any, max_concurrent_requests: int = 150):
        super().__init__(app)
        self.max_concurrent_requests = max_concurrent_requests
        self.current_in_flight = 0
        self.rejected_requests = 0
        self._lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        async with self._lock:
            if self.current_in_flight >= self.max_concurrent_requests:
                self.rejected_requests += 1
                logger.warning(
                    "LOAD SHEDDING: In-flight requests (%d) exceeded limit (%d). Rejecting request with 503.",
                    self.current_in_flight,
                    self.max_concurrent_requests,
                )
                return JSONResponse(
                    status_code=503,
                    content={
                        "success": False,
                        "error": "Server under extreme load. Please retry in a few moments.",
                        "retry_after_seconds": 3,
                    },
                    headers={"Retry-After": "3"},
                )
            self.current_in_flight += 1

        try:
            response = await call_next(request)
            return response
        finally:
            async with self._lock:
                self.current_in_flight = max(0, self.current_in_flight - 1)


# ── Canonical System Caches ───────────────────────────────────────────
# 1. Product Catalog Cache (60s TTL): Avoids query storms on storefront
catalog_cache = MemoryCache("catalog_cache", default_ttl=60.0, max_size=500)

# 2. Pincode & Logistics Cache (3600s TTL): Static Speed Post hubs
pincode_cache = MemoryCache("pincode_cache", default_ttl=3600.0, max_size=2000)

# 3. Active Pricing Cache (120s TTL): Temporal price version lookups
pricing_cache = MemoryCache("pricing_cache", default_ttl=120.0, max_size=500)

all_system_caches = [catalog_cache, pincode_cache, pricing_cache]

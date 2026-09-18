"""Redis & In-Memory Hybrid Cache Layer for Apollo Engineering.

Features:
- Seamless Redis Cluster / Standalone connection via REDIS_URL.
- Graceful in-memory fallback (MemoryCache LRU + TTL) when Redis is unavailable.
- Namespace isolation for catalog, pincodes, sessions, and rate-limiting.
"""
import json
import logging
from typing import Any

from app.core.config import settings
from app.core.load_optimizer import MemoryCache, catalog_cache, pincode_cache, pricing_cache

logger = logging.getLogger("apollo.cache")


class CacheClient:
    """Enterprise Hybrid Cache Client with Redis and in-memory LRU fallback."""

    def __init__(self, default_ttl_sec: int = 300):
        self.default_ttl_sec = default_ttl_sec
        self.redis_url = getattr(settings, "REDIS_URL", None)
        self.redis = None
        self._fallback_cache = MemoryCache(name="redis_fallback", default_ttl=float(default_ttl_sec), max_size=2000)
        self._initialized = False

    async def connect(self) -> None:
        """Connect to Redis if configured and installed."""
        if self._initialized:
            return
        if self.redis_url:
            try:
                import redis.asyncio as aioredis
                self.redis = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
                await self.redis.ping()
                logger.info("[Cache] Connected to Redis at %s", self.redis_url)
            except Exception as exc:
                logger.warning("[Cache] Redis unavailable (%s), falling back to in-memory cache.", exc)
                self.redis = None
        else:
            logger.info("[Cache] No REDIS_URL configured; operating with fast In-Memory LRU/TTL cache.")
        self._initialized = True

    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis:
            try:
                await self.redis.close()
            except Exception as exc:
                logger.debug("[Cache] Notice closing Redis connection: %s", exc)
            self.redis = None
        self._initialized = False

    async def get(self, key: str) -> Any:
        """Retrieve a value from cache."""
        if not self._initialized:
            await self.connect()

        if self.redis:
            try:
                val = await self.redis.get(key)
                if val is not None:
                    return json.loads(val)
                return None
            except Exception as exc:
                logger.warning("[Cache] Redis get error (%s), reading fallback cache", exc)

        return await self._fallback_cache.get(key)

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set a key-value pair in cache."""
        if not self._initialized:
            await self.connect()

        effective_ttl = ttl if ttl is not None else self.default_ttl_sec

        if self.redis:
            try:
                serialized = json.dumps(value)
                await self.redis.set(key, serialized, ex=effective_ttl)
                return
            except Exception as exc:
                logger.warning("[Cache] Redis set error (%s), writing fallback cache", exc)

        await self._fallback_cache.set(key, value, ttl=effective_ttl)

    async def delete(self, key: str) -> None:
        """Delete a key from cache."""
        if not self._initialized:
            await self.connect()

        if self.redis:
            try:
                await self.redis.delete(key)
            except Exception as exc:
                logger.warning("[Cache] Redis delete error (%s)", exc)

        await self._fallback_cache.delete(key)


cache_client = CacheClient()


def get_cache(name: str = "default") -> MemoryCache | CacheClient:
    """Retrieve named cache partition."""
    partitions = {
        "catalog": catalog_cache,
        "pincode": pincode_cache,
        "pricing": pricing_cache,
    }
    return partitions.get(name, cache_client)

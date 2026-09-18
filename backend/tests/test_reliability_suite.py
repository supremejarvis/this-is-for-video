"""Enterprise Reliability Test Suite: Worker, Circuit Breaker, and Load Optimizer."""
import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenException,
    CircuitState,
)
from app.core.load_optimizer import MemoryCache
from app.core.worker import BackgroundWorkerManager
from app.main import app


@pytest.mark.asyncio
async def test_circuit_breaker_lifecycle():
    """Verify CLOSED -> OPEN -> HALF_OPEN -> CLOSED state transitions."""
    breaker = CircuitBreaker(
        name="TEST_BREAKER",
        failure_threshold=2,
        recovery_timeout=0.1,  # Fast 100ms recovery for tests
        half_open_success_threshold=2,
    )

    assert breaker.state == CircuitState.CLOSED

    # 1. Normal successful execution
    async def good_call():
        return "SUCCESS"

    res = await breaker.call_async(good_call)
    assert res == "SUCCESS"
    assert breaker.state == CircuitState.CLOSED

    # 2. Trigger failures
    async def bad_call():
        raise ValueError("Downstream service timed out")

    with pytest.raises(ValueError, match="Downstream service timed out"):
        await breaker.call_async(bad_call)
    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 1

    # Second failure trips breaker to OPEN
    with pytest.raises(ValueError, match="Downstream service timed out"):
        await breaker.call_async(bad_call)
    assert breaker.state == CircuitState.OPEN

    # 3. Fail fast when OPEN (no delay/hang)
    with pytest.raises(CircuitBreakerOpenException) as excinfo:
        await breaker.call_async(good_call)
    assert "is OPEN" in str(excinfo.value)

    # 4. Fallback execution when OPEN
    def fallback_result():
        return "FALLBACK_DATA"

    fb_res = await breaker.call_async(good_call, fallback=fallback_result)
    assert fb_res == "FALLBACK_DATA"

    # 5. Recovery after timeout -> HALF_OPEN -> CLOSED
    await asyncio.sleep(0.12)  # Wait for cooldown
    # Probe 1
    res1 = await breaker.call_async(good_call)
    assert res1 == "SUCCESS"
    assert breaker.state == CircuitState.HALF_OPEN
    assert breaker.success_count == 1

    # Probe 2 recovers to CLOSED
    res2 = await breaker.call_async(good_call)
    assert res2 == "SUCCESS"
    assert breaker.state == CircuitState.CLOSED
    assert breaker.failure_count == 0


@pytest.mark.asyncio
async def test_memory_cache_ttl_and_lru():
    """Verify Load Optimizer MemoryCache TTL expiration and LRU eviction."""
    cache = MemoryCache("test_cache", default_ttl=0.1, max_size=2)

    # 1. Store and retrieve
    await cache.set("item1", "val1")
    await cache.set("item2", "val2")
    assert await cache.get("item1") == "val1"
    assert await cache.get("item2") == "val2"

    # 2. TTL Expiration
    await asyncio.sleep(0.12)
    assert await cache.get("item1") is None
    assert await cache.get("item2") is None

    # 3. LRU Eviction
    cache_lru = MemoryCache("lru_cache", default_ttl=60.0, max_size=2)
    await cache_lru.set("a", 1)
    await cache_lru.set("b", 2)
    # Access 'a' to make 'b' the oldest
    assert await cache_lru.get("a") == 1
    # Add 'c', which should evict 'b'
    await cache_lru.set("c", 3)
    assert await cache_lru.get("a") == 1
    assert await cache_lru.get("b") is None  # Evicted
    assert await cache_lru.get("c") == 3

    stats = cache_lru.get_stats()
    assert stats["evictions"] == 1
    assert stats["size"] == 2


@pytest.mark.asyncio
async def test_worker_lifecycle_and_status():
    """Verify background worker manager status and clean startup/shutdown."""
    manager = BackgroundWorkerManager()
    status = manager.get_status()
    assert "outbox_worker" in status
    assert "quote_cleanup_worker" in status
    assert status["outbox_worker"]["running"] is False

    # Start and stop cleanly
    manager.start_all()
    await asyncio.sleep(0.05)
    active_status = manager.get_status()
    assert active_status["outbox_worker"]["running"] is True
    assert active_status["quote_cleanup_worker"]["running"] is True

    await manager.stop_all()
    stopped_status = manager.get_status()
    assert stopped_status["outbox_worker"]["running"] is False
    assert stopped_status["quote_cleanup_worker"]["running"] is False


@pytest.mark.asyncio
async def test_system_status_endpoint():
    """Verify GET /api/v1/system/status returns live telemetry on all 3 pillars."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/system/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "circuit_breakers" in data
        assert len(data["circuit_breakers"]) >= 3
        breaker_names = [cb["name"] for cb in data["circuit_breakers"]]
        assert "CEPT_INDIA_POST" in breaker_names
        assert "MSG91_OTP_GATEWAY" in breaker_names
        assert "RAZORPAY_GATEWAY" in breaker_names
        assert "background_workers" in data
        assert "load_optimizer_caches" in data

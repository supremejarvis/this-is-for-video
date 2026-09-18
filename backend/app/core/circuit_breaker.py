"""Resilience Circuit Breaker Pattern for External Third-Party Integrations.

Protects against cascading failures and high latency from external providers
(CEPT India Post, MSG91 SMS/WhatsApp Gateway, Razorpay API).

States:
- CLOSED: Normal operation. Requests pass through.
- OPEN: Fail fast. Calls immediately execute fallback without waiting for timeouts.
- HALF_OPEN: Recovery probe. Limited trial calls allowed to check if service recovered.
"""
import asyncio
import enum
import functools
import inspect
import logging
import time
from collections.abc import Callable
from typing import Any

logger = logging.getLogger("apollo.circuit_breaker")


class CircuitState(enum.StrEnum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN and no fallback was provided."""

    def __init__(self, name: str, retry_after: float):
        self.name = name
        self.retry_after = round(retry_after, 2)
        super().__init__(
            f"Circuit breaker '{name}' is OPEN. Downstream service unavailable. Retry after {self.retry_after}s."
        )


class CircuitBreaker:
    """Production-grade asynchronous and synchronous Circuit Breaker."""

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_success_threshold: int = 2,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_success_threshold = half_open_success_threshold

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: float | None = None
        self.last_state_change: float = time.monotonic()
        self._lock = asyncio.Lock()

    def get_status(self) -> dict[str, Any]:
        """Return real-time diagnostic status of this breaker."""
        now = time.monotonic()
        remaining_cooldown = 0.0
        if self.state == CircuitState.OPEN and self.last_failure_time:
            elapsed = now - self.last_failure_time
            remaining_cooldown = max(0.0, self.recovery_timeout - elapsed)

        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout_sec": self.recovery_timeout,
            "remaining_cooldown_sec": round(remaining_cooldown, 2),
        }

    def _check_state_transition(self) -> None:
        """Check if OPEN breaker has cooled down and can transition to HALF_OPEN."""
        if (
            self.state == CircuitState.OPEN
            and self.last_failure_time
            and (time.monotonic() - self.last_failure_time >= self.recovery_timeout)
        ):
            logger.info("Circuit breaker '%s' cooled down -> transitioning to HALF_OPEN probe", self.name)
            self.state = CircuitState.HALF_OPEN
            self.success_count = 0
            self.failure_count = 0

    def record_success(self) -> None:
        """Record a successful downstream call."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.half_open_success_threshold:
                logger.info("Circuit breaker '%s' probe successful -> recovering to CLOSED state", self.name)
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.last_failure_time = None
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0

    def record_failure(self, error: Exception) -> None:
        """Record a failed downstream call."""
        self.last_failure_time = time.monotonic()
        self.failure_count += 1
        logger.warning(
            "Circuit breaker '%s' recorded failure (%d/%d): %s",
            self.name,
            self.failure_count,
            self.failure_threshold,
            error,
        )

        if (
            self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)
            and (self.failure_count >= self.failure_threshold or self.state == CircuitState.HALF_OPEN)
        ):
            logger.error(
                "Circuit breaker '%s' tripped! State changed to OPEN. Downstream service marked offline.",
                self.name,
            )
            self.state = CircuitState.OPEN
            self.success_count = 0

    async def call_async(
        self,
        func: Callable[..., Any],
        *args: Any,
        fallback: Callable[..., Any] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Execute an asynchronous function wrapped in this circuit breaker."""
        async with self._lock:
            self._check_state_transition()

            if self.state == CircuitState.OPEN:
                retry_after = max(
                    0.0,
                    self.recovery_timeout - (time.monotonic() - (self.last_failure_time or time.monotonic())),
                )
                if fallback is not None:
                    logger.info("Circuit breaker '%s' is OPEN -> invoking fallback immediately", self.name)
                    if inspect.iscoroutinefunction(fallback):
                        return await fallback(*args, **kwargs)
                    return fallback(*args, **kwargs)
                raise CircuitBreakerOpenException(self.name, retry_after)

        try:
            result = await func(*args, **kwargs)
            async with self._lock:
                self.record_success()
            return result
        except Exception as exc:
            async with self._lock:
                self.record_failure(exc)
            if fallback is not None:
                logger.info("Circuit breaker '%s' failed on call -> invoking fallback", self.name)
                if inspect.iscoroutinefunction(fallback):
                    return await fallback(*args, **kwargs)
                return fallback(*args, **kwargs)
            raise

    def __call__(self, fallback: Callable[..., Any] | None = None) -> Callable:
        """Decorator for wrapping async functions in this circuit breaker."""

        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            @functools.wraps(func)
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                return await self.call_async(func, *args, fallback=fallback, **kwargs)

            return wrapper

        return decorator


# ── Canonical System Circuit Breakers ──────────────────────────────────
# 1. India Post CEPT API Breaker: Fails fast to Kathwada GIDC fallback rate table
cept_circuit_breaker = CircuitBreaker(
    name="CEPT_INDIA_POST",
    failure_threshold=3,
    recovery_timeout=30.0,
    half_open_success_threshold=2,
)

# 2. MSG91 SMS / WhatsApp Gateway Breaker
msg91_circuit_breaker = CircuitBreaker(
    name="MSG91_OTP_GATEWAY",
    failure_threshold=4,
    recovery_timeout=45.0,
    half_open_success_threshold=2,
)

# 3. Razorpay Payment Gateway Breaker
razorpay_circuit_breaker = CircuitBreaker(
    name="RAZORPAY_GATEWAY",
    failure_threshold=5,
    recovery_timeout=60.0,
    half_open_success_threshold=2,
)

all_circuit_breakers = [
    cept_circuit_breaker,
    msg91_circuit_breaker,
    razorpay_circuit_breaker,
]

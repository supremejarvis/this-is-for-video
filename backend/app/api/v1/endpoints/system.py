"""Enterprise System Health, Workers, Circuit Breakers & Load Optimizer Diagnostic Endpoint."""
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter

from app.core.circuit_breaker import all_circuit_breakers
from app.core.load_optimizer import all_system_caches
from app.core.worker import worker_manager

router = APIRouter(prefix="/system", tags=["System Diagnostics"])


@router.get("/status", summary="Real-time Enterprise Reliability Suite Status")
async def get_system_status() -> dict[str, Any]:
    """Returns live telemetry on Circuit Breakers, Background Workers, and Memory Caches."""
    return {
        "status": "healthy",
        "server_time": datetime.now(UTC).isoformat(),
        "circuit_breakers": [cb.get_status() for cb in all_circuit_breakers],
        "background_workers": worker_manager.get_status(),
        "load_optimizer_caches": [cache.get_stats() for cache in all_system_caches],
    }

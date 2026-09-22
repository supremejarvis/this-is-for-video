"""Health Check Endpoints with Database Ping and Latency Monitoring."""
import time
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

router = APIRouter()


@router.get("/health", summary="Health check")
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Readiness and liveness check verifying PostgreSQL DB connection and latency."""
    start = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "healthy",
            "service": "apollo-backend",
            "environment": settings.ENVIRONMENT,
            "database": {
                "status": "healthy",
                "latency_ms": latency_ms,
            },
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "degraded",
                "service": "apollo-backend",
                "environment": settings.ENVIRONMENT,
                "database": {
                    "status": f"unhealthy: {exc}",
                },
            },
        )

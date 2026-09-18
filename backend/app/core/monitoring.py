"""API Request Monitoring & Audit Logging Middleware.

Logs every request/response with timing, status codes, and errors.
Structured JSON format for Sentry/Datadog/ELK ingestion.
"""
import json
import logging
import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api.audit")
logger.setLevel(logging.INFO)

# Ensure handler exists
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.propagate = False


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to audit every HTTP request/response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4())[:8])
        start_time = time.perf_counter()
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")[:200]

        # Log request start
        logger.info(json.dumps({
            "event": "request_start",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query) if request.url.query else None,
            "client_ip": client_ip,
            "user_agent": user_agent,
        }))

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Determine log level based on status
            if response.status_code >= 500:
                level = "error"
            elif response.status_code >= 400:
                level = "warning"
            else:
                level = "info"

            log_data = {
                "event": "request_end",
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }

            getattr(logger, level)(json.dumps(log_data))

            # Add request ID to response headers for tracing
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(json.dumps({
                "event": "request_crash",
                "request_id": request_id,
                "error": str(exc),
                "error_type": type(exc).__name__,
                "duration_ms": duration_ms,
            }), exc_info=True)

            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": "Internal server error",
                    "request_id": request_id
                },
                headers={"X-Request-ID": request_id}
            )


def setup_monitoring(app):
    """Add monitoring middleware to FastAPI app."""
    app.add_middleware(AuditMiddleware)
    return app
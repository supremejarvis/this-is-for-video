import logging
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.gzip import GZipMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.load_optimizer import ConcurrencyLimiterMiddleware
from app.core.monitoring import setup_monitoring
from app.core.rate_limiter import limiter

logger = logging.getLogger("apollo.security")

# Enforce secure docs defaults for production
is_production = settings.ENVIRONMENT.lower() == "production"
docs_enabled = settings.DOCS_ENABLED and not is_production
if is_production and settings.DOCS_ENABLED:
    logger.warning("SECURITY ALERT: Swagger/OpenAPI documentation is disabled in production environment.")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: Initialize tables and seed catalog & owner
    try:
        from app.core.database import init_db
        await init_db()
        from app.cli.seed_catalog import seed_catalog
        await seed_catalog()
        # Safe One-Time Owner Provisioning Check:
        # Never reset passwords on startup. Only provision if DB has no OWNER and ADMIN_INIT_PASSWORD is set.
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.auth import User, UserRole
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.role == UserRole.OWNER)
            res = await session.execute(stmt)
            existing_owner = res.scalar_one_or_none()
            if not existing_owner and settings.ADMIN_INIT_PASSWORD:
                from app.cli.seed_owner import async_seed_owner
                await async_seed_owner(
                    email=settings.ADMIN_INIT_EMAIL or "admin@apolloengineering.co.in",
                    password=settings.ADMIN_INIT_PASSWORD,
                    name="Apollo Administrator"
                )
                logger.info("Initial system owner provisioned from secure environment.")
            elif not existing_owner:
                logger.info("Notice: No system OWNER user provisioned. Use 'python -m app.cli.seed_owner' to bootstrap.")
        logger.info("Database initialized and catalog seeded successfully.")
    except Exception as e:
        logger.warning(f"Database auto-initialization / seeding notice: {e}")

    # Start Enterprise Background Workers (Outbox Publisher, Quote Cleanup)
    from app.core.worker import worker_manager
    worker_manager.start_all()

    yield

    # Graceful shutdown of background workers
    await worker_manager.stop_all()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if docs_enabled else None,
    docs_url=f"{settings.API_V1_STR}/docs" if docs_enabled else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if docs_enabled else None,
)

# Load Optimizer: Response Compression (70-80% payload bandwidth savings)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(ConcurrencyLimiterMiddleware, max_concurrent_requests=150)

# Monitoring & Audit Logging Middleware
setup_monitoring(app)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mandatory Security Headers Middleware (SEC-005)
@app.middleware("http")
async def add_security_headers(request: Request, call_next: Callable[[Request], Any]) -> Response:
    response: Response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS configuration for Frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://apollo-web-three.vercel.app",
        "https://apolloengineering.co.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.endpoints.ws import router as ws_router

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, tags=["WebSocket"])


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "service": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs",
        "openapi": f"{settings.API_V1_STR}/openapi.json",
    }

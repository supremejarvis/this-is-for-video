from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings

logger = logging.getLogger("apollo.security")

# Enforce secure docs defaults for production
is_production = settings.ENVIRONMENT.lower() == "production"
docs_enabled = settings.DOCS_ENABLED and not is_production
if is_production and settings.DOCS_ENABLED:
    logger.warning("SECURITY ALERT: Swagger/OpenAPI documentation is disabled in production environment.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables and seed catalog & owner
    try:
        from app.core.database import init_db
        await init_db()
        from app.cli.seed_catalog import seed_catalog
        await seed_catalog()
        from app.cli.seed_owner import async_seed_owner
        await async_seed_owner(
            email="admin@apolloengineering.co.in",
            password="NIL@apl321",
            name="Apollo Administrator"
        )
        logger.info("Database initialized and catalog seeded successfully.")
    except Exception as e:
        logger.warning(f"Database auto-initialization / seeding notice: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if docs_enabled else None,
    docs_url=f"{settings.API_V1_STR}/docs" if docs_enabled else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if docs_enabled else None,
)

# Mandatory Security Headers Middleware (SEC-005)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS configuration for Frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    return {
        "service": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs",
        "openapi": f"{settings.API_V1_STR}/openapi.json",
    }

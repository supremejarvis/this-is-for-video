"""Pytest configuration and shared fixtures."""
import os
import sys
from pathlib import Path

# Set test environment variables BEFORE ANY IMPORTS
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_for_testing_only")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

from app.core.database import Base

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set test environment variables BEFORE ANY IMPORTS
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_for_testing_only")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

# Register all models with Base.metadata
import app.models  # noqa: F401
from app.core.database import Base, engine, AsyncSessionLocal


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


async_engine = engine
TestingAsyncSessionLocal = AsyncSessionLocal


@pytest.fixture(autouse=True)
async def db_schema():
    """Ensure all tables are created before each test and dropped after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestingAsyncSessionLocal() as session:
        yield session



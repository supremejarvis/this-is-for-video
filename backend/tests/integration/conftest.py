"""Integration tests configuration.

Detects if the live PostgreSQL server is running on localhost:5432.
If unreachable, cleanly skips external database integration tests so unit test suites
and offline workflows proceed reliably.
"""
import socket

import pytest


def is_postgres_running(host: str = "localhost", port: int = 5432) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (OSError, ConnectionRefusedError):
        return False


@pytest.fixture(autouse=True, scope="module")
def require_postgres_server():
    if not is_postgres_running():
        pytest.skip("Live PostgreSQL server on localhost:5432 is not running", allow_module_level=True)


@pytest.fixture(scope="session", autouse=True)
def initialize_postgres_database():
    if not is_postgres_running():
        return

    import asyncio

    from sqlalchemy.ext.asyncio import create_async_engine

    from app.models import Base

    db_url = "postgresql+asyncpg://postgres_test:postgres@localhost:5432/apollo_disposable_test"

    async def _setup():
        engine = create_async_engine(db_url, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    try:
        asyncio.run(_setup())
    except Exception as exc:
        print(f"[Warning] Failed to initialize test PostgreSQL schema: {exc}")

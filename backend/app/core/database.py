"""Database Connection & Session Configuration."""
from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_: Any, compiler: Any, **kw: Any) -> str:
    return "JSON"

class Base(DeclarativeBase):
    """Base model for all SQLAlchemy entities."""
    pass

is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

engine_kwargs: dict[str, Any] = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.DATABASE_URL.lower():
        from sqlalchemy.pool import StaticPool
        engine_kwargs["poolclass"] = StaticPool
else:
    # Serverless-safe PostgreSQL configuration
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs["pool_pre_ping"] = True

# Managed engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def init_db() -> None:
    """Initialize database tables idempotently."""
    import app.models  # noqa: F401 - Register all models with Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

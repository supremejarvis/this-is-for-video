"""Integration Tests for FastAPI Endpoints."""
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.main import app
from app.models import Base

DATABASE_URL = "postgresql+asyncpg://postgres_test:postgres@localhost:5432/apollo_disposable_test"

@pytest.fixture(scope="module")
async def session_factory():
    engine = create_async_engine(DATABASE_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
async def db(session_factory):
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify health check endpoint returns 200 OK."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "apollo-backend"


@pytest.mark.asyncio
async def test_create_quote_tc01_endpoint(db: AsyncSession, client: AsyncClient):
    """Verify POST /api/v1/quotes calculates TC-01 with 15m TTL."""
    from app.models import PriceVersion, Product, ProductVariant, TaxMode
    from sqlalchemy import select

    # Seed APE-DC-35MM in catalog
    v = (await db.execute(select(ProductVariant).where(ProductVariant.sku == "APE-DC-35MM"))).scalar_one_or_none()
    if not v:
        p = Product(sku_prefix="APE-DC-35MM", name="Drain Clip 35mm", hsn_code="73269099", is_active=True)
        db.add(p)
        await db.flush()
        v = ProductVariant(product_id=p.id, sku="APE-DC-35MM", frame_thickness="35mm", is_active=True)
        db.add(v)
        await db.flush()

    pv_stmt = select(PriceVersion).where(
        (PriceVersion.variant_id == v.id) | (PriceVersion.product_id == v.product_id),
        PriceVersion.valid_to.is_(None),
    )
    existing_pv = (await db.execute(pv_stmt)).scalar_one_or_none()
    if not existing_pv:
        pv = PriceVersion(
            variant_id=v.id,
            product_id=v.product_id,
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("20.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73269099",
            tax_mode=TaxMode.GST_INCLUSIVE,
        )
        db.add(pv)
        await db.commit()


    payload = {
        "items": [
            {
                "sku": "APE-DC-35MM",
                "quantity": 1,
            }
        ],
        "destination_pincode": "382430",
        "base_shipping": "60.00",
        "rounding_multiple": 1,
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/quotes", json=payload)
        assert response.status_code == 201
        data = response.json()

        assert data["quote_number"].startswith("APE-Q-2026-")
        assert data["destination_pincode"] == "382430"
        assert Decimal(data["subtotal_taxable"]) == Decimal("16.95")
        assert Decimal(data["total_product_gst"]) == Decimal("3.05")
        assert Decimal(data["shipping_gst"]) == Decimal("10.80")
        assert Decimal(data["prepaid_total"]) == Decimal("90.80")
        assert Decimal(data["cod_total"]) == Decimal("94.00")
        assert "expires_at" in data


@pytest.mark.asyncio
async def test_create_quote_invalid_pincode_rejected():
    """Verify invalid 3-digit PIN code is rejected with HTTP 422."""
    payload = {
        "items": [
            {
                "sku": "APE-DC-35MM",
                "quantity": 1,
                "unit_price": "20.00",
            }
        ],
        "destination_pincode": "123",  # Invalid
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/quotes", json=payload)
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_quote_empty_items_rejected():
    """Verify empty cart is rejected with HTTP 422."""
    payload = {
        "items": [],
        "destination_pincode": "382430",
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/quotes", json=payload)
        assert response.status_code == 422

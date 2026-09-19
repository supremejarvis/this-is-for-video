"""Integration tests for B2B multi-tier volume pricing and cross-size family pooling."""
import uuid
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.main import app
from app.models import PriceVersion, Product, ProductVariant, TaxMode
from app.schemas.quote import CreateQuoteRequest, QuoteItemRequest
from app.services.quote_service import QuoteService

DATABASE_URL = "postgresql+asyncpg://postgres_test:postgres@localhost:5432/apollo_disposable_test"


@pytest.fixture
async def session_factory():
    engine = create_async_engine(DATABASE_URL, echo=False, poolclass=NullPool)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def seeded_tiered_product(session_factory):
    """Seed product with 2 variants and B2C + B2B tiered price versions.
    Tiers:
      B2C: ₹20 (min_qty 1)
      B2B:
        < 1000 pcs: ₹17 (min_qty 1)
        >= 1000 pcs: ₹15 (min_qty 1000)
        >= 2500 pcs: ₹10 (min_qty 2500)
    """
    prefix = f"TIER-{uuid.uuid4().hex[:6]}"
    sku_28 = f"{prefix}-28MM"
    sku_35 = f"{prefix}-35MM"

    async with session_factory() as session:
        prod = Product(sku_prefix=prefix, name="Solar Water Drain Clip", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()

        var_28 = ProductVariant(product_id=prod.id, sku=sku_28, frame_thickness="28mm", is_active=True)
        var_35 = ProductVariant(product_id=prod.id, sku=sku_35, frame_thickness="35mm", is_active=True)
        session.add_all([var_28, var_35])
        await session.flush()

        # B2C standard price
        pv_b2c = PriceVersion(
            product_id=prod.id,
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("20.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
        )
        # B2B tier 1 (< 1000 pcs)
        pv_b2b_1 = PriceVersion(
            product_id=prod.id,
            channel="B2B",
            min_quantity=1,
            unit_price=Decimal("17.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
        )
        # B2B tier 2 (>= 1000 pcs)
        pv_b2b_1000 = PriceVersion(
            product_id=prod.id,
            channel="B2B",
            min_quantity=1000,
            unit_price=Decimal("15.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
        )
        # B2B tier 3 (>= 2500 pcs)
        pv_b2b_2500 = PriceVersion(
            product_id=prod.id,
            channel="B2B",
            min_quantity=2500,
            unit_price=Decimal("10.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
        )
        session.add_all([pv_b2c, pv_b2b_1, pv_b2b_1000, pv_b2b_2500])
        await session.commit()

    return {
        "product_id": prod.id,
        "sku_28": sku_28,
        "sku_35": sku_35,
    }


@pytest.mark.asyncio
async def test_b2c_mode_does_not_apply_volume_tiers(client, seeded_tiered_product):
    """In B2C retail mode, buyers pay standard B2C price (₹20) even at 1500 pcs."""
    sku_28 = seeded_tiered_product["sku_28"]

    payload = {
        "items": [{"sku": sku_28, "quantity": 1500}],
        "destination_pincode": "382430",
        "channel": "B2C",
        "base_shipping": "0.00",
        "rounding_multiple": 1,
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()
    item = data["items"][0]
    assert Decimal(str(item["unit_price"])) == Decimal("20.00")
    assert Decimal(str(item["line_gross"])) == Decimal("30000.00")


@pytest.mark.asyncio
async def test_b2b_single_variant_under_1000_uses_base_b2b_price(client, seeded_tiered_product):
    """In B2B mode, quantity < 1000 uses ₹17.00/pc."""
    sku_28 = seeded_tiered_product["sku_28"]

    payload = {
        "items": [{"sku": sku_28, "quantity": 500}],
        "destination_pincode": "382430",
        "channel": "B2B",
        "base_shipping": "0.00",
        "rounding_multiple": 1,
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()
    item = data["items"][0]
    assert Decimal(str(item["unit_price"])) == Decimal("17.00")
    assert Decimal(str(item["line_gross"])) == Decimal("8500.00")


@pytest.mark.asyncio
async def test_b2b_cross_size_pooling_qualifies_for_1000_tier(client, seeded_tiered_product):
    """In B2B mode, buying 500 pcs of 28mm + 500 pcs of 35mm (pooled total 1000 pcs) qualifies BOTH variants for ₹15.00/pc."""
    sku_28 = seeded_tiered_product["sku_28"]
    sku_35 = seeded_tiered_product["sku_35"]

    payload = {
        "items": [
            {"sku": sku_28, "quantity": 500},
            {"sku": sku_35, "quantity": 500},
        ],
        "destination_pincode": "382430",
        "channel": "B2B",
        "base_shipping": "0.00",
        "rounding_multiple": 1,
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 2
    for item in data["items"]:
        assert Decimal(str(item["unit_price"])) == Decimal("15.00")
        assert Decimal(str(item["line_gross"])) == Decimal("7500.00")
    assert Decimal(str(data["total_product_gross"])) == Decimal("15000.00")


@pytest.mark.asyncio
async def test_b2b_cross_size_pooling_qualifies_for_2500_tier(client, seeded_tiered_product):
    """In B2B mode, buying 1500 pcs of 28mm + 1000 pcs of 35mm (pooled total 2500 pcs) qualifies BOTH variants for ₹10.00/pc."""
    sku_28 = seeded_tiered_product["sku_28"]
    sku_35 = seeded_tiered_product["sku_35"]

    payload = {
        "items": [
            {"sku": sku_28, "quantity": 1500},
            {"sku": sku_35, "quantity": 1000},
        ],
        "destination_pincode": "382430",
        "channel": "B2B",
        "base_shipping": "0.00",
        "rounding_multiple": 1,
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 2
    for item in data["items"]:
        assert Decimal(str(item["unit_price"])) == Decimal("10.00")
    assert Decimal(str(data["total_product_gross"])) == Decimal("25000.00")

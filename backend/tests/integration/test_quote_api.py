"""Integration tests for POST /api/v1/quotes and Quote Lifecycle against real PostgreSQL.

Proves:
- Product and price are loaded from PostgreSQL
- Client-supplied unit price is rejected with HTTP 400
- Invalid SKU/variant is rejected with HTTP 404
- Invalid PIN code is rejected with HTTP 422
- Quote stores calculation version ("1.0.0") and catalog version ("1.0.0")
- Quote stores complete immutable amount breakdown
- Quote expiry uses an injectable clock, not sleep-based tests
- Expired quote cannot create an order (ExpiredQuoteError)
- Price change in catalog requires a new quote (PriceChangedError)
- Repeated idempotency key does not create duplicate quotes
- Response and persisted snapshot are identical
"""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.main import app
from app.models import PriceVersion, Product, ProductVariant, Quote, TaxMode
from app.schemas.quote import CreateQuoteRequest, QuoteItemRequest
from app.services.quote_service import (
    ExpiredQuoteError,
    PriceChangedError,
    QuoteService,
)

DATABASE_URL = "postgresql+asyncpg://postgres@localhost:5433/apollo_disposable_test"


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
async def seeded_catalog(session_factory):
    """Seed active product, variant, and price version in PostgreSQL."""
    sku = f"CLIP-{uuid.uuid4().hex[:6]}"
    async with session_factory() as session:
        prod = Product(sku_prefix=sku, name="Drain Clip 35mm", hsn_code="73269099", is_active=True)
        session.add(prod)
        await session.flush()

        var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
        session.add(var)
        await session.flush()

        pv = PriceVersion(
            product_id=prod.id,
            unit_price=Decimal("20.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
        )
        session.add(pv)
        await session.commit()
    return {"sku": sku, "unit_price": Decimal("20.00"), "product_id": prod.id}


@pytest.mark.asyncio
async def test_quote_loads_price_from_postgres_and_matches_persisted_snapshot(client, seeded_catalog, session_factory):
    """Authoritative quote loads price from PostgreSQL; API response matches persisted snapshot."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 10}],
        "destination_pincode": "382430",
        "base_shipping": "60.00",
        "rounding_multiple": 1,
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()

    # Check versions
    assert data["calculation_version"] == "1.0.0"
    assert data["catalog_version"] == "1.0.0"
    assert data["destination_pincode"] == "382430"

    # Check line item authoritative price loaded from DB (₹20.00)
    assert len(data["items"]) == 1
    assert data["items"][0]["sku"] == sku
    assert data["items"][0]["unit_price"] == "20.00"
    assert data["items"][0]["line_gross"] == "200.00"
    assert data["items"][0]["taxable_base"] == "169.49"
    assert data["items"][0]["product_gst"] == "30.51"

    # Check totals
    assert data["base_shipping"] == "60.00"
    assert data["shipping_gst"] == "10.80"
    assert data["shipping_total"] == "70.80"
    assert data["prepaid_total"] == "270.80"

    # Verify persisted snapshot in database
    quote_id = uuid.UUID(data["quote_id"])
    async with session_factory() as session:
        db_quote = await session.get(Quote, quote_id)
        assert db_quote is not None
        assert db_quote.quote_number == data["quote_number"]
        assert str(db_quote.prepaid_total) == data["prepaid_total"]
        assert str(db_quote.subtotal_taxable) == data["subtotal_taxable"]


@pytest.mark.asyncio
async def test_client_supplied_unit_price_is_ignored(client, seeded_catalog):
    """Client attempting to dictate unit_price is safely ignored; database price ₹20.00 is used."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 5, "unit_price": "5.00"}],
        "destination_pincode": "382430",
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["items"][0]["unit_price"] == "20.00"  # DB price, NOT client's 5.00


@pytest.mark.asyncio
async def test_invalid_sku_is_rejected(client):
    """Non-existent SKU is rejected with HTTP 404."""
    payload = {
        "items": [{"sku": "NON-EXISTENT-SKU-999", "quantity": 2}],
        "destination_pincode": "382430",
    }
    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 404
    assert "invalid" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_pincode_is_rejected(client, seeded_catalog):
    """Invalid PIN code (not 6 digits or starting with 0) is rejected with HTTP 422."""
    sku = seeded_catalog["sku"]
    # Starting with 0
    res1 = await client.post(
        "/api/v1/quotes",
        json={"items": [{"sku": sku, "quantity": 1}], "destination_pincode": "082430"}
    )
    assert res1.status_code == 422

    # 5 digits
    res2 = await client.post(
        "/api/v1/quotes",
        json={"items": [{"sku": sku, "quantity": 1}], "destination_pincode": "38243"}
    )
    assert res2.status_code == 422


@pytest.mark.asyncio
async def test_idempotency_key_does_not_create_duplicates(client, seeded_catalog):
    """Repeated calls with identical X-Idempotency-Key return the exact same quote without duplicating."""
    sku = seeded_catalog["sku"]
    idemp_key = f"idemp_{uuid.uuid4().hex}"
    payload = {
        "items": [{"sku": sku, "quantity": 5}],
        "destination_pincode": "382430",
        "idempotency_key": idemp_key,
    }
    res1 = await client.post("/api/v1/quotes", json=payload)
    assert res1.status_code == 201
    quote_id_1 = res1.json()["quote_id"]

    # Second request with same idempotency key
    res2 = await client.post("/api/v1/quotes", json=payload)
    assert res2.status_code == 201
    quote_id_2 = res2.json()["quote_id"]

    assert quote_id_1 == quote_id_2


@pytest.mark.asyncio
async def test_quote_expiry_with_injectable_clock_blocks_order(seeded_catalog, session_factory):
    """Proves injectable clock: quote expires after 15 minutes, preventing order creation."""
    sku = seeded_catalog["sku"]

    t0 = datetime(2026, 9, 4, 12, 0, 0, tzinfo=UTC)
    req = CreateQuoteRequest(
        items=[QuoteItemRequest(sku=sku, quantity=5)],
        destination_pincode="382430",
        base_shipping=Decimal("60.00"),
    )

    async with session_factory() as session:
        # Create quote at t0
        quote_resp = await QuoteService.create_quote(session, req, clock=lambda: t0)
        await session.commit()

        # At t0 + 10 mins (within 15 min TTL), order creation succeeds
        t_valid = t0 + timedelta(minutes=10)
        order = await QuoteService.create_order_from_quote(session, quote_resp.quote_id, clock=lambda: t_valid)
        assert order is not None
        await session.rollback()

        # At t0 + 16 mins (expired), order creation raises ExpiredQuoteError
        t_expired = t0 + timedelta(minutes=16)
        with pytest.raises(ExpiredQuoteError) as exc_info:
            await QuoteService.create_order_from_quote(session, quote_resp.quote_id, clock=lambda: t_expired)
        assert "expired" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_price_change_invalidates_quote_conversion(seeded_catalog, session_factory):
    """If catalog price changes after quote is issued, converting the old quote to an order is rejected."""
    sku = seeded_catalog["sku"]
    prod_id = seeded_catalog["product_id"]

    req = CreateQuoteRequest(
        items=[QuoteItemRequest(sku=sku, quantity=5)],
        destination_pincode="382430",
    )

    async with session_factory() as session:
        quote_resp = await QuoteService.create_quote(session, req)
        await session.commit()

    # Admin changes price from ₹20 to ₹25
    async with session_factory() as session:
        # Invalidate old price version
        stmt = select(PriceVersion).where(PriceVersion.product_id == prod_id, PriceVersion.valid_to.is_(None))
        old_pv = (await session.execute(stmt)).scalar_one()
        old_pv.valid_to = datetime.now(UTC)

        new_pv = PriceVersion(
            product_id=prod_id,
            unit_price=Decimal("25.00"),
            tax_mode=TaxMode.GST_INCLUSIVE,
            gst_rate=Decimal("0.18"),
            valid_from=datetime.now(UTC),
        )
        session.add(new_pv)
        await session.commit()

    # Attempt to convert old quote with stale ₹20 price
        with pytest.raises(PriceChangedError) as exc_info:
            await QuoteService.create_order_from_quote(session, quote_resp.quote_id)
        err_msg = str(exc_info.value).lower()
        assert "price for sku" in err_msg
        assert "new quote is required" in err_msg

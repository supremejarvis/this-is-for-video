"""Integration Tests for FastAPI Endpoints."""
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


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
async def test_create_quote_tc01_endpoint():
    """Verify POST /api/v1/quotes calculates TC-01 with 15m TTL."""
    from app.core.database import AsyncSessionLocal
    from app.models import PriceVersion, Product, ProductVariant, TaxMode

    # Seed APE-DC-35MM in catalog
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        v = (await session.execute(select(ProductVariant).where(ProductVariant.sku == "APE-DC-35MM"))).scalar_one_or_none()
        if not v:
            p = Product(sku_prefix="APE-DC-35MM", name="Drain Clip 35mm", hsn_code="73269099", is_active=True)
            session.add(p)
            await session.flush()
            v = ProductVariant(product_id=p.id, sku="APE-DC-35MM", frame_thickness="35mm", is_active=True)
            session.add(v)
            await session.flush()

        pv_stmt = select(PriceVersion).where(
            (PriceVersion.variant_id == v.id) | (PriceVersion.product_id == v.product_id),
            PriceVersion.valid_to.is_(None),
        )
        existing_pv = (await session.execute(pv_stmt)).scalar_one_or_none()
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
            session.add(pv)
            await session.commit()


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

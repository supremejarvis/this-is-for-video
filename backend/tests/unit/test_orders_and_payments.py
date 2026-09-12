"""Unit and Security Tests for Orders and Payments Endpoints."""
import hashlib
import hmac
import json
import uuid
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.schemas.pricing import PriceVersionCreate, TaxMode
from app.schemas.product import ProductCreate, ProductVariantCreate
from app.services.catalog_service import CatalogService
from app.services.pricing_service import PricingService

async_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingAsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
async def setup_database():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session():
    async with TestingAsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def seeded_catalog(db_session: AsyncSession):
    """Seed active product, variant, price version, and inventory stock via authoritative services."""
    product = await CatalogService.create_product(
        db_session,
        ProductCreate(
            sku_prefix="APE-DC",
            name="Apollo SS304 Solar Drain Clip",
            hsn_code="73269099",
            variants=[
                ProductVariantCreate(
                    sku="APE-DC-35MM",
                    frame_thickness="35mm",
                    pack_size=1,
                    initial_stock=500,
                )
            ],
        ),
    )
    variant = product.variants[0]

    await PricingService.create_price_version(
        db_session,
        PriceVersionCreate(
            variant_id=variant.id,
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("20.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73269099",
            tax_mode=TaxMode.GST_INCLUSIVE,
        ),
    )
    await db_session.commit()
    return {"product": product, "variant": variant, "sku": "APE-DC-35MM"}


@pytest.mark.asyncio
async def test_order_creation_persists_authoritatively(client: AsyncClient, seeded_catalog: dict):
    """Test creating an order persists in DB and authoritatively calculates prices."""
    sku = seeded_catalog["sku"]
    payload = {
        "idempotency_key": "idemp-order-test-001",
        "items": [{"sku": sku, "quantity": 10}],
        "destination_pincode": "382430",
        "customer": {"name": "Pravin Patel", "phone": "9825012345"},
        "payment_method": "RAZORPAY",
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201, f"Failed: {res.status_code} - {res.text}"
    data = res.json()
    assert data["order_number"].startswith("APE-ORD-2026-")
    assert data["order_status"] == "CONFIRMED"
    assert data["payment_status"] == "PENDING"
    assert len(data["items"]) == 1
    assert data["items"][0]["sku"] == sku
    assert data["items"][0]["quantity"] == 10
    # Price is authoritatively ₹20.00 each
    assert float(data["items"][0]["unit_price"]) == 20.0
    assert float(data["total_payable"]) > 0


@pytest.mark.asyncio
async def test_order_idempotency_prevents_duplicate_orders(client: AsyncClient, seeded_catalog: dict):
    """Submitting the same idempotency key must return the existing order, not create a duplicate."""
    sku = seeded_catalog["sku"]
    idemp_key = "idemp-duplicate-prevention-999"
    payload = {
        "idempotency_key": idemp_key,
        "items": [{"sku": sku, "quantity": 5}],
        "destination_pincode": "382430",
        "customer": {"name": "Test User", "phone": "9825012345"},
    }

    res1 = await client.post("/api/v1/orders", json=payload)
    assert res1.status_code == 201
    order1 = res1.json()

    # Second submission
    res2 = await client.post("/api/v1/orders", json=payload)
    assert res2.status_code == 200 or res2.status_code == 201
    order2 = res2.json()

    assert order1["order_number"] == order2["order_number"]
    assert order1["id"] == order2["id"]


@pytest.mark.asyncio
async def test_order_creation_rejects_insufficient_stock(client: AsyncClient, seeded_catalog: dict):
    """Test that requesting more stock than available is rejected."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 99999}],  # Stock is only 500
        "destination_pincode": "382430",
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]


@pytest.mark.asyncio
async def test_razorpay_create_order_and_signature_verification(client: AsyncClient, seeded_catalog: dict):
    """Test full Razorpay flow: create order, verify valid signature, and reject invalid signature."""
    sku = seeded_catalog["sku"]
    order_res = await client.post(
        "/api/v1/orders",
        json={"items": [{"sku": sku, "quantity": 2}], "destination_pincode": "382430"},
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]

    # 1. Create Razorpay order
    rzp_create = await client.post("/api/v1/payments/razorpay/create-order", json={"order_id": order_id})
    assert rzp_create.status_code == 200
    rzp_data = rzp_create.json()
    rzp_order_id = rzp_data["razorpay_order_id"]
    rzp_payment_id = "pay_test_00123"

    # 2. Reject invalid signature
    bad_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": "invalid_tampered_signature",
        },
    )
    assert bad_verify.status_code == 400
    assert "Invalid Razorpay payment signature" in bad_verify.json()["detail"]

    # 3. Accept valid HMAC-SHA256 signature
    msg = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
    valid_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg,
        hashlib.sha256,
    ).hexdigest()

    good_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_sig,
        },
    )
    assert good_verify.status_code == 200
    assert good_verify.json()["verified"] is True
    assert good_verify.json()["payment_status"] == "CAPTURED"


@pytest.mark.asyncio
async def test_razorpay_webhook_idempotency(client: AsyncClient, seeded_catalog: dict):
    """Test Razorpay webhook processes events and ignores duplicates."""
    sku = seeded_catalog["sku"]
    order_res = await client.post(
        "/api/v1/orders",
        json={"items": [{"sku": sku, "quantity": 1}], "destination_pincode": "382430"},
    )
    order_id = order_res.json()["id"]

    event_payload = {
        "id": "evt_test_unique_12345",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_wh_123",
                    "notes": {"order_id": order_id},
                }
            }
        },
    }
    raw_body = json.dumps(event_payload).encode("utf-8")
    sig = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    # First call
    wh1 = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert wh1.status_code == 200
    assert wh1.json()["status"] == "processed"

    # Second call (idempotency check)
    wh2 = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert wh2.status_code == 200
    assert wh2.json()["status"] == "ignored"
    assert wh2.json()["reason"] == "already_processed"


@pytest.mark.asyncio
async def test_razorpay_webhook_signature_mandatory(client: AsyncClient):
    """Test Razorpay webhook rejects missing or invalid signature with HTTP 401."""
    raw_body = json.dumps({"event": "payment.captured"}).encode("utf-8")

    # Missing signature -> HTTP 401
    wh_missing = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )
    assert wh_missing.status_code == 401
    assert "Missing mandatory X-Razorpay-Signature" in wh_missing.json()["detail"]

    # Invalid signature -> HTTP 401
    wh_invalid = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": "invalidsig12345"},
    )
    assert wh_invalid.status_code == 401
    assert "Invalid webhook signature" in wh_invalid.json()["detail"]



@pytest.mark.asyncio
async def test_price_tampering_prevented_backend_authoritative(client: AsyncClient, seeded_catalog: dict):
    """Verify that client-supplied price or totals are ignored; backend authoritatively calculates prices."""
    sku = seeded_catalog["sku"]
    # Malicious client attempts to pass unit_price ₹1.00 and total_payable ₹1.00
    tampered_payload = {
        "idempotency_key": "idemp-tamper-001",
        "items": [
            {
                "sku": sku,
                "quantity": 10,
                "unit_price": 1.00,
                "line_gross": 10.00,
            }
        ],
        "total_payable": 10.00,
        "destination_pincode": "382430",
        "customer": {"name": "Tamper Test", "phone": "9825012345"},
    }

    res = await client.post("/api/v1/orders", json=tampered_payload)
    assert res.status_code == 201
    data = res.json()
    # Authoritative DB price version is 20.00, so line_gross must be 200.00, not 10.00!
    assert float(data["items"][0]["unit_price"]) == 20.00
    assert float(data["items"][0]["line_gross"]) == 200.00
    assert float(data["total_payable"]) > 200.00


@pytest.mark.asyncio
async def test_guest_session_order_creation_persists(client: AsyncClient, seeded_catalog: dict):
    """Verify guest checkout creates order successfully without any prior authentication session."""
    sku = seeded_catalog["sku"]
    guest_payload = {
        "idempotency_key": str(uuid.uuid4()),
        "items": [{"sku": sku, "quantity": 2}],
        "destination_pincode": "382430",
        "customer": {
            "name": "Guest Buyer",
            "phone": "9876543210",
            "email": "guest@example.com",
        },
        "shipping_address": {
            "address_line1": "Plot 12, GIDC Phase 2",
            "city": "Kathwada",
            "state": "Gujarat",
            "pincode": "382430",
        },
        "payment_method": "COD",
    }

    res = await client.post("/api/v1/orders", json=guest_payload)
    assert res.status_code == 201
    order = res.json()
    assert order["order_number"].startswith("APE-ORD-2026-")
    assert order["order_status"] == "CONFIRMED"
    assert order["payment_status"] == "PENDING"
    assert float(order["total_payable"]) > 0


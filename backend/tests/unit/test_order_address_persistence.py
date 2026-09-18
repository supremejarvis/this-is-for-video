"""Dedicated Regression Tests for P0-004: Customer Contact & Delivery Address Persistence."""
import uuid
from decimal import Decimal
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import StaticPool

from app.api.deps import get_optional_current_user
from app.core.database import Base, get_db
from app.main import app
from app.models import (
    InventoryReservation,
    Order,
    User,
    UserRole,
)
from app.schemas.pricing import PriceVersionCreate, TaxMode
from app.schemas.product import ProductCreate, ProductVariantCreate
from app.schemas.quote import CreateQuoteRequest, QuoteItemRequest
from app.services.catalog_service import CatalogService
from app.services.pricing_service import PricingService
from app.services.quote_service import QuoteService

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
    """Seed active product, variant, price version, and initial stock."""
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
async def test_p0_004_a_valid_order_persists_customer_name(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-A: Valid order request -> order created -> customer name stored."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 5}],
        "destination_pincode": "382430",
        "customer": {
            "name": "Arjun Sharma",
            "phone": "9825012345",
            "email": "arjun.sharma@example.com",
        },
        "shipping_address": {
            "address_line1": "Plot 101, Phase 2, GIDC Industrial Estate",
            "city": "Kathwada",
            "state": "Gujarat",
            "pincode": "382430",
        },
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201, f"Failed: {res.text}"
    order_id = uuid.UUID(res.json()["id"])

    # Query DB directly to verify persistent values
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.address))
    order = (await db_session.execute(stmt)).scalar_one()

    assert order.customer_name == "Arjun Sharma"
    assert order.address is not None
    assert order.address.full_name == "Arjun Sharma"


@pytest.mark.asyncio
async def test_p0_004_b_valid_order_persists_canonical_phone(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-B: Valid order request -> phone stored in canonical 10-digit format."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 2}],
        "destination_pincode": "382430",
        "customer": {
            "name": "Pravin Patel",
            "phone": "+91 9825012345",  # Phone with country code prefix
            "email": "pravin@example.com",
        },
        "shipping_address": {
            "address_line1": "Kathwada GIDC",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "382430",
        },
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201
    order_id = uuid.UUID(res.json()["id"])

    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.address))
    order = (await db_session.execute(stmt)).scalar_one()

    assert order.customer_phone == "9825012345"
    assert order.address.phone == "9825012345"


@pytest.mark.asyncio
async def test_p0_004_c_complete_address_fields_stored(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-C: Complete address stored: line1, line2 if supplied, landmark if supplied, city, state, PIN."""
    sku = seeded_catalog["sku"]
    payload = {
        "items": [{"sku": sku, "quantity": 10}],
        "destination_pincode": "382430",
        "customer": {
            "name": "Industrial Client",
            "phone": "9876543210",
            "email": "client@industrial.in",
        },
        "shipping_address": {
            "address_line1": "Shed No. 44/A",
            "address_line2": "Near Kathwada Railway Crossing",
            "landmark": "Opposite Torrent Power Substation",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "state_code": "24",
            "pincode": "382430",
            "country": "India",
        },
        "claim_gst": True,
        "company_name": "Apollo Solar Tech LLP",
        "gstin": "24AAACA1234A1Z5",
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201
    order_id = uuid.UUID(res.json()["id"])

    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.address))
    order = (await db_session.execute(stmt)).scalar_one()
    addr = order.address

    assert addr is not None
    assert addr.address_line1 == "Shed No. 44/A"
    assert addr.address_line2 == "Near Kathwada Railway Crossing"
    assert addr.landmark == "Opposite Torrent Power Substation"
    assert addr.city == "Ahmedabad"
    assert addr.state == "Gujarat"
    assert addr.state_code == "24"
    assert addr.pincode == "382430"
    assert addr.country == "India"
    assert addr.company_name == "Apollo Solar Tech LLP"
    assert addr.gstin == "24AAACA1234A1Z5"
    assert order.company_name == "Apollo Solar Tech LLP"
    assert order.gstin == "24AAACA1234A1Z5"


@pytest.mark.asyncio
async def test_p0_004_d_retrieve_order_values_match_validated_request(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-D: Retrieve order from database -> values equal original validated request."""
    sku = seeded_catalog["sku"]
    req_customer = {
        "name": "Mehul Desai",
        "phone": "9988776655",
        "email": "mehul.desai@gmail.com",
    }
    req_address = {
        "address_line1": "Plot 77, GIDC Estate",
        "address_line2": "Phase 1",
        "landmark": "Near Water Tank",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "382430",
        "country": "India",
    }
    payload = {
        "items": [{"sku": sku, "quantity": 3}],
        "destination_pincode": "382430",
        "customer": req_customer,
        "shipping_address": req_address,
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201
    data = res.json()
    order_id = data["id"]

    # Retrieve order directly from DB
    stmt = select(Order).where(Order.id == uuid.UUID(order_id)).options(selectinload(Order.address))
    order = (await db_session.execute(stmt)).scalar_one()

    assert order.customer_name == req_customer["name"]
    assert order.customer_phone == req_customer["phone"]
    assert order.customer_email == req_customer["email"]
    assert order.address.address_line1 == req_address["address_line1"]
    assert order.address.address_line2 == req_address["address_line2"]
    assert order.address.landmark == req_address["landmark"]
    assert order.address.city == req_address["city"]
    assert order.address.state == req_address["state"]
    assert order.address.pincode == req_address["pincode"]


@pytest.mark.asyncio
async def test_p0_004_e_edit_customer_profile_does_not_mutate_historical_order(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-E: Edit customer's profile after order -> historical order address remains unchanged."""
    sku = seeded_catalog["sku"]

    # 1. Create registered user
    user = User(
        id=uuid.uuid4(),
        email="customer.original@example.com",
        full_name="Original Name",
        role=UserRole.CUSTOMER,
        password_hash="fakehash",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # 2. Place order while authenticated as this user
    app.dependency_overrides[get_optional_current_user] = lambda: user
    payload = {
        "items": [{"sku": sku, "quantity": 1}],
        "destination_pincode": "382430",
        "customer": {
            "name": "Original Delivery Recipient",
            "phone": "9825012345",
            "email": "customer.original@example.com",
        },
        "shipping_address": {
            "address_line1": "100 Original Delivery Way",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "382430",
        },
    }

    res = await client.post("/api/v1/orders", json=payload)
    assert res.status_code == 201
    order_id = uuid.UUID(res.json()["id"])
    app.dependency_overrides.clear()

    # 3. Simulate customer subsequently updating their profile in users table
    stmt_user = select(User).where(User.id == user.id)
    user_db = (await db_session.execute(stmt_user)).scalar_one()
    user_db.full_name = "Completely New Profile Name"
    user_db.email = "new.email.after.update@example.com"
    await db_session.commit()

    # 4. Verify the historical order address snapshot remains 100% UNCHANGED
    stmt_order = select(Order).where(Order.id == order_id).options(selectinload(Order.address))
    historical_order = (await db_session.execute(stmt_order)).scalar_one()

    assert historical_order.user_id == user.id
    assert historical_order.customer_name == "Original Delivery Recipient"
    assert historical_order.address.full_name == "Original Delivery Recipient"
    assert historical_order.address.address_line1 == "100 Original Delivery Way"
    assert historical_order.address.email == "customer.original@example.com"


@pytest.mark.asyncio
async def test_p0_004_f_missing_mandatory_shipping_fields_rejects_without_creating_order(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-F: Missing mandatory shipping field -> validation error -> no order created."""
    sku = seeded_catalog["sku"]

    # Initial order count
    count_before = (await db_session.execute(select(func.count(Order.id)))).scalar()

    # 1. Missing address_line1
    res1 = await client.post(
        "/api/v1/orders",
        json={
            "items": [{"sku": sku, "quantity": 1}],
            "destination_pincode": "382430",
            "customer": {"name": "Test User", "phone": "9825012345"},
            "shipping_address": {
                "address_line1": "",  # Blank / invalid
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pincode": "382430",
            },
        },
    )
    assert res1.status_code == 422

    # 2. Invalid Indian PIN code (5 digits)
    res2 = await client.post(
        "/api/v1/orders",
        json={
            "items": [{"sku": sku, "quantity": 1}],
            "destination_pincode": "38243",
            "customer": {"name": "Test User", "phone": "9825012345"},
            "shipping_address": {
                "address_line1": "Valid Address Line",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pincode": "38243",  # Invalid 5-digit PIN
            },
        },
    )
    assert res2.status_code == 422

    # 3. Invalid phone number (starts with 1)
    res3 = await client.post(
        "/api/v1/orders",
        json={
            "items": [{"sku": sku, "quantity": 1}],
            "destination_pincode": "382430",
            "customer": {"name": "Test User", "phone": "1234567890"},  # Invalid Indian mobile
            "shipping_address": {
                "address_line1": "Valid Address Line",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pincode": "382430",
            },
        },
    )
    assert res3.status_code == 422

    # Verify zero orders were created in database
    count_after = (await db_session.execute(select(func.count(Order.id)))).scalar()
    assert count_after == count_before


@pytest.mark.asyncio
async def test_p0_004_g_quote_pin_differs_from_shipping_pin_rejected(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-G: Quote PIN differs from submitted shipping PIN -> request rejected -> no inconsistent order created."""
    sku = seeded_catalog["sku"]

    # 1. Generate authoritative quote for PIN 382430 (Ahmedabad Hub)
    quote_req = CreateQuoteRequest(
        items=[QuoteItemRequest(sku=sku, quantity=2)],
        destination_pincode="382430",
    )
    quote_res = await QuoteService.create_quote(session=db_session, request=quote_req)
    await db_session.commit()
    quote_id = str(quote_res.quote_id)

    # 2. Attempt to create order using quote_id for 382430 but shipping address has PIN 380001 (Mismatch)
    mismatch_payload = {
        "quote_id": quote_id,
        "customer": {"name": "Pin Mismatch Tester", "phone": "9825012345"},
        "shipping_address": {
            "address_line1": "Navrangpura Road",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "380001",  # Differing PIN code!
        },
    }

    res = await client.post("/api/v1/orders", json=mismatch_payload)
    assert res.status_code == 400
    assert "Shipping address PIN code '380001' does not match quote destination PIN code '382430'" in res.json()["detail"]

    # Verify no order created
    stmt = select(Order).where(Order.quote_id == uuid.UUID(quote_id))
    order = (await db_session.execute(stmt)).scalar_one_or_none()
    assert order is None


@pytest.mark.asyncio
async def test_p0_004_h_database_failure_rolls_back_entire_order_atomically(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-H: Database failure during address persistence -> entire order transaction rolls back."""
    sku = seeded_catalog["sku"]
    count_orders_before = (await db_session.execute(select(func.count(Order.id)))).scalar()
    count_res_before = (await db_session.execute(select(func.count(InventoryReservation.id)))).scalar()

    payload = {
        "items": [{"sku": sku, "quantity": 1}],
        "destination_pincode": "382430",
        "customer": {"name": "Atomic Rollback", "phone": "9825012345"},
        "shipping_address": {
            "address_line1": "Plot 99, Kathwada",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "382430",
        },
    }

    # Simulate unexpected failure during flush or commit in create_order_from_quote
    with patch("app.services.quote_service.OrderAddress", side_effect=RuntimeError("Simulated DB Address Write Failure")):
        res = await client.post("/api/v1/orders", json=payload)
        assert res.status_code == 500

    # Verify atomic rollback: no orphan order, no orphan reservations, no partial records
    count_orders_after = (await db_session.execute(select(func.count(Order.id)))).scalar()
    count_res_after = (await db_session.execute(select(func.count(InventoryReservation.id)))).scalar()
    assert count_orders_after == count_orders_before
    assert count_res_after == count_res_before


@pytest.mark.asyncio
async def test_p0_004_i_unauthorized_override_of_internal_fields_is_ignored_safely(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-I: Unauthorized payload tries to override financial or internal fields -> ignored safely."""
    sku = seeded_catalog["sku"]
    arbitrary_user_id = str(uuid.uuid4())

    tampered_payload = {
        "items": [{"sku": sku, "quantity": 2}],
        "destination_pincode": "382430",
        "customer": {"name": "Security Attacker", "phone": "9825012345"},
        "shipping_address": {
            "address_line1": "Street 1",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "382430",
        },
        # Attacker injects privileged/internal fields
        "user_id": arbitrary_user_id,
        "order_status": "COMPLETED",
        "payment_status": "CAPTURED",
        "total_payable": "0.01",
        "shipping_base": "0.00",
    }

    res = await client.post("/api/v1/orders", json=tampered_payload)
    assert res.status_code == 201
    order_data = res.json()

    # Verify privileged fields were NOT overridden by client payload
    assert order_data["order_status"] == "CONFIRMED"
    assert order_data["payment_status"] == "PENDING"
    assert order_data["user_id"] is None  # Client-supplied arbitrary user_id was ignored
    assert Decimal(str(order_data["total_payable"])) > Decimal("20.00")  # Catalog price enforced


@pytest.mark.asyncio
async def test_p0_004_j_authenticated_customer_order_linked_to_correct_user(client: AsyncClient, db_session: AsyncSession, seeded_catalog: dict):
    """P0-004-J: Authenticated customer order is linked to correct user and BOLA is enforced."""
    sku = seeded_catalog["sku"]

    # 1. Create Customer A and Customer B
    customer_a = User(
        id=uuid.uuid4(),
        email="customer.a@apollo.in",
        full_name="Customer A",
        role=UserRole.CUSTOMER,
        password_hash="fakehash",
        is_active=True,
    )
    customer_b = User(
        id=uuid.uuid4(),
        email="customer.b@apollo.in",
        full_name="Customer B",
        role=UserRole.CUSTOMER,
        password_hash="fakehash",
        is_active=True,
    )
    db_session.add_all([customer_a, customer_b])
    await db_session.commit()

    # 2. Customer A places an order
    app.dependency_overrides[get_optional_current_user] = lambda: customer_a
    res = await client.post(
        "/api/v1/orders",
        json={
            "items": [{"sku": sku, "quantity": 1}],
            "destination_pincode": "382430",
            "customer": {"name": "Customer A", "phone": "9825012345"},
            "shipping_address": {
                "address_line1": "Customer A Address",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pincode": "382430",
            },
        },
    )
    assert res.status_code == 201
    order_id = res.json()["id"]

    # 3. Order is linked to Customer A in database
    stmt = select(Order).where(Order.id == uuid.UUID(order_id))
    order = (await db_session.execute(stmt)).scalar_one()
    assert order.user_id == customer_a.id

    # 4. Customer A can retrieve their own order
    app.dependency_overrides[get_optional_current_user] = lambda: customer_a
    res_a = await client.get(f"/api/v1/orders/{order_id}")
    assert res_a.status_code == 200
    assert res_a.json()["address"]["address_line1"] == "Customer A Address"

    # 5. Customer B accessing Customer A's order is forbidden (BOLA check)
    app.dependency_overrides[get_optional_current_user] = lambda: customer_b
    res_b = await client.get(f"/api/v1/orders/{order_id}")
    assert res_b.status_code == 403

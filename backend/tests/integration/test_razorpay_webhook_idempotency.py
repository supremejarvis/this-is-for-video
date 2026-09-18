"""Integration tests for Razorpay Webhook Idempotency against real PostgreSQL database."""

import json
import uuid
import hmac
import hashlib
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models import (
    FulfilmentStatus,
    InventoryItem,
    InventoryReservation,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentStatus,
    Quote,
    QuoteItem,
    WebhookEvent,
)

DATABASE_URL = "postgresql+asyncpg://postgres_test:postgres@localhost:5432/apollo_disposable_test"


@pytest.fixture(scope="module")
async def session_factory():
    engine = create_async_engine(DATABASE_URL, echo=False, poolclass=NullPool)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session, session.begin():
        await session.execute(text("DELETE FROM webhook_events;"))
        await session.execute(text("DELETE FROM payments;"))
        await session.execute(text("DELETE FROM orders;"))
    yield factory
    await engine.dispose()


@pytest.fixture
async def client(session_factory):
    """AsyncClient with PostgreSQL database override."""
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


def make_webhook_signature(raw_body: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for Razorpay webhook."""
    return hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()


@pytest.mark.asyncio
async def test_webhook_duplicate_event_returns_ignored(session_factory, client: AsyncClient):
    """Duplicate webhook with same event_id returns 'already_processed' without changing state."""
    # Create an order in PENDING payment status
    order_id = uuid.uuid4()
    order_no = f"ORD-WEBHOOK-{uuid.uuid4().hex[:6]}"
    
    async with session_factory() as session, session.begin():
        order = Order(
            id=order_id,
            order_number=order_no,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.PENDING,
            fulfilment_status=FulfilmentStatus.UNFULFILLED,
            replacement_status="NONE",
            subtotal_taxable=Decimal("84.75"),
            product_gst=Decimal("15.25"),
            shipping_base=Decimal("60.00"),
            shipping_gst=Decimal("10.80"),
            cod_surcharge=Decimal("0.00"),
            total_payable=Decimal("170.80"),
        )
        session.add(order)

    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET or "test_webhook_secret"
    
    event_id = f"evt_{uuid.uuid4().hex[:24]}"
    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:16]}",
                    "notes": {"order_id": str(order_id)}
                }
            }
        }
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = make_webhook_signature(raw_body, webhook_secret)

    # First webhook - should process
    response1 = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )
    assert response1.status_code == 200
    assert response1.json()["status"] == "processed"

    # Verify order status changed to CAPTURED
    async with session_factory() as session:
        order = await session.get(Order, order_id)
        assert order.payment_status == PaymentStatus.CAPTURED
        assert order.order_status == OrderStatus.CONFIRMED

        # Verify WebhookEvent recorded
        stmt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        evt = (await session.execute(stmt)).scalar_one()
        assert evt is not None

    # Second webhook with SAME event_id - should be ignored
    response2 = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )
    assert response2.status_code == 200
    assert response2.json()["status"] == "ignored"
    assert response2.json()["reason"] == "already_processed"

    # Verify order state unchanged (still CAPTURED)
    async with session_factory() as session:
        order = await session.get(Order, order_id)
        assert order.payment_status == PaymentStatus.CAPTURED

        # Verify no duplicate WebhookEvent
        stmt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        events = (await session.execute(stmt)).scalars().all()
        assert len(events) == 1


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(client: AsyncClient):
    """Webhook with invalid HMAC signature is rejected with 401."""
    raw_body = json.dumps({"id": "evt_test", "event": "payment.captured"}).encode("utf-8")
    bad_signature = "invalid_signature"

    response = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": bad_signature,
        },
    )
    
    assert response.status_code == 401
    assert "Invalid webhook signature" in response.json()["detail"]


@pytest.mark.asyncio
async def test_webhook_missing_signature_rejected(client: AsyncClient):
    """Webhook without X-Razorpay-Signature header is rejected with 401."""
    raw_body = json.dumps({"id": "evt_test", "event": "payment.captured"}).encode("utf-8")

    response = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )
    
    assert response.status_code == 401
    assert "Missing mandatory X-Razorpay-Signature header" in response.json()["detail"]


@pytest.mark.asyncio
async def test_webhook_payment_failed_updates_order_status(session_factory, client: AsyncClient):
    """payment.failed webhook sets order payment_status to FAILED."""
    order_id = uuid.uuid4()
    order_no = f"ORD-FAIL-{uuid.uuid4().hex[:6]}"
    
    async with session_factory() as session, session.begin():
        order = Order(
            id=order_id,
            order_number=order_no,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.PENDING,
            fulfilment_status=FulfilmentStatus.UNFULFILLED,
            replacement_status="NONE",
            subtotal_taxable=Decimal("84.75"),
            product_gst=Decimal("15.25"),
            shipping_base=Decimal("60.00"),
            shipping_gst=Decimal("10.80"),
            cod_surcharge=Decimal("0.00"),
            total_payable=Decimal("170.80"),
        )
        session.add(order)

    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET or "test_webhook_secret"
    event_id = f"evt_{uuid.uuid4().hex[:24]}"
    payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:16]}",
                    "notes": {"order_id": str(order_id)}
                }
            }
        }
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = make_webhook_signature(raw_body, webhook_secret)

    response = await client.post(
        "/api/v1/payments/razorpay/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "processed"

    async with session_factory() as session:
        order = await session.get(Order, order_id)
        assert order.payment_status == PaymentStatus.FAILED


@pytest.mark.asyncio
async def test_get_payment_status_endpoint(session_factory, client: AsyncClient):
    """GET /api/v1/payments/status/{order_id} returns accurate order payment status."""
    order_id = uuid.uuid4()
    order_no = f"ORD-STAT-{uuid.uuid4().hex[:6]}"

    async with session_factory() as session, session.begin():
        order = Order(
            id=order_id,
            order_number=order_no,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.CAPTURED,
            fulfilment_status=FulfilmentStatus.UNFULFILLED,
            replacement_status="NONE",
            subtotal_taxable=Decimal("84.75"),
            product_gst=Decimal("15.25"),
            shipping_base=Decimal("60.00"),
            shipping_gst=Decimal("10.80"),
            cod_surcharge=Decimal("0.00"),
            total_payable=Decimal("170.80"),
        )
        session.add(order)
        payment = Payment(
            order_id=order.id,
            provider="razorpay",
            provider_payment_id="pay_stat_test_123",
            amount=Decimal("170.80"),
            status=PaymentStatus.CAPTURED,
        )
        session.add(payment)

    # Query by UUID
    res_uuid = await client.get(f"/api/v1/payments/status/{order_id}")
    assert res_uuid.status_code == 200
    data_uuid = res_uuid.json()
    assert data_uuid["order_id"] == str(order_id)
    assert data_uuid["payment_status"] == "CAPTURED"
    assert data_uuid["transaction_id"] == "pay_stat_test_123"

    # Query by Order Number
    res_no = await client.get(f"/api/v1/payments/status/{order_no}")
    assert res_no.status_code == 200
    data_no = res_no.json()
    assert data_no["order_number"] == order_no
    assert data_no["payment_status"] == "CAPTURED"


@pytest.mark.asyncio
async def test_get_quote_endpoint(session_factory, client: AsyncClient):
    """GET /api/v1/quotes/{quote_id} returns authoritative quote snapshot."""
    from datetime import datetime, UTC, timedelta
    quote_id = uuid.uuid4()
    quote_number = f"APE-Q-2026-{uuid.uuid4().hex[:8].upper()}"

    async with session_factory() as session, session.begin():
        quote = Quote(
            id=quote_id,
            quote_number=quote_number,
            calculation_version="1.0.0",
            catalog_version="1.0.0",
            destination_pincode="382430",
            subtotal_taxable=Decimal("100.00"),
            total_product_gst=Decimal("18.00"),
            total_product_gross=Decimal("118.00"),
            base_shipping=Decimal("50.00"),
            shipping_gst=Decimal("9.00"),
            shipping_total=Decimal("59.00"),
            prepaid_total=Decimal("177.00"),
            cod_surcharge=Decimal("4.43"),
            cod_raw_total=Decimal("181.43"),
            cod_total=Decimal("185.00"),
            rounding_multiple=5,
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
            created_at=datetime.now(UTC),
        )
        session.add(quote)
        q_item = QuoteItem(
            quote_id=quote_id,
            sku="APE-SC-35MM",
            quantity=10,
            unit_price=Decimal("11.80"),
            line_gross=Decimal("118.00"),
            taxable_base=Decimal("100.00"),
            product_gst=Decimal("18.00"),
            gst_rate=Decimal("0.1800"),
            tax_mode="GST_INCLUSIVE",
        )
        session.add(q_item)

    # Query by UUID
    res_uuid = await client.get(f"/api/v1/quotes/{quote_id}")
    assert res_uuid.status_code == 200
    data_uuid = res_uuid.json()
    assert data_uuid["quote_id"] == str(quote_id)
    assert data_uuid["quote_number"] == quote_number
    assert len(data_uuid["items"]) == 1
    assert data_uuid["items"][0]["sku"] == "APE-SC-35MM"

    # Query by Quote Number
    res_no = await client.get(f"/api/v1/quotes/{quote_number}")
    assert res_no.status_code == 200
    data_no = res_no.json()
    assert data_no["quote_id"] == str(quote_id)
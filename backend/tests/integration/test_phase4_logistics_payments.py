"""Integration tests for Phase 4: Logistics Booking Idempotency, Webhooks, and Return Restock on PostgreSQL."""
from datetime import UTC, datetime
from decimal import Decimal
import uuid
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

POSTGRES_DB_URL = "postgresql+asyncpg://apollo_ecommerce:Goal%25495@127.0.0.1:5432/apollo_ecommerce"


@pytest.fixture
async def session_factory():
    engine = create_async_engine(POSTGRES_DB_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
async def db_session(session_factory):
    async with session_factory() as session:
        yield session
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.order import FulfilmentStatus, Order, OrderItem, OrderStatus, Payment, PaymentStatus, Shipment
from app.models.product import Product, ProductVariant
from app.models.shipping_advanced import ItemDisposition, Package, Return, ReturnItem, ReturnStatus
from app.models.warehouse import StockItem, Warehouse, WarehouseStatus
from app.schemas.returns import CaliperInspectionRequest, ItemInspectionDetail, ReturnReceiveRequest
from app.schemas.shipping import PackageItemSpec, PackageSpec, ShipmentBookingRequest, ShippingQuoteItem, ShippingQuoteRequest
from app.services.payment_service import PaymentService
from app.services.returns_service import ReturnsService
from app.services.shipping_service import ShippingService



@pytest.mark.asyncio
async def test_shipping_quote_calculation_live(db_session: AsyncSession):
    """Test Speed Post rate calculation with statutory 18% GST."""
    service = ShippingService(db_session)
    req = ShippingQuoteRequest(
        origin_pincode="382430",
        destination_pincode="380001",  # Local Ahmedabad
        items=[
            ShippingQuoteItem(sku="APE-SC-35MM-P50", quantity=2, weight_g=20),
        ],
        is_cod=False,
    )
    quote = await service.calculate_quote(req)
    assert quote.zone == "LOCAL"
    assert quote.is_serviceable is True
    assert quote.chargeable_weight_g == 240  # 40g + 200g tare
    assert quote.base_shipping == Decimal("30.00")
    assert quote.shipping_gst == Decimal("5.40")  # 18% of 30.00
    assert quote.total_shipping == Decimal("35.40")


@pytest.mark.asyncio
async def test_idempotent_shipment_booking(db_session: AsyncSession):
    """Booking a shipment twice with the same idempotency key must be strictly idempotent."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    service = ShippingService(db_session)

    # Create dummy order and order item
    order = Order(
        order_number=f"ORD-SHIP-IDEMP-{uuid.uuid4().hex[:6]}",
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.CAPTURED,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        subtotal_taxable=Decimal("100.00"),
        product_gst=Decimal("18.00"),
        shipping_base=Decimal("30.00"),
        shipping_gst=Decimal("5.40"),
        total_payable=Decimal("153.40"),
    )
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        sku="APE-SC-35MM-P50",
        quantity=2,
        unit_price=Decimal("50.00"),
        line_gross=Decimal("100.00"),
        taxable_base=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(order_item)
    await db_session.commit()

    idemp_key = f"BOOK-KEY-{uuid.uuid4().hex[:12]}"
    booking_req = ShipmentBookingRequest(
        order_id=order.id,
        carrier="INDIA_POST",
        service_code="SPEED_POST",
        origin_pincode="382430",
        destination_pincode="400001",
        idempotency_key=idemp_key,
        packages=[
            PackageSpec(
                package_number=1,
                actual_weight_g=40,
                length_mm=150,
                width_mm=100,
                height_mm=50,
                items=[PackageItemSpec(order_item_id=order_item.id, quantity=2)],
            )
        ],
    )

    # 1. First Booking
    res1 = await service.book_shipment(booking_req)
    assert res1.awb_number is not None
    assert res1.awb_number.startswith("SP")
    assert res1.status == "READY_TO_SHIP"

    # 2. Second Duplicate Booking (Retry)
    res2 = await service.book_shipment(booking_req)
    # Must return exact same shipment and AWB
    assert res2.shipment_id == res1.shipment_id
    assert res2.awb_number == res1.awb_number

    # Verify database has exactly 1 shipment for this AWB
    stmt = select(Shipment).where(Shipment.awb_number == res1.awb_number)
    shipments = (await db_session.execute(stmt)).scalars().all()
    assert len(shipments) == 1


@pytest.mark.asyncio
async def test_webhook_receipt_idempotency(db_session: AsyncSession):
    """Processing identical webhook delivery twice must be handled idempotently."""
    payment_service = PaymentService(db_session)
    from app.core.config import settings
    secret = settings.RAZORPAY_WEBHOOK_SECRET or "mock_webhook_secret_for_dev_test_only"
    event_id = f"evt_test_{uuid.uuid4().hex[:12]}"

    raw_body = f'{{"id":"{event_id}","event":"payment.captured","payload":{{"payment":{{"entity":{{"id":"pay_mock_123","amount":5000}}}}}}}}'.encode("utf-8")
    import hmac
    import hashlib
    sig = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    import json
    payload_data = json.loads(raw_body.decode("utf-8"))

    # 1. First Delivery
    res1 = await payment_service.process_razorpay_webhook(raw_body, sig, payload_data)
    assert res1["status"] == "PROCESSED"
    assert res1["event_id"] == event_id

    # 2. Replay Delivery
    res2 = await payment_service.process_razorpay_webhook(raw_body, sig, payload_data)
    assert res2["status"] == "ALREADY_PROCESSED"
    assert res2.get("duplicate") is True or "safely ignored" in res2.get("message", "")


@pytest.mark.asyncio
async def test_return_inspection_and_inventory_restock_invariant(db_session: AsyncSession):
    """Only accepted items with RESTOCK_INVENTORY increment stock; scrap items do not."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    returns_service = ReturnsService(db_session)

    # 1. Setup Warehouse and Inventory Item
    wh = Warehouse(
        company_id=company_id,
        code=f"WH-RET-{uuid.uuid4().hex[:6].upper()}",
        name="Returns Inspection Warehouse",
        pincode="382430",
        status=WarehouseStatus.ACTIVE,
    )
    db_session.add(wh)
    await db_session.flush()

    sku = f"APE-SC-RET-{uuid.uuid4().hex[:6].upper()}"
    product = Product(
        sku_prefix=f"RET-{uuid.uuid4().hex[:6].upper()}",
        name=f"Return Test Product {uuid.uuid4().hex[:6]}",
        hsn_code="73269099",
        is_active=True,
    )
    db_session.add(product)
    await db_session.flush()

    variant = ProductVariant(
        product_id=product.id,
        sku=sku,
        frame_thickness="35mm",
        pack_size=50,
        is_active=True,
    )
    db_session.add(variant)
    await db_session.flush()

    inv_item = InventoryItem(
        variant_id=variant.id,
        sku=sku,
        quantity_on_hand=10,
        quantity_reserved=0,
    )
    db_session.add(inv_item)
    await db_session.flush()

    # 2. Create Order & Order Item
    order = Order(
        order_number=f"ORD-RET-{uuid.uuid4().hex[:6]}",
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.CAPTURED,
        fulfilment_status=FulfilmentStatus.DELIVERED,
        subtotal_taxable=Decimal("50.00"),
        product_gst=Decimal("9.00"),
        shipping_base=Decimal("30.00"),
        shipping_gst=Decimal("5.40"),
        total_payable=Decimal("94.40"),
    )
    db_session.add(order)
    await db_session.flush()

    order_item = OrderItem(
        order_id=order.id,
        sku=sku,
        quantity=5,
        unit_price=Decimal("10.00"),
        line_gross=Decimal("50.00"),
        taxable_base=Decimal("42.37"),
        product_gst=Decimal("7.63"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(order_item)
    await db_session.flush()

    # 3. Create Return Case
    ret_case = Return(
        company_id=company_id,
        order_id=order.id,
        reason="Wrong frame size ordered by customer",
        status=ReturnStatus.REQUESTED,
        caliper_photo_url="https://images.unsplash.com/photo-example-caliper.jpg",
    )
    db_session.add(ret_case)
    await db_session.flush()

    ret_item = ReturnItem(
        return_id=ret_case.id,
        order_item_id=order_item.id,
        requested_qty=5,
        received_qty=0,
        accepted_qty=0,
        disposition=ItemDisposition.RESTOCK_INVENTORY,
    )
    db_session.add(ret_item)
    await db_session.commit()

    # 4. Inspect Caliper Evidence
    inspected = await returns_service.inspect_caliper_evidence(
        ret_case.id,
        CaliperInspectionRequest(
            verified_frame_thickness_mm=Decimal("35.00"),
            approval=True,
            notes="Frame confirmed 35mm with vernier caliper",
        ),
    )
    assert inspected.status == "APPROVED"

    # 5. Receive physical items at warehouse:
    # 3 accepted for RESTOCK_INVENTORY, 2 rejected as SCRAP_DEFECTIVE
    receive_req = ReturnReceiveRequest(
        warehouse_id=wh.id,
        inspection_items=[
            ItemInspectionDetail(
                return_item_id=ret_item.id,
                received_qty=5,
                accepted_qty=3,
                disposition="RESTOCK_INVENTORY",
            )
        ],
    )
    completed = await returns_service.receive_and_restock(ret_case.id, receive_req)
    assert completed.status == "COMPLETED"

    # 6. Verify inventory movement: only 3 units added, NOT 5!
    # Check StockItem in target warehouse
    stmt = select(StockItem).where(StockItem.warehouse_id == wh.id, StockItem.variant_id == variant.id)
    res = await db_session.execute(stmt)
    wh_stock = res.scalars().first()
    assert wh_stock is not None
    assert wh_stock.on_hand == 3  # Exactly 3 accepted units restocked!

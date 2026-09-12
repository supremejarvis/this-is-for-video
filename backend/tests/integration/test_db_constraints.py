"""Integration tests for real PostgreSQL database constraints.

Proves:
- quantity_on_hand cannot be negative (CHECK constraint)
- quantity_reserved cannot be negative (CHECK constraint)
- quantity_reserved cannot exceed quantity_on_hand (CHECK constraint)
- duplicate webhook event_id is rejected (UNIQUE constraint)
- duplicate order number is rejected (UNIQUE constraint)
- invalid GST rate is rejected (CHECK constraint)
- deleting referenced products/variants cannot corrupt existing inventory (RESTRICT FK)
- placed-order snapshots remain unchanged after price updates (Immutable snapshot)
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    FulfilmentStatus,
    InventoryItem,
    Order,
    OrderItem,
    OrderStatus,
    OutboxEvent,
    PaymentStatus,
    PriceVersion,
    Product,
    ProductVariant,
    ReplacementStatus,
    TaxMode,
)

DATABASE_URL = "postgresql+asyncpg://postgres@localhost:5433/apollo_disposable_test"

@pytest.fixture
async def db_session():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_quantity_on_hand_cannot_be_negative(db_session: AsyncSession):
    """CHECK chk_inventory_on_hand_positive prevents negative stock."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
    db_session.add(var)
    await db_session.flush()

    inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=-5, quantity_reserved=0)
    db_session.add(inv)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "check" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_quantity_reserved_cannot_be_negative(db_session: AsyncSession):
    """CHECK chk_inventory_reserved_positive prevents negative reserved quantity."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
    db_session.add(var)
    await db_session.flush()

    inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=10, quantity_reserved=-1)
    db_session.add(inv)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "check" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_quantity_reserved_cannot_exceed_quantity_on_hand(db_session: AsyncSession):
    """CHECK chk_inventory_available_stock_non_negative prevents over-reservation."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
    db_session.add(var)
    await db_session.flush()

    inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=5, quantity_reserved=6)
    db_session.add(inv)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "check" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_duplicate_webhook_event_id_is_rejected(db_session: AsyncSession):
    """UNIQUE outbox_events_event_id_key rejects duplicate event_id."""
    ev_id = uuid.uuid4()
    agg_id = uuid.uuid4()
    ev1 = OutboxEvent(event_id=ev_id, event_type="order.created", aggregate_type="order", aggregate_id=agg_id, payload={"order": 1})
    db_session.add(ev1)
    await db_session.commit()

    ev2 = OutboxEvent(event_id=ev_id, event_type="order.created", aggregate_type="order", aggregate_id=agg_id, payload={"order": 2})
    db_session.add(ev2)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "unique" in str(exc_info.value).lower() or "outbox_events_event_id_key" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_duplicate_order_number_is_rejected(db_session: AsyncSession):
    """UNIQUE orders_order_number_key rejects duplicate order numbers."""
    order_no = f"ORD-DUP-{uuid.uuid4().hex[:6]}"
    ord1 = Order(
        order_number=order_no,
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.PENDING,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        replacement_status=ReplacementStatus.NONE,
        subtotal_taxable=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        shipping_base=Decimal("60.00"),
        shipping_gst=Decimal("10.80"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("170.80"),
    )
    db_session.add(ord1)
    await db_session.commit()

    ord2 = Order(
        order_number=order_no,
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.PENDING,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        replacement_status=ReplacementStatus.NONE,
        subtotal_taxable=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        shipping_base=Decimal("60.00"),
        shipping_gst=Decimal("10.80"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("170.80"),
    )
    db_session.add(ord2)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "unique" in str(exc_info.value).lower() or "orders_order_number_key" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_invalid_gst_rate_is_rejected(db_session: AsyncSession):
    """CHECK chk_price_version_gst_rate_statutory rejects unapproved GST rate like 35%."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    pv = PriceVersion(
        product_id=prod.id,
        unit_price=Decimal("20.00"),
        tax_mode=TaxMode.GST_INCLUSIVE,
        gst_rate=Decimal("0.35"),  # Invalid: only <= 0.28 allowed by statutory check constraint
    )
    db_session.add(pv)
    with pytest.raises(IntegrityError) as exc_info:
        await db_session.commit()
    await db_session.rollback()
    assert "chk_price_version_gst_rate_statutory" in str(exc_info.value).lower() or "check" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_deleting_referenced_variant_fails(db_session: AsyncSession):
    """Foreign key ondelete='RESTRICT' on inventory_items prevents deleting variant with active inventory."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
    db_session.add(var)
    await db_session.flush()

    inv = InventoryItem(variant_id=var.id, sku=sku, quantity_on_hand=10, quantity_reserved=0)
    db_session.add(inv)
    await db_session.commit()

    # Direct SQL delete to verify PostgreSQL RESTRICT foreign key enforcement
    with pytest.raises(IntegrityError) as exc_info:  # noqa: PT012
        await db_session.execute(text("DELETE FROM product_variants WHERE id = :var_id"), {"var_id": var.id})
        await db_session.commit()
    await db_session.rollback()
    assert "foreign key" in str(exc_info.value).lower() or "violates foreign key constraint" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_placed_order_snapshot_immutability(db_session: AsyncSession):
    """Proves placed order items retain their exact snapshot even if PriceVersion changes."""
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(sku_prefix=sku, name="Test Clip", hsn_code="73269099", is_active=True)
    db_session.add(prod)
    await db_session.flush()

    pv1 = PriceVersion(
        product_id=prod.id,
        unit_price=Decimal("20.00"),
        tax_mode=TaxMode.GST_INCLUSIVE,
        gst_rate=Decimal("0.18"),
    )
    db_session.add(pv1)
    await db_session.flush()

    var = ProductVariant(product_id=prod.id, sku=sku, frame_thickness="35mm", is_active=True)
    db_session.add(var)
    await db_session.flush()

    ord1 = Order(
        order_number=f"ORD-SNAP-{uuid.uuid4().hex[:6]}",
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.CAPTURED,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        replacement_status=ReplacementStatus.NONE,
        subtotal_taxable=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        shipping_base=Decimal("60.00"),
        shipping_gst=Decimal("10.80"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("170.80"),
    )
    db_session.add(ord1)
    await db_session.flush()

    item = OrderItem(
        order_id=ord1.id,
        sku=sku,
        quantity=5,
        unit_price=Decimal("20.00"),
        line_gross=Decimal("100.00"),
        taxable_base=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        gst_rate=Decimal("0.18"),
    )
    db_session.add(item)
    await db_session.commit()

    # Admin updates price to ₹35.00
    pv2 = PriceVersion(
        product_id=prod.id,
        unit_price=Decimal("35.00"),
        tax_mode=TaxMode.GST_INCLUSIVE,
        gst_rate=Decimal("0.18"),
    )
    db_session.add(pv2)
    await db_session.commit()

    # Re-query the order item: must still have original snapshot
    refreshed_item = await db_session.get(OrderItem, item.id)
    assert refreshed_item is not None
    assert refreshed_item.unit_price == Decimal("20.00")
    assert refreshed_item.line_gross == Decimal("100.00")
    assert refreshed_item.taxable_base == Decimal("84.75")
    assert refreshed_item.product_gst == Decimal("15.25")

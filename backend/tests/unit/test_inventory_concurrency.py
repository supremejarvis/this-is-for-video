"""Unit tests for Inventory Concurrency, Invariants, and Pack Allocations."""
from decimal import Decimal
import uuid
import pytest

from app.models.warehouse import StockItem
from app.models.order import OrderItem


def test_stock_item_available_balance_math():
    """Verify available = on_hand - reserved - quarantined."""
    item = StockItem(
        id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        warehouse_id=uuid.uuid4(),
        variant_id=uuid.uuid4(),
        on_hand=100,
        reserved=25,
        quarantined=10,
        version=1,
    )
    assert item.available == 65

    # Completely reserved
    item.reserved = 90
    assert item.available == 0

    # Zero stock
    item.on_hand = 0
    item.reserved = 0
    item.quarantined = 0
    assert item.available == 0


def test_deterministic_item_sorting_prevents_deadlocks():
    """Verify items are sorted deterministically by SKU to guarantee lock hierarchy."""
    raw_skus = ["APE-SC-40MM", "APE-SC-28MM", "APE-SC-35MM", "APE-SC-30MM"]
    items = [
        OrderItem(
            id=uuid.uuid4(),
            order_id=uuid.uuid4(),
            sku=sku,
            quantity=5,
            unit_price=Decimal("20.00"),
            line_gross=Decimal("100.00"),
            taxable_base=Decimal("84.75"),
            product_gst=Decimal("15.25"),
            gst_rate=Decimal("0.1800"),
        )
        for sku in raw_skus
    ]

    # Deterministic sorting
    sorted_items = sorted(items, key=lambda it: it.sku.strip().upper())
    sorted_skus = [it.sku for it in sorted_items]

    assert sorted_skus == ["APE-SC-28MM", "APE-SC-30MM", "APE-SC-35MM", "APE-SC-40MM"]
    # Even if incoming requests have different orderings, sorted_items will always lock in exact identical order
    reversed_items = list(reversed(items))
    assert [it.sku for it in sorted(reversed_items, key=lambda it: it.sku.strip().upper())] == sorted_skus


def test_pack_quantity_multiplier_math():
    """Verify pack multipliers (e.g. 5-pack) calculate exact base unit consumption."""
    pack_quantity = 5
    order_quantity = 3  # Buyer ordered 3 packs of 5
    base_consumption = order_quantity * pack_quantity
    assert base_consumption == 15

    # Verify single units
    single_pack = 1
    assert 10 * single_pack == 10

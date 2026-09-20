"""Integration tests for Phase 3: Multi-Warehouse Inventory, Stock Transfers, Counts, and Order Saga Concurrency."""
from datetime import UTC, datetime
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.models.company import Company
from app.models.inventory import InventoryItem, InventoryReservation, ReservationStatus
from app.models.order import (
    FulfilmentStatus,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
)
from app.models.product import FitMode, Product, ProductVariant
from app.models.saga import SagaInstance, SagaStatus, SagaStepStatus
from app.models.warehouse import (
    StockCount,
    StockCountStatus,
    StockItem,
    StockTransfer,
    TransferStatus,
    Warehouse,
    WarehouseStatus,
)
from app.services.order_saga import InsufficientStockSagaError, OrderSagaOrchestrator
from app.services.warehouse_service import WarehouseService

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


@pytest.mark.asyncio
async def test_warehouse_adjustment_and_balance_listing(db_session: AsyncSession):
    """Verify multi-warehouse stock adjustments and balance queries."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # 1. Create a dedicated warehouse
    wh_code = f"WH-TEST-{uuid.uuid4().hex[:6].upper()}"
    warehouse = await WarehouseService.create_warehouse(
        session=db_session,
        company_id=company_id,
        code=wh_code,
        name=f"Test Warehouse {wh_code}",
        city="Ahmedabad",
    )
    await db_session.commit()

    # 2. Create product & variant
    unique_suffix = uuid.uuid4().hex[:6]
    product = Product(
        sku_prefix=f"TST-WH-{unique_suffix}",
        name=f"Warehouse Test Clip {unique_suffix}",
        hsn_code="73269099",
    )
    db_session.add(product)
    await db_session.flush()

    variant = ProductVariant(
        product_id=product.id,
        sku=f"TST-WH-{unique_suffix}-28MM",
        frame_thickness="28mm",
        pack_size=1,
    )
    db_session.add(variant)
    await db_session.flush()

    # 3. Adjust stock +100 units
    item = await WarehouseService.adjust_warehouse_stock(
        session=db_session,
        company_id=company_id,
        warehouse_id=warehouse.id,
        variant_id=variant.id,
        sku=variant.sku,
        quantity_delta=100,
        reason="Initial test stock receipt",
    )
    await db_session.commit()

    assert item.on_hand == 100
    assert item.reserved == 0
    assert item.available == 100

    # 4. Query balances
    items, total = await WarehouseService.list_balances(
        session=db_session,
        company_id=company_id,
        warehouse_id=warehouse.id,
        variant_id=variant.id,
    )
    assert total >= 1
    found = next((i for i in items if i["sku"] == variant.sku), None)
    assert found is not None
    assert found["on_hand"] == 100
    assert found["available"] == 100


@pytest.mark.asyncio
async def test_warehouse_stock_transfer_flow(db_session: AsyncSession):
    """Verify stock transfer workflow: DRAFT -> DISPATCH (deducts origin) -> RECEIVE (adds dest)."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # 1. Create Origin and Destination Warehouses
    wh1 = await WarehouseService.create_warehouse(
        session=db_session, company_id=company_id, code=f"WH-ORG-{uuid.uuid4().hex[:6].upper()}", name="Origin Hub"
    )
    wh2 = await WarehouseService.create_warehouse(
        session=db_session, company_id=company_id, code=f"WH-DST-{uuid.uuid4().hex[:6].upper()}", name="Destination Hub"
    )
    await db_session.commit()

    # 2. Product and initial stock at Origin
    unique_suffix = uuid.uuid4().hex[:6]
    product = Product(
        sku_prefix=f"TST-TRF-{unique_suffix}",
        name="Transfer Test Clip",
        hsn_code="73269099",
    )
    db_session.add(product)
    await db_session.flush()

    variant = ProductVariant(
        product_id=product.id,
        sku=f"TST-TRF-{unique_suffix}-30MM",
        frame_thickness="30mm",
        pack_size=1,
    )
    db_session.add(variant)
    await db_session.flush()

    # Initial stock: 50 units at wh1
    await WarehouseService.adjust_warehouse_stock(
        session=db_session,
        company_id=company_id,
        warehouse_id=wh1.id,
        variant_id=variant.id,
        sku=variant.sku,
        quantity_delta=50,
        reason="Stock for transfer test",
    )
    await db_session.commit()

    # 3. Create Transfer of 20 units
    transfer = await WarehouseService.create_stock_transfer(
        session=db_session,
        company_id=company_id,
        from_warehouse_id=wh1.id,
        to_warehouse_id=wh2.id,
        items=[{"variant_id": str(variant.id), "quantity": 20}],
        notes="Inter-warehouse stock rebalancing",
    )
    await db_session.commit()
    assert transfer.status == TransferStatus.DRAFT

    # 4. Dispatch Transfer -> Origin should decrement by 20 (from 50 to 30)
    transfer = await WarehouseService.dispatch_stock_transfer(
        session=db_session,
        company_id=company_id,
        transfer_id=transfer.id,
    )
    await db_session.commit()
    assert transfer.status == TransferStatus.IN_TRANSIT

    stock_wh1 = (
        await db_session.execute(
            select(StockItem).where(StockItem.warehouse_id == wh1.id, StockItem.variant_id == variant.id)
        )
    ).scalar_one()
    assert stock_wh1.on_hand == 30

    # 5. Receive Transfer -> Destination should receive 20 units
    transfer = await WarehouseService.receive_stock_transfer(
        session=db_session,
        company_id=company_id,
        transfer_id=transfer.id,
    )
    await db_session.commit()
    assert transfer.status == TransferStatus.RECEIVED

    stock_wh2 = (
        await db_session.execute(
            select(StockItem).where(StockItem.warehouse_id == wh2.id, StockItem.variant_id == variant.id)
        )
    ).scalar_one()
    assert stock_wh2.on_hand == 20


@pytest.mark.asyncio
async def test_two_orders_competing_for_last_unit_concurrency(db_session: AsyncSession):
    """Verify that when two orders compete for the last unit, exactly one succeeds and one fails."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    unique_suffix = uuid.uuid4().hex[:6]

    # 1. Create Product & Variant
    product = Product(
        sku_prefix=f"TST-SAGA-{unique_suffix}",
        name="Last Unit Test Clip",
        hsn_code="73269099",
    )
    db_session.add(product)
    await db_session.flush()

    sku = f"TST-SAGA-{unique_suffix}-35MM"
    variant = ProductVariant(
        product_id=product.id,
        sku=sku,
        frame_thickness="35mm",
        pack_size=1,
    )
    db_session.add(variant)
    await db_session.flush()

    # 2. Create InventoryItem with EXACTLY 1 unit on hand
    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        sku=sku,
        quantity_on_hand=1,
        quantity_reserved=0,
    )
    db_session.add(inv_item)
    await db_session.commit()

    # 3. Create Order 1 and Order 2, both asking for 1 unit
    order1 = Order(
        order_number=f"ORD-SAGA-1-{unique_suffix}",
        order_status=OrderStatus.QUOTED,
        payment_status=PaymentStatus.PENDING,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        subtotal_taxable=Decimal("20.00"),
        product_gst=Decimal("3.60"),
        shipping_base=Decimal("50.00"),
        shipping_gst=Decimal("9.00"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("82.60"),
        currency="INR",
    )
    db_session.add(order1)
    await db_session.flush()

    item1 = OrderItem(
        order_id=order1.id,
        sku=sku,
        quantity=1,
        unit_price=Decimal("20.00"),
        line_gross=Decimal("23.60"),
        taxable_base=Decimal("20.00"),
        product_gst=Decimal("3.60"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(item1)

    order2 = Order(
        order_number=f"ORD-SAGA-2-{unique_suffix}",
        order_status=OrderStatus.QUOTED,
        payment_status=PaymentStatus.PENDING,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        subtotal_taxable=Decimal("20.00"),
        product_gst=Decimal("3.60"),
        shipping_base=Decimal("50.00"),
        shipping_gst=Decimal("9.00"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("82.60"),
        currency="INR",
    )
    db_session.add(order2)
    await db_session.flush()

    item2 = OrderItem(
        order_id=order2.id,
        sku=sku,
        quantity=1,
        unit_price=Decimal("20.00"),
        line_gross=Decimal("23.60"),
        taxable_base=Decimal("20.00"),
        product_gst=Decimal("3.60"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(item2)
    await db_session.commit()

    # 4. Order 1 reserves stock -> MUST SUCCEED
    saga1 = await OrderSagaOrchestrator.reserve_order_inventory(
        session=db_session,
        company_id=company_id,
        order=order1,
    )
    await db_session.commit()
    assert saga1.current_step == "AWAIT_PAYMENT"

    # Verify inventory state: on_hand=1, reserved=1, available=0
    await db_session.refresh(inv_item)
    assert inv_item.quantity_on_hand == 1
    assert inv_item.quantity_reserved == 1
    assert (inv_item.quantity_on_hand - inv_item.quantity_reserved) == 0

    # 5. Order 2 attempts to reserve stock -> MUST FAIL with InsufficientStockSagaError
    with pytest.raises(InsufficientStockSagaError) as exc_info:
        await OrderSagaOrchestrator.reserve_order_inventory(
            session=db_session,
            company_id=company_id,
            order=order2,
        )
    await db_session.commit()

    assert "Insufficient stock" in str(exc_info.value)

    # 6. Verify Saga 2 failed and recorded error
    saga2 = (
        await db_session.execute(
            select(SagaInstance).where(SagaInstance.order_id == order2.id)
        )
    ).scalar_one()
    assert saga2.state == SagaStatus.FAILED
    assert "Insufficient stock" in saga2.last_error

    # 7. Confirm payment for Order 1 -> Should allocate and mark confirmed
    saga1_confirmed = await OrderSagaOrchestrator.confirm_payment_and_allocate(
        session=db_session,
        company_id=company_id,
        order=order1,
        payment_reference="PAY_TEST_RZP_123",
    )
    await db_session.commit()
    assert saga1_confirmed.state == SagaStatus.SUCCEEDED
    assert order1.order_status == OrderStatus.CONFIRMED
    assert order1.payment_status == PaymentStatus.CAPTURED

    # Invariant check: on_hand decremented to 0, reserved cleared to 0
    await db_session.refresh(inv_item)
    assert inv_item.quantity_on_hand == 0
    assert inv_item.quantity_reserved == 0


@pytest.mark.asyncio
async def test_order_cancellation_compensating_saga(db_session: AsyncSession):
    """Verify order cancellation releases active reservation and updates saga state."""
    company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    unique_suffix = uuid.uuid4().hex[:6]

    product = Product(
        sku_prefix=f"TST-CNC-{unique_suffix}",
        name="Cancellation Test Clip",
        hsn_code="73269099",
    )
    db_session.add(product)
    await db_session.flush()

    sku = f"TST-CNC-{unique_suffix}-40MM"
    variant = ProductVariant(
        product_id=product.id,
        sku=sku,
        frame_thickness="40mm",
        pack_size=1,
    )
    db_session.add(variant)
    await db_session.flush()

    inv_item = InventoryItem(
        id=uuid.uuid4(),
        variant_id=variant.id,
        sku=sku,
        quantity_on_hand=10,
        quantity_reserved=0,
    )
    db_session.add(inv_item)
    await db_session.commit()

    # Create Order
    order = Order(
        order_number=f"ORD-CNC-{unique_suffix}",
        order_status=OrderStatus.QUOTED,
        payment_status=PaymentStatus.PENDING,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        subtotal_taxable=Decimal("100.00"),
        product_gst=Decimal("18.00"),
        shipping_base=Decimal("50.00"),
        shipping_gst=Decimal("9.00"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("177.00"),
        currency="INR",
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        sku=sku,
        quantity=5,
        unit_price=Decimal("20.00"),
        line_gross=Decimal("118.00"),
        taxable_base=Decimal("100.00"),
        product_gst=Decimal("18.00"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(item)
    await db_session.commit()

    # 1. Reserve 5 units
    saga = await OrderSagaOrchestrator.reserve_order_inventory(
        session=db_session,
        company_id=company_id,
        order=order,
    )
    await db_session.commit()

    await db_session.refresh(inv_item)
    assert inv_item.quantity_reserved == 5

    # 2. Cancel order
    saga = await OrderSagaOrchestrator.cancel_order_and_compensate(
        session=db_session,
        company_id=company_id,
        order=order,
        reason="Customer requested cancellation before dispatch",
    )
    await db_session.commit()

    assert saga.state == SagaStatus.COMPENSATING
    assert order.order_status == OrderStatus.CANCELLED

    # Invariant: reserved units released back to 0
    await db_session.refresh(inv_item)
    assert inv_item.quantity_reserved == 0
    assert inv_item.quantity_on_hand == 10

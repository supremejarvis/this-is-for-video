"""Unit tests for Gate 2B: Dynamic Variants, Temporal Pricing, and Ledger Invariants."""
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import MovementType
from app.models.outbox import OutboxEvent
from app.models.price import TaxMode
from app.models.product import FitMode
from app.schemas.pricing import PriceVersionCreate
from app.schemas.product import ProductCreate, ProductVariantCreate
from app.services.catalog_service import CatalogService
from app.services.inventory import DuplicateIdempotencyKeyError, InventoryService
from app.services.pricing_service import PriceOverlapException, PricingService


@pytest.mark.asyncio
async def test_dynamic_variants_and_sizing_normalization(db_session: AsyncSession):
    """Verify structured sizing fields, normalization (e.g. '30 mm' -> 30.00 EXACT), and standard seed sizes."""
    # Test normalization in schema
    v_exact = ProductVariantCreate(sku="TEST-30-1", frame_thickness="30 mm")
    assert v_exact.fit_mode == FitMode.EXACT
    assert v_exact.frame_thickness_mm == Decimal("30.00")
    assert v_exact.display_label == "30 mm"

    v_univ = ProductVariantCreate(sku="TEST-UNIV-1", frame_thickness="UNIVERSAL")
    assert v_univ.fit_mode == FitMode.UNIVERSAL
    assert v_univ.frame_thickness_mm is None

    # Invalid thickness raises ValueError
    with pytest.raises(ValueError, match="Invalid frame thickness"):
        ProductVariantCreate(sku="TEST-INVALID-1", frame_thickness="abc")

    # Create product with 28, 30, 33, 35, 40 mm and universal
    product_data = ProductCreate(
        sku_prefix="APE-CLAMP",
        name="Apollo Solar End Clamp SS304",
        hsn_code="73269099",
        variants=[
            ProductVariantCreate(sku="APE-CLAMP-28MM-P1", frame_thickness="28mm", pack_size=1, initial_stock=100),
            ProductVariantCreate(sku="APE-CLAMP-30MM-P1", frame_thickness="30mm", pack_size=1, initial_stock=150),
            ProductVariantCreate(sku="APE-CLAMP-33MM-P1", frame_thickness="33mm", pack_size=1, initial_stock=80),
            ProductVariantCreate(sku="APE-CLAMP-35MM-P1", frame_thickness="35mm", pack_size=1, initial_stock=200),
            ProductVariantCreate(sku="APE-CLAMP-40MM-P1", frame_thickness="40mm", pack_size=1, initial_stock=120),
            ProductVariantCreate(sku="APE-CLAMP-UNIV-P1", frame_thickness="universal", pack_size=1, initial_stock=50),
        ],
    )

    product = await CatalogService.create_product(db_session, product_data)
    assert product.id is not None
    assert len(product.variants) == 6

    # Verify structured sizing in DB
    exact_variants = [v for v in product.variants if v.fit_mode == FitMode.EXACT]
    assert len(exact_variants) == 5
    exact_sizes = {v.frame_thickness_mm for v in exact_variants}
    assert exact_sizes == {Decimal("28.00"), Decimal("30.00"), Decimal("33.00"), Decimal("35.00"), Decimal("40.00")}

    # Verify outbox event emitted for product creation and variant creations
    events_stmt = select(OutboxEvent).where(OutboxEvent.aggregate_id == product.id)
    events = (await db_session.execute(events_stmt)).scalars().all()
    assert any(e.event_type == "catalog.product.changed" for e in events)


@pytest.mark.asyncio
async def test_product_soft_archiving_preserves_history(db_session: AsyncSession):
    """Verify soft archiving sets flags without deleting database rows."""
    product_data = ProductCreate(
        sku_prefix="APE-MID",
        name="Apollo Mid Clamp SS304",
        hsn_code="73269099",
        variants=[
            ProductVariantCreate(sku="APE-MID-35MM-P1", frame_thickness="35mm", pack_size=1, initial_stock=10),
        ],
    )
    product = await CatalogService.create_product(db_session, product_data)
    product_id = product.id

    # Archive product
    archived = await CatalogService.archive_product(db_session, product_id)
    assert archived.is_archived is True
    assert archived.is_active is False
    assert archived.variants[0].is_archived is True

    # Outbox event catalog.product.archived emitted
    events_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == product_id,
        OutboxEvent.event_type == "catalog.product.archived",
    )
    events = (await db_session.execute(events_stmt)).scalars().all()
    assert len(events) >= 1

    # Standard list excludes archived
    active_list = await CatalogService.list_products(db_session, include_archived=False)
    assert not any(p.id == product_id for p in active_list)

    # Full list includes archived
    full_list = await CatalogService.list_products(db_session, include_archived=True)
    assert any(p.id == product_id for p in full_list)


@pytest.mark.asyncio
async def test_temporal_pricing_attached_to_variant_with_channels_and_moq(db_session: AsyncSession):
    """Verify pricing is attached to ProductVariant with B2C/B2B channels and MOQ tiers."""
    product = await CatalogService.create_product(
        db_session,
        ProductCreate(
            sku_prefix="APE-HEX",
            name="Apollo Hex Bolt SS304",
            hsn_code="73181500",
            variants=[
                ProductVariantCreate(sku="APE-HEX-M8-30", frame_thickness="NOT_APPLICABLE", pack_size=1, initial_stock=100)
            ],
        ),
    )
    variant = product.variants[0]

    t0 = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)
    t1 = datetime(2026, 6, 1, 0, 0, 0, tzinfo=UTC)
    t2 = datetime(2026, 12, 31, 23, 59, 59, tzinfo=UTC)

    # 1. B2C Retail Price: MOQ 1, GST_INCLUSIVE, 20.00
    pv_b2c = await PricingService.create_price_version(
        db_session,
        PriceVersionCreate(
            variant_id=variant.id,
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("20.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73181500",
            tax_mode=TaxMode.GST_INCLUSIVE,
            valid_from=t0,
            valid_to=t2,
            reason="Standard retail price",
        ),
    )
    assert pv_b2c.variant_id == variant.id
    assert pv_b2c.unit_price == Decimal("20.00")

    # 2. B2B Tier 1: MOQ 100, GST_EXCLUSIVE, 15.00
    pv_b2b_t1 = await PricingService.create_price_version(
        db_session,
        PriceVersionCreate(
            variant_id=variant.id,
            channel="B2B",
            min_quantity=100,
            unit_price=Decimal("15.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73181500",
            tax_mode=TaxMode.GST_EXCLUSIVE,
            valid_from=t0,
            valid_to=t2,
            reason="B2B tier 1 wholesale",
        ),
    )
    assert pv_b2b_t1.unit_price == Decimal("15.00")

    # 3. B2B Tier 2: MOQ 500, GST_EXCLUSIVE, 12.50
    pv_b2b_t2 = await PricingService.create_price_version(
        db_session,
        PriceVersionCreate(
            variant_id=variant.id,
            channel="B2B",
            min_quantity=500,
            unit_price=Decimal("12.50"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73181500",
            tax_mode=TaxMode.GST_EXCLUSIVE,
            valid_from=t0,
            valid_to=t2,
            reason="B2B tier 2 wholesale",
        ),
    )
    assert pv_b2b_t2.unit_price == Decimal("12.50")

    # 4. Overlap rejection for same variant, channel, MOQ tier, and tax_mode
    with pytest.raises(PriceOverlapException):
        await PricingService.create_price_version(
            db_session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2C",
                min_quantity=1,
                unit_price=Decimal("22.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_INCLUSIVE,
                valid_from=t1,
                valid_to=t2,
            ),
        )

    # 5. Price resolution by channel and quantity tier
    # B2C quantity 5 -> resolves B2C MOQ 1 price (20.00)
    p_b2c = await PricingService.get_active_price(
        db_session, variant.id, channel="B2C", quantity=5, tax_mode=TaxMode.GST_INCLUSIVE, at_time=t1
    )
    assert p_b2c is not None
    assert p_b2c.unit_price == Decimal("20.00")

    # B2B quantity 250 -> resolves B2B MOQ 100 price (15.00)
    p_b2b_250 = await PricingService.get_active_price(
        db_session, variant.id, channel="B2B", quantity=250, tax_mode=TaxMode.GST_EXCLUSIVE, at_time=t1
    )
    assert p_b2b_250 is not None
    assert p_b2b_250.unit_price == Decimal("15.00")

    # B2B quantity 1000 -> resolves B2B MOQ 500 price (12.50)
    p_b2b_1000 = await PricingService.get_active_price(
        db_session, variant.id, channel="B2B", quantity=1000, tax_mode=TaxMode.GST_EXCLUSIVE, at_time=t1
    )
    assert p_b2b_1000 is not None
    assert p_b2b_1000.unit_price == Decimal("12.50")


@pytest.mark.asyncio
async def test_append_only_inventory_ledger_with_idempotency_and_reconciliation(db_session: AsyncSession):
    """Verify inventory movements require idempotency keys, signed deltas, and reconcile balances."""
    product = await CatalogService.create_product(
        db_session,
        ProductCreate(
            sku_prefix="APE-LEDGER",
            name="Apollo Ledger Test Item",
            hsn_code="73269099",
            variants=[
                ProductVariantCreate(sku="APE-LEDGER-30MM", frame_thickness="30mm", pack_size=1, initial_stock=50),
            ],
        ),
    )
    variant = product.variants[0]

    # 1. Receipt of additional 25 units with explicit idempotency key
    item, m_receipt = await InventoryService.receive_stock(
        session=db_session,
        sku="APE-LEDGER-30MM",
        quantity=25,
        idempotency_key="idemp-rcv-001",
        reference_id="PO-999",
        source_reference_type="PO",
        reason="Factory batch intake",
    )
    assert item.quantity_on_hand == 75
    assert m_receipt.movement_type == MovementType.RECEIPT
    assert m_receipt.quantity_delta_on_hand == 25
    assert m_receipt.resulting_quantity_on_hand == 75

    # 2. Duplicate idempotency key must raise DuplicateIdempotencyKeyError
    with pytest.raises(DuplicateIdempotencyKeyError):
        await InventoryService.receive_stock(
            session=db_session,
            sku="APE-LEDGER-30MM",
            quantity=25,
            idempotency_key="idemp-rcv-001",
        )

    # 3. Manual scrap adjustment of -5 units
    item, m_adj = await InventoryService.adjust_stock(
        session=db_session,
        sku="APE-LEDGER-30MM",
        quantity_delta=-5,
        idempotency_key="idemp-adj-001",
        reason="Caliper inspection failed thickness test",
        source_reference_type="INSPECTION",
    )
    assert item.quantity_on_hand == 70
    assert m_adj.movement_type == MovementType.ADJUSTMENT
    assert m_adj.quantity_delta_on_hand == -5
    assert m_adj.resulting_quantity_on_hand == 70

    # 4. Reconciliation: Sum of on-hand deltas across all movements must equal item.quantity_on_hand
    movements = await InventoryService.list_movements(db_session, variant_id=variant.id)
    total_delta = sum(m.quantity_delta_on_hand for m in movements)
    assert total_delta == item.quantity_on_hand == 70


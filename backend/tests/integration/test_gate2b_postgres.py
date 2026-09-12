"""Integration tests for Gate 2B on PostgreSQL 16: Dynamic Variants, Temporal Pricing & Inventory Ledger."""
import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError, IntegrityError, InternalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.auth import AuthAuditLog, User, UserRole
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.outbox import OutboxEvent
from app.models.price import PriceVersion, TaxMode
from app.models.product import Product
from app.schemas.pricing import PriceVersionCreate
from app.schemas.product import ProductCreate, ProductVariantCreate
from app.services.catalog_service import CatalogService
from app.services.inventory import InsufficientStockError, InventoryService
from app.services.pricing_service import PricingService

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/apollo_disposable_test"


@pytest.fixture
async def session_factory():
    engine = create_async_engine(DATABASE_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
async def db(session_factory):
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


async def get_or_create_user(db: AsyncSession, email: str, role: UserRole) -> User:
    stmt = select(User).where(User.email == email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password("Password123456!"),
        full_name=f"Test {role.value}",
        role=role,
        is_active=True,
        is_archived=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_role(client: AsyncClient, db: AsyncSession, role: UserRole) -> tuple[dict, str]:
    email = f"user_{role.value.lower()}@ape-store.com"
    await get_or_create_user(db, email, role)
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123456!"},
    )
    assert res.status_code == 200, f"Login failed for role {role}: {res.text}"
    csrf_token = res.cookies.get("ape_csrf") or ""
    return res.json(), csrf_token


@pytest.mark.asyncio
async def test_postgres_dynamic_variants_28_to_40mm(client, db):
    """PostgreSQL Invariant: All dynamic clamp sizes (28, 30, 33, 35, 40mm, universal) created and retrieved."""
    _, csrf_token = await login_role(client, db, UserRole.CATALOG_MANAGER)
    headers = {"X-CSRF-Token": csrf_token}

    sku_prefix = f"APE-EC-{uuid.uuid4().hex[:6].upper()}"
    prod_payload = {
        "sku_prefix": sku_prefix,
        "name": "Apollo SS304 End Clamps",
        "hsn_code": "73269099",
        "description": "High tensile solar panel mounting end clamps",
        "variants": [
            {"sku": f"{sku_prefix}-28MM", "frame_thickness": "28mm", "pack_size": 10, "initial_stock": 100},
            {"sku": f"{sku_prefix}-30MM", "frame_thickness": "30mm", "pack_size": 10, "initial_stock": 200},
            {"sku": f"{sku_prefix}-33MM", "frame_thickness": "33mm", "pack_size": 10, "initial_stock": 150},
            {"sku": f"{sku_prefix}-35MM", "frame_thickness": "35mm", "pack_size": 10, "initial_stock": 300},
            {"sku": f"{sku_prefix}-40MM", "frame_thickness": "40mm", "pack_size": 10, "initial_stock": 250},
            {"sku": f"{sku_prefix}-UNIV", "frame_thickness": "universal", "pack_size": 50, "initial_stock": 80},
        ],
    }

    create_res = await client.post("/api/v1/products/", json=prod_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    data = create_res.json()
    product_id = data["id"]
    assert len(data["variants"]) == 6

    # Verify inventory item and stock was correctly initialized in PostgreSQL
    for v in data["variants"]:
        stmt = select(InventoryItem).where(InventoryItem.sku == v["sku"])
        inv = (await db.execute(stmt)).scalar_one_or_none()
        assert inv is not None
        assert inv.quantity_on_hand > 0

    # Retrieve product via public GET
    get_res = await client.get(f"/api/v1/products/{product_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    thicknesses = {v["frame_thickness"] for v in retrieved["variants"]}
    assert thicknesses == {"28mm", "30mm", "33mm", "35mm", "40mm", "universal"}


@pytest.mark.asyncio
async def test_postgres_soft_archiving(client, db):
    """PostgreSQL Invariant: Product delete soft-archives without hard delete."""
    _, csrf_token = await login_role(client, db, UserRole.CATALOG_MANAGER)
    headers = {"X-CSRF-Token": csrf_token}

    sku_prefix = f"APE-ARCH-{uuid.uuid4().hex[:6].upper()}"
    prod_payload = {
        "sku_prefix": sku_prefix,
        "name": "Apollo Temporary Bracket",
        "hsn_code": "73269099",
        "variants": [
            {"sku": f"{sku_prefix}-35MM", "frame_thickness": "35mm", "pack_size": 1, "initial_stock": 10},
        ],
    }
    create_res = await client.post("/api/v1/products/", json=prod_payload, headers=headers)
    product_id = create_res.json()["id"]

    # Delete (soft archive)
    del_res = await client.delete(f"/api/v1/products/{product_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["is_archived"] is True
    assert del_res.json()["is_active"] is False

    # Default list excludes archived product
    list_res = await client.get("/api/v1/products/")
    assert not any(p["id"] == product_id for p in list_res.json())

    # With include_archived=True, product is present
    archived_list_res = await client.get("/api/v1/products/?include_archived=true")
    assert any(p["id"] == product_id for p in archived_list_res.json())

    # In PostgreSQL, record still exists
    stmt = select(Product).where(Product.id == uuid.UUID(product_id))
    db_prod = (await db.execute(stmt)).scalar_one_or_none()
    assert db_prod is not None
    assert db_prod.is_archived is True


@pytest.mark.asyncio
async def test_postgres_temporal_pricing_and_overlap_rejection(client, db):
    """PostgreSQL Invariant: Temporal price intervals attached to ProductVariant cannot overlap; active price resolved accurately."""
    _, cat_csrf = await login_role(client, db, UserRole.CATALOG_MANAGER)
    sku_prefix = f"APE-PR-{uuid.uuid4().hex[:6].upper()}"
    prod_res = await client.post(
        "/api/v1/products/",
        json={
            "sku_prefix": sku_prefix,
            "name": "Apollo Rails",
            "hsn_code": "73269099",
            "variants": [
                {"sku": f"{sku_prefix}-VAR", "frame_thickness": "NOT_APPLICABLE", "pack_size": 1, "initial_stock": 50}
            ],
        },
        headers={"X-CSRF-Token": cat_csrf},
    )
    variant_id = prod_res.json()["variants"][0]["id"]

    # Login as FINANCE to set prices
    _, fin_csrf = await login_role(client, db, UserRole.FINANCE)
    fin_headers = {"X-CSRF-Token": fin_csrf}

    # 1. Create initial active price version (open-ended) attached to variant_id
    pv1_res = await client.post(
        "/api/v1/pricing/versions",
        json={
            "variant_id": variant_id,
            "channel": "B2C",
            "min_quantity": 1,
            "unit_price": "22.50",
            "gst_rate": "0.1800",
            "hsn_code": "73269099",
            "tax_mode": "GST_INCLUSIVE",
        },
        headers=fin_headers,
    )
    assert pv1_res.status_code == 201
    assert pv1_res.json()["unit_price"] == "22.50"
    assert pv1_res.json()["variant_id"] == variant_id

    # 2. Query active price
    active_res = await client.get(
        f"/api/v1/pricing/active?variant_id={variant_id}&channel=B2C&quantity=1&tax_mode=GST_INCLUSIVE"
    )
    assert active_res.status_code == 200
    assert active_res.json()["unit_price"] == "22.50"

    # 3. Create a new open-ended version: terminates previous active version cleanly
    pv2_res = await client.post(
        "/api/v1/pricing/versions",
        json={
            "variant_id": variant_id,
            "channel": "B2C",
            "min_quantity": 1,
            "unit_price": "25.00",
            "gst_rate": "0.1800",
            "hsn_code": "73269099",
            "tax_mode": "GST_INCLUSIVE",
        },
        headers=fin_headers,
    )
    assert pv2_res.status_code == 201
    assert pv2_res.json()["unit_price"] == "25.00"

    # 4. Now active price must be 25.00
    active_now = await client.get(
        f"/api/v1/pricing/active?variant_id={variant_id}&channel=B2C&quantity=1&tax_mode=GST_INCLUSIVE"
    )
    assert active_now.json()["unit_price"] == "25.00"

    # 5. Verify PostgreSQL database has 2 versions
    stmt = select(PriceVersion).where(PriceVersion.variant_id == uuid.UUID(variant_id))
    versions = (await db.execute(stmt)).scalars().all()
    assert len(versions) == 2


@pytest.mark.asyncio
async def test_postgres_simultaneous_overlapping_price_exclusion_constraint(session_factory):
    """PostgreSQL Invariant: PostgreSQL Exclusion Constraint (btree_gist) prevents concurrent overlapping prices."""
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=f"APE-GIST-{uuid.uuid4().hex[:6].upper()}",
                name="Apollo Exclusion Constraint Test Product",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=f"APE-GIST-VAR-{uuid.uuid4().hex[:4]}", frame_thickness="30mm", initial_stock=10)],
            ),
        )
        variant = product.variants[0]
        variant_id = variant.id
        product_id = product.id

    t_start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=UTC)
    t_end = datetime(2026, 8, 1, 0, 0, 0, tzinfo=UTC)

    # 1. Insert first valid interval directly into DB
    async with session_factory() as s1:
        pv1 = PriceVersion(
            id=uuid.uuid4(),
            variant_id=variant_id,
            product_id=product_id,
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("30.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73269099",
            tax_mode=TaxMode.GST_INCLUSIVE,
            valid_from=t_start,
            valid_to=t_end,
            reason="Initial interval",
        )
        s1.add(pv1)
        await s1.commit()

    # 2. Attempt to bypass service and insert an overlapping interval directly via SQL in PostgreSQL
    # Interval [2026-05-01, 2026-10-01) overlaps [2026-03-01, 2026-08-01)
    async with session_factory() as s2:
        overlap_sql = text("""
            INSERT INTO price_versions (
                id, variant_id, product_id, currency, channel, min_quantity, unit_price,
                gst_rate, hsn_code, tax_mode, valid_from, valid_to, reason
            ) VALUES (
                :id, :variant_id, :product_id, 'INR', 'B2C', 1, 35.00,
                0.1800, '73269099', 'GST_INCLUSIVE', :valid_from, :valid_to, 'Illegal Overlap'
            )
        """)
        with pytest.raises((IntegrityError, DBAPIError, ProgrammingError)) as excinfo:
            await s2.execute(
                overlap_sql,
                {
                    "id": uuid.uuid4(),
                    "variant_id": variant_id,
                    "product_id": product_id,
                    "valid_from": datetime(2026, 5, 1, 0, 0, 0, tzinfo=UTC),
                    "valid_to": datetime(2026, 10, 1, 0, 0, 0, tzinfo=UTC),
                },
            )

        # Confirm PostgreSQL exclusion constraint caught it
        assert "uq_price_version_no_overlap" in str(excinfo.value).lower() or "exclusion" in str(excinfo.value).lower()


@pytest.mark.asyncio
async def test_postgres_b2c_b2b_and_moq_price_resolution(session_factory):
    """PostgreSQL Invariant: Resolves distinct prices across B2C vs B2B channels and MOQ tiers."""
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=f"APE-MOQ-{uuid.uuid4().hex[:6].upper()}",
                name="Apollo Solar Mid Clamp Bulk",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=f"APE-MOQ-VAR-{uuid.uuid4().hex[:4]}", frame_thickness="35mm", initial_stock=1000)],
            ),
        )
        variant = product.variants[0]

        # B2C: Retail price 25.00 (MOQ 1)
        await PricingService.create_price_version(
            session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2C",
                min_quantity=1,
                unit_price=Decimal("25.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="73269099",
                tax_mode=TaxMode.GST_INCLUSIVE,
                reason="Retail B2C",
            ),
        )

        # B2B: MOQ 100 tier -> 18.00 (GST_EXCLUSIVE)
        await PricingService.create_price_version(
            session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2B",
                min_quantity=100,
                unit_price=Decimal("18.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="73269099",
                tax_mode=TaxMode.GST_EXCLUSIVE,
                reason="Wholesale tier 1",
            ),
        )

        # B2B: MOQ 500 tier -> 15.00 (GST_EXCLUSIVE)
        await PricingService.create_price_version(
            session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2B",
                min_quantity=500,
                unit_price=Decimal("15.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="73269099",
                tax_mode=TaxMode.GST_EXCLUSIVE,
                reason="Wholesale tier 2",
            ),
        )

        # Test resolution
        p_b2c = await PricingService.get_active_price(session, variant.id, channel="B2C", quantity=10, tax_mode=TaxMode.GST_INCLUSIVE)
        assert p_b2c.unit_price == Decimal("25.00")

        p_b2b_small = await PricingService.get_active_price(session, variant.id, channel="B2B", quantity=200, tax_mode=TaxMode.GST_EXCLUSIVE)
        assert p_b2b_small.unit_price == Decimal("18.00")

        p_b2b_large = await PricingService.get_active_price(session, variant.id, channel="B2B", quantity=1000, tax_mode=TaxMode.GST_EXCLUSIVE)
        assert p_b2b_large.unit_price == Decimal("15.00")


@pytest.mark.asyncio
async def test_postgres_gst_hsn_version_changes(session_factory):
    """PostgreSQL Invariant: Updating GST rate and HSN code creates immutable new version."""
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=f"APE-TAX-{uuid.uuid4().hex[:6].upper()}",
                name="Apollo Tax Versioning Test",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=f"APE-TAX-VAR-{uuid.uuid4().hex[:4]}", frame_thickness="30mm", initial_stock=50)],
            ),
        )
        variant = product.variants[0]

        now = datetime.now(UTC)
        # Version 1: 18% GST, HSN 73269099
        pv1 = await PricingService.create_price_version(
            session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2C",
                min_quantity=1,
                unit_price=Decimal("20.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="73269099",
                tax_mode=TaxMode.GST_INCLUSIVE,
                valid_from=now - timedelta(days=10),
                valid_to=now - timedelta(days=1),
                reason="Standard initial tax rate",
            ),
        )

        # Version 2: Statutory revised GST (12%) and updated HSN
        pv2 = await PricingService.create_price_version(
            session,
            PriceVersionCreate(
                variant_id=variant.id,
                channel="B2C",
                min_quantity=1,
                unit_price=Decimal("19.00"),
                gst_rate=Decimal("0.1200"),
                hsn_code="84799090",
                tax_mode=TaxMode.GST_INCLUSIVE,
                valid_from=now - timedelta(days=1),
                valid_to=None,
                reason="Statutory GST rate rationalization",
            ),
        )

        # Historical price query at t-5 days resolves pv1
        hist_price = await PricingService.get_active_price(session, variant.id, channel="B2C", quantity=1, at_time=now - timedelta(days=5))
        assert hist_price.id == pv1.id
        assert hist_price.gst_rate == Decimal("0.1800")
        assert hist_price.hsn_code == "73269099"

        # Current price query resolves pv2
        curr_price = await PricingService.get_active_price(session, variant.id, channel="B2C", quantity=1)
        assert curr_price.id == pv2.id
        assert curr_price.gst_rate == Decimal("0.1200")
        assert curr_price.hsn_code == "84799090"


@pytest.mark.asyncio
async def test_postgres_append_only_inventory_ledger(client, db):
    """PostgreSQL Invariant: Stock receipts and adjustments create immutable ledger records with signed deltas."""
    _, cat_csrf = await login_role(client, db, UserRole.CATALOG_MANAGER)
    sku_prefix = f"APE-INV-{uuid.uuid4().hex[:6].upper()}"
    sku = f"{sku_prefix}-35MM"
    await client.post(
        "/api/v1/products/",
        json={
            "sku_prefix": sku_prefix,
            "name": "Apollo Clamp Inventory Test",
            "hsn_code": "73269099",
            "variants": [{"sku": sku, "frame_thickness": "35mm", "pack_size": 1, "initial_stock": 100}],
        },
        headers={"X-CSRF-Token": cat_csrf},
    )

    # Login as INVENTORY_MANAGER
    _, inv_csrf = await login_role(client, db, UserRole.INVENTORY_MANAGER)
    inv_headers = {"X-CSRF-Token": inv_csrf}

    # 1. Stock Receipt with idempotency key
    idemp_rcv = f"idemp-test-rcv-{uuid.uuid4()}"
    rec_res = await client.post(
        "/api/v1/inventory/receipt",
        json={
            "sku": sku,
            "quantity": 50,
            "idempotency_key": idemp_rcv,
            "reference_id": "PO-1001",
            "source_reference_type": "PO",
            "reason": "Manufacturing shipment",
        },
        headers=inv_headers,
    )
    assert rec_res.status_code == 201
    assert rec_res.json()["movement_type"] == "RECEIPT"
    assert rec_res.json()["quantity_delta_on_hand"] == 50
    assert rec_res.json()["resulting_quantity_on_hand"] == 150
    assert rec_res.json()["idempotency_key"] == idemp_rcv

    # 2. Stock Adjustment with idempotency key
    idemp_adj = f"idemp-test-adj-{uuid.uuid4()}"
    adj_res = await client.post(
        "/api/v1/inventory/adjustment",
        json={
            "sku": sku,
            "quantity_delta": -10,
            "idempotency_key": idemp_adj,
            "reference_id": "QC-FAIL",
            "source_reference_type": "INSPECTION",
            "reason": "Defective extrusion batch",
        },
        headers=inv_headers,
    )
    assert adj_res.status_code == 201
    assert adj_res.json()["movement_type"] == "ADJUSTMENT"
    assert adj_res.json()["quantity_delta_on_hand"] == -10
    assert adj_res.json()["resulting_quantity_on_hand"] == 140

    # 3. Duplicate idempotency key must be rejected with 409 Conflict
    dup_res = await client.post(
        "/api/v1/inventory/receipt",
        json={
            "sku": sku,
            "quantity": 50,
            "idempotency_key": idemp_rcv,
            "reference_id": "PO-DUPLICATE",
        },
        headers=inv_headers,
    )
    assert dup_res.status_code == 409


@pytest.mark.asyncio
async def test_postgres_100_concurrent_inventory_mutations(session_factory):
    """PostgreSQL Invariant: 100 concurrent inventory mutations execute without negative stock or race conditions."""
    sku = f"APE-CONC-{uuid.uuid4().hex[:6].upper()}"
    async with session_factory() as session:
        await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=sku,
                name="Concurrency Test Clamp",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=sku, frame_thickness="30mm", initial_stock=500)],
            ),
        )

    # Concurrently fire 100 reservation holds of 5 units each
    async def reserve_task(idx: int):
        async with session_factory() as s:
            try:
                order_id = uuid.uuid4()
                await InventoryService.reserve_stock(
                    session=s,
                    sku=sku,
                    quantity=5,
                    order_id=order_id,
                )
                await s.commit()
                return True
            except Exception:
                await s.rollback()
                return False

    tasks = [reserve_task(i) for i in range(100)]
    results = await asyncio.gather(*tasks)

    # Verify inventory state
    async with session_factory() as session:
        stmt = select(InventoryItem).where(InventoryItem.sku == sku)
        item = (await session.execute(stmt)).scalar_one()

        # All 100 succeeded: 100 * 5 = 500 reserved, 500 on hand, 0 available
        success_count = sum(1 for r in results if r is True)
        assert success_count == 100
        assert item.quantity_on_hand == 500
        assert item.quantity_reserved == 500
        assert item.quantity_on_hand >= item.quantity_reserved


@pytest.mark.asyncio
async def test_postgres_ledger_totals_reconciliation(session_factory):
    """PostgreSQL Invariant: Sum of ledger quantity deltas reconciles with active stock balances."""
    sku = f"APE-RECON-{uuid.uuid4().hex[:6].upper()}"
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=sku,
                name="Reconciliation Test Clamp",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=sku, frame_thickness="30mm", initial_stock=100)],
            ),
        )
        variant = product.variants[0]

        # Execute multiple receipts and adjustments
        await InventoryService.receive_stock(session, sku, 50, reason="Batch 2")
        await InventoryService.adjust_stock(session, sku, -20, reason="Damage")
        await InventoryService.receive_stock(session, sku, 30, reason="Batch 3")
        await session.commit()

        # Sum of deltas from ledger
        movements = await InventoryService.list_movements(session, variant_id=variant.id)
        total_on_hand_delta = sum(m.quantity_delta_on_hand for m in movements)

        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert total_on_hand_delta == item.quantity_on_hand == 160


@pytest.mark.asyncio
async def test_postgres_append_only_triggers_block_update_and_delete(session_factory):
    """PostgreSQL Invariant: DB triggers reject UPDATE and DELETE operations on append-only ledger and audit logs."""
    audit_id = uuid.uuid4()
    async with session_factory() as session:
        session.add(
            AuthAuditLog(
                id=audit_id,
                email_attempted="audit_test@ape-store.com",
                event_type="LOGIN_SUCCESS",
                ip_address="127.0.0.1",
                details={"reason": "audit test"},
            )
        )
        await session.commit()

    # 1. Attempt UPDATE on auth_audit_logs -> must be rejected by trigger
    async with session_factory() as session:
        with pytest.raises((InternalError, DBAPIError, ProgrammingError)) as exc:
            await session.execute(
                text("UPDATE auth_audit_logs SET ip_address = '10.0.0.1' WHERE id = :id"),
                {"id": audit_id},
            )
        assert "append-only" in str(exc.value).lower() or "not allowed" in str(exc.value).lower()

    # 2. Attempt DELETE on auth_audit_logs -> must be rejected by trigger
    async with session_factory() as session:
        with pytest.raises((InternalError, DBAPIError, ProgrammingError)) as exc:
            await session.execute(
                text("DELETE FROM auth_audit_logs WHERE id = :id"),
                {"id": audit_id},
            )
        assert "append-only" in str(exc.value).lower() or "not allowed" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_postgres_atomic_rollback_of_mutation_and_outbox_event(session_factory):
    """PostgreSQL Invariant: If a business transaction rolls back, its outbox event is atomically rolled back."""
    sku_prefix = f"APE-ROLL-{uuid.uuid4().hex[:6].upper()}"
    async with session_factory() as session:
        try:
            # Create product with 1 valid variant and 1 duplicate/failing variant
            product_data = ProductCreate(
                sku_prefix=sku_prefix,
                name="Rollback Test Product",
                hsn_code="73269099",
                variants=[
                    ProductVariantCreate(sku=f"{sku_prefix}-V1", frame_thickness="30mm", initial_stock=10),
                    ProductVariantCreate(sku=f"{sku_prefix}-V1", frame_thickness="35mm", initial_stock=10),
                ],
            )
            await CatalogService.create_product(session, product_data)
        except Exception:
            await session.rollback()

    # Verify that neither product nor outbox event exists in PostgreSQL
    async with session_factory() as session:
        p_stmt = select(Product).where(Product.sku_prefix == sku_prefix)
        p = (await session.execute(p_stmt)).scalar_one_or_none()
        assert p is None

        # No outbox events for this sku_prefix
        ob_stmt = select(OutboxEvent)
        all_ob = (await session.execute(ob_stmt)).scalars().all()
        assert not any(sku_prefix in str(ev.payload) for ev in all_ob)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "can_create_products", "can_create_pricing", "can_adjust_inventory"),
    [
        (UserRole.OWNER, True, True, True),
        (UserRole.CATALOG_MANAGER, True, False, False),
        (UserRole.FINANCE, False, True, False),
        (UserRole.INVENTORY_MANAGER, False, False, True),
        (UserRole.AUDITOR, False, False, False),
        (UserRole.ORDER_OPERATIONS, False, False, False),
        (UserRole.SUPPORT, False, False, False),
    ],
)
async def test_postgres_gate2b_rbac_matrix(
    client, db, role, can_create_products, can_create_pricing, can_adjust_inventory
):
    """PostgreSQL Invariant: Endpoint-level RBAC authorization matrix for Gate 2B across all 7 roles."""
    _, csrf_token = await login_role(client, db, role)
    headers = {"X-CSRF-Token": csrf_token}

    # 1. Product creation attempt
    sku_prefix = f"APE-RBAC-{role.value[:3]}-{uuid.uuid4().hex[:4].upper()}"
    p_res = await client.post(
        "/api/v1/products/",
        json={"sku_prefix": sku_prefix, "name": "RBAC Product", "hsn_code": "73269099"},
        headers=headers,
    )
    if can_create_products:
        assert p_res.status_code == 201
    else:
        assert p_res.status_code == 403

    # 2. Pricing creation attempt (with valid variant_id schema)
    dummy_variant_id = str(uuid.uuid4())
    pr_res = await client.post(
        "/api/v1/pricing/versions",
        json={
            "variant_id": dummy_variant_id,
            "channel": "B2C",
            "min_quantity": 1,
            "unit_price": "20.00",
            "gst_rate": "0.1800",
            "hsn_code": "73269099",
            "tax_mode": "GST_INCLUSIVE",
        },
        headers=headers,
    )
    if can_create_pricing:
        # Fails with 400 Bad Request because dummy_variant_id doesn't exist, but passes RBAC guard!
        assert pr_res.status_code in (400, 404)
    else:
        assert pr_res.status_code == 403

    # 3. Inventory adjustment attempt
    inv_res = await client.post(
        "/api/v1/inventory/adjustment",
        json={"sku": "NON-EXISTENT", "quantity_delta": 5, "reason": "RBAC test"},
        headers=headers,
    )
    if can_adjust_inventory:
        # Fails with 400 Bad Request because SKU doesn't exist, but passes RBAC guard!
        assert inv_res.status_code == 400
    else:
        assert inv_res.status_code == 403


@pytest.mark.asyncio
async def test_postgres_oversubscription_concurrency_exact_inventory_hold(session_factory):
    """PostgreSQL Invariant: Exactly 40 of 100 simultaneous holds succeed on 40 units stock, with 0 negative/over-reserved balance."""
    sku = f"APE-OVER-{uuid.uuid4().hex[:6].upper()}"
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=sku,
                name="Oversubscription Clamp",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=sku, frame_thickness="30mm", initial_stock=40)],
            ),
        )
        variant_id = product.variants[0].id

    # Launch 100 simultaneous holds of 1 unit
    async def hold_one():
        async with session_factory() as s:
            try:
                order_id = uuid.uuid4()
                await InventoryService.reserve_stock(
                    session=s,
                    sku=sku,
                    quantity=1,
                    order_id=order_id,
                )
                await s.commit()
                return "SUCCESS"
            except InsufficientStockError:
                await s.rollback()
                return "INSUFFICIENT_STOCK"
            except Exception as e:
                await s.rollback()
                return f"ERROR: {type(e).__name__}"

    tasks = [hold_one() for _ in range(100)]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r == "SUCCESS")
    failed_count = sum(1 for r in results if r == "INSUFFICIENT_STOCK")

    assert success_count == 40
    assert failed_count == 60

    # Verify inventory state
    async with session_factory() as session:
        item = (await session.execute(select(InventoryItem).where(InventoryItem.sku == sku))).scalar_one()
        assert item.quantity_on_hand == 40
        assert item.quantity_reserved == 40
        assert (item.quantity_on_hand - item.quantity_reserved) == 0

        # Exactly 40 ledger entries of type RESERVATION_HOLD
        movements = (
            await session.execute(
                select(InventoryMovement).where(
                    InventoryMovement.variant_id == variant_id,
                    InventoryMovement.movement_type == MovementType.RESERVATION_HOLD,
                )
            )
        ).scalars().all()
        assert len(movements) == 40

        # Exactly 40 committed outbox events for inventory.balance.changed from the holds
        outbox_events = (
            await session.execute(
                select(OutboxEvent).where(
                    OutboxEvent.aggregate_id == item.id,
                    OutboxEvent.event_type == "inventory.balance.changed",
                )
            )
        ).scalars().all()
        # 1 from initial creation receipt + 40 from successful holds = 41 total
        assert len(outbox_events) == 41


@pytest.mark.asyncio
async def test_postgres_strengthened_thickness_check_constraint(session_factory):
    """PostgreSQL Invariant: ck_variant_thickness_fit strictly rejects inconsistent thickness data."""
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=f"APE-THK-{uuid.uuid4().hex[:6].upper()}",
                name="Thickness Test Product",
                hsn_code="73269099",
            ),
        )
        prod_id = product.id

    # 1. Invalid EXACT: min_thickness_mm is not null
    async with session_factory() as s:
        with pytest.raises((IntegrityError, DBAPIError)):
            await s.execute(
                text("""
                    INSERT INTO product_variants (
                        id, product_id, sku, fit_mode, frame_thickness_mm, min_thickness_mm,
                        display_label, frame_thickness, pack_size, is_active, is_archived, created_at
                    ) VALUES (
                        :id, :pid, 'SKU-EX-BAD', 'EXACT', 30.00, 25.00,
                        'Bad Exact', '30mm', 1, true, false, NOW()
                    )
                """),
                {"id": uuid.uuid4(), "pid": prod_id},
            )

    # 2. Invalid RANGE: frame_thickness_mm is not null
    async with session_factory() as s:
        with pytest.raises((IntegrityError, DBAPIError)):
            await s.execute(
                text("""
                    INSERT INTO product_variants (
                        id, product_id, sku, fit_mode, frame_thickness_mm, min_thickness_mm, max_thickness_mm,
                        display_label, frame_thickness, pack_size, is_active, is_archived, created_at
                    ) VALUES (
                        :id, :pid, 'SKU-RG-BAD', 'RANGE', 30.00, 25.00, 35.00,
                        'Bad Range', '25-35mm', 1, true, false, NOW()
                    )
                """),
                {"id": uuid.uuid4(), "pid": prod_id},
            )

    # 3. Invalid UNIVERSAL with thickness value: must be rejected
    async with session_factory() as s:
        with pytest.raises((IntegrityError, DBAPIError)):
            await s.execute(
                text("""
                    INSERT INTO product_variants (
                        id, product_id, sku, fit_mode, frame_thickness_mm,
                        display_label, frame_thickness, pack_size, is_active, is_archived, created_at
                    ) VALUES (
                        :id, :pid, 'SKU-UNIV-BAD', 'UNIVERSAL', 28.00,
                        'Universal', 'universal', 1, true, false, NOW()
                    )
                """),
                {"id": uuid.uuid4(), "pid": prod_id},
            )


@pytest.mark.asyncio
async def test_postgres_currency_inr_check_and_exclusion_constraint(session_factory):
    """PostgreSQL Invariant: ck_price_version_currency_inr blocks non-INR currencies."""
    async with session_factory() as session:
        product = await CatalogService.create_product(
            session,
            ProductCreate(
                sku_prefix=f"APE-CURR-{uuid.uuid4().hex[:6].upper()}",
                name="Currency Test Product",
                hsn_code="73269099",
                variants=[ProductVariantCreate(sku=f"APE-CURR-V-{uuid.uuid4().hex[:4]}", frame_thickness="30mm")],
            ),
        )
        variant_id = product.variants[0].id
        prod_id = product.id

    # Attempt to insert currency='USD' -> must be rejected by check constraint
    async with session_factory() as s:
        with pytest.raises((IntegrityError, DBAPIError)):
            await s.execute(
                text("""
                    INSERT INTO price_versions (
                        id, variant_id, product_id, currency, channel, min_quantity, unit_price,
                        gst_rate, hsn_code, tax_mode, valid_from, valid_to, reason
                    ) VALUES (
                        :id, :vid, :pid, 'USD', 'B2C', 1, 20.00,
                        0.1800, '73269099', 'GST_INCLUSIVE', NOW(), NULL, 'USD price'
                    )
                """),
                {"id": uuid.uuid4(), "vid": variant_id, "pid": prod_id},
            )


@pytest.mark.asyncio
async def test_postgres_optimistic_concurrency_control(client: AsyncClient, db: AsyncSession):
    """PostgreSQL Invariant: Optimistic locking rejects stale updates with 409 and increments version on success."""
    _, owner_csrf = await login_role(client, db, UserRole.OWNER)
    headers = {"X-CSRF-Token": owner_csrf}

    # 1. Create product (version=1)
    sku_prefix = f"APE-OCC-{uuid.uuid4().hex[:6].upper()}"
    p_res = await client.post(
        "/api/v1/products/",
        json={
            "sku_prefix": sku_prefix,
            "name": "OCC Test Product",
            "hsn_code": "73269099",
            "variants": [{"sku": f"{sku_prefix}-V1", "frame_thickness": "30mm", "pack_size": 1}],
        },
        headers=headers,
    )
    assert p_res.status_code == 201
    prod_data = p_res.json()
    product_id = prod_data["id"]
    variant_id = prod_data["variants"][0]["id"]
    assert prod_data["version"] == 1
    assert prod_data["variants"][0]["version"] == 1

    # 2. Update without version or If-Match -> 428 Precondition Required
    bad_req = await client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "New Name Without Version"},
        headers=headers,
    )
    assert bad_req.status_code == 428

    # 3. Update with stale version -> 409 Conflict
    stale_req = await client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "Stale Update", "version": 999},
        headers=headers,
    )
    assert stale_req.status_code == 409

    # 4. Update with correct version in body -> 200 OK, version increments to 2
    ok_req = await client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "Updated Valid Name", "version": 1},
        headers=headers,
    )
    assert ok_req.status_code == 200
    assert ok_req.json()["version"] == 2

    # 5. Subsequent update with now-stale version 1 -> 409 Conflict
    stale2 = await client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "Stale Update 2", "version": 1},
        headers=headers,
    )
    assert stale2.status_code == 409

    # 6. Update with If-Match header "2" -> 200 OK, version increments to 3
    if_match_headers = {**headers, "If-Match": '"2"'}
    ok_header_req = await client.put(
        f"/api/v1/products/{product_id}",
        json={"name": "Header Match Updated"},
        headers=if_match_headers,
    )
    assert ok_header_req.status_code == 200
    assert ok_header_req.json()["version"] == 3

    # 7. Check outbox event includes new version 3
    outbox_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == uuid.UUID(product_id),
        OutboxEvent.event_type == "catalog.product.changed",
    ).order_by(OutboxEvent.created_at.desc())
    latest_event = (await db.execute(outbox_stmt)).scalars().first()
    assert latest_event is not None
    assert latest_event.payload["version"] == 3

    # 8. Test OCC on Variant Update (PATCH)
    var_stale = await client.patch(
        f"/api/v1/products/variants/{variant_id}",
        json={"pack_size": 5, "version": 99},
        headers=headers,
    )
    assert var_stale.status_code == 409

    var_ok = await client.patch(
        f"/api/v1/products/variants/{variant_id}",
        json={"pack_size": 5, "version": 1},
        headers=headers,
    )
    assert var_ok.status_code == 200
    assert var_ok.json()["version"] == 2
    assert var_ok.json()["pack_size"] == 5

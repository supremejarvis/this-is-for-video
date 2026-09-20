"""Integration tests for Phase 2: Category DAG cycle prevention, Cartesian generator, safe CSV export, and Pricing engine."""
import uuid
from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models.auth import User, UserRole
from app.models.company import Company
from app.models.inventory import InventoryItem
from app.models.price import PriceVersion, TaxMode
from app.models.product import FitMode, Product, ProductVariant


from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
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
    email = f"user_{role.value.lower()}_{uuid.uuid4().hex[:4]}@ape-store.com"
    await get_or_create_user(db, email, role)
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123456!"},
    )
    assert res.status_code == 200, f"Login failed for role {role}: {res.text}"
    csrf_token = res.cookies.get("ape_csrf") or ""
    return res.json(), csrf_token


async def ensure_company(db: AsyncSession) -> Company:
    comp_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    company = await db.get(Company, comp_id)
    if not company:
        company = Company(
            id=comp_id,
            legal_name="Apollo Engineering Private Limited",
            currency="INR",
            timezone="Asia/Kolkata",
            fiscal_config={"fy_start_month": 4, "fy_start_day": 1},
        )
        db.add(company)
        await db.commit()
    return company


async def ensure_product_with_variant(db: AsyncSession) -> tuple[Product, ProductVariant]:
    stmt = select(Product).where(Product.sku_prefix == "APE-SC")
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        product = Product(
            id=uuid.uuid4(),
            sku_prefix="APE-SC",
            name="Apollo SS304 Solar Drain Clip",
            hsn_code="73269099",
            is_active=True,
            is_archived=False,
        )
        db.add(product)
        await db.flush()

        variant = ProductVariant(
            id=uuid.uuid4(),
            product_id=product.id,
            sku="APE-SC-30MM",
            fit_mode=FitMode.EXACT,
            frame_thickness="30mm",
            pack_size=50,
            display_label="30mm Pack of 50",
            is_active=True,
            is_archived=False,
        )
        db.add(variant)
        await db.flush()

        inv = InventoryItem(
            id=uuid.uuid4(),
            variant_id=variant.id,
            sku="APE-SC-30MM",
            quantity_on_hand=500,
            quantity_reserved=0,
        )
        db.add(inv)

        pv = PriceVersion(
            id=uuid.uuid4(),
            variant_id=variant.id,
            product_id=product.id,
            currency="INR",
            channel="B2C",
            min_quantity=1,
            unit_price=Decimal("20.00"),
            gst_rate=Decimal("0.1800"),
            hsn_code="73269099",
            tax_mode=TaxMode.GST_INCLUSIVE,
        )
        db.add(pv)
        await db.commit()
    else:
        variant_stmt = select(ProductVariant).where(ProductVariant.product_id == product.id)
        variant = (await db.execute(variant_stmt)).scalars().first()

    return product, variant


@pytest.mark.asyncio
async def test_admin_category_dag_cycle_prevention(client: AsyncClient, db_session: AsyncSession):
    """Verify that Category DAG hierarchy strictly rejects cyclic parent assignments."""
    await ensure_company(db_session)
    _, csrf_token = await login_role(client, db_session, UserRole.CATALOG_MANAGER)
    headers = {"X-CSRF-Token": csrf_token}

    # 1. Create root category A
    res_a = await client.post("/api/v1/admin/categories", json={
        "name": "Solar Structure Mounting",
        "slug": f"solar-mounting-{uuid.uuid4().hex[:6]}",
        "parent_id": None,
    }, headers=headers)
    assert res_a.status_code == 201, res_a.text
    cat_a = res_a.json()

    # 2. Create child category B (parent is A)
    res_b = await client.post("/api/v1/admin/categories", json={
        "name": "Clamps & Fasteners",
        "slug": f"clamps-fasteners-{uuid.uuid4().hex[:6]}",
        "parent_id": cat_a["id"],
    }, headers=headers)
    assert res_b.status_code == 201, res_b.text
    cat_b = res_b.json()

    # 3. Create grandchild category C (parent is B)
    res_c = await client.post("/api/v1/admin/categories", json={
        "name": "SS304 Drain Clips",
        "slug": f"ss304-drain-clips-{uuid.uuid4().hex[:6]}",
        "parent_id": cat_b["id"],
    }, headers=headers)
    assert res_c.status_code == 201, res_c.text
    cat_c = res_c.json()

    # 4. Attempt to set A's parent to C (direct cycle A -> B -> C -> A)
    res_cycle = await client.put(f"/api/v1/admin/categories/{cat_a['id']}", json={
        "parent_id": cat_c["id"],
    }, headers=headers)
    assert res_cycle.status_code == 400, "Cycle should be rejected with 400 Bad Request"
    assert "cycle detected" in res_cycle.text.lower()


@pytest.mark.asyncio
async def test_admin_variant_cartesian_preview(client: AsyncClient, db_session: AsyncSession):
    """Verify Cartesian preview generates expected combinations and detects existing keys."""
    await ensure_company(db_session)
    product, _ = await ensure_product_with_variant(db_session)
    product_id = str(product.id)

    _, csrf_token = await login_role(client, db_session, UserRole.CATALOG_MANAGER)
    headers = {"X-CSRF-Token": csrf_token}

    # 1. Create an attribute with values
    res_attr = await client.post("/api/v1/admin/attributes", json={
        "code": f"test_pack_{uuid.uuid4().hex[:6]}",
        "label": "Test Pack Size",
        "is_variant_axis": True,
        "initial_values": [
            {"normalized_value": "p10", "label": "Pack of 10", "sort_order": 0},
            {"normalized_value": "p50", "label": "Pack of 50", "sort_order": 1},
        ],
    }, headers=headers)
    assert res_attr.status_code == 201, res_attr.text
    attr = res_attr.json()

    # 2. Preview combinations for this axis
    res_prev = await client.post(f"/api/v1/admin/products/{product_id}/variants/preview", json={
        "axes": [
            {
                "attribute_id": attr["id"],
                "value_ids": [v["id"] for v in attr["values"]],
            }
        ]
    }, headers=headers)
    assert res_prev.status_code == 200, res_prev.text
    prev_data = res_prev.json()
    assert prev_data["total_combinations"] == 2
    assert len(prev_data["items"]) == 2
    for item in prev_data["items"]:
        assert item["combination_key"]
        assert item["suggested_sku"].startswith("APE-SC-")


@pytest.mark.asyncio
async def test_admin_variants_safe_csv_export(client: AsyncClient, db_session: AsyncSession):
    """Verify that the variants export endpoint returns safe CSV content with proper Content-Type."""
    await ensure_company(db_session)
    await ensure_product_with_variant(db_session)
    _, csrf_token = await login_role(client, db_session, UserRole.CATALOG_MANAGER)

    res = await client.get("/api/v1/admin/variants/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "SKU,Product Name,Display Label" in content
    # Check that dangerous formulas are not present unquoted
    assert "\n=" not in content


@pytest.mark.asyncio
async def test_admin_pricing_preview_calculation(client: AsyncClient, db_session: AsyncSession):
    """Verify live pricing preview calculates line-total statutory GST correctly."""
    await ensure_company(db_session)
    _, variant = await ensure_product_with_variant(db_session)
    variant_id = str(variant.id)

    _, csrf_token = await login_role(client, db_session, UserRole.FINANCE)
    headers = {"X-CSRF-Token": csrf_token}

    # 1. Test Intra-state B2C inclusive (Gujarat state 24)
    res_intra = await client.post("/api/v1/admin/pricing/preview", json={
        "variant_id": variant_id,
        "quantity": 100,
        "customer_group_code": "RETAIL_B2C",
        "customer_state_code": "24",
        "is_tax_inclusive": True,
    }, headers=headers)
    assert res_intra.status_code == 200, res_intra.text
    data_intra = res_intra.json()
    assert data_intra["is_interstate"] is False
    assert Decimal(data_intra["cgst_amount"]) > Decimal("0.00")
    assert Decimal(data_intra["sgst_amount"]) > Decimal("0.00")
    assert Decimal(data_intra["igst_amount"]) == Decimal("0.00")
    assert Decimal(data_intra["cgst_rate"]) == Decimal("0.0900")
    assert Decimal(data_intra["sgst_rate"]) == Decimal("0.0900")

    # 2. Test Inter-state (e.g. Maharashtra state 27)
    res_inter = await client.post("/api/v1/admin/pricing/preview", json={
        "variant_id": variant_id,
        "quantity": 100,
        "customer_group_code": "RETAIL_B2C",
        "customer_state_code": "27",
        "is_tax_inclusive": True,
    }, headers=headers)
    assert res_inter.status_code == 200, res_inter.text
    data_inter = res_inter.json()
    assert data_inter["is_interstate"] is True
    assert Decimal(data_inter["igst_amount"]) > Decimal("0.00")
    assert Decimal(data_inter["cgst_amount"]) == Decimal("0.00")
    assert Decimal(data_inter["sgst_amount"]) == Decimal("0.00")
    assert Decimal(data_inter["igst_rate"]) == Decimal("0.1800")

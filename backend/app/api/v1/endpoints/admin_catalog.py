"""Admin Enterprise Catalog Endpoints: Categories, Attributes, Variants, Cartesian Generator, Safe CSV."""
import uuid
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_session_and_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.core.spreadsheet_security import generate_safe_csv, parse_csv_rows
from app.models.auth import User, UserRole
from app.models.catalog_advanced import (
    Attribute,
    AttributeValue,
    Category,
    CategoryStatus,
    MediaAsset,
    ProductAttribute,
    ProductOptionValue,
    VariantOption,
)
from app.models.company import Company
from app.models.inventory import InventoryItem
from app.models.price import PriceVersion
from app.models.product import FitMode, Product, ProductVariant
from app.schemas.catalog_advanced import (
    AttributeCreate,
    AttributeResponse,
    AttributeUpdate,
    AttributeValueCreate,
    AttributeValueResponse,
    CategoryCreate,
    CategoryResponse,
    CategoryTreeResponse,
    CategoryUpdate,
    VariantBatchGenerateRequest,
    VariantBatchGenerateResponse,
    VariantCombinationPreviewRequest,
    VariantCombinationPreviewResponse,
    VariantImportReport,
)
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.catalog_service import CatalogService, DuplicateSkuException, OptimisticLockException
from app.services.category_service import CategoryNotFoundException, CategoryService, CycleDetectedException, DuplicateSlugException
from app.services.outbox import OutboxService
from app.services.variant_generation_service import VariantGenerationService

router = APIRouter(prefix="/admin", tags=["Admin Catalog"])

DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_admin_user_or_dev(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        session_user = await get_current_session_and_user(request, db)
        user = session_user[1]
        if user.role in [UserRole.OWNER, UserRole.CATALOG_MANAGER, UserRole.FINANCE]:
            return user
    except HTTPException:
        pass

    if settings.ENVIRONMENT == "development":
        try:
            stmt = select(User).where(User.email == (settings.ADMIN_INIT_EMAIL or "admin@apolloengineering.co.in"))
            admin_user = (await db.execute(stmt)).scalar_one_or_none()
            if admin_user:
                return admin_user
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in as an administrator.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
    include_archived: bool = False,
) -> Any:
    cats = await CategoryService.list_categories(db, DEFAULT_COMPANY_ID, include_archived=include_archived)
    return cats


@router.get("/categories/tree", response_model=list[dict[str, Any]])
async def get_category_tree(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    return await CategoryService.get_tree(db, DEFAULT_COMPANY_ID)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    try:
        return await CategoryService.create_category(db, DEFAULT_COMPANY_ID, data)
    except DuplicateSlugException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except CategoryNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    try:
        return await CategoryService.update_category(db, DEFAULT_COMPANY_ID, category_id, data)
    except CycleDetectedException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    except DuplicateSlugException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except CategoryNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None


# ─────────────────────────────────────────────────────────────────────────────
# 2. ATTRIBUTES & VALUES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/attributes", response_model=list[AttributeResponse])
async def list_attributes(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(Attribute).where(Attribute.company_id == DEFAULT_COMPANY_ID).options(
        selectinload(Attribute.values)
    ).order_by(Attribute.label.asc())
    attrs = (await db.execute(stmt)).scalars().all()
    return attrs


@router.post("/attributes", response_model=AttributeResponse, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    data: AttributeCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    # Check code uniqueness
    stmt = select(Attribute).where(Attribute.company_id == DEFAULT_COMPANY_ID, Attribute.code == data.code)
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Attribute code '{data.code}' already exists.")

    attr = Attribute(
        id=uuid.uuid4(),
        company_id=DEFAULT_COMPANY_ID,
        code=data.code,
        label=data.label,
        data_type=data.data_type,
        unit=data.unit,
        is_variant_axis=data.is_variant_axis,
    )
    db.add(attr)
    await db.flush()

    for idx, v_data in enumerate(data.initial_values):
        val = AttributeValue(
            id=uuid.uuid4(),
            attribute_id=attr.id,
            normalized_value=v_data.normalized_value,
            label=v_data.label,
            sort_order=v_data.sort_order or idx,
        )
        db.add(val)

    await db.commit()
    return await db.scalar(
        select(Attribute).where(Attribute.id == attr.id).options(selectinload(Attribute.values))
    )


@router.post("/attributes/{attribute_id}/values", response_model=AttributeValueResponse, status_code=status.HTTP_201_CREATED)
async def add_attribute_value(
    attribute_id: uuid.UUID,
    data: AttributeValueCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    attr = await db.get(Attribute, attribute_id)
    if not attr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")

    stmt = select(AttributeValue).where(
        AttributeValue.attribute_id == attribute_id,
        AttributeValue.normalized_value == data.normalized_value,
    )
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Value '{data.normalized_value}' already exists for this attribute.")

    val = AttributeValue(
        id=uuid.uuid4(),
        attribute_id=attribute_id,
        normalized_value=data.normalized_value,
        label=data.label,
        sort_order=data.sort_order,
    )
    db.add(val)
    await db.commit()
    await db.refresh(val)
    return val


# ─────────────────────────────────────────────────────────────────────────────
# 3. PRODUCTS MANAGEMENT & READINESS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/products")
async def list_admin_products(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> Any:
    query = select(Product).options(
        selectinload(Product.variants).selectinload(ProductVariant.inventory_item),
        selectinload(Product.variants).selectinload(ProductVariant.price_versions),
    )
    if search:
        s = f"%{search.strip()}%"
        query = query.where(or_(Product.name.ilike(s), Product.sku_prefix.ilike(s)))
    if is_active is not None:
        query = query.where(Product.is_active == is_active)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    query = query.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    items = (await db.execute(query)).scalars().all()

    # Format result with variant count, stock aggregation, and price range
    result_items = []
    for p in items:
        variants = p.variants
        total_stock = sum(v.inventory_item.quantity_on_hand if v.inventory_item else 0 for v in variants)
        prices = [
            pv.unit_price for v in variants for pv in v.price_versions
            if pv.channel == "B2C" and pv.valid_to is None
        ]
        min_price = min(prices) if prices else Decimal("0.00")
        max_price = max(prices) if prices else Decimal("0.00")

        result_items.append({
            "id": str(p.id),
            "sku_prefix": p.sku_prefix,
            "name": p.name,
            "description": p.description,
            "hsn_code": p.hsn_code,
            "is_active": p.is_active,
            "is_archived": p.is_archived,
            "status": p.status.value,
            "variant_count": len(variants),
            "total_stock": total_stock,
            "price_min": str(min_price),
            "price_max": str(max_price),
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
            "version": p.version,
        })

    return {"total": total, "items": result_items}


@router.post("/products/{product_id}/publish")
async def publish_product(
    product_id: uuid.UUID,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(Product).where(Product.id == product_id).options(
        selectinload(Product.variants).selectinload(ProductVariant.price_versions),
        selectinload(Product.variants).selectinload(ProductVariant.inventory_item),
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    # Readiness validation per Section 4 Publication Rules
    reasons = []
    if not product.name or len(product.name.strip()) < 3:
        reasons.append("Product name is missing or too short (minimum 3 characters).")
    if not product.hsn_code or len(product.hsn_code.strip()) < 4:
        reasons.append("Valid statutory HSN code is required.")
    if not product.variants:
        reasons.append("Product must have at least one sellable variant.")
    else:
        # Check active pricing
        has_pricing = any(
            any(pv.channel == "B2C" and pv.valid_to is None for pv in v.price_versions)
            for v in product.variants
        )
        if not has_pricing:
            reasons.append("At least one variant must have an approved, active B2C price.")

    if reasons:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"message": "Product is not ready for publication.", "violations": reasons},
        )

    product.is_active = True
    product.is_archived = False
    product.version += 1
    for v in product.variants:
        v.is_active = True
        v.is_archived = False

    await db.commit()

    OutboxService.emit_event(
        session=db,
        event_type="catalog.product.published.v1",
        aggregate_type="product",
        aggregate_id=product.id,
        payload={"product_id": str(product.id), "sku_prefix": product.sku_prefix, "status": "PUBLISHED"},
    )

    return {"status": "PUBLISHED", "product_id": str(product.id)}


@router.post("/products/{product_id}/unpublish")
async def unpublish_product(
    product_id: uuid.UUID,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(Product).where(Product.id == product_id).options(selectinload(Product.variants))
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.is_active = False
    product.is_archived = False
    product.version += 1
    for v in product.variants:
        v.is_active = False

    await db.commit()

    OutboxService.emit_event(
        session=db,
        event_type="catalog.product.unpublished.v1",
        aggregate_type="product",
        aggregate_id=product.id,
        payload={"product_id": str(product.id), "sku_prefix": product.sku_prefix, "status": "DRAFT"},
    )

    return {"status": "DRAFT", "product_id": str(product.id)}


@router.post("/products/{product_id}/archive")
async def archive_product(
    product_id: uuid.UUID,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(Product).where(Product.id == product_id).options(selectinload(Product.variants))
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.is_archived = True
    product.is_active = False
    product.version += 1
    for v in product.variants:
        v.is_archived = True
        v.is_active = False
        v.version += 1

    await db.commit()

    OutboxService.emit_event(
        session=db,
        event_type="catalog.product.archived.v1",
        aggregate_type="product",
        aggregate_id=product.id,
        payload={"product_id": str(product.id), "sku_prefix": product.sku_prefix, "status": "ARCHIVED"},
    )
    return {"status": "ARCHIVED", "product_id": str(product.id)}


# ─────────────────────────────────────────────────────────────────────────────
# 4. CARTESIAN VARIANT GENERATION PREVIEW & BATCH
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/products/{product_id}/variants/preview", response_model=VariantCombinationPreviewResponse)
async def preview_variant_combinations(
    product_id: uuid.UUID,
    payload: VariantCombinationPreviewRequest,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    try:
        return await VariantGenerationService.preview_combinations(db, product_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.post("/products/{product_id}/variants/generate", response_model=VariantBatchGenerateResponse, status_code=status.HTTP_201_CREATED)
async def batch_generate_variants(
    product_id: uuid.UUID,
    payload: VariantBatchGenerateRequest,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    try:
        return await VariantGenerationService.batch_generate_variants(db, product_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


# ─────────────────────────────────────────────────────────────────────────────
# 5. ALL VARIANTS & INLINE EDITING
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/variants")
async def list_all_variants(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
    product_id: uuid.UUID | None = None,
    search: str | None = None,
    limit: int = Query(default=100, ge=1, le=250),
    offset: int = Query(default=0, ge=0),
) -> Any:
    stmt = select(ProductVariant).options(
        selectinload(ProductVariant.product),
        selectinload(ProductVariant.inventory_item),
        selectinload(ProductVariant.price_versions),
    )
    if product_id:
        stmt = stmt.where(ProductVariant.product_id == product_id)
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(ProductVariant.sku.ilike(s), ProductVariant.display_label.ilike(s)))

    stmt = stmt.order_by(ProductVariant.sku.asc()).offset(offset).limit(limit)
    variants = (await db.execute(stmt)).scalars().all()

    items = []
    for v in variants:
        pv_b2c = next((pv for pv in v.price_versions if pv.channel == "B2C" and pv.valid_to is None), None)
        items.append({
            "id": str(v.id),
            "product_id": str(v.product_id),
            "product_name": v.product.name if v.product else "",
            "sku": v.sku,
            "display_label": v.display_label,
            "frame_thickness": v.frame_thickness,
            "pack_size": v.pack_size,
            "is_active": v.is_active,
            "is_archived": v.is_archived,
            "version": v.version,
            "stock_on_hand": v.inventory_item.quantity_on_hand if v.inventory_item else 0,
            "stock_reserved": v.inventory_item.quantity_reserved if v.inventory_item else 0,
            "unit_price": str(pv_b2c.unit_price) if pv_b2c else "0.00",
        })
    return {"items": items}


@router.put("/variants/{variant_id}")
async def update_variant_inline(
    variant_id: uuid.UUID,
    payload: dict[str, Any],
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found.")

    # Optimistic locking
    expected_version = payload.get("version")
    if expected_version is not None and variant.version != expected_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Variant was modified by another transaction. Expected v{expected_version}, current v{variant.version}.",
        )

    if "display_label" in payload and payload["display_label"]:
        variant.display_label = str(payload["display_label"]).strip()
    if "pack_size" in payload and payload["pack_size"] is not None:
        variant.pack_size = int(payload["pack_size"])
    if "is_active" in payload and payload["is_active"] is not None:
        variant.is_active = bool(payload["is_active"])

    variant.version += 1
    await db.commit()
    await db.refresh(variant)
    return {"status": "SUCCESS", "variant_id": str(variant.id), "version": variant.version}


@router.post("/variants/{variant_id}/deactivate")
async def deactivate_variant(
    variant_id: uuid.UUID,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found.")

    variant.is_active = False
    variant.version += 1
    await db.commit()
    return {"status": "DEACTIVATED", "variant_id": str(variant.id)}


# ─────────────────────────────────────────────────────────────────────────────
# 6. FORMULA-SAFE CSV EXPORT & BULK IMPORT
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/variants/export")
async def export_variants_safe_csv(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Download formula-injection safe CSV of all variants."""
    stmt = select(ProductVariant).options(
        selectinload(ProductVariant.product),
        selectinload(ProductVariant.inventory_item),
        selectinload(ProductVariant.price_versions),
    ).order_by(ProductVariant.sku.asc())
    variants = (await db.execute(stmt)).scalars().all()

    headers = ["SKU", "Product Name", "Display Label", "Pack Size", "Price (INR)", "Stock On Hand", "Status"]
    rows = []
    for v in variants:
        pv_b2c = next((pv for pv in v.price_versions if pv.channel == "B2C" and pv.valid_to is None), None)
        price_str = str(pv_b2c.unit_price) if pv_b2c else "0.00"
        stock_str = str(v.inventory_item.quantity_on_hand if v.inventory_item else 0)
        status_str = "ACTIVE" if v.is_active else "INACTIVE"
        rows.append([
            v.sku,
            v.product.name if v.product else "",
            v.display_label,
            str(v.pack_size),
            price_str,
            stock_str,
            status_str,
        ])

    csv_content = generate_safe_csv(headers, rows)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=apollo_variants_catalog.csv"},
    )


@router.post("/variants/import", response_model=VariantImportReport)
async def import_variants_csv(
    request: Request,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
    dry_run: bool = Query(default=True, description="Dry run preview without modifying database"),
) -> Any:
    """Parse and validate CSV upload with formula-injection stripping and row-level error reporting."""
    raw_bytes = await request.body()
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1")

    headers, rows, parse_errors = parse_csv_rows(content)
    if parse_errors:
        return VariantImportReport(
            dry_run=dry_run,
            total_rows=len(rows),
            valid_rows=0,
            error_count=len(parse_errors),
            errors=parse_errors,
            applied_count=0,
        )

    required_cols = {"SKU", "Pack Size"}
    if not required_cols.issubset(set(headers)):
        return VariantImportReport(
            dry_run=dry_run,
            total_rows=len(rows),
            valid_rows=0,
            error_count=1,
            errors=[f"CSV missing required columns: {required_cols - set(headers)}"],
            applied_count=0,
        )

    valid_count = 0
    applied_count = 0
    row_errors = []

    for idx, r in enumerate(rows, start=2):
        sku = r.get("SKU", "").strip().upper()
        if not sku:
            row_errors.append(f"Row {idx}: SKU cannot be empty.")
            continue

        stmt = select(ProductVariant).where(ProductVariant.sku == sku)
        variant = (await db.execute(stmt)).scalar_one_or_none()
        if not variant:
            row_errors.append(f"Row {idx}: SKU '{sku}' not found in catalog.")
            continue

        valid_count += 1
        if not dry_run:
            # Apply updates
            if "Pack Size" in r and r["Pack Size"].isdigit():
                variant.pack_size = int(r["Pack Size"])
            if "Display Label" in r and r["Display Label"]:
                variant.display_label = r["Display Label"].strip()
            variant.version += 1
            applied_count += 1

    if not dry_run and applied_count > 0:
        await db.commit()

    return VariantImportReport(
        dry_run=dry_run,
        total_rows=len(rows),
        valid_rows=valid_count,
        error_count=len(row_errors),
        errors=row_errors,
        applied_count=applied_count,
    )

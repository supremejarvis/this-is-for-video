"""Product and Dynamic Variant Catalog API Endpoints."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)
from app.services.catalog_service import (
    CatalogService,
    DuplicateSkuException,
    OptimisticLockException,
    ProductNotFoundException,
    VariantNotFoundException,
)

router = APIRouter(prefix="/products", tags=["products"])


def _map_product_response(product: Product) -> ProductResponse:
    variants = []
    for v in product.variants:
        avail = 0
        if v.inventory_item:
            avail = max(0, v.inventory_item.quantity_on_hand - v.inventory_item.quantity_reserved)

        price_val = None
        tax_mode_val = None
        if hasattr(v, "price_versions") and v.price_versions:
            current_pv = next((pv for pv in v.price_versions if pv.valid_to is None), None)
            if current_pv:
                price_val = current_pv.unit_price
                tax_mode_val = current_pv.tax_mode.value if hasattr(current_pv.tax_mode, "value") else str(current_pv.tax_mode)

        if price_val is None and hasattr(product, "price_versions") and product.price_versions:
            current_pv = next((pv for pv in product.price_versions if pv.valid_to is None), None)
            if current_pv:
                price_val = current_pv.unit_price
                tax_mode_val = current_pv.tax_mode.value if hasattr(current_pv.tax_mode, "value") else str(current_pv.tax_mode)

        variants.append(
            ProductVariantResponse(
                id=v.id,
                product_id=v.product_id,
                sku=v.sku,
                fit_mode=v.fit_mode,
                frame_thickness_mm=v.frame_thickness_mm,
                min_thickness_mm=v.min_thickness_mm,
                max_thickness_mm=v.max_thickness_mm,
                display_label=v.display_label,
                frame_thickness=v.frame_thickness,
                pack_size=v.pack_size,
                is_active=v.is_active,
                is_archived=v.is_archived,
                version=v.version,
                available_stock=avail,
                unit_price=price_val,
                tax_mode=tax_mode_val,
                created_at=v.created_at,
            )
        )
    return ProductResponse(
        id=product.id,
        sku_prefix=product.sku_prefix,
        name=product.name,
        description=product.description,
        hsn_code=product.hsn_code,
        is_active=product.is_active,
        is_archived=product.is_archived,
        version=product.version,
        variants=variants,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    """Create a new product with optional initial dynamic variants (28/30/33/35/40mm)."""
    try:
        product = await CatalogService.create_product(db, data, creator_user_id=current_user.id)
        return _map_product_response(product)
    except DuplicateSkuException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None


@router.get("", response_model=list[ProductResponse], include_in_schema=False)
@router.get("/", response_model=list[ProductResponse])
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    include_archived: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ProductResponse]:
    """List catalog products and their variants."""
    products = await CatalogService.list_products(
        db, include_archived=include_archived, limit=limit, offset=offset
    )
    return [_map_product_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_archived: Annotated[bool, Query()] = False,
) -> ProductResponse:
    """Get single product with dynamic variants and current stock."""
    product = await CatalogService.get_product(db, product_id, include_archived=include_archived)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return _map_product_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
) -> ProductResponse:
    """Update product metadata with optimistic concurrency control."""
    expected_version: int | None = None
    if if_match is not None:
        try:
            expected_version = int(if_match.strip().strip('"'))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid If-Match header value.") from None
    elif data.version is not None:
        expected_version = data.version
    else:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Update requires expected version in body or If-Match header.",
        )

    try:
        product = await CatalogService.update_product(
            db, product_id, data, expected_version=expected_version
        )
        return _map_product_response(product)
    except OptimisticLockException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.delete("/{product_id}", response_model=ProductResponse)
async def archive_product(
    product_id: uuid.UUID,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    """Soft-archive product and all its variants (no hard delete)."""
    try:
        product = await CatalogService.archive_product(db, product_id)
        return _map_product_response(product)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
async def create_variant(
    product_id: uuid.UUID,
    data: ProductVariantCreate,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductVariantResponse:
    """Add a dynamic variant (e.g. 28mm, 30mm, 33mm, 35mm, 40mm, universal) to a product."""
    try:
        variant = await CatalogService.create_variant(
            db, product_id, data, creator_user_id=current_user.id
        )
        return ProductVariantResponse(
            id=variant.id,
            product_id=variant.product_id,
            sku=variant.sku,
            fit_mode=variant.fit_mode,
            frame_thickness_mm=variant.frame_thickness_mm,
            min_thickness_mm=variant.min_thickness_mm,
            max_thickness_mm=variant.max_thickness_mm,
            display_label=variant.display_label,
            frame_thickness=variant.frame_thickness,
            pack_size=variant.pack_size,
            is_active=variant.is_active,
            is_archived=variant.is_archived,
            version=variant.version,
            available_stock=data.initial_stock,
            created_at=variant.created_at,
        )
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except DuplicateSkuException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.patch("/variants/{variant_id}", response_model=ProductVariantResponse)
async def update_variant(
    variant_id: uuid.UUID,
    data: ProductVariantUpdate,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
) -> ProductVariantResponse:
    """Update variant status or pack size with optimistic concurrency control."""
    expected_version: int | None = None
    if if_match is not None:
        try:
            expected_version = int(if_match.strip().strip('"'))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid If-Match header value.") from None
    elif data.version is not None:
        expected_version = data.version
    else:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Update requires expected version in body or If-Match header.",
        )

    try:
        variant = await CatalogService.update_variant(
            db, variant_id, data, expected_version=expected_version
        )
        return ProductVariantResponse(
            id=variant.id,
            product_id=variant.product_id,
            sku=variant.sku,
            fit_mode=variant.fit_mode,
            frame_thickness_mm=variant.frame_thickness_mm,
            min_thickness_mm=variant.min_thickness_mm,
            max_thickness_mm=variant.max_thickness_mm,
            display_label=variant.display_label,
            frame_thickness=variant.frame_thickness,
            pack_size=variant.pack_size,
            is_active=variant.is_active,
            is_archived=variant.is_archived,
            version=variant.version,
            available_stock=0,
            created_at=variant.created_at,
        )
    except OptimisticLockException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except VariantNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.delete("/variants/{variant_id}", response_model=ProductVariantResponse)
async def archive_variant(
    variant_id: uuid.UUID,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.CATALOG_MANAGER])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductVariantResponse:
    """Soft-archive a dynamic variant."""
    try:
        variant = await CatalogService.archive_variant(db, variant_id)
        return ProductVariantResponse(
            id=variant.id,
            product_id=variant.product_id,
            sku=variant.sku,
            fit_mode=variant.fit_mode,
            frame_thickness_mm=variant.frame_thickness_mm,
            min_thickness_mm=variant.min_thickness_mm,
            max_thickness_mm=variant.max_thickness_mm,
            display_label=variant.display_label,
            frame_thickness=variant.frame_thickness,
            pack_size=variant.pack_size,
            is_active=variant.is_active,
            is_archived=variant.is_archived,
            available_stock=0,
            created_at=variant.created_at,
        )
    except VariantNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None


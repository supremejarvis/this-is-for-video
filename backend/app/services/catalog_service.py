"""Authoritative Catalog Service for Products & Structured Dynamic Variants."""
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.product import FitMode, Product, ProductVariant
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)
from app.services.outbox import OutboxService


def utcnow() -> datetime:
    return datetime.now(UTC)


class DuplicateSkuException(Exception):
    """Raised when SKU or SKU prefix already exists."""
    pass


class ProductNotFoundException(Exception):
    """Raised when product is not found."""
    pass


class VariantNotFoundException(Exception):
    """Raised when variant is not found."""
    pass


class OptimisticLockException(Exception):
    """Raised when an update conflicts with the current entity version."""
    pass


class CatalogService:
    """Business logic for Products, structured Solar Panel Clamp Variants, and outbox event streaming."""

    @classmethod
    async def create_product(
        cls,
        db: AsyncSession,
        data: ProductCreate,
        creator_user_id: uuid.UUID | None = None,
    ) -> Product:
        """Create product with structured variants and transactional outbox event."""
        # 1. Check SKU prefix uniqueness
        prefix_stmt = select(Product).where(Product.sku_prefix == data.sku_prefix.strip().upper())
        existing = (await db.execute(prefix_stmt)).scalar_one_or_none()
        if existing:
            raise DuplicateSkuException(f"Product SKU prefix '{data.sku_prefix}' already exists.")

        product = Product(
            id=uuid.uuid4(),
            sku_prefix=data.sku_prefix.strip().upper(),
            name=data.name.strip(),
            description=data.description,
            hsn_code=data.hsn_code.strip(),
            is_active=True,
            is_archived=False,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        db.add(product)
        await db.flush()

        # Emit transactional outbox event
        OutboxService.emit_event(
            session=db,
            event_type="catalog.product.changed",
            aggregate_type="product",
            aggregate_id=product.id,
            payload={
                "product_id": str(product.id),
                "sku_prefix": product.sku_prefix,
                "name": product.name,
                "is_active": product.is_active,
                "updated_at": product.updated_at.isoformat(),
            },
        )

        # 2. Process variants if provided
        for v_data in data.variants:
            await cls._add_variant_internal(db, product.id, v_data, creator_user_id)

        await db.commit()
        return await cls.get_product_required(db, product.id)

    @classmethod
    async def _add_variant_internal(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        v_data: ProductVariantCreate,
        creator_user_id: uuid.UUID | None = None,
    ) -> ProductVariant:
        sku = v_data.sku.strip().upper()
        # Check SKU uniqueness
        sku_stmt = select(ProductVariant).where(ProductVariant.sku == sku)
        if (await db.execute(sku_stmt)).scalar_one_or_none():
            raise DuplicateSkuException(f"Variant SKU '{sku}' already exists.")

        variant = ProductVariant(
            id=uuid.uuid4(),
            product_id=product_id,
            sku=sku,
            fit_mode=v_data.fit_mode,
            frame_thickness_mm=v_data.frame_thickness_mm,
            min_thickness_mm=v_data.min_thickness_mm,
            max_thickness_mm=v_data.max_thickness_mm,
            display_label=v_data.display_label,
            frame_thickness=v_data.frame_thickness or "30mm",
            pack_size=v_data.pack_size,
            is_active=True,
            is_archived=False,
            created_at=utcnow(),
        )
        db.add(variant)
        await db.flush()

        # Emit outbox event for variant change
        fit_mode_str = variant.fit_mode.value if hasattr(variant.fit_mode, "value") else str(variant.fit_mode)
        OutboxService.emit_event(
            session=db,
            event_type="catalog.variant.changed",
            aggregate_type="variant",
            aggregate_id=variant.id,
            payload={
                "variant_id": str(variant.id),
                "product_id": str(product_id),
                "sku": variant.sku,
                "fit_mode": fit_mode_str,
                "display_label": variant.display_label,
            },
        )

        # Create corresponding InventoryItem
        inv_item = InventoryItem(
            id=uuid.uuid4(),
            variant_id=variant.id,
            sku=sku,
            quantity_on_hand=v_data.initial_stock,
            quantity_reserved=0,
            updated_at=utcnow(),
        )
        db.add(inv_item)
        await db.flush()

        # If initial stock > 0, record in immutable append-only ledger with unique idempotency key
        if v_data.initial_stock > 0:
            movement = InventoryMovement(
                id=uuid.uuid4(),
                inventory_item_id=inv_item.id,
                variant_id=variant.id,
                movement_type=MovementType.RECEIPT,
                idempotency_key=f"INIT-{variant.sku}-{uuid.uuid4().hex[:12]}",
                quantity_delta_on_hand=v_data.initial_stock,
                quantity_delta_reserved=0,
                resulting_quantity_on_hand=v_data.initial_stock,
                resulting_quantity_reserved=0,
                source_reference_type="INITIAL_SEED",
                source_reference_id=f"INIT-{variant.sku}",
                actor_id=creator_user_id,
                quantity_delta=v_data.initial_stock,
                quantity_on_hand_after=v_data.initial_stock,
                quantity_reserved_after=0,
                reference_id=f"INIT-{variant.sku}",
                created_by_user_id=creator_user_id,
                reason="Initial inventory upon variant creation",
                created_at=utcnow(),
            )
            db.add(movement)

            # Emit inventory balance outbox event
            OutboxService.emit_event(
                session=db,
                event_type="inventory.balance.changed",
                aggregate_type="inventory",
                aggregate_id=inv_item.id,
                payload={
                    "inventory_item_id": str(inv_item.id),
                    "variant_id": str(variant.id),
                    "sku": variant.sku,
                    "on_hand": inv_item.quantity_on_hand,
                    "reserved": inv_item.quantity_reserved,
                },
            )

        return variant

    @classmethod
    async def create_variant(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        data: ProductVariantCreate,
        creator_user_id: uuid.UUID | None = None,
    ) -> ProductVariant:
        """Create a new dynamic variant for an existing product."""
        product = await cls.get_product_required(db, product_id)
        if product.is_archived:
            raise ValueError("Cannot add variant to an archived product.")

        variant = await cls._add_variant_internal(db, product_id, data, creator_user_id)
        await db.commit()
        await db.refresh(variant)
        return variant

    @classmethod
    async def seed_standard_variants(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        creator_user_id: uuid.UUID | None = None,
    ) -> list[ProductVariant]:
        """Seed standard solar panel clamp sizes (28, 30, 33, 35, 40 mm) as structured database rows."""
        product = await cls.get_product_required(db, product_id)
        specs = [
            (Decimal("28.00"), "28 mm Standard Clamp", 100),
            (Decimal("30.00"), "30 mm Standard Clamp", 100),
            (Decimal("33.00"), "33 mm Standard Clamp", 100),
            (Decimal("35.00"), "35 mm Standard Clamp", 100),
            (Decimal("40.00"), "40 mm Standard Clamp", 100),
        ]
        created = []
        for mm, label, stock in specs:
            sku = f"{product.sku_prefix}-{mm:g}MM"
            v_data = ProductVariantCreate(
                sku=sku,
                fit_mode=FitMode.EXACT,
                frame_thickness_mm=mm,
                display_label=label,
                pack_size=1,
                initial_stock=stock,
            )
            v = await cls._add_variant_internal(db, product_id, v_data, creator_user_id)
            created.append(v)
        await db.commit()
        return created

    @classmethod
    async def get_product(
        cls, db: AsyncSession, product_id: uuid.UUID, include_archived: bool = False
    ) -> Product | None:
        """Fetch product with active/archived variants and inventory relations."""
        stmt = (
            select(Product)
            .options(
                selectinload(Product.variants).selectinload(ProductVariant.inventory_item),
                selectinload(Product.variants).selectinload(ProductVariant.price_versions),
                selectinload(Product.price_versions),
            )
            .where(Product.id == product_id)
        )
        if not include_archived:
            stmt = stmt.where(Product.is_archived.is_(False))

        return (await db.execute(stmt)).scalar_one_or_none()

    @classmethod
    async def get_product_required(
        cls, db: AsyncSession, product_id: uuid.UUID, include_archived: bool = False
    ) -> Product:
        product = await cls.get_product(db, product_id, include_archived=include_archived)
        if not product:
            raise ProductNotFoundException(f"Product with ID '{product_id}' not found.")
        return product

    @classmethod
    async def list_products(
        cls, db: AsyncSession, include_archived: bool = False, limit: int = 100, offset: int = 0
    ) -> Sequence[Product]:
        """List products with pagination."""
        stmt = (
            select(Product)
            .options(
                selectinload(Product.variants).selectinload(ProductVariant.inventory_item),
                selectinload(Product.variants).selectinload(ProductVariant.price_versions),
                selectinload(Product.price_versions),
            )
            .order_by(Product.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if not include_archived:
            stmt = stmt.where(Product.is_archived.is_(False))

        return (await db.execute(stmt)).scalars().all()

    @classmethod
    async def update_product(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        data: ProductUpdate,
        expected_version: int | None = None,
    ) -> Product:
        """Update product details with optimistic concurrency control."""
        product = await cls.get_product_required(db, product_id)
        if product.is_archived:
            raise ValueError("Cannot update an archived product.")

        # Optimistic Concurrency Control check
        target_version = expected_version if expected_version is not None else data.version
        if target_version is not None and product.version != target_version:
            raise OptimisticLockException(
                f"Optimistic lock conflict: Stale product version {target_version}; current is {product.version}."
            )

        if data.name is not None:
            product.name = data.name.strip()
        if data.description is not None:
            product.description = data.description
        if data.hsn_code is not None:
            product.hsn_code = data.hsn_code.strip()
        if data.is_active is not None:
            product.is_active = data.is_active

        # Increment version upon mutation
        product.version += 1
        product.updated_at = utcnow()

        # Emit outbox event with version
        OutboxService.emit_event(
            session=db,
            event_type="catalog.product.changed",
            aggregate_type="product",
            aggregate_id=product.id,
            payload={
                "product_id": str(product.id),
                "sku_prefix": product.sku_prefix,
                "name": product.name,
                "is_active": product.is_active,
                "version": product.version,
                "updated_at": product.updated_at.isoformat(),
            },
        )

        await db.commit()
        return await cls.get_product_required(db, product_id)

    @classmethod
    async def archive_product(cls, db: AsyncSession, product_id: uuid.UUID) -> Product:
        """Soft-archive product and all its variants (no hard delete)."""
        product = await cls.get_product_required(db, product_id, include_archived=True)
        product.is_archived = True
        product.is_active = False
        product.version += 1
        product.updated_at = utcnow()

        # Archive all associated variants
        for variant in product.variants:
            variant.is_archived = True
            variant.is_active = False
            variant.version += 1

        # Emit outbox event for archive
        OutboxService.emit_event(
            session=db,
            event_type="catalog.product.archived",
            aggregate_type="product",
            aggregate_id=product.id,
            payload={
                "product_id": str(product.id),
                "is_archived": True,
                "version": product.version,
                "updated_at": product.updated_at.isoformat(),
            },
        )

        await db.commit()
        return await cls.get_product_required(db, product_id, include_archived=True)

    @classmethod
    async def update_variant(
        cls,
        db: AsyncSession,
        variant_id: uuid.UUID,
        data: ProductVariantUpdate,
        expected_version: int | None = None,
    ) -> ProductVariant:
        """Update variant pack size, active status, or display label with optimistic concurrency control."""
        stmt = select(ProductVariant).where(ProductVariant.id == variant_id)
        variant = (await db.execute(stmt)).scalar_one_or_none()
        if not variant:
            raise VariantNotFoundException(f"Variant with ID '{variant_id}' not found.")
        if variant.is_archived:
            raise ValueError("Cannot update an archived variant.")

        # Optimistic Concurrency Control check
        target_version = expected_version if expected_version is not None else data.version
        if target_version is not None and variant.version != target_version:
            raise OptimisticLockException(
                f"Optimistic lock conflict: Stale variant version {target_version}; current is {variant.version}."
            )

        if data.pack_size is not None:
            variant.pack_size = data.pack_size
        if data.is_active is not None:
            variant.is_active = data.is_active
        if data.display_label is not None:
            variant.display_label = data.display_label

        variant.version += 1

        fit_mode_str = variant.fit_mode.value if hasattr(variant.fit_mode, "value") else str(variant.fit_mode)
        OutboxService.emit_event(
            session=db,
            event_type="catalog.variant.changed",
            aggregate_type="variant",
            aggregate_id=variant.id,
            payload={
                "variant_id": str(variant.id),
                "product_id": str(variant.product_id),
                "sku": variant.sku,
                "fit_mode": fit_mode_str,
                "display_label": variant.display_label,
                "version": variant.version,
            },
        )

        await db.commit()
        await db.refresh(variant)
        return variant

    @classmethod
    async def archive_variant(cls, db: AsyncSession, variant_id: uuid.UUID) -> ProductVariant:
        """Soft-archive variant."""
        stmt = select(ProductVariant).where(ProductVariant.id == variant_id)
        variant = (await db.execute(stmt)).scalar_one_or_none()
        if not variant:
            raise VariantNotFoundException(f"Variant with ID '{variant_id}' not found.")

        variant.is_archived = True
        variant.is_active = False

        fit_mode_str = variant.fit_mode.value if hasattr(variant.fit_mode, "value") else str(variant.fit_mode)
        OutboxService.emit_event(
            session=db,
            event_type="catalog.variant.changed",
            aggregate_type="variant",
            aggregate_id=variant.id,
            payload={
                "variant_id": str(variant.id),
                "product_id": str(variant.product_id),
                "is_archived": True,
                "fit_mode": fit_mode_str,
            },
        )

        await db.commit()
        await db.refresh(variant)
        return variant

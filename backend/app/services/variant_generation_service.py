"""Variant Cartesian combination generator and canonical key service."""
import itertools
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog_advanced import Attribute, AttributeValue, ProductOptionValue, VariantOption
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.price import PriceVersion, TaxMode
from app.models.product import FitMode, Product, ProductVariant
from app.schemas.catalog_advanced import (
    VariantBatchGenerateItem,
    VariantBatchGenerateRequest,
    VariantBatchGenerateResponse,
    VariantCombinationPreviewItem,
    VariantCombinationPreviewRequest,
    VariantCombinationPreviewResponse,
)
from app.services.outbox import OutboxService


def compute_canonical_combination_key(option_pairs: list[tuple[uuid.UUID, uuid.UUID]]) -> str:
    """Compute deterministic canonical combination key from (attribute_id, value_id) pairs.
    
    Sorting by attribute_id ensures axis order changes never alter identity.
    """
    sorted_pairs = sorted([(str(a), str(v)) for a, v in option_pairs], key=lambda x: (x[0], x[1]))
    return "|".join(f"{a}:{v}" for a, v in sorted_pairs)


class VariantGenerationService:
    """Service for Cartesian combination previews and atomic variant generation."""

    @classmethod
    async def preview_combinations(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        request: VariantCombinationPreviewRequest,
    ) -> VariantCombinationPreviewResponse:
        # Load product
        p_stmt = select(Product).where(Product.id == product_id)
        product = (await db.execute(p_stmt)).scalar_one_or_none()
        if not product:
            raise ValueError(f"Product '{product_id}' not found.")

        # Load attributes and values for the requested axes
        axis_values_map: list[list[tuple[uuid.UUID, uuid.UUID, str, str, str]]] = []
        for axis_sel in request.axes:
            attr_stmt = select(Attribute).where(Attribute.id == axis_sel.attribute_id)
            attr = (await db.execute(attr_stmt)).scalar_one_or_none()
            if not attr:
                raise ValueError(f"Attribute '{axis_sel.attribute_id}' not found.")

            val_stmt = select(AttributeValue).where(
                AttributeValue.id.in_(axis_sel.value_ids),
                AttributeValue.attribute_id == attr.id,
            ).order_by(AttributeValue.sort_order.asc())
            vals = (await db.execute(val_stmt)).scalars().all()
            if not vals:
                raise ValueError(f"No valid attribute values found for attribute '{attr.label}'.")

            axis_values_map.append([
                (attr.id, v.id, attr.code, attr.label, v.label) for v in vals
            ])

        # Generate Cartesian product
        cartesian_tuples = list(itertools.product(*axis_values_map))
        if len(cartesian_tuples) > 100:
            raise ValueError(f"Cartesian generation limit exceeded: {len(cartesian_tuples)} combinations generated (maximum 100). Please narrow your selection.")

        # Fetch existing variants for this product
        existing_stmt = select(ProductVariant).where(ProductVariant.product_id == product_id)
        existing_variants = (await db.execute(existing_stmt)).scalars().all()
        existing_skus = {v.sku.upper() for v in existing_variants}

        # Check existing VariantOption combination keys
        existing_keys = set()
        for ev in existing_variants:
            vo_stmt = select(VariantOption).where(VariantOption.variant_id == ev.id)
            vos = (await db.execute(vo_stmt)).scalars().all()
            if vos:
                key = compute_canonical_combination_key([(vo.attribute_id, vo.value_id) for vo in vos])
                existing_keys.add(key)

        items: list[VariantCombinationPreviewItem] = []
        for combo in cartesian_tuples:
            pairs = [(item[0], item[1]) for item in combo]
            comb_key = compute_canonical_combination_key(pairs)

            labels = [item[4] for item in combo]
            slug_parts = [item[4].upper().replace(" ", "").replace("/", "-") for item in combo]
            suggested_sku = f"{product.sku_prefix}-{'-'.join(slug_parts)}"
            suggested_label = f"{product.name} ({', '.join(labels)})"

            already_exists = comb_key in existing_keys or suggested_sku in existing_skus

            options_meta = [
                {
                    "attribute_id": str(item[0]),
                    "value_id": str(item[1]),
                    "attribute_code": item[2],
                    "attribute_label": item[3],
                    "value_label": item[4],
                }
                for item in combo
            ]

            items.append(VariantCombinationPreviewItem(
                combination_key=comb_key,
                options=options_meta,
                suggested_sku=suggested_sku,
                suggested_label=suggested_label,
                already_exists=already_exists,
            ))

        new_count = sum(1 for i in items if not i.already_exists)
        existing_count = len(items) - new_count

        return VariantCombinationPreviewResponse(
            total_combinations=len(items),
            new_combinations_count=new_count,
            existing_combinations_count=existing_count,
            items=items,
        )

    @classmethod
    async def batch_generate_variants(
        cls,
        db: AsyncSession,
        product_id: uuid.UUID,
        request: VariantBatchGenerateRequest,
    ) -> VariantBatchGenerateResponse:
        p_stmt = select(Product).where(Product.id == product_id)
        product = (await db.execute(p_stmt)).scalar_one_or_none()
        if not product:
            raise ValueError(f"Product '{product_id}' not found.")

        created_variants: list[dict[str, Any]] = []
        skipped_count = 0

        for item in request.variants:
            clean_sku = item.sku.strip().upper()
            # Check if SKU already exists
            sku_stmt = select(ProductVariant).where(ProductVariant.sku == clean_sku)
            if (await db.execute(sku_stmt)).scalar_one_or_none():
                skipped_count += 1
                continue

            variant_id = uuid.uuid4()
            variant = ProductVariant(
                id=variant_id,
                product_id=product.id,
                sku=clean_sku,
                fit_mode=FitMode.EXACT,
                display_label=item.display_label,
                frame_thickness="30mm",
                pack_size=item.pack_size,
                is_active=True,
                is_archived=False,
                version=1,
            )
            db.add(variant)
            await db.flush()

            # Attach variant options
            for val_id in item.option_value_ids:
                val_stmt = select(AttributeValue).where(AttributeValue.id == val_id)
                val_obj = (await db.execute(val_stmt)).scalar_one_or_none()
                if val_obj:
                    vo = VariantOption(
                        id=uuid.uuid4(),
                        variant_id=variant.id,
                        attribute_id=val_obj.attribute_id,
                        value_id=val_obj.id,
                    )
                    db.add(vo)

            # Create Inventory item
            inv_item = InventoryItem(
                id=uuid.uuid4(),
                variant_id=variant.id,
                sku=clean_sku,
                quantity_on_hand=item.initial_stock,
                quantity_reserved=0,
            )
            db.add(inv_item)
            await db.flush()

            if item.initial_stock > 0:
                movement = InventoryMovement(
                    id=uuid.uuid4(),
                    inventory_item_id=inv_item.id,
                    variant_id=variant.id,
                    movement_type=MovementType.RECEIPT,
                    idempotency_key=f"BATCH-INIT-{clean_sku}-{uuid.uuid4().hex[:8]}",
                    quantity_delta_on_hand=item.initial_stock,
                    quantity_delta_reserved=0,
                    resulting_quantity_on_hand=item.initial_stock,
                    resulting_quantity_reserved=0,
                    source_reference_type="BATCH_GENERATION",
                    source_reference_id=f"GEN-{clean_sku}",
                )
                db.add(movement)

            # Create initial price version
            pv = PriceVersion(
                id=uuid.uuid4(),
                variant_id=variant.id,
                product_id=product.id,
                currency="INR",
                channel="B2C",
                min_quantity=1,
                unit_price=item.initial_b2c_price,
                gst_rate=Decimal("0.1800"),
                hsn_code=product.hsn_code or "73269099",
                tax_mode=TaxMode.GST_INCLUSIVE,
                reason="Batch Variant Generation Initial Price",
            )
            db.add(pv)

            # Outbox event
            OutboxService.emit_event(
                session=db,
                event_type="catalog.variant.created.v1",
                aggregate_type="variant",
                aggregate_id=variant.id,
                payload={
                    "variant_id": str(variant.id),
                    "product_id": str(product.id),
                    "sku": variant.sku,
                    "combination_key": item.combination_key,
                    "pack_size": variant.pack_size,
                    "initial_price": str(item.initial_b2c_price),
                },
            )

            created_variants.append({
                "id": str(variant.id),
                "sku": variant.sku,
                "display_label": variant.display_label,
            })

        await db.commit()
        return VariantBatchGenerateResponse(
            created_count=len(created_variants),
            created_variants=created_variants,
            skipped_count=skipped_count,
        )

"""Idempotent Catalog and Pricing Seeder for Apollo Engineering."""
import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.price import PriceVersion, TaxMode
from app.models.product import FitMode, Product, ProductVariant
from app.schemas.product import ProductCreate
from app.services.catalog_service import CatalogService


async def seed_catalog() -> None:
    async with AsyncSessionLocal() as session:
        # Check if APE-SC exists
        stmt = select(Product).where(Product.sku_prefix == "APE-SC")
        product = (await session.execute(stmt)).scalar_one_or_none()

        if product is None:
            print("Seeding APE-SC product with standard 28/30/33/35/40 mm variants...")
            product = await CatalogService.create_product(
                session,
                ProductCreate(
                    sku_prefix="APE-SC",
                    name="Apollo AISI SS304 Solar Panel Water Drain & Anti-Soiling Clamp",
                    description=(
                        "Heavy-duty AISI SS304 grade solar panel water draining and de-soiling clamp. "
                        "Engineered for Indian weather conditions with permanent siphon tension to prevent "
                        "mud-lip accumulation, hotspot degradation, and power loss."
                    ),
                    hsn_code="73269099",
                ),
            )
            # Seed the 5 standard sizes
            await CatalogService.seed_standard_variants(session, product.id)
            await session.commit()
            product = (await session.execute(stmt)).scalar_one()

        # Seed active pricing versions for all variants if missing
        stmt_variants = select(ProductVariant).where(ProductVariant.product_id == product.id)
        variants = (await session.execute(stmt_variants)).scalars().all()

        for variant in variants:
            pv_stmt = select(PriceVersion).where(
                PriceVersion.variant_id == variant.id,
                PriceVersion.channel == "B2C",
                PriceVersion.valid_to.is_(None),
            )
            existing_pv = (await session.execute(pv_stmt)).scalar_one_or_none()
            if not existing_pv:
                pv = PriceVersion(
                    id=uuid.uuid4(),
                    variant_id=variant.id,
                    product_id=product.id,
                    currency="INR",
                    channel="B2C",
                    min_quantity=1,
                    unit_price=Decimal("20.00"),
                    gst_rate=Decimal("0.1800"),
                    hsn_code=product.hsn_code,
                    tax_mode=TaxMode.GST_INCLUSIVE,
                    reason="Initial Catalog Seed Price",
                )
                session.add(pv)

            # Also seed B2B wholesale tier
            pv_b2b_stmt = select(PriceVersion).where(
                PriceVersion.variant_id == variant.id,
                PriceVersion.channel == "B2B",
                PriceVersion.valid_to.is_(None),
            )
            existing_b2b_pv = (await session.execute(pv_b2b_stmt)).scalar_one_or_none()
            if not existing_b2b_pv:
                pv_b2b = PriceVersion(
                    id=uuid.uuid4(),
                    variant_id=variant.id,
                    product_id=product.id,
                    currency="INR",
                    channel="B2B",
                    min_quantity=100,
                    unit_price=Decimal("16.00"),
                    gst_rate=Decimal("0.1800"),
                    hsn_code=product.hsn_code,
                    tax_mode=TaxMode.GST_EXCLUSIVE,
                    reason="Initial B2B Wholesale Seed Price",
                )
                session.add(pv_b2b)

        # Seed AE-SPRINKLER product and variants
        stmt_sprinkler = select(Product).where(Product.sku_prefix == "AE-SPRINKLER")
        sprinkler_prod = (await session.execute(stmt_sprinkler)).scalar_one_or_none()

        if sprinkler_prod is None:
            print("Seeding AE-SPRINKLER product with AE-SPRINKLER-SS304 variant...")
            sprinkler_prod = Product(
                id=uuid.uuid4(),
                sku_prefix="AE-SPRINKLER",
                name="SS304 Solar Panel Sprinkler (AetherWash Tech · SS304 Grade)",
                description=(
                    "Heavy-duty AISI SS304 solar panel sprinkler system with 180° uniform water curtain. "
                    "Engineered for rooftop solar panel automatic washing and anti-soiling."
                ),
                hsn_code="84248990",
                is_active=True,
                is_archived=False,
            )
            session.add(sprinkler_prod)
            await session.flush()

            sprinkler_variant = ProductVariant(
                id=uuid.uuid4(),
                product_id=sprinkler_prod.id,
                sku="AE-SPRINKLER-SS304",
                fit_mode=FitMode.NOT_APPLICABLE,
                frame_thickness="not_applicable",
                display_label='SS304 Solar Panel Sprinkler (180° Uniform Curtain / ½" BSP Male)',
                pack_size=1,
                is_active=True,
                is_archived=False,
            )
            session.add(sprinkler_variant)
            await session.flush()

            # Seed inventory
            from app.models.inventory import InventoryItem, InventoryMovement, MovementType
            inv_item = InventoryItem(
                id=uuid.uuid4(),
                variant_id=sprinkler_variant.id,
                sku="AE-SPRINKLER-SS304",
                quantity_on_hand=1500,
                quantity_reserved=0,
            )
            session.add(inv_item)
            await session.flush()

            inv_mov = InventoryMovement(
                id=uuid.uuid4(),
                inventory_item_id=inv_item.id,
                variant_id=sprinkler_variant.id,
                movement_type=MovementType.RECEIPT,
                idempotency_key=f"INIT-SPRINKLER-{uuid.uuid4().hex[:12]}",
                quantity_delta_on_hand=1500,
                quantity_delta_reserved=0,
                resulting_quantity_on_hand=1500,
                resulting_quantity_reserved=0,
                source_reference_type="INITIAL_SEED",
                source_reference_id="INIT-AE-SPRINKLER-SS304",
                reason="Initial inventory seed for flagship SS304 sprinkler",
            )
            session.add(inv_mov)

            # Seed B2C pricing
            pv_b2c = PriceVersion(
                id=uuid.uuid4(),
                variant_id=sprinkler_variant.id,
                product_id=sprinkler_prod.id,
                currency="INR",
                channel="B2C",
                min_quantity=1,
                unit_price=Decimal("220.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="84248990",
                tax_mode=TaxMode.GST_INCLUSIVE,
                reason="Initial Flagship Sprinkler B2C Price",
            )
            session.add(pv_b2c)

            # Seed B2B pricing
            pv_b2b = PriceVersion(
                id=uuid.uuid4(),
                variant_id=sprinkler_variant.id,
                product_id=sprinkler_prod.id,
                currency="INR",
                channel="B2B",
                min_quantity=50,
                unit_price=Decimal("185.00"),
                gst_rate=Decimal("0.1800"),
                hsn_code="84248990",
                tax_mode=TaxMode.GST_EXCLUSIVE,
                reason="Initial Flagship Sprinkler B2B Wholesale Price",
            )
            session.add(pv_b2b)
            await session.commit()
            print("AE-SPRINKLER seeded successfully.")
        else:
            # Ensure AE-SPRINKLER-SS304 variant exists and has pricing
            stmt_v = select(ProductVariant).where(ProductVariant.sku == "AE-SPRINKLER-SS304")
            v_obj = (await session.execute(stmt_v)).scalar_one_or_none()
            if not v_obj:
                v_obj = ProductVariant(
                    id=uuid.uuid4(),
                    product_id=sprinkler_prod.id,
                    sku="AE-SPRINKLER-SS304",
                    fit_mode=FitMode.NOT_APPLICABLE,
                    frame_thickness="not_applicable",
                    display_label='SS304 Solar Panel Sprinkler (180° Uniform Curtain / ½" BSP Male)',
                    pack_size=1,
                    is_active=True,
                    is_archived=False,
                )
                session.add(v_obj)
                await session.flush()

                from app.models.inventory import InventoryItem
                inv_item = InventoryItem(
                    id=uuid.uuid4(),
                    variant_id=v_obj.id,
                    sku="AE-SPRINKLER-SS304",
                    quantity_on_hand=1500,
                    quantity_reserved=0,
                )
                session.add(inv_item)

                pv_b2c = PriceVersion(
                    id=uuid.uuid4(),
                    variant_id=v_obj.id,
                    product_id=sprinkler_prod.id,
                    currency="INR",
                    channel="B2C",
                    min_quantity=1,
                    unit_price=Decimal("220.00"),
                    gst_rate=Decimal("0.1800"),
                    hsn_code="84248990",
                    tax_mode=TaxMode.GST_INCLUSIVE,
                    reason="Initial Flagship Sprinkler B2C Price",
                )
                session.add(pv_b2c)

                pv_b2b = PriceVersion(
                    id=uuid.uuid4(),
                    variant_id=v_obj.id,
                    product_id=sprinkler_prod.id,
                    currency="INR",
                    channel="B2B",
                    min_quantity=50,
                    unit_price=Decimal("185.00"),
                    gst_rate=Decimal("0.1800"),
                    hsn_code="84248990",
                    tax_mode=TaxMode.GST_EXCLUSIVE,
                    reason="Initial Flagship Sprinkler B2B Wholesale Price",
                )
                session.add(pv_b2b)
                await session.commit()

        await session.commit()
        print(f"Catalog seeding complete. Products ready in database.")


if __name__ == "__main__":
    asyncio.run(seed_catalog())

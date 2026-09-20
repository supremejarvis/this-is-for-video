"""Shipping Logistics, Rate Calculator, Carrier Adapters, Idempotent Booking, and Tracking."""
import hashlib
import uuid
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.order import FulfilmentStatus, Order, OrderItem, Shipment
from app.models.outbox import OutboxEvent
from app.models.shipping_advanced import Carrier, Package, ShipmentItem, ShippingRateCard, ShippingRateSlab, TrackingEvent
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.product import ProductVariant
from app.models.warehouse import StockItem, Warehouse
from app.schemas.shipping import (
    DispatchManifestItem,
    DispatchManifestResponse,
    PackageSpec,
    ShipmentBookingRequest,
    ShipmentBookingResponse,
    ShippingQuoteRequest,
    ShippingQuoteResponse,
)

ORIGIN_HUB_PINCODE = "382430"  # Kathwada GIDC, Ahmedabad
DEFAULT_PACKAGING_TARE_G = 200  # Standard shipping parcel packaging tare
VOLUMETRIC_DIVISOR = 5000  # cm^3 / 5000 -> kg standard for domestic couriers


def utcnow() -> datetime:
    return datetime.now(UTC)


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def determine_zone(destination_pincode: str) -> str:
    """Determine delivery zone based on origin 382430 (Ahmedabad, Gujarat)."""
    dest = destination_pincode.strip()
    if dest.startswith("380") or dest.startswith("382"):
        return "LOCAL"
    elif dest.startswith("38") or dest.startswith("39") or dest.startswith("36") or dest.startswith("37"):
        return "GUJARAT"
    return "REST_OF_INDIA"


def calculate_speed_post_fallback_base(chargeable_weight_g: int, zone: str) -> Decimal:
    """India Post Speed Post statutory fallback tariff table."""
    weight = max(1, chargeable_weight_g)
    if zone == "LOCAL":
        if weight <= 50:
            return Decimal("15.00")
        elif weight <= 200:
            return Decimal("25.00")
        elif weight <= 500:
            return Decimal("30.00")
        else:
            addl_slabs = (weight - 500 + 499) // 500
            return Decimal("30.00") + Decimal(addl_slabs) * Decimal("10.00")
    elif zone == "GUJARAT":
        if weight <= 50:
            return Decimal("25.00")
        elif weight <= 200:
            return Decimal("30.00")
        elif weight <= 500:
            return Decimal("40.00")
        else:
            addl_slabs = (weight - 500 + 499) // 500
            return Decimal("40.00") + Decimal(addl_slabs) * Decimal("15.00")
    else:  # REST_OF_INDIA
        if weight <= 50:
            return Decimal("35.00")
        elif weight <= 200:
            return Decimal("35.00")
        elif weight <= 500:
            return Decimal("50.00")
        else:
            addl_slabs = (weight - 500 + 499) // 500
            return Decimal("50.00") + Decimal(addl_slabs) * Decimal("35.00")


class ShippingService:
    @staticmethod
    def resolve_item_weight(sku: str) -> int:
        """Resolve weight in grams for a given SKU (defaulting to 15g for solar drain clips)."""
        sku_upper = (sku or "").upper()
        if "CLIP" in sku_upper:
            return 15
        elif "CLAMP" in sku_upper:
            return 150
        elif "WALKWAY" in sku_upper or "BRACKET" in sku_upper:
            return 250
        elif "COMBO" in sku_upper or "KIT" in sku_upper:
            return 350
        return 50

    @staticmethod
    def calculate_shipping(destination_pincode: str, total_weight_grams: int):
        """Calculate fallback Speed Post shipping without active DB session."""
        zone = determine_zone(destination_pincode)
        chargeable_weight_g = max(1, total_weight_grams + DEFAULT_PACKAGING_TARE_G)
        base_charge = calculate_speed_post_fallback_base(chargeable_weight_g, zone)
        shipping_gst = round_currency(base_charge * Decimal("0.18"))
        total_shipping = base_charge + shipping_gst

        class _FallbackQuote:
            pass

        q = _FallbackQuote()
        q.base_shipping = base_charge
        q.shipping_gst = shipping_gst
        q.total_shipping = total_shipping
        q.zone = zone
        return q

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_quote(self, req: ShippingQuoteRequest) -> ShippingQuoteResponse:
        """Calculate authoritative shipping quote with statutory 18% GST."""
        zone = determine_zone(req.destination_pincode)

        total_physical_g = sum(item.quantity * item.weight_g for item in req.items)
        packaging_tare_g = DEFAULT_PACKAGING_TARE_G
        chargeable_weight_g = total_physical_g + packaging_tare_g

        # Check for active rate cards in DB
        stmt = (
            select(ShippingRateSlab)
            .join(ShippingRateCard)
            .where(
                ShippingRateCard.status == "ACTIVE",
                ShippingRateSlab.zone == zone,
                ShippingRateSlab.min_weight_g <= chargeable_weight_g,
                ShippingRateSlab.max_weight_g >= chargeable_weight_g,
            )
            .order_by(ShippingRateSlab.base_charge.asc())
        )
        res = await self.db.execute(stmt)
        slab = res.scalars().first()

        if slab:
            base_charge = slab.base_charge
        else:
            base_charge = calculate_speed_post_fallback_base(chargeable_weight_g, zone)

        shipping_gst = round_currency(base_charge * Decimal("0.18"))
        cod_surcharge = Decimal("0.00")
        if req.is_cod:
            # 2.5% surcharge on total
            cod_surcharge = round_currency((base_charge + shipping_gst) * Decimal("0.025"))

        total_shipping = base_charge + shipping_gst + cod_surcharge

        return ShippingQuoteResponse(
            origin_pincode=req.origin_pincode,
            destination_pincode=req.destination_pincode,
            zone=zone,
            carrier_code=req.carrier_code,
            service_code="SPEED_POST",
            total_physical_weight_g=total_physical_g,
            packaging_tare_g=packaging_tare_g,
            chargeable_weight_g=chargeable_weight_g,
            base_shipping=base_charge,
            shipping_gst=shipping_gst,
            gst_rate=Decimal("0.18"),
            cod_surcharge=cod_surcharge,
            total_shipping=total_shipping,
            is_serviceable=True,
            estimated_delivery_days=2 if zone == "LOCAL" else (3 if zone == "GUJARAT" else 5),
        )

    async def book_shipment(self, req: ShipmentBookingRequest) -> ShipmentBookingResponse:
        """Idempotently book shipment, create packages, items, and AWB."""
        # 1. Idempotency Check: check if shipment already booked with this key or AWB
        awb_candidate = f"SP{req.idempotency_key[:8].upper()}IN"
        existing_stmt = select(Shipment).where(Shipment.awb_number == awb_candidate)
        res = await self.db.execute(existing_stmt)
        existing_shipment = res.scalars().first()

        if existing_shipment:
            # Calculate total weight
            pkg_stmt = select(func.sum(Package.chargeable_weight_g)).where(Package.shipment_id == existing_shipment.id)
            pkg_res = await self.db.execute(pkg_stmt)
            total_weight = pkg_res.scalar() or 0
            count_stmt = select(func.count(Package.id)).where(Package.shipment_id == existing_shipment.id)
            count_res = await self.db.execute(count_stmt)
            pkg_count = count_res.scalar() or 1

            return ShipmentBookingResponse(
                shipment_id=existing_shipment.id,
                order_id=existing_shipment.order_id,
                carrier=existing_shipment.carrier,
                awb_number=existing_shipment.awb_number or awb_candidate,
                status=existing_shipment.status.value,
                origin_pincode=existing_shipment.origin_pincode,
                destination_pincode=existing_shipment.destination_pincode,
                total_packages=pkg_count,
                total_chargeable_weight_g=total_weight,
                created_at=existing_shipment.created_at,
            )

        # 2. Verify Order Exists
        order = await self.db.get(Order, req.order_id)
        if not order:
            raise ValueError(f"Order {req.order_id} not found")

        # 3. Create Shipment
        shipment = Shipment(
            order_id=req.order_id,
            carrier=req.carrier,
            awb_number=awb_candidate,
            origin_pincode=req.origin_pincode,
            destination_pincode=req.destination_pincode,
            status=FulfilmentStatus.READY_TO_SHIP,
        )
        self.db.add(shipment)
        await self.db.flush()

        total_weight_g = 0
        for pkg_spec in req.packages:
            # Calculate volumetric weight: (L * W * H in mm) -> convert to cm^3 / 5000 -> kg -> g
            vol_cm3 = (pkg_spec.length_mm * pkg_spec.width_mm * pkg_spec.height_mm) / 1000.0
            vol_weight_g = int((vol_cm3 / VOLUMETRIC_DIVISOR) * 1000)
            chargeable_g = max(pkg_spec.actual_weight_g, vol_weight_g)
            total_weight_g += chargeable_g

            pkg = Package(
                shipment_id=shipment.id,
                package_number=pkg_spec.package_number,
                actual_weight_g=pkg_spec.actual_weight_g,
                length_mm=pkg_spec.length_mm,
                width_mm=pkg_spec.width_mm,
                height_mm=pkg_spec.height_mm,
                chargeable_weight_g=chargeable_g,
            )
            self.db.add(pkg)
            await self.db.flush()

            for item_spec in pkg_spec.items:
                ship_item = ShipmentItem(
                    shipment_id=shipment.id,
                    package_id=pkg.id,
                    order_item_id=item_spec.order_item_id,
                    quantity=item_spec.quantity,
                )
                self.db.add(ship_item)

        # Update order fulfillment status
        order.fulfilment_status = FulfilmentStatus.READY_TO_SHIP

        # Record Outbox Event
        outbox = OutboxEvent(
            event_type="shipment.booked.v1",
            aggregate_type="shipment",
            aggregate_id=shipment.id,
            payload={
                "shipment_id": str(shipment.id),
                "order_id": str(order.id),
                "awb_number": shipment.awb_number,
                "carrier": shipment.carrier,
                "total_chargeable_weight_g": total_weight_g,
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return ShipmentBookingResponse(
            shipment_id=shipment.id,
            order_id=order.id,
            carrier=shipment.carrier,
            awb_number=shipment.awb_number,
            status=shipment.status.value,
            origin_pincode=shipment.origin_pincode,
            destination_pincode=shipment.destination_pincode,
            total_packages=len(req.packages),
            total_chargeable_weight_g=total_weight_g,
            created_at=shipment.created_at,
        )

    async def dispatch_shipment(self, shipment_id: uuid.UUID, warehouse_id: uuid.UUID) -> dict[str, Any]:
        """Dispatch shipment: mark SHIPPED and record physical stock deduction movement."""
        stmt = (
            select(Shipment)
            .where(Shipment.id == shipment_id)
            .options(
                selectinload(Shipment.order).selectinload(Order.items),
            )
        )
        res = await self.db.execute(stmt)
        shipment = res.scalars().first()
        if not shipment:
            raise ValueError(f"Shipment {shipment_id} not found")

        if shipment.status == FulfilmentStatus.SHIPPED:
            return {"message": "Shipment already dispatched", "awb_number": shipment.awb_number}

        order = shipment.order
        # For each order item, decrement on_hand and reserved in target warehouse and global inventory
        for order_item in order.items:
            clean_sku = order_item.sku.strip().upper()
            var_stmt = select(ProductVariant).where(func.upper(ProductVariant.sku) == clean_sku)
            var_res = await self.db.execute(var_stmt)
            variant = var_res.scalars().first()

            if variant:
                # 1. Update multi-warehouse StockItem
                stock_stmt = (
                    select(StockItem)
                    .where(
                        StockItem.warehouse_id == warehouse_id,
                        StockItem.variant_id == variant.id,
                    )
                    .with_for_update()
                )
                stock_res = await self.db.execute(stock_stmt)
                stock_item = stock_res.scalars().first()
                if stock_item:
                    stock_item.on_hand = max(0, stock_item.on_hand - order_item.quantity)
                    stock_item.reserved = max(0, stock_item.reserved - order_item.quantity)

                # 2. Update global InventoryItem
                inv_stmt = select(InventoryItem).where(InventoryItem.variant_id == variant.id).with_for_update()
                inv_res = await self.db.execute(inv_stmt)
                inv_item = inv_res.scalars().first()
                if inv_item:
                    inv_item.quantity_on_hand = max(0, inv_item.quantity_on_hand - order_item.quantity)
                    inv_item.quantity_reserved = max(0, inv_item.quantity_reserved - order_item.quantity)

        shipment.status = FulfilmentStatus.SHIPPED
        order.fulfilment_status = FulfilmentStatus.SHIPPED

        outbox = OutboxEvent(
            company_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            event_type="shipment.dispatched.v1",
            aggregate_type="shipment",
            aggregate_id=shipment.id,
            payload={
                "shipment_id": str(shipment.id),
                "order_id": str(order.id),
                "awb_number": shipment.awb_number,
                "dispatched_at": utcnow().isoformat(),
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return {
            "shipment_id": str(shipment.id),
            "status": shipment.status.value,
            "awb_number": shipment.awb_number,
            "message": "Shipment dispatched and warehouse inventory consumed successfully",
        }

    async def ingest_tracking_event(
        self, shipment_id: uuid.UUID, provider_event_id: str, status: str, location: str | None, description: str | None, occurred_at: datetime
    ) -> TrackingEvent:
        """Deduplicated tracking event ingestion with forward-only terminal state progression."""
        shipment = await self.db.get(Shipment, shipment_id)
        if not shipment:
            raise ValueError(f"Shipment {shipment_id} not found")

        payload_hash = hashlib.sha256(f"{shipment_id}:{provider_event_id}:{status}".encode()).hexdigest()

        # Check duplicate
        dup_stmt = select(TrackingEvent).where(TrackingEvent.payload_hash == payload_hash)
        dup_res = await self.db.execute(dup_stmt)
        existing = dup_res.scalars().first()
        if existing:
            return existing

        event = TrackingEvent(
            shipment_id=shipment_id,
            provider_event_id=provider_event_id,
            status=status,
            location=location,
            description=description,
            provider_occurred_at=occurred_at,
            payload_hash=payload_hash,
        )
        self.db.add(event)

        # Update shipment status only if not already terminal (DELIVERED or RTO)
        if shipment.status not in (FulfilmentStatus.DELIVERED, FulfilmentStatus.RTO):
            status_upper = status.upper()
            if "DELIVER" in status_upper:
                shipment.status = FulfilmentStatus.DELIVERED
                if shipment.order_id:
                    ord_obj = await self.db.get(Order, shipment.order_id)
                    if ord_obj:
                        ord_obj.fulfilment_status = FulfilmentStatus.DELIVERED
            elif "OUT_FOR_DELIVERY" in status_upper:
                shipment.status = FulfilmentStatus.OUT_FOR_DELIVERY
            elif "RTO" in status_upper or "RETURN" in status_upper:
                shipment.status = FulfilmentStatus.RTO

        await self.db.commit()
        return event

    async def generate_dispatch_manifest(self, carrier: str = "INDIA_POST") -> DispatchManifestResponse:
        """Generate official carrier pickup manifest for all READY_TO_SHIP shipments."""
        stmt = (
            select(Shipment)
            .where(Shipment.carrier == carrier, Shipment.status == FulfilmentStatus.READY_TO_SHIP)
            .options(selectinload(Shipment.order))
        )
        res = await self.db.execute(stmt)
        shipments = res.scalars().all()

        manifest_items: list[DispatchManifestItem] = []
        total_weight_g = 0

        for s in shipments:
            pkg_stmt = select(func.sum(Package.chargeable_weight_g)).where(Package.shipment_id == s.id)
            pkg_res = await self.db.execute(pkg_stmt)
            weight = pkg_res.scalar() or 500
            total_weight_g += weight

            order_num = s.order.order_number if s.order else "UNKNOWN"
            customer_name = s.order.customer_name if s.order else None

            manifest_items.append(
                DispatchManifestItem(
                    shipment_id=s.id,
                    order_id=s.order_id,
                    order_number=order_num,
                    awb_number=s.awb_number or "PENDING",
                    destination_pincode=s.destination_pincode,
                    customer_name=customer_name,
                    weight_g=weight,
                )
            )

        manifest_id = f"MNF-{datetime.now(UTC).strftime('%Y%m%d')}-{len(manifest_items):03d}"
        total_kg = Decimal(total_weight_g) / Decimal("1000.0")

        return DispatchManifestResponse(
            manifest_id=manifest_id,
            carrier=carrier,
            origin_hub_pincode=ORIGIN_HUB_PINCODE,
            generated_at=utcnow(),
            total_shipments=len(manifest_items),
            total_weight_kg=round_currency(total_kg),
            shipments=manifest_items,
        )

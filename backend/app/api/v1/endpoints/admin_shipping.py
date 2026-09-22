"""Admin Shipping and Logistics Endpoints."""
from collections.abc import Sequence
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.order import FulfilmentStatus, Shipment
from app.models.shipping_advanced import ShippingRateCard
from app.schemas.shipping import (
    DispatchManifestResponse,
    PackageOut,
    ShipmentBookingRequest,
    ShipmentBookingResponse,
    ShipmentDetailOut,
    ShipmentItemOut,
    ShippingQuoteRequest,
    ShippingQuoteResponse,
    ShippingRateCardOut,
    TrackingEventCreate,
    TrackingEventOut,
)
from app.services.shipping_service import ShippingService

router = APIRouter(prefix="/admin/shipping", tags=["Admin Shipping"])
public_router = APIRouter(prefix="/shipping", tags=["Shipping"])


@public_router.get(
    "/pincode/{pincode}",
    summary="Lookup Indian PIN Code City, District, State and Delivery Zone",
    description="Resolves 6-digit Indian PIN code to city, district, state, GST code and Speed Post delivery metrics.",
)
@router.get(
    "/pincode/{pincode}",
    include_in_schema=False,
)
async def lookup_pincode_info(pincode: str) -> dict[str, Any]:
    """Resolve Indian PIN code for storefront checkout autofill and zone verification."""
    try:
        return await ShippingService.lookup_pincode(pincode)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/rates", response_model=list[ShippingRateCardOut])
async def list_shipping_rates(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[ShippingRateCard]:
    """List shipping rate cards and zone slabs."""
    stmt = (
        select(ShippingRateCard)
        .options(selectinload(ShippingRateCard.slabs))
        .order_by(ShippingRateCard.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/quotes", response_model=ShippingQuoteResponse)
async def calculate_shipping_quote(
    req: ShippingQuoteRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.INVENTORY_MANAGER))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShippingQuoteResponse:
    """Calculate authoritative shipping quote from Kathwada GIDC hub."""
    service = ShippingService(db)
    return await service.calculate_quote(req)


@router.get("/shipments", response_model=list[ShipmentDetailOut])
async def list_shipments(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
) -> list[ShipmentDetailOut]:
    """List shipments with packages and tracking history."""
    stmt = (
        select(Shipment)
        .options(
            selectinload(Shipment.packages).selectinload(PackageOut.items if hasattr(PackageOut, 'items') else None),
            selectinload(Shipment.tracking_events),
        )
        .order_by(Shipment.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(Shipment.status == status_filter)

    res = await db.execute(stmt)
    shipments = res.scalars().all()

    out: list[ShipmentDetailOut] = []
    for s in shipments:
        pkgs: list[PackageOut] = []
        for p in s.packages:
            items_out = [
                ShipmentItemOut(
                    id=it.id,
                    shipment_id=it.shipment_id,
                    package_id=it.package_id,
                    order_item_id=it.order_item_id,
                    quantity=it.quantity,
                )
                for it in p.items
            ]
            pkgs.append(
                PackageOut(
                    id=p.id,
                    shipment_id=p.shipment_id,
                    package_number=p.package_number,
                    actual_weight_g=p.actual_weight_g,
                    length_mm=p.length_mm,
                    width_mm=p.width_mm,
                    height_mm=p.height_mm,
                    chargeable_weight_g=p.chargeable_weight_g,
                    items=items_out,
                )
            )

        events_out = [
            TrackingEventOut(
                id=ev.id,
                shipment_id=ev.shipment_id,
                provider_event_id=ev.provider_event_id,
                status=ev.status,
                location=ev.location,
                description=ev.description,
                provider_occurred_at=ev.provider_occurred_at,
                received_at=ev.received_at,
            )
            for ev in s.tracking_events
        ]

        out.append(
            ShipmentDetailOut(
                id=s.id,
                order_id=s.order_id,
                carrier=s.carrier,
                awb_number=s.awb_number,
                origin_pincode=s.origin_pincode,
                destination_pincode=s.destination_pincode,
                status=s.status.value,
                created_at=s.created_at,
                packages=pkgs,
                tracking_events=events_out,
            )
        )
    return out


@router.post("/shipments/book", response_model=ShipmentBookingResponse, status_code=status.HTTP_201_CREATED)
async def book_shipment(
    req: ShipmentBookingRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ShipmentBookingResponse:
    """Book shipment with carrier idempotently."""
    service = ShippingService(db)
    try:
        return await service.book_shipment(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/shipments/{id}/dispatch")
async def dispatch_shipment(
    id: uuid.UUID,
    warehouse_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.INVENTORY_MANAGER))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Dispatch shipment and consume allocated warehouse inventory."""
    service = ShippingService(db)
    try:
        return await service.dispatch_shipment(id, warehouse_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/shipments/{id}/events", response_model=TrackingEventOut)
async def record_tracking_event(
    id: uuid.UUID,
    req: TrackingEventCreate,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TrackingEventOut:
    """Ingest tracking update for a shipment."""
    service = ShippingService(db)
    try:
        ev = await service.ingest_tracking_event(
            shipment_id=id,
            provider_event_id=req.provider_event_id,
            status=req.status,
            location=req.location,
            description=req.description,
            occurred_at=req.provider_occurred_at,
        )

        from app.core.websocket import ws_manager
        try:
            await ws_manager.broadcast("tracking", {
                "type": "TRACKING_EVENT",
                "shipment_id": str(id),
                "status": req.status,
                "location": req.location,
                "description": req.description,
            })
            await ws_manager.broadcast(f"tracking:{id}", {
                "type": "TRACKING_EVENT",
                "shipment_id": str(id),
                "status": req.status,
                "location": req.location,
                "description": req.description,
            })
        except Exception:
            pass

        return TrackingEventOut.model_validate(ev)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/manifest", response_model=DispatchManifestResponse)
async def get_dispatch_manifest(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS))],
    db: Annotated[AsyncSession, Depends(get_db)],
    carrier: str = Query("INDIA_POST"),
) -> DispatchManifestResponse:
    """Generate carrier pickup manifest for READY_TO_SHIP orders."""
    service = ShippingService(db)
    return await service.generate_dispatch_manifest(carrier)

"""Pricing and Temporal Price Version Endpoints."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.price import PriceVersion, TaxMode
from app.schemas.pricing import (
    OrderCalculationRequest,
    OrderCalculationResult,
    PriceVersionCreate,
    PriceVersionResponse,
)
from app.services.pricing import PricingEngine
from app.services.pricing_service import PriceOverlapException, PricingService, utcnow

router = APIRouter(prefix="/pricing", tags=["pricing"])


def _to_price_version_response(pv: PriceVersion, is_active_now: bool) -> PriceVersionResponse:
    return PriceVersionResponse(
        id=pv.id,
        variant_id=pv.variant_id,
        product_id=pv.product_id,
        currency=pv.currency,
        channel=pv.channel,
        min_quantity=pv.min_quantity,
        unit_price=pv.unit_price,
        gst_rate=pv.gst_rate,
        hsn_code=pv.hsn_code,
        tax_mode=pv.tax_mode,
        valid_from=pv.valid_from,
        valid_to=pv.valid_to,
        reason=pv.reason,
        is_active_now=is_active_now,
    )


@router.post("/versions", response_model=PriceVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_price_version(
    data: PriceVersionCreate,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.FINANCE])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PriceVersionResponse:
    """Create an immutable temporal price version attached to a ProductVariant.

    Guarded by RBAC (OWNER or FINANCE only).
    """
    try:
        pv = await PricingService.create_price_version(db, data, created_by_user_id=current_user.id)
        now = utcnow()
        is_active = (pv.valid_from <= now) and (pv.valid_to is None or pv.valid_to > now)
        return _to_price_version_response(pv, is_active_now=is_active)
    except PriceOverlapException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.get("/versions", response_model=list[PriceVersionResponse])
async def list_price_versions(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.FINANCE, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    variant_id: Annotated[uuid.UUID | None, Query()] = None,
    product_id: Annotated[uuid.UUID | None, Query()] = None,
    channel: Annotated[str | None, Query()] = None,
    tax_mode: Annotated[TaxMode | None, Query()] = None,
) -> list[PriceVersionResponse]:
    """List historical and active price versions for a variant or product."""
    versions = await PricingService.list_price_versions(
        db, variant_id=variant_id, product_id=product_id, channel=channel, tax_mode=tax_mode
    )
    now = utcnow()
    return [
        _to_price_version_response(
            pv, is_active_now=((pv.valid_from <= now) and (pv.valid_to is None or pv.valid_to > now))
        )
        for pv in versions
    ]


@router.get("/active", response_model=PriceVersionResponse)
async def get_active_price(
    variant_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    channel: Annotated[str, Query()] = "B2C",
    quantity: Annotated[int, Query(ge=1)] = 1,
    tax_mode: Annotated[TaxMode, Query()] = TaxMode.GST_INCLUSIVE,
) -> PriceVersionResponse:
    """Retrieve the current active price version for a variant, channel, and quantity tier."""
    pv = await PricingService.get_active_price(
        db, variant_id=variant_id, channel=channel, quantity=quantity, tax_mode=tax_mode
    )
    if not pv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active price version found for variant '{variant_id}' under {channel}/{tax_mode} (MOQ <= {quantity}).",
        )
    return _to_price_version_response(pv, is_active_now=True)


@router.post("/calculate", response_model=OrderCalculationResult)
async def calculate_order(request: OrderCalculationRequest) -> OrderCalculationResult:
    """Authoritative stateless order calculation engine (100% Decimal, statutory GST & COD)."""
    return PricingEngine.calculate_order(request)



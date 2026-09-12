"""Quote API Endpoints with Database Pricing and Strict Invariant Enforcement."""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.quote import CreateQuoteRequest, QuoteResponse
from app.services.quote_service import (
    ClientPriceRejectedError,
    InvalidSkuError,
    QuoteService,
    ShippingRateUnavailableError,
)

router = APIRouter()


@router.post(
    "",
    response_model=QuoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Authoritative Expiring Quote",
    description="Loads catalog pricing from PostgreSQL, performs exact statutory calculations, and persists an immutable snapshot.",
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Client-supplied unit price is rejected"},
        status.HTTP_404_NOT_FOUND: {"description": "SKU not found or inactive in catalog"},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"description": "Live Speed Post rate unavailable in production"},
    },
)
async def create_quote(
    request: CreateQuoteRequest,
    session: AsyncSession = Depends(get_db),  # noqa: B008
    x_idempotency_key: str | None = Header(default=None, alias="X-Idempotency-Key"),
) -> QuoteResponse:
    # Use header idempotency key if body one is missing
    if not request.idempotency_key and x_idempotency_key:
        request.idempotency_key = x_idempotency_key

    try:
        quote_response = await QuoteService.create_quote(
            session=session,
            request=request,
        )
        return quote_response
    except ClientPriceRejectedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except InvalidSkuError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ShippingRateUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        ) from e

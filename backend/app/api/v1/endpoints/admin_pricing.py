"""Admin Enterprise Pricing Endpoints: Customer Groups, Price Lists, Quantity Slabs, Tax Profiles, and Quote Preview."""
import uuid
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_session_and_user
from app.core.config import settings
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.pricing_advanced import (
    CustomerGroup,
    PriceList,
    PriceListStatus,
    PriceRule,
    TaxProfile,
    TaxRule,
)
from app.schemas.pricing_advanced import (
    CustomerGroupCreate,
    CustomerGroupResponse,
    PriceListCreate,
    PriceListResponse,
    PriceListUpdate,
    PriceRuleCreate,
    PriceRuleResponse,
    PricingPreviewRequest,
    PricingPreviewResponse,
    TaxProfileCreate,
    TaxProfileResponse,
    TaxRuleCreate,
    TaxRuleResponse,
)
from app.services.advanced_pricing_service import (
    AdvancedPricingService,
    PriceRuleOverlapException,
)

router = APIRouter(prefix="/admin", tags=["Admin Pricing"])

DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_admin_user_or_dev(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        session_user = await get_current_session_and_user(request, db)
        user = session_user[1]
        if user.role in [UserRole.OWNER, UserRole.FINANCE, UserRole.CATALOG_MANAGER]:
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
# 1. CUSTOMER GROUPS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/customer-groups", response_model=list[CustomerGroupResponse])
async def list_customer_groups(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(CustomerGroup).where(CustomerGroup.company_id == DEFAULT_COMPANY_ID).order_by(CustomerGroup.code.asc())
    return (await db.execute(stmt)).scalars().all()


@router.post("/customer-groups", response_model=CustomerGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_group(
    data: CustomerGroupCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(CustomerGroup).where(
        CustomerGroup.company_id == DEFAULT_COMPANY_ID,
        CustomerGroup.code == data.code,
    )
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Customer group '{data.code}' already exists.")

    cg = CustomerGroup(
        id=uuid.uuid4(),
        company_id=DEFAULT_COMPANY_ID,
        code=data.code,
        name=data.name.strip(),
        description=data.description,
    )
    db.add(cg)
    await db.commit()
    await db.refresh(cg)
    return cg


# ─────────────────────────────────────────────────────────────────────────────
# 2. PRICE LISTS & PRICE RULES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/price-lists", response_model=list[PriceListResponse])
async def list_price_lists(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(PriceList).where(PriceList.company_id == DEFAULT_COMPANY_ID).options(
        selectinload(PriceList.rules)
    ).order_by(PriceList.priority.desc())
    return (await db.execute(stmt)).scalars().all()


@router.post("/price-lists", response_model=PriceListResponse, status_code=status.HTTP_201_CREATED)
async def create_price_list(
    data: PriceListCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(PriceList).where(PriceList.company_id == DEFAULT_COMPANY_ID, PriceList.name == data.name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Price list '{data.name}' already exists.")

    return await AdvancedPricingService.create_price_list(db, DEFAULT_COMPANY_ID, data)


@router.post("/price-rules", response_model=PriceRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_price_rule(
    price_list_id: uuid.UUID,
    data: PriceRuleCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    plist = await db.get(PriceList, price_list_id)
    if not plist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price list not found.")

    try:
        return await AdvancedPricingService.add_price_rule(db, price_list_id, data)
    except PriceRuleOverlapException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from None


# ─────────────────────────────────────────────────────────────────────────────
# 3. TAX PROFILES & TAX RULES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/tax-profiles", response_model=list[TaxProfileResponse])
async def list_tax_profiles(
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(TaxProfile).where(TaxProfile.company_id == DEFAULT_COMPANY_ID).options(
        selectinload(TaxProfile.rules)
    ).order_by(TaxProfile.name.asc())
    return (await db.execute(stmt)).scalars().all()


@router.post("/tax-profiles", response_model=TaxProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_profile(
    data: TaxProfileCreate,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    stmt = select(TaxProfile).where(TaxProfile.company_id == DEFAULT_COMPANY_ID, TaxProfile.name == data.name.strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Tax profile '{data.name}' already exists.")

    tp = TaxProfile(
        id=uuid.uuid4(),
        company_id=DEFAULT_COMPANY_ID,
        name=data.name.strip(),
        hsn_code=data.hsn_code.strip(),
        status=data.status,
    )
    db.add(tp)
    await db.flush()

    for r_data in data.rules:
        tr = TaxRule(
            id=uuid.uuid4(),
            tax_profile_id=tp.id,
            jurisdiction=r_data.jurisdiction,
            component=r_data.component,
            rate=r_data.rate,
            effective_from=r_data.effective_from,
            effective_to=r_data.effective_to,
        )
        db.add(tr)

    await db.commit()
    await db.refresh(tp)
    return tp


# ─────────────────────────────────────────────────────────────────────────────
# 4. AUTHORITATIVE PRICING PREVIEW
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/pricing/preview", response_model=PricingPreviewResponse)
async def preview_pricing_calculation(
    payload: PricingPreviewRequest,
    _: Annotated[User, Depends(get_admin_user_or_dev)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    return await AdvancedPricingService.calculate_quote_preview(db, DEFAULT_COMPANY_ID, payload)

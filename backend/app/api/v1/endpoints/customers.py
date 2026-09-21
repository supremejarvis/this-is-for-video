"""Customer Profile, Address Book, Consent Records, and Active Sessions API Endpoints."""
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    SESSION_COOKIE_NAME,
    get_current_session_and_user,
    get_current_user,
    verify_csrf,
)
from app.core.database import get_db
from app.core.security import hash_token
from app.models.auth import User, UserSession
from app.models.customer import (
    ConsentRecord,
    CustomerAccountType,
    CustomerAddress,
    CustomerProfile,
    VerifiedIdentifier,
)
from app.schemas.customer import (
    ActiveSessionResponse,
    CustomerAddressCreateRequest,
    CustomerAddressResponse,
    CustomerAddressUpdateRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from app.services.auth_service import utcnow

router = APIRouter()


@router.get("/me", response_model=CustomerProfileResponse)
async def get_my_customer_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CustomerProfileResponse:
    """Retrieve the authoritative profile for the currently authenticated customer."""
    stmt = select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        # Auto-provision baseline profile if not yet created
        phone = current_user.email.split("@")[0] if "@phone." in current_user.email else None
        profile = CustomerProfile(
            user_id=current_user.id,
            full_name=current_user.full_name or "Valued Customer",
            email=current_user.email if "@phone." not in current_user.email else None,
            phone=phone,
            account_type=CustomerAccountType.B2C,
            kyc_status="PENDING",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return CustomerProfileResponse.model_validate(profile)


@router.patch("/me", response_model=CustomerProfileResponse)
async def update_my_customer_profile(
    request: Request,
    payload: CustomerProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CustomerProfileResponse:
    """Update profile fields for the authenticated customer and record terms consent."""
    stmt = select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if not profile:
        profile = CustomerProfile(
            user_id=current_user.id,
            full_name=current_user.full_name or "Customer",
            account_type=CustomerAccountType.B2C,
        )
        db.add(profile)

    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
        current_user.full_name = payload.full_name.strip()

    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        profile.email = clean_email
        # If user email is synthetic phone email, update user.email
        if "@phone." in current_user.email:
            current_user.email = clean_email

    if payload.phone is not None:
        profile.phone = payload.phone.strip()

    if payload.company_name is not None:
        profile.company_name = payload.company_name.strip() or None

    if payload.gstin is not None:
        profile.gstin = payload.gstin.strip().upper() or None

    if payload.pan is not None:
        profile.pan = payload.pan.strip().upper() or None

    if payload.account_type is not None:
        try:
            profile.account_type = CustomerAccountType(payload.account_type.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid account_type. Must be 'B2C' or 'B2B'.",
            ) from None

    # Statutory consent recording
    if payload.terms_accepted:
        ip_address = request.client.host if request.client else None
        consent = ConsentRecord(
            user_id=current_user.id,
            terms_version=payload.terms_version or "2026-09-v1",
            privacy_version=payload.privacy_version or "2026-09-v1",
            ip_address=ip_address,
            accepted_at=utcnow(),
        )
        db.add(consent)

    profile.updated_at = utcnow()
    await db.commit()
    await db.refresh(profile)
    return CustomerProfileResponse.model_validate(profile)


# ─────────────────────────────────────────────────────────────────────────────
# Address Book Endpoints (Strict BOLA / IDOR Verification)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me/addresses", response_model=list[CustomerAddressResponse])
async def list_my_addresses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CustomerAddressResponse]:
    """List all saved delivery addresses belonging to the authenticated customer."""
    stmt = (
        select(CustomerAddress)
        .where(CustomerAddress.user_id == current_user.id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc())
    )
    addresses = (await db.execute(stmt)).scalars().all()
    return [CustomerAddressResponse.model_validate(a) for a in addresses]


@router.post("/me/addresses", response_model=CustomerAddressResponse, status_code=status.HTTP_201_CREATED)
async def create_my_address(
    payload: CustomerAddressCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CustomerAddressResponse:
    """Create a new delivery address bound to the authenticated customer."""
    if payload.is_default:
        # Clear default flag on other addresses for this user
        stmt_clear = (
            update(CustomerAddress)
            .where(CustomerAddress.user_id == current_user.id)
            .values(is_default=False)
        )
        await db.execute(stmt_clear)

    address = CustomerAddress(
        user_id=current_user.id,
        address_type=payload.address_type.upper(),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        flat_building=payload.flat_building.strip(),
        street_area=payload.street_area.strip(),
        landmark=payload.landmark.strip() if payload.landmark else None,
        pincode=payload.pincode.strip(),
        city=payload.city.strip(),
        state=payload.state.strip(),
        state_code=payload.state_code.strip(),
        post_office_name=payload.post_office_name.strip() if payload.post_office_name else None,
        gstin=payload.gstin.strip().upper() if payload.gstin else None,
        is_default=payload.is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return CustomerAddressResponse.model_validate(address)


@router.put("/me/addresses/{address_id}", response_model=CustomerAddressResponse)
async def update_my_address(
    address_id: uuid.UUID,
    payload: CustomerAddressUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CustomerAddressResponse:
    """Update an existing address. Enforces BOLA: Customer can only modify their own address."""
    stmt = select(CustomerAddress).where(
        CustomerAddress.id == address_id,
        CustomerAddress.user_id == current_user.id,
    )
    address = (await db.execute(stmt)).scalar_one_or_none()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to the current customer.",
        )

    if payload.is_default:
        stmt_clear = (
            update(CustomerAddress)
            .where(CustomerAddress.user_id == current_user.id, CustomerAddress.id != address_id)
            .values(is_default=False)
        )
        await db.execute(stmt_clear)
        address.is_default = True
    elif payload.is_default is False:
        address.is_default = False

    if payload.address_type is not None:
        address.address_type = payload.address_type.upper()
    if payload.full_name is not None:
        address.full_name = payload.full_name.strip()
    if payload.phone is not None:
        address.phone = payload.phone.strip()
    if payload.flat_building is not None:
        address.flat_building = payload.flat_building.strip()
    if payload.street_area is not None:
        address.street_area = payload.street_area.strip()
    if payload.landmark is not None:
        address.landmark = payload.landmark.strip() or None
    if payload.pincode is not None:
        address.pincode = payload.pincode.strip()
    if payload.city is not None:
        address.city = payload.city.strip()
    if payload.state is not None:
        address.state = payload.state.strip()
    if payload.state_code is not None:
        address.state_code = payload.state_code.strip()
    if payload.post_office_name is not None:
        address.post_office_name = payload.post_office_name.strip() or None
    if payload.gstin is not None:
        address.gstin = payload.gstin.strip().upper() or None

    address.updated_at = utcnow()
    await db.commit()
    await db.refresh(address)
    return CustomerAddressResponse.model_validate(address)


@router.delete("/me/addresses/{address_id}")
async def delete_my_address(
    address_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Delete a delivery address. Enforces BOLA: Customer can only delete their own address."""
    stmt = select(CustomerAddress).where(
        CustomerAddress.id == address_id,
        CustomerAddress.user_id == current_user.id,
    )
    address = (await db.execute(stmt)).scalar_one_or_none()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to the current customer.",
        )

    await db.delete(address)
    await db.commit()
    return {"message": "Address deleted successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# Active Sessions Management (Account Security)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me/sessions", response_model=list[ActiveSessionResponse])
async def list_my_active_sessions(
    request: Request,
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ActiveSessionResponse]:
    """List active sessions for the authenticated customer."""
    current_session, user = session_user
    now = utcnow()

    stmt = (
        select(UserSession)
        .where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
            UserSession.absolute_expires_at > now,
            UserSession.idle_expires_at > now,
        )
        .order_by(UserSession.last_seen_at.desc())
    )
    sessions = (await db.execute(stmt)).scalars().all()

    return [
        ActiveSessionResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            last_seen_at=s.last_seen_at,
            created_at=s.created_at,
            idle_expires_at=s.idle_expires_at,
            absolute_expires_at=s.absolute_expires_at,
            expires_at=s.absolute_expires_at,
            is_current=(s.id == current_session.id),
        )
        for s in sessions
    ]

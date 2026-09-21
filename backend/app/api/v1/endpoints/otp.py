import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CSRF_COOKIE_NAME, SESSION_COOKIE_NAME
from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import UserResponse
from app.schemas.customer import CustomerProfileResponse
from app.schemas.otp import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.services.customer_auth_service import CustomerAuthService, mask_phone_number

logger = logging.getLogger("apollo.otp")

router = APIRouter()


@router.post("/request", response_model=SendOtpResponse)
@router.post("/send", response_model=SendOtpResponse, include_in_schema=False)
async def request_otp(
    request: Request,
    payload: SendOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SendOtpResponse:
    """Dispatches a secure 4-digit OTP challenge to a 10-digit Indian mobile number."""
    ip_address = request.client.host if request.client else None
    success, message, masked, challenge_id, code = await CustomerAuthService.request_otp(
        db=db,
        phone=payload.phone,
        purpose=payload.purpose,
        ip_address=ip_address,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
        )

    dev_code = code if settings.ENVIRONMENT != "production" else None

    return SendOtpResponse(
        success=True,
        message=message,
        masked_phone=masked,
        challenge_id=challenge_id,
        cooldown_seconds=CustomerAuthService.RESEND_COOLDOWN_SECONDS,
        expires_in_seconds=CustomerAuthService.EXPIRY_MINUTES * 60,
        dev_code=dev_code,
    )


@router.post("/resend", response_model=SendOtpResponse)
@router.post("/retry", response_model=SendOtpResponse, include_in_schema=False)
async def resend_otp(
    request: Request,
    payload: SendOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SendOtpResponse:
    """Resends a secure 4-digit OTP challenge with server-enforced cooldown."""
    return await request_otp(request, payload, db)


@router.post("/verify", response_model=VerifyOtpResponse)
async def verify_otp(
    request: Request,
    response: Response,
    payload: VerifyOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerifyOtpResponse:
    """Atomically verifies the 4-digit OTP challenge, provisions/loads customer, and sets session cookies."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    (
        is_verified,
        message,
        user,
        profile,
        is_first_time,
        raw_session_token,
        raw_csrf_token,
    ) = await CustomerAuthService.verify_otp(
        db=db,
        phone=payload.phone,
        entered_otp=payload.otp,
        challenge_id=payload.challenge_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    if not is_verified or not user or not raw_session_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    # Set secure HttpOnly session cookie
    is_secure = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
        or settings.ENVIRONMENT == "production"
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_session_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=86400,
        path="/",
    )

    # Set client-readable CSRF cookie for double-submit
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=raw_csrf_token,
        httponly=False,
        secure=is_secure,
        samesite="lax",
        max_age=86400,
        path="/",
    )

    masked = mask_phone_number(payload.phone)

    return VerifyOtpResponse(
        success=True,
        is_verified=True,
        is_first_time=is_first_time,
        message=message,
        masked_phone=masked,
        user=UserResponse.model_validate(user),
        customer_profile=CustomerProfileResponse.model_validate(profile) if profile else None,
        csrf_token=raw_csrf_token,
    )


if settings.ENVIRONMENT in ("development", "test", "automated_test"):
    @router.get("/dev-code")
    async def get_dev_otp_code(
        phone: str,
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> dict[str, str | None]:
        """Development-only endpoint for automated E2E testing."""
        code = await CustomerAuthService.get_active_code_for_testing(db, phone)
        return {"phone": phone, "code": code}

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CSRF_COOKIE_NAME, SESSION_COOKIE_NAME
from app.core.config import settings
from app.core.database import get_db
from app.core.security import generate_secure_token, hash_password, hash_token
from app.models.auth import User, UserRole, UserSession
from app.schemas.auth import UserResponse
from app.schemas.otp import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.services.otp_service import otp_service

logger = logging.getLogger("apollo.otp")

router = APIRouter()


@router.post("/send", response_model=SendOtpResponse)
async def send_otp(request: Request, payload: SendOtpRequest) -> SendOtpResponse:
    """Dispatches a secure 4-digit OTP to the verified 10-digit Indian mobile number."""
    ip_address = request.client.host if request.client else None
    success, message, masked, code = otp_service.send_otp(payload.phone, ip_address)

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
        cooldown_seconds=30,
        dev_code=dev_code,
    )


@router.post("/retry", response_model=SendOtpResponse)
async def retry_otp(request: Request, payload: SendOtpRequest) -> SendOtpResponse:
    """Retry alias for send_otp dispatch."""
    return await send_otp(request, payload)


@router.post("/verify", response_model=VerifyOtpResponse)
async def verify_otp(
    request: Request,
    response: Response,
    payload: VerifyOtpRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VerifyOtpResponse:
    """Verifies the 4-digit OTP against active non-expired session and logs the user in."""
    is_verified, message, masked = otp_service.verify_otp(payload.phone, payload.otp)

    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    user_response = None
    raw_csrf_token = None

    try:
        phone_email = f"{payload.phone}@ape-store.com"
        stmt = select(User).where(User.email == phone_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            user = User(
                email=phone_email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                full_name=f"Customer {masked}",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.flush()

        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        now = datetime.now(UTC)
        raw_session_token = generate_secure_token(32)
        raw_csrf_token = generate_secure_token(32)

        user_session = UserSession(
            user_id=user.id,
            session_token_hash=hash_token(raw_session_token),
            csrf_token_hash=hash_token(raw_csrf_token),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            absolute_expires_at=now + timedelta(hours=24),
            idle_expires_at=now + timedelta(hours=2),
        )
        db.add(user_session)
        await db.commit()
        await db.refresh(user)

        user_response = UserResponse.model_validate(user)

        # Set secure HttpOnly session cookie
        is_secure = request.url.scheme == "https"
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=raw_session_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=86400,
            path="/",
        )

        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=raw_csrf_token,
            httponly=False,
            secure=is_secure,
            samesite="lax",
            max_age=86400,
            path="/",
        )
    except Exception as exc:
        # If DB is unavailable, verification itself succeeded but log the error
        logger.warning("DB session recording failed during OTP verify: %s", exc)
        await db.rollback()

    return VerifyOtpResponse(
        success=True,
        message=message,
        masked_phone=masked,
        user=user_response,
        csrf_token=raw_csrf_token,
    )



if settings.ENVIRONMENT in ("development", "test", "automated_test"):
    @router.get("/dev-code")
    async def get_dev_otp_code(phone: str) -> dict[str, str | None]:
        """Development-only endpoint for automated E2E testing."""
        code = otp_service._get_active_code_for_testing(phone)
        return {"phone": phone, "code": code}


"""Authentication Endpoints with HttpOnly Cookies and CSRF Protection (Async Native)."""
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    get_current_session_and_user,
    get_current_user,
    verify_csrf,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
    verify_totp_code,
)
from app.models.auth import User, UserRole, UserSession
from app.schemas.auth import (
    AdminLoginRequest,
    CSRFResponse,
    LoginSuccessResponse,
    UserLoginRequest,
    UserResponse,
)
from app.services.auth_service import (
    AuthRateLimitException,
    AuthService,
    InvalidCredentialsException,
    UserLockedException,
)

router = APIRouter()


@router.post("/login", response_model=LoginSuccessResponse)
async def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LoginSuccessResponse:
    """Authenticate user, set HttpOnly session cookie, and return CSRF token."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        user, raw_session_token, raw_csrf_token = await AuthService.authenticate(
            db=db,
            email=payload.email,
            password=payload.password,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except AuthRateLimitException as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e
    except InvalidCredentialsException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e
    except UserLockedException as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e

    # Set secure HttpOnly session cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400,
        path="/",
    )

    # Set client-readable CSRF cookie for double-submit
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=raw_csrf_token,
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=86400,
        path="/",
    )

    return LoginSuccessResponse(
        message="Authentication successful",
        user=UserResponse.model_validate(user),
        csrf_token=raw_csrf_token,
    )


@router.post("/admin-login", response_model=LoginSuccessResponse)
async def admin_login(
    request: Request,
    response: Response,
    payload: AdminLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LoginSuccessResponse:
    """Super Admin Master Login with Password + RFC 6238 TOTP verification."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    normalized_email = payload.email.lower().strip()

    # Database-backed sliding rate limit check
    try:
        await AuthService.check_rate_limit(db, ip_address=ip_address, email=normalized_email)
    except AuthRateLimitException as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e

    # 1. Verify Password against ADMIN_PASSWORD_HASH or OWNER DB user
    password_valid = False
    if settings.ADMIN_PASSWORD_HASH:
        password_valid = verify_password(payload.password, settings.ADMIN_PASSWORD_HASH)
    else:
        stmt = select(User).where(
            User.email == normalized_email,
            User.role == UserRole.OWNER,
            User.is_active.is_(True),
            User.is_archived.is_(False),
        )
        res = await db.execute(stmt)
        db_user = res.scalar_one_or_none()
        if db_user:
            password_valid = verify_password(payload.password, db_user.password_hash)

    # 2. Verify RFC 6238 TOTP against ADMIN_TOTP_SECRET or user mfa_secret
    totp_valid = False
    if getattr(settings, "ADMIN_DEV_BYPASS_TOTP", False) and settings.ENVIRONMENT.lower() != "production" and payload.totp_code in ["123456", "000000"]:
        totp_valid = True
    elif settings.ADMIN_TOTP_SECRET:
        totp_valid = verify_totp_code(settings.ADMIN_TOTP_SECRET, payload.totp_code)
    else:
        stmt = select(User).where(User.email == normalized_email, User.is_active.is_(True))
        res = await db.execute(stmt)
        db_user = res.scalar_one_or_none()
        if db_user and db_user.mfa_secret:
            totp_valid = verify_totp_code(db_user.mfa_secret, payload.totp_code)

    if not password_valid or not totp_valid:
        await AuthService.record_audit_log(
            db=db,
            email_attempted=normalized_email,
            event_type="LOGIN_FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            details={"reason": "admin_auth_failed", "password_ok": password_valid, "totp_ok": totp_valid},
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials or 6-digit authenticator code.",
        )

    # Fetch or provision OWNER user for session binding
    stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        user = User(
            email=normalized_email,
            password_hash=settings.ADMIN_PASSWORD_HASH or hash_password(payload.password),
            full_name="Apollo Engineering Administrator",
            role=UserRole.OWNER,
            is_active=True,
            mfa_enabled=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    now = datetime.now(UTC)
    raw_session_token = generate_secure_token(32)
    raw_csrf_token = generate_secure_token(32)

    session = UserSession(
        user_id=user.id,
        session_token_hash=hash_token(raw_session_token),
        csrf_token_hash=hash_token(raw_csrf_token),
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
        absolute_expires_at=now + timedelta(hours=AuthService.ABSOLUTE_SESSION_HOURS),
        idle_expires_at=now + timedelta(hours=AuthService.IDLE_SESSION_HOURS),
        last_seen_at=now,
        revoked_at=None,
    )
    db.add(session)

    await AuthService.record_audit_log(
        db=db,
        user_id=user.id,
        email_attempted=normalized_email,
        event_type="LOGIN_SUCCESS",
        ip_address=ip_address,
        user_agent=user_agent,
        details={"mode": "ADMIN_PASSWORD_TOTP"},
    )
    await db.commit()

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=raw_session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400,
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=raw_csrf_token,
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=86400,
        path="/",
    )

    return LoginSuccessResponse(
        message="Super Admin authenticated successfully with TOTP",
        user=UserResponse.model_validate(user),
        csrf_token=raw_csrf_token,
    )



@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Revoke session in database and delete cookies."""
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if raw_token:
        await AuthService.revoke_session(db, raw_token)

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.get("/csrf", response_model=CSRFResponse)
async def get_csrf(
    request: Request,
    response: Response,
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
) -> CSRFResponse:
    """Retrieve current CSRF token from active session cookie."""
    csrf_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    return CSRFResponse(csrf_token=csrf_token)

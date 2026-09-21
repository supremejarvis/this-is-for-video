"""Authentication Endpoints with HttpOnly Cookies and CSRF Protection (Async Native)."""
import uuid
from datetime import timedelta
from typing import Annotated, Any, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    get_current_session_and_user,
    get_current_user,
    get_optional_current_user,
    verify_csrf,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    generate_secure_token,
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
    UserProfileUpdateRequest,
    UserResponse,
)
from app.services.auth_service import (
    DUMMY_PASSWORD_HASH,
    AuthRateLimitException,
    AuthService,
    InvalidCredentialsException,
    UserLockedException,
    utcnow,
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
    """Super Admin Master Login with Password + RFC 6238 TOTP verification.

    Security Invariant (P0-003):
    Login ONLY authenticates existing pre-provisioned administrative accounts.
    It NEVER creates, promotes, bootstraps, or manufactures an administrative or OWNER account.
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    normalized_email = payload.email.lower().strip()

    # 1. Database-backed sliding rate limit check
    try:
        await AuthService.check_rate_limit(db, ip_address=ip_address, email=normalized_email)
    except AuthRateLimitException as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e

    # Helper for uniform 401 response and timing-safe rejection
    async def reject_unauthorized(
        error_code: str,
        user_id: uuid.UUID | None = None,
        extra_details: dict[str, Any] | None = None,
    ) -> NoReturn:
        verify_password(payload.password, DUMMY_PASSWORD_HASH)
        details: dict[str, Any] = {"reason": "admin_auth_failed", "error_code": error_code}
        if extra_details:
            details.update(extra_details)
        await AuthService.record_audit_log(
            db=db,
            user_id=user_id,
            email_attempted=normalized_email,
            event_type="LOGIN_FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 2. Query existing user from authoritative PostgreSQL/SQLite database
    stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    # 3. User existence check: Unknown identity MUST fail closed with 401 and ZERO side-effects
    if not user:
        await reject_unauthorized(error_code="USER_NOT_FOUND")

    # 4. Account active & archived status verification
    if not user.is_active or user.is_archived:
        await reject_unauthorized(error_code="ACCOUNT_INACTIVE_OR_ARCHIVED", user_id=user.id)

    # 5. Strict Role Validation: Admin login strictly requires OWNER administrative role (P0-003)
    ADMIN_LOGIN_ALLOWED_ROLES = {UserRole.OWNER}
    if user.role not in ADMIN_LOGIN_ALLOWED_ROLES:
        await reject_unauthorized(
            error_code="UNAUTHORIZED_ROLE",
            user_id=user.id,
            extra_details={"attempted_role": str(user.role)},
        )

    # 6. Check temporary lockout status
    if user.locked_until and user.locked_until > utcnow():
        await reject_unauthorized(error_code="ACCOUNT_LOCKED", user_id=user.id)

    # 7. Verify Password against user's password_hash or secure ADMIN_PASSWORD_HASH override
    password_valid = False
    if (user.password_hash and verify_password(payload.password, user.password_hash)) or (settings.ADMIN_PASSWORD_HASH and verify_password(payload.password, settings.ADMIN_PASSWORD_HASH)):
        password_valid = True

    # 8. Verify RFC 6238 TOTP against user's mfa_secret or secure ADMIN_TOTP_SECRET override
    totp_valid = False
    clean_totp = (payload.totp_code or "").strip()
    if clean_totp:
        if (user.mfa_secret and verify_totp_code(user.mfa_secret, clean_totp)) or (settings.ADMIN_TOTP_SECRET and verify_totp_code(settings.ADMIN_TOTP_SECRET, clean_totp)):
            totp_valid = True
    elif not user.mfa_enabled:
        # If user has not enabled MFA, password verification is authoritative
        totp_valid = True

    if not password_valid or not totp_valid:
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= AuthService.MAX_FAILED_ATTEMPTS:
            user.locked_until = utcnow() + timedelta(minutes=15)

        failure_code = "INVALID_PASSWORD" if not password_valid else "INVALID_TOTP"
        await AuthService.record_audit_log(
            db=db,
            user_id=user.id,
            email_attempted=normalized_email,
            event_type="LOGIN_FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "reason": "admin_auth_failed",
                "error_code": failure_code,
                "attempt_count": user.failed_login_attempts,
            },
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 9. Success: Reset failed attempt counters and unlock
    user.failed_login_attempts = 0
    user.locked_until = None

    now = utcnow()
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
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=raw_csrf_token,
        httponly=False,
        secure=is_secure,
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
    """Revoke current session in database and delete cookies."""
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if raw_token:
        await AuthService.revoke_session(db, raw_token)

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all(
    request: Request,
    response: Response,
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
    _: Annotated[None, Depends(verify_csrf)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Revoke all active sessions for the authenticated user across all devices."""
    user_session, user = session_user
    count = await AuthService.revoke_all_user_sessions(db, user.id, reason="USER_LOGOUT_ALL")

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    return {
        "message": "All sessions revoked successfully",
        "revoked_count": count,
    }


@router.get("/session")
@router.get("/session/", include_in_schema=False)
async def get_session_status(
    user: Annotated[User | None, Depends(get_optional_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Check session status cleanly without raising 401 on unauthenticated visitors."""
    if user is None:
        return {"authenticated": False, "user": None, "customer_profile": None}

    from app.models.customer import CustomerAccountType, CustomerProfile, VerifiedIdentifier
    from app.schemas.customer import CustomerProfileResponse

    stmt_p = select(CustomerProfile).where(CustomerProfile.user_id == user.id)
    profile = (await db.execute(stmt_p)).scalar_one_or_none()

    if profile is None:
        stmt_ident = select(VerifiedIdentifier).where(
            VerifiedIdentifier.user_id == user.id,
            VerifiedIdentifier.identifier_type == "PHONE",
        )
        ident = (await db.execute(stmt_ident)).scalar_one_or_none()
        derived_phone = ident.normalized_identifier if ident else None

        if not derived_phone and user.email:
            import re
            m = re.match(r"^(\+?91)?([6-9]\d{9})@", user.email)
            if m:
                derived_phone = m.group(2)

        is_synthetic_email = "@phone.apolloengineering.co.in" in user.email or "@ape-store.com" in user.email
        profile = CustomerProfile(
            user_id=user.id,
            full_name=user.full_name,
            email=None if is_synthetic_email else user.email,
            phone=derived_phone,
            account_type=CustomerAccountType.B2C,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    elif not profile.phone:
        stmt_ident = select(VerifiedIdentifier).where(
            VerifiedIdentifier.user_id == user.id,
            VerifiedIdentifier.identifier_type == "PHONE",
        )
        ident = (await db.execute(stmt_ident)).scalar_one_or_none()
        if ident:
            profile.phone = ident.normalized_identifier
            await db.commit()
            await db.refresh(profile)
        elif user.email:
            import re
            m = re.match(r"^(\+?91)?([6-9]\d{9})@", user.email)
            if m:
                profile.phone = m.group(2)
                await db.commit()
                await db.refresh(profile)

    profile_data = (
        CustomerProfileResponse.model_validate(profile).model_dump(mode="json")
        if profile
        else None
    )

    user_resp = UserResponse.model_validate(user)
    if profile and profile.phone:
        user_resp.phone = profile.phone

    return {
        "authenticated": True,
        "user": user_resp.model_dump(mode="json"),
        "customer_profile": profile_data,
    }



@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    payload: UserProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Update authenticated user's own profile (full_name and/or email)."""
    if payload.full_name is not None:
        clean_name = payload.full_name.strip()
        if len(clean_name) >= 2:
            current_user.full_name = clean_name
    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if new_email != current_user.email:
            stmt = select(User).where(User.email == new_email, User.id != current_user.id)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered by another account",
                )
            current_user.email = new_email
    await db.commit()
    await db.refresh(current_user)
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

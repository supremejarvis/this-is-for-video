"""FastAPI Security and RBAC Dependencies (Async Native)."""
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_csrf_token
from app.models.auth import User, UserRole, UserSession
from app.services.auth_service import AuthService

SESSION_COOKIE_NAME = "ape_session"
CSRF_COOKIE_NAME = "ape_csrf"
CSRF_HEADER_NAME = "x-csrf-token"


async def get_current_session_and_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[UserSession, User]:
    """Validate HttpOnly session cookie or Bearer token and return active session and user."""
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing session cookie or Bearer token.",
        )

    result = await AuthService.get_session_and_user(db, raw_token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    return result


async def get_current_user(
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
) -> User:
    """Return the authenticated user."""
    return session_user[1]


async def get_optional_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Return the authenticated user if session cookie or Bearer token exists and is valid, else None."""
    raw_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()
        else:
            return None

    try:
        result = await AuthService.get_session_and_user(db, raw_token)
        return result[1] if result else None
    except Exception:
        return None


async def verify_csrf(
    request: Request,
    session_user: Annotated[tuple[UserSession, User], Depends(get_current_session_and_user)],
) -> None:
    """Verify CSRF token on state-modifying HTTP methods (POST, PUT, PATCH, DELETE)."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    user_session, _ = session_user
    header_csrf = request.headers.get(CSRF_HEADER_NAME)
    if not header_csrf:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing from X-CSRF-Token header.",
        )

    if not verify_csrf_token(header_csrf, user_session.csrf_token_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed.",
        )


def require_roles(allowed_roles: list[UserRole]) -> Callable[..., Any]:
    """RBAC Guard: Enforce that authenticated user possesses one of the authorized roles."""

    async def role_checker(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Insufficient privileges for role {user.role}.",
            )
        return user

    return role_checker

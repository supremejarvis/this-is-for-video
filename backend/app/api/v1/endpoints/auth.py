"""Authentication Endpoints with HttpOnly Cookies and CSRF Protection (Async Native)."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    get_current_session_and_user,
    get_current_user,
    verify_csrf,
)
from app.core.database import get_db
from app.models.auth import User, UserSession
from app.schemas.auth import (
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

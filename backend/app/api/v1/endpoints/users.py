"""User Management Endpoints for RBAC Verification (Async Native)."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles, verify_csrf
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.schemas.auth import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_user(
    payload: UserCreateRequest,
    _: Annotated[None, Depends(verify_csrf)],
    current_user: Annotated[User, Depends(require_roles([UserRole.OWNER]))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Create a new staff user with granular RBAC role (Owner only)."""
    stmt = select(User).where(User.email == payload.email.lower().strip())
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = await AuthService.create_user(
        db=db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role,
    )
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_staff_user(
    user_id: str,
    payload: UserUpdateRequest,
    _: Annotated[None, Depends(verify_csrf)],
    current_user: Annotated[User, Depends(require_roles([UserRole.OWNER]))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Update staff user (Owner only). Immediately revokes active sessions if security fields change."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid user ID format",
        ) from None

    stmt = select(User).where(User.id == uid, User.is_archived.is_(False))
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated_user = await AuthService.update_user(
        db=db,
        user=user,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        new_password=payload.new_password,
    )
    return UserResponse.model_validate(updated_user)


@router.get("", response_model=list[UserResponse])
async def list_staff_users(
    current_user: Annotated[User, Depends(require_roles([UserRole.OWNER, UserRole.AUDITOR]))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserResponse]:
    """List staff users (Owner and Auditor only)."""
    stmt = select(User).where(User.is_archived.is_(False)).order_by(User.created_at.asc())
    users = (await db.execute(stmt)).scalars().all()
    return [UserResponse.model_validate(u) for u in users]

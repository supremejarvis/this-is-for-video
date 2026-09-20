"""Admin Returns Management, Caliper Verification & Item Inspection Endpoints."""
from collections.abc import Sequence
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.shipping_advanced import Return
from app.schemas.returns import (
    CaliperInspectionRequest,
    ReturnCreateRequest,
    ReturnOut,
    ReturnReceiveRequest,
)
from app.services.returns_service import ReturnsService

router = APIRouter(prefix="/admin/returns", tags=["Admin Returns"])


@router.post("", response_model=ReturnOut, status_code=status.HTTP_201_CREATED)
async def create_return_case(
    req: ReturnCreateRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.SUPPORT))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReturnOut:
    """Create return case with requested items."""
    service = ReturnsService(db)
    try:
        return await service.create_return(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=list[ReturnOut])
async def list_returns(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.SUPPORT, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
) -> list[ReturnOut]:
    """List return cases with line items."""
    stmt = (
        select(Return)
        .options(selectinload(Return.items))
        .order_by(Return.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(Return.status == status_filter)

    res = await db.execute(stmt)
    cases = res.scalars().all()
    return [ReturnOut.model_validate(c) for c in cases]


@router.get("/{id}", response_model=ReturnOut)
async def get_return_detail(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.SUPPORT, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReturnOut:
    """Get return case detail with caliper photo and items."""
    stmt = select(Return).where(Return.id == id).options(selectinload(Return.items))
    res = await db.execute(stmt)
    ret = res.scalars().first()
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Return {id} not found")
    return ReturnOut.model_validate(ret)


@router.post("/{id}/inspect-caliper", response_model=ReturnOut)
async def inspect_caliper(
    id: uuid.UUID,
    req: CaliperInspectionRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.SUPPORT))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReturnOut:
    """Admin inspects caliper photo and verifies solar frame thickness."""
    service = ReturnsService(db)
    try:
        return await service.inspect_caliper_evidence(id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{id}/receive", response_model=ReturnOut)
async def receive_return_items(
    id: uuid.UUID,
    req: ReturnReceiveRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.INVENTORY_MANAGER, UserRole.ORDER_OPERATIONS))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReturnOut:
    """Physical parcel receipt at warehouse: restocks ONLY accepted items with RESTOCK_INVENTORY disposition."""
    service = ReturnsService(db)
    try:
        return await service.receive_and_restock(id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

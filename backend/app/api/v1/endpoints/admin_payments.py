"""Admin Payment Verification, Refunds, and Reconciliation Endpoints."""
from collections.abc import Sequence
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.order import Payment
from app.schemas.payment import (
    PaymentOut,
    PaymentReconciliationSummary,
    RefundRequest,
    RefundResponse,
    UpiVerificationRequest,
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/admin/payments", tags=["Admin Payments"])


@router.get("", response_model=list[PaymentOut])
async def list_payments(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.FINANCE, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
) -> Sequence[Payment]:
    """List customer payment transactions."""
    stmt = select(Payment).order_by(Payment.created_at.desc()).limit(limit)
    if status_filter:
        stmt = stmt.where(Payment.status == status_filter)

    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/{id}/verify-upi", response_model=PaymentOut)
async def verify_upi_payment(
    id: uuid.UUID,
    req: UpiVerificationRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.FINANCE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PaymentOut:
    """Admin manual verification desk: verify direct UPI payment with bank UTR."""
    service = PaymentService(db)
    try:
        return await service.verify_upi_payment(id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/refund", response_model=RefundResponse)
async def issue_refund(
    req: RefundRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.FINANCE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RefundResponse:
    """Issue authorized refund against a payment transaction."""
    service = PaymentService(db)
    try:
        return await service.process_refund(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/reconciliation", response_model=PaymentReconciliationSummary)
async def get_payment_reconciliation(
    current_user: Annotated[User, Depends(require_roles(UserRole.OWNER, UserRole.FINANCE, UserRole.AUDITOR))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PaymentReconciliationSummary:
    """Reconciliation desk: Gateway receipts vs Invoice allocations."""
    service = PaymentService(db)
    return await service.get_reconciliation_summary()

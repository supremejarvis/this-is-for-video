"""Admin Double-Entry Accounting, Period Controls, and Financial Reports Router."""
from datetime import date
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.models.accounting import Invoice, JournalEntry, JournalLine
from app.models.auth import User
from app.schemas.accounting import (
    AccountCreate,
    AccountOut,
    FiscalPeriodLockRequest,
    FiscalPeriodOut,
    GstSubledgerReport,
    InvoiceIssueRequest,
    InvoiceOut,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalReversalRequest,
    PaymentAllocationOut,
    PaymentAllocationRequest,
    ProfitAndLossReport,
    TrialBalanceReport,
)
from app.services.accounting_service import AccountingService

router = APIRouter()
DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


# -------------------------------------------------------------------------
# Chart of Accounts
# -------------------------------------------------------------------------

@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AccountOut]:
    """List chart of accounts for company."""
    service = AccountingService(db)
    return await service.list_accounts(DEFAULT_COMPANY_ID)


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    req: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    """Create a new account in chart of accounts."""
    service = AccountingService(db)
    try:
        return await service.create_account(DEFAULT_COMPANY_ID, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------------------------------------------------------------
# Fiscal Periods
# -------------------------------------------------------------------------

@router.get("/periods", response_model=list[FiscalPeriodOut])
async def list_fiscal_periods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FiscalPeriodOut]:
    """List all fiscal periods and their lock states."""
    service = AccountingService(db)
    await service.ensure_default_fiscal_period(DEFAULT_COMPANY_ID)
    return await service.list_fiscal_periods(DEFAULT_COMPANY_ID)


@router.post("/periods/{period_id}/lock", response_model=FiscalPeriodOut)
async def lock_fiscal_period(
    period_id: uuid.UUID,
    req: FiscalPeriodLockRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FiscalPeriodOut:
    """Lock or unlock a fiscal period with audit trail."""
    service = AccountingService(db)
    try:
        return await service.lock_fiscal_period(period_id, req, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------------------------------------------------------------
# Invoices
# -------------------------------------------------------------------------

@router.post("/invoices/issue", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def issue_tax_invoice(
    req: InvoiceIssueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceOut:
    """Issue official GST Tax Invoice for confirmed order and post journal entry."""
    service = AccountingService(db)
    try:
        return await service.issue_invoice_for_order(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/invoices", response_model=list[InvoiceOut])
async def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[InvoiceOut]:
    """List issued statutory tax invoices."""
    stmt = (
        select(Invoice)
        .where(Invoice.company_id == DEFAULT_COMPANY_ID)
        .options(selectinload(Invoice.lines))
        .order_by(Invoice.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    invoices = res.scalars().all()
    return [InvoiceOut.model_validate(inv) for inv in invoices]


# -------------------------------------------------------------------------
# Payment Allocations
# -------------------------------------------------------------------------

@router.post("/payment-allocations", response_model=PaymentAllocationOut, status_code=status.HTTP_201_CREATED)
async def allocate_payment(
    req: PaymentAllocationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentAllocationOut:
    """Allocate captured payment against an invoice."""
    service = AccountingService(db)
    try:
        return await service.allocate_payment(req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------------------------------------------------------------
# Double-Entry General Ledger Journals
# -------------------------------------------------------------------------

@router.post("/journals", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
async def post_journal(
    req: JournalEntryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JournalEntryOut:
    """Authoritatively post a double-entry general ledger journal entry."""
    service = AccountingService(db)
    try:
        return await service.post_journal_entry(DEFAULT_COMPANY_ID, req, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/journals/{journal_id}/reverse", response_model=JournalEntryOut)
async def reverse_journal(
    journal_id: uuid.UUID,
    req: JournalReversalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JournalEntryOut:
    """Reverse a posted journal entry immutably."""
    service = AccountingService(db)
    try:
        return await service.reverse_journal_entry(journal_id, req, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/journals", response_model=list[JournalEntryOut])
async def list_journals(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[JournalEntryOut]:
    """List posted general ledger journals with lines."""
    stmt = (
        select(JournalEntry)
        .where(JournalEntry.company_id == DEFAULT_COMPANY_ID)
        .options(selectinload(JournalEntry.lines).selectinload(JournalLine.account))
        .order_by(JournalEntry.posting_date.desc(), JournalEntry.posted_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    out: list[JournalEntryOut] = []
    for j in entries:
        lines = []
        for line in j.lines:
            lines.append(
                {
                    "id": line.id,
                    "account_id": line.account_id,
                    "account_code": line.account.code if line.account else "",
                    "account_name": line.account.name if line.account else "",
                    "debit": line.debit,
                    "credit": line.credit,
                    "currency": line.currency,
                    "customer_id": line.customer_id,
                    "supplier_id": line.supplier_id,
                    "cost_center_id": line.cost_center_id,
                }
            )
        out.append(
            JournalEntryOut(
                id=j.id,
                company_id=j.company_id,
                posting_date=j.posting_date,
                period_id=j.period_id,
                status=j.status.value,
                source_type=j.source_type,
                source_id=j.source_id,
                posting_kind=j.posting_kind,
                reversal_of=j.reversal_of,
                description=j.description,
                posted_at=j.posted_at,
                lines=lines,
            )
        )
    return out


# -------------------------------------------------------------------------
# Financial Reports
# -------------------------------------------------------------------------

@router.get("/reports/trial-balance", response_model=TrialBalanceReport)
async def get_trial_balance(
    as_of: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TrialBalanceReport:
    """Generate authoritative Trial Balance report."""
    service = AccountingService(db)
    target_date = as_of or date.today()
    return await service.generate_trial_balance(DEFAULT_COMPANY_ID, target_date)


@router.get("/reports/profit-and-loss", response_model=ProfitAndLossReport)
async def get_profit_and_loss(
    from_date: date | None = None,
    to_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfitAndLossReport:
    """Generate statutory Profit & Loss report."""
    service = AccountingService(db)
    today = date.today()
    f_date = from_date or date(today.year, 4, 1 if today.month >= 4 else today.year - 1)
    t_date = to_date or today
    return await service.generate_profit_and_loss(DEFAULT_COMPANY_ID, f_date, t_date)


@router.get("/reports/gst-subledger", response_model=GstSubledgerReport)
async def get_gst_subledger(
    from_date: date | None = None,
    to_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GstSubledgerReport:
    """Generate statutory GST subledger summary."""
    service = AccountingService(db)
    today = date.today()
    f_date = from_date or date(today.year, today.month, 1)
    t_date = to_date or today
    return await service.generate_gst_subledger(DEFAULT_COMPANY_ID, f_date, t_date)

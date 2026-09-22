import csv
from datetime import date, datetime
import io
from typing import Annotated, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_roles
from app.models.accounting import Invoice, JournalEntry, JournalLine
from app.models.auth import User, UserRole
from app.models.order import Order, OrderStatus, PaymentStatus
from app.services.shipping_service import determine_zone
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


@router.get(
    "/export/gst-gstr1",
    summary="Export Authoritative GSTR-1 Sales Return Register",
    description="Generates and downloads statutory GSTR-1 B2B and B2C sales report in CSV or JSON format.",
)
async def export_gstr1_report(
    from_date: date | None = None,
    to_date: date | None = None,
    export_format: str = Query("csv", pattern="^(csv|json)$", alias="format"),
    current_user: User = Depends(require_roles([UserRole.OWNER, UserRole.FINANCE, UserRole.AUDITOR])),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate statutory GSTR-1 outward supplies return."""
    # Query confirmed/paid orders
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.address))
        .where(
            Order.payment_status.in_([PaymentStatus.CAPTURED, PaymentStatus.PENDING]),
            Order.order_status.in_([
                OrderStatus.CONFIRMED,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
            ]),
        )
        .order_by(Order.created_at.desc())
    )
    result = await db.execute(stmt)
    orders = result.scalars().all()

    # Apply date filters if supplied
    filtered_orders = []
    for ord_obj in orders:
        ord_date = ord_obj.created_at.date() if hasattr(ord_obj.created_at, "date") else ord_obj.created_at
        if from_date and ord_date < from_date:
            continue
        if to_date and ord_date > to_date:
            continue
        filtered_orders.append(ord_obj)

    records: list[dict[str, Any]] = []

    for ord_obj in filtered_orders:
        gstin_val = (ord_obj.gstin or (ord_obj.address.gstin if ord_obj.address else None) or "").strip().upper()
        is_b2b = bool(gstin_val and len(gstin_val) >= 15)
        recipient_gstin = gstin_val if is_b2b else "URP"
        receiver_name = (
            ord_obj.company_name
            or (ord_obj.address.company_name if ord_obj.address else None)
            or ord_obj.customer_name
            or (ord_obj.address.full_name if ord_obj.address else "Customer")
        )
        inv_number = f"APE/26-27/{ord_obj.order_number}"
        inv_date = ord_obj.created_at.strftime("%d-%b-%Y") if hasattr(ord_obj.created_at, "strftime") else str(ord_obj.created_at)[:10]
        inv_val = float(ord_obj.total_payable)

        # Place of supply
        pincode = (ord_obj.address.pincode if ord_obj.address else "382430").strip()
        state_str = (ord_obj.address.state if ord_obj.address else "Gujarat").strip()
        zone = determine_zone(pincode)

        if zone in ("LOCAL", "GUJARAT") or "GUJARAT" in state_str.upper():
            place_of_supply = "24-Gujarat"
            is_intra = True
        else:
            place_of_supply = f"99-{state_str}" if state_str else "99-Other"
            is_intra = False

        taxable_val = float(ord_obj.subtotal_taxable + ord_obj.shipping_base)
        tot_product_gst = float(ord_obj.product_gst)
        tot_shipping_gst = float(ord_obj.shipping_gst)
        total_gst = tot_product_gst + tot_shipping_gst

        if is_intra:
            cgst_amt = round(total_gst / 2, 2)
            sgst_amt = round(total_gst / 2, 2)
            igst_amt = 0.0
        else:
            cgst_amt = 0.0
            sgst_amt = 0.0
            igst_amt = round(total_gst, 2)

        records.append({
            "gstin_recipient": recipient_gstin,
            "receiver_name": receiver_name,
            "invoice_number": inv_number,
            "invoice_date": inv_date,
            "invoice_value": inv_val,
            "place_of_supply": place_of_supply,
            "reverse_charge": "N",
            "applicable_tax_rate": 18.0,
            "invoice_type": "Regular B2B" if is_b2b else "B2C Small",
            "taxable_value": round(taxable_val, 2),
            "cess_amount": 0.0,
            "cgst_amount": cgst_amt,
            "sgst_amount": sgst_amt,
            "igst_amount": igst_amt,
            "hsn_summary": "73269099, 996812",
        })

    if export_format == "json":
        from fastapi.responses import JSONResponse
        return JSONResponse(content={
            "report": "GSTR-1 Outward Supplies Sales Register",
            "company": "Apollo Engineering",
            "gstin": "24AAAPA0000A1Z5",
            "period": f"{from_date or 'Beginning'} to {to_date or 'Latest'}",
            "total_records": len(records),
            "total_invoice_value": round(sum(r["invoice_value"] for r in records), 2),
            "total_taxable_value": round(sum(r["taxable_value"] for r in records), 2),
            "total_cgst": round(sum(r["cgst_amount"] for r in records), 2),
            "total_sgst": round(sum(r["sgst_amount"] for r in records), 2),
            "total_igst": round(sum(r["igst_amount"] for r in records), 2),
            "records": records,
        })

    # Generate official GSTR-1 formatted CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "GSTIN/UIN of Recipient",
        "Receiver Name",
        "Invoice Number",
        "Invoice Date",
        "Invoice Value (₹)",
        "Place Of Supply",
        "Reverse Charge",
        "Applicable % of Tax Rate",
        "Invoice Type",
        "Rate (%)",
        "Taxable Value (₹)",
        "Cess Amount (₹)",
        "CGST Amount (₹)",
        "SGST Amount (₹)",
        "IGST Amount (₹)",
        "HSN / SAC Codes",
    ])

    for r in records:
        writer.writerow([
            r["gstin_recipient"],
            r["receiver_name"],
            r["invoice_number"],
            r["invoice_date"],
            f"{r['invoice_value']:.2f}",
            r["place_of_supply"],
            r["reverse_charge"],
            f"{r['applicable_tax_rate']:.1f}%",
            r["invoice_type"],
            "18.00",
            f"{r['taxable_value']:.2f}",
            f"{r['cess_amount']:.2f}",
            f"{r['cgst_amount']:.2f}",
            f"{r['sgst_amount']:.2f}",
            f"{r['igst_amount']:.2f}",
            r["hsn_summary"],
        ])

    csv_bytes = output.getvalue().encode("utf-8-sig")  # utf-8 with BOM for Excel compatibility
    filename = f"GSTR1_Sales_{from_date or 'all'}_{to_date or 'latest'}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        },
    )

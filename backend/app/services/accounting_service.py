"""Double-Entry Accounting Service, Subledger Posting Engine, and Financial Reports."""
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
import uuid

from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.accounting import (
    Account,
    AccountType,
    CreditNote,
    CreditNoteLine,
    FiscalPeriod,
    FiscalPeriodStatus,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    JournalEntry,
    JournalEntryStatus,
    JournalLine,
    PaymentAllocation,
    Settlement,
)
from app.models.order import Order, OrderItem, OrderStatus, Payment, PaymentStatus
from app.models.outbox import OutboxEvent
from app.schemas.accounting import (
    AccountCreate,
    AccountOut,
    AccountsReceivableAgingReport,
    AgingBucket,
    BalanceSheetReport,
    CreditNoteCreateRequest,
    CreditNoteOut,
    FiscalPeriodCreate,
    FiscalPeriodLockRequest,
    FiscalPeriodOut,
    GeneralLedgerAccountSummary,
    GeneralLedgerReport,
    GeneralLedgerTransaction,
    GstSubledgerItem,
    GstSubledgerReport,
    InvoiceIssueRequest,
    InvoiceLineOut,
    InvoiceOut,
    JournalEntryCreateRequest,
    JournalEntryOut,
    JournalLineInput,
    JournalLineOut,
    JournalReversalRequest,
    PaymentAllocationOut,
    PaymentAllocationRequest,
    ProfitAndLossReport,
    SettlementOut,
    TrialBalanceItem,
    TrialBalanceReport,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


DEFAULT_CHART_OF_ACCOUNTS = [
    # Assets (1000s)
    {"code": "1010", "name": "Operating Bank Account (HDFC/SBI)", "type": AccountType.ASSET, "normal": "DEBIT"},
    {"code": "1020", "name": "Payment Gateway Clearing (Razorpay)", "type": AccountType.ASSET, "normal": "DEBIT"},
    {"code": "1030", "name": "Carrier COD Clearing (India Post Speed Post)", "type": AccountType.ASSET, "normal": "DEBIT"},
    {"code": "1100", "name": "Accounts Receivable (Trade Debtors)", "type": AccountType.ASSET, "normal": "DEBIT"},
    {"code": "1200", "name": "Finished Goods Stock (SS304 Drain Clips)", "type": AccountType.ASSET, "normal": "DEBIT"},
    # Liabilities (2000s)
    {"code": "2010", "name": "Output CGST Payable", "type": AccountType.LIABILITY, "normal": "CREDIT"},
    {"code": "2020", "name": "Output SGST Payable", "type": AccountType.LIABILITY, "normal": "CREDIT"},
    {"code": "2030", "name": "Output IGST Payable", "type": AccountType.LIABILITY, "normal": "CREDIT"},
    {"code": "2100", "name": "Customer Advance Receipts", "type": AccountType.LIABILITY, "normal": "CREDIT"},
    # Equity (3000s)
    {"code": "3010", "name": "Owner Capital & Retained Earnings", "type": AccountType.EQUITY, "normal": "CREDIT"},
    # Revenue (4000s)
    {"code": "4010", "name": "Sales Revenue (Drain Clips & Engineering Hardware)", "type": AccountType.REVENUE, "normal": "CREDIT"},
    {"code": "4020", "name": "Shipping & Freight Income Recovered", "type": AccountType.REVENUE, "normal": "CREDIT"},
    # Expenses (5000s)
    {"code": "5010", "name": "Cost of Goods Sold (COGS - Stainless Steel Material)", "type": AccountType.EXPENSE, "normal": "DEBIT"},
    {"code": "5020", "name": "Payment Gateway Processing Fees", "type": AccountType.EXPENSE, "normal": "DEBIT"},
    {"code": "5030", "name": "Outward Freight & Logistics Charges", "type": AccountType.EXPENSE, "normal": "DEBIT"},
]


class AccountingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -------------------------------------------------------------------------
    # Chart of Accounts Bootstrap
    # -------------------------------------------------------------------------

    async def ensure_standard_chart_of_accounts(self, company_id: uuid.UUID) -> None:
        """Seed standard chart of accounts if not present."""
        stmt = select(Account.code).where(Account.company_id == company_id)
        res = await self.db.execute(stmt)
        existing_codes = set(res.scalars().all())

        for acc in DEFAULT_CHART_OF_ACCOUNTS:
            if acc["code"] not in existing_codes:
                new_acc = Account(
                    company_id=company_id,
                    code=acc["code"],
                    name=acc["name"],
                    account_type=acc["type"],
                    normal_balance=acc["normal"],
                    is_active=True,
                )
                self.db.add(new_acc)
        await self.db.flush()

    async def list_accounts(self, company_id: uuid.UUID) -> list[AccountOut]:
        await self.ensure_standard_chart_of_accounts(company_id)
        stmt = select(Account).where(Account.company_id == company_id).order_by(Account.code)
        res = await self.db.execute(stmt)
        accounts = res.scalars().all()
        return [AccountOut.model_validate(a) for a in accounts]

    async def create_account(self, company_id: uuid.UUID, req: AccountCreate) -> AccountOut:
        clean_code = req.code.strip().upper()
        stmt = select(Account).where(Account.company_id == company_id, Account.code == clean_code)
        existing = (await self.db.execute(stmt)).scalars().first()
        if existing:
            raise ValueError(f"Account code {clean_code} already exists")

        acc = Account(
            company_id=company_id,
            code=clean_code,
            name=req.name.strip(),
            account_type=AccountType(req.account_type),
            normal_balance=req.normal_balance.upper(),
            parent_id=req.parent_id,
            is_active=req.is_active,
        )
        self.db.add(acc)
        await self.db.commit()
        await self.db.refresh(acc)
        return AccountOut.model_validate(acc)

    # -------------------------------------------------------------------------
    # Fiscal Periods
    # -------------------------------------------------------------------------

    async def ensure_default_fiscal_period(self, company_id: uuid.UUID, for_date: date | None = None) -> FiscalPeriod:
        """Ensure an active open fiscal period covers the target date."""
        target_date = for_date or date.today()
        stmt = select(FiscalPeriod).where(
            FiscalPeriod.company_id == company_id,
            FiscalPeriod.start_date <= target_date,
            FiscalPeriod.end_date >= target_date,
        )
        res = await self.db.execute(stmt)
        period = res.scalars().first()
        if period:
            return period

        # Create Indian Financial Year (April 1 to March 31)
        year = target_date.year if target_date.month >= 4 else target_date.year - 1
        fy_name = f"FY {year}-{str(year+1)[-2:]}"
        start_d = date(year, 4, 1)
        end_d = date(year + 1, 3, 31)

        period = FiscalPeriod(
            company_id=company_id,
            name=fy_name,
            start_date=start_d,
            end_date=end_d,
            status=FiscalPeriodStatus.OPEN,
        )
        self.db.add(period)
        await self.db.flush()
        return period

    async def list_fiscal_periods(self, company_id: uuid.UUID) -> list[FiscalPeriodOut]:
        stmt = select(FiscalPeriod).where(FiscalPeriod.company_id == company_id).order_by(FiscalPeriod.start_date.desc())
        res = await self.db.execute(stmt)
        periods = res.scalars().all()
        return [FiscalPeriodOut.model_validate(p) for p in periods]

    async def lock_fiscal_period(
        self, period_id: uuid.UUID, req: FiscalPeriodLockRequest, current_user_id: uuid.UUID | None = None
    ) -> FiscalPeriodOut:
        period = await self.db.get(FiscalPeriod, period_id)
        if not period:
            raise ValueError(f"Fiscal period {period_id} not found")

        target_status = FiscalPeriodStatus(req.status.upper())
        period.status = target_status
        if target_status == FiscalPeriodStatus.LOCKED:
            period.locked_at = utcnow()
            period.locked_by = current_user_id
        else:
            period.locked_at = None
            period.locked_by = None

        await self.db.commit()
        await self.db.refresh(period)
        return FiscalPeriodOut.model_validate(period)

    # -------------------------------------------------------------------------
    # Double-Entry Subledger Posting Engine
    # -------------------------------------------------------------------------

    async def post_journal_entry(
        self, company_id: uuid.UUID, req: JournalEntryCreateRequest, user_id: uuid.UUID | None = None
    ) -> JournalEntryOut:
        """
        Authoritative posting of double-entry journal entry.
        Guards:
        1. Fiscal period must be OPEN.
        2. sum(debits) == sum(credits) exactly.
        3. Each line must have exactly one positive side (debit > 0 or credit > 0).
        4. Idempotent on (company_id, source_type, source_id, posting_kind).
        """
        await self.ensure_standard_chart_of_accounts(company_id)

        # 1. Period Lock Guard
        period = await self.ensure_default_fiscal_period(company_id, req.posting_date)
        if period.status == FiscalPeriodStatus.LOCKED:
            raise ValueError(f"Cannot post to locked fiscal period: {period.name} ({period.start_date} to {period.end_date})")

        # 2. Duplicate Check
        existing_stmt = select(JournalEntry).where(
            JournalEntry.company_id == company_id,
            JournalEntry.source_type == req.source_type,
            JournalEntry.source_id == req.source_id,
            JournalEntry.posting_kind == req.posting_kind,
        )
        existing_res = await self.db.execute(existing_stmt)
        if existing_res.scalars().first():
            raise ValueError(
                f"Duplicate journal entry for {req.source_type}:{req.source_id} with kind {req.posting_kind}"
            )

        # 3. Double-Entry Balance Guard
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for line in req.lines:
            d = round_currency(line.debit)
            c = round_currency(line.credit)
            if d > 0 and c > 0:
                raise ValueError(f"Invalid line: both debit ({d}) and credit ({c}) cannot be positive simultaneously")
            if d == 0 and c == 0:
                raise ValueError("Invalid line: either debit or credit must be positive")
            total_debit += d
            total_credit += c

        if total_debit != total_credit:
            raise ValueError(
                f"Unbalanced journal entry! Sum(Debit)={total_debit} does not equal Sum(Credit)={total_credit}"
            )

        # 4. Resolve Accounts
        acc_codes = [line.account_code.strip().upper() for line in req.lines]
        acc_stmt = select(Account).where(Account.company_id == company_id, Account.code.in_(acc_codes))
        acc_res = await self.db.execute(acc_stmt)
        acc_map = {acc.code: acc for acc in acc_res.scalars().all()}

        for code in acc_codes:
            if code not in acc_map:
                raise ValueError(f"Account code {code} does not exist in chart of accounts")

        # 5. Create Header in DRAFT state first
        journal = JournalEntry(
            company_id=company_id,
            posting_date=req.posting_date,
            period_id=period.id,
            status=JournalEntryStatus.DRAFT,
            source_type=req.source_type,
            source_id=req.source_id,
            posting_kind=req.posting_kind,
            description=req.description,
            posted_at=utcnow(),
            posted_by=user_id,
        )
        self.db.add(journal)
        await self.db.flush()

        # 6. Create Lines
        out_lines: list[JournalLineOut] = []
        for line in req.lines:
            code = line.account_code.strip().upper()
            acc = acc_map[code]
            d = round_currency(line.debit)
            c = round_currency(line.credit)

            line_id = uuid.uuid4()
            j_line = JournalLine(
                id=line_id,
                journal_entry_id=journal.id,
                account_id=acc.id,
                debit=d,
                credit=c,
                currency="INR",
                customer_id=line.customer_id,
                supplier_id=line.supplier_id,
                cost_center_id=line.cost_center_id,
            )
            self.db.add(j_line)

            out_lines.append(
                JournalLineOut(
                    id=line_id,
                    account_id=acc.id,
                    account_code=acc.code,
                    account_name=acc.name,
                    debit=d,
                    credit=c,
                    currency="INR",
                    customer_id=line.customer_id,
                    supplier_id=line.supplier_id,
                    cost_center_id=line.cost_center_id,
                )
            )

        await self.db.flush()

        # 7. Transition to POSTED status (fires database trigger trg_check_journal_balance)
        journal.status = JournalEntryStatus.POSTED
        await self.db.flush()

        # 7. Outbox Event
        outbox = OutboxEvent(
            event_type="accounting.journal.posted.v1",
            aggregate_type="journal_entry",
            aggregate_id=journal.id,
            payload={
                "journal_id": str(journal.id),
                "source_type": journal.source_type,
                "source_id": journal.source_id,
                "posting_date": journal.posting_date.isoformat(),
                "total_amount": str(total_debit),
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return JournalEntryOut(
            id=journal.id,
            company_id=journal.company_id,
            posting_date=journal.posting_date,
            period_id=journal.period_id,
            status=journal.status.value,
            source_type=journal.source_type,
            source_id=journal.source_id,
            posting_kind=journal.posting_kind,
            reversal_of=journal.reversal_of,
            description=journal.description,
            posted_at=journal.posted_at,
            lines=out_lines,
        )

    async def reverse_journal_entry(
        self, journal_id: uuid.UUID, req: JournalReversalRequest, user_id: uuid.UUID | None = None
    ) -> JournalEntryOut:
        """
        Immutable reversal of a posted journal entry.
        Original journal status is set to REVERSED; a new journal entry is posted with swapped debits/credits.
        """
        stmt = select(JournalEntry).where(JournalEntry.id == journal_id).options(
            selectinload(JournalEntry.lines).selectinload(JournalLine.account)
        )
        res = await self.db.execute(stmt)
        original = res.scalars().first()
        if not original:
            raise ValueError(f"Journal entry {journal_id} not found")

        if original.status == JournalEntryStatus.REVERSED:
            raise ValueError(f"Journal entry {journal_id} has already been reversed")

        reversal_lines: list[JournalLineInput] = []
        for line in original.lines:
            reversal_lines.append(
                JournalLineInput(
                    account_code=line.account.code,
                    debit=line.credit,  # Swap debit and credit
                    credit=line.debit,
                    customer_id=line.customer_id,
                    supplier_id=line.supplier_id,
                    cost_center_id=line.cost_center_id,
                )
            )

        create_req = JournalEntryCreateRequest(
            posting_date=date.today(),
            source_type=original.source_type,
            source_id=original.source_id,
            posting_kind="REVERSAL",
            description=f"Reversal of {original.id}: {req.reason.strip()}",
            lines=reversal_lines,
        )

        reversal_out = await self.post_journal_entry(original.company_id, create_req, user_id)
        original.status = JournalEntryStatus.REVERSED
        await self.db.commit()

        return reversal_out

    # -------------------------------------------------------------------------
    # Tax Invoice Issuance
    # -------------------------------------------------------------------------

    async def issue_invoice_for_order(self, req: InvoiceIssueRequest) -> InvoiceOut:
        """
        Generate statutory GST Tax Invoice for confirmed order and post general ledger entry.
        Idempotent: returns existing invoice if already issued.
        """
        company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

        # 1. Check existing invoice
        stmt = select(Invoice).where(Invoice.order_id == req.order_id).options(selectinload(Invoice.lines))
        res = await self.db.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return InvoiceOut.model_validate(existing)

        # 2. Fetch Order with Items
        order_stmt = select(Order).where(Order.id == req.order_id).options(selectinload(Order.items))
        order_res = await self.db.execute(order_stmt)
        order = order_res.scalars().first()
        if not order:
            raise ValueError(f"Order {req.order_id} not found")

        # 3. Generate sequential invoice number transactionally
        count_stmt = select(func.count(Invoice.id)).where(
            Invoice.company_id == company_id,
            Invoice.series == req.series,
            Invoice.financial_year == req.financial_year,
        )
        invoice_seq = ((await self.db.execute(count_stmt)).scalar() or 0) + 1
        invoice_num = f"{req.series}/{req.financial_year}/{invoice_seq:04d}"

        today = date.today()
        due_d = today + timedelta(days=req.due_days)

        invoice = Invoice(
            company_id=company_id,
            order_id=order.id,
            series=req.series,
            financial_year=req.financial_year,
            invoice_number=invoice_num,
            status=InvoiceStatus.ISSUED,
            issue_date=today,
            due_date=due_d,
            currency="INR",
            subtotal=order.subtotal_taxable,
            tax_total=round_currency(order.product_gst + order.shipping_gst),
            shipping_total=order.shipping_base,
            grand_total=order.total_payable,
            totals_snapshot={
                "order_number": order.order_number,
                "subtotal_taxable": str(order.subtotal_taxable),
                "product_gst": str(order.product_gst),
                "shipping_base": str(order.shipping_base),
                "shipping_gst": str(order.shipping_gst),
                "grand_total": str(order.total_payable),
            },
        )
        self.db.add(invoice)
        await self.db.flush()

        # 4. Generate Invoice Lines from Order Items
        total_cgst = Decimal("0.00")
        total_sgst = Decimal("0.00")
        total_igst = Decimal("0.00")

        lines_out: list[InvoiceLineOut] = []
        for item in order.items:
            # Assume intrastate Gujarat by default (CGST 9% + SGST 9%)
            cgst_r = round_currency(item.gst_rate / Decimal("2.0"))
            sgst_r = cgst_r
            cgst_a = round_currency(item.product_gst / Decimal("2.0"))
            sgst_a = round_currency(item.product_gst - cgst_a)
            igst_r = Decimal("0.0000")
            igst_a = Decimal("0.00")

            total_cgst += cgst_a
            total_sgst += sgst_a

            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                order_item_id=item.id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                taxable_amount=item.taxable_base,
                cgst_rate=cgst_r,
                cgst_amount=cgst_a,
                sgst_rate=sgst_r,
                sgst_amount=sgst_a,
                igst_rate=igst_r,
                igst_amount=igst_a,
                line_total=item.line_gross,
            )
            self.db.add(inv_line)
            await self.db.flush()
            lines_out.append(InvoiceLineOut.model_validate(inv_line))

        # Shipping tax breakdown (18% GST -> 9% CGST + 9% SGST)
        ship_cgst = round_currency(order.shipping_gst / Decimal("2.0"))
        ship_sgst = round_currency(order.shipping_gst - ship_cgst)
        total_cgst += ship_cgst
        total_sgst += ship_sgst

        # 5. Post Double-Entry Journal Entry for Revenue & Tax Recognition
        # Dr Accounts Receivable (1100): Grand Total
        # Cr Sales Revenue (4010): Product Subtotal
        # Cr Shipping Revenue (4020): Shipping Base
        # Cr Output CGST (2010): Total CGST
        # Cr Output SGST (2020): Total SGST
        journal_lines = [
            JournalLineInput(account_code="1100", debit=invoice.grand_total, credit=Decimal("0.00")),
            JournalLineInput(account_code="4010", debit=Decimal("0.00"), credit=invoice.subtotal),
        ]
        if invoice.shipping_total > 0:
            journal_lines.append(
                JournalLineInput(account_code="4020", debit=Decimal("0.00"), credit=invoice.shipping_total)
            )
        if total_cgst > 0:
            journal_lines.append(
                JournalLineInput(account_code="2010", debit=Decimal("0.00"), credit=total_cgst)
            )
        if total_sgst > 0:
            journal_lines.append(
                JournalLineInput(account_code="2020", debit=Decimal("0.00"), credit=total_sgst)
            )
        if total_igst > 0:
            journal_lines.append(
                JournalLineInput(account_code="2030", debit=Decimal("0.00"), credit=total_igst)
            )

        # Balance check adjustment for 1-paisa rounding
        total_cr = sum(line.credit for line in journal_lines)
        diff = invoice.grand_total - total_cr
        if diff != Decimal("0.00"):
            # Adjust to Sales Revenue to ensure exact balance
            for l in journal_lines:
                if l.account_code == "4010":
                    l.credit += diff
                    break

        await self.post_journal_entry(
            company_id=company_id,
            req=JournalEntryCreateRequest(
                posting_date=today,
                source_type="INVOICE",
                source_id=str(invoice.id),
                posting_kind="ORIGINAL",
                description=f"GST Tax Invoice {invoice.invoice_number} for Order {order.order_number}",
                lines=journal_lines,
            ),
        )

        outbox = OutboxEvent(
            event_type="accounting.invoice.issued.v1",
            aggregate_type="invoice",
            aggregate_id=invoice.id,
            payload={
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "order_id": str(order.id),
                "grand_total": str(invoice.grand_total),
            },
        )
        self.db.add(outbox)
        await self.db.commit()

        return InvoiceOut(
            id=invoice.id,
            company_id=invoice.company_id,
            order_id=invoice.order_id,
            series=invoice.series,
            financial_year=invoice.financial_year,
            invoice_number=invoice.invoice_number,
            status=invoice.status.value,
            issue_date=invoice.issue_date,
            due_date=invoice.due_date,
            currency=invoice.currency,
            subtotal=invoice.subtotal,
            tax_total=invoice.tax_total,
            shipping_total=invoice.shipping_total,
            grand_total=invoice.grand_total,
            totals_snapshot=invoice.totals_snapshot,
            created_at=invoice.created_at,
            lines=lines_out,
        )

    # -------------------------------------------------------------------------
    # Payment Allocation Engine
    # -------------------------------------------------------------------------

    async def allocate_payment(self, req: PaymentAllocationRequest) -> PaymentAllocationOut:
        """
        Allocate captured payment to an invoice atomically.
        Guards:
        1. Allocation amount cannot exceed unallocated payment balance.
        2. Allocation amount cannot exceed unpaid invoice balance.
        3. Posts Dr Bank / Clearing (1010/1020), Cr Accounts Receivable (1100).
        """
        payment = await self.db.get(Payment, req.payment_id)
        if not payment:
            raise ValueError(f"Payment {req.payment_id} not found")

        if payment.status not in (PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED):
            raise ValueError(f"Payment {req.payment_id} is not captured (status: {payment.status})")

        invoice = await self.db.get(Invoice, req.invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {req.invoice_id} not found")

        # Check existing allocations for payment
        p_stmt = select(func.coalesce(func.sum(PaymentAllocation.amount), Decimal("0.00"))).where(
            PaymentAllocation.payment_id == payment.id
        )
        p_allocated = (await self.db.execute(p_stmt)).scalar() or Decimal("0.00")
        unallocated_payment = payment.amount - p_allocated
        if req.amount > unallocated_payment:
            raise ValueError(
                f"Allocation amount {req.amount} exceeds unallocated payment balance {unallocated_payment}"
            )

        # Check existing allocations for invoice
        i_stmt = select(func.coalesce(func.sum(PaymentAllocation.amount), Decimal("0.00"))).where(
            PaymentAllocation.invoice_id == invoice.id
        )
        i_allocated = (await self.db.execute(i_stmt)).scalar() or Decimal("0.00")
        unpaid_invoice = invoice.grand_total - i_allocated
        if req.amount > unpaid_invoice:
            raise ValueError(
                f"Allocation amount {req.amount} exceeds unpaid invoice balance {unpaid_invoice}"
            )

        alloc_id = uuid.uuid4()
        alloc = PaymentAllocation(
            id=alloc_id,
            payment_id=payment.id,
            invoice_id=invoice.id,
            amount=round_currency(req.amount),
        )
        self.db.add(alloc)
        await self.db.flush()

        # Update invoice payment status
        if i_allocated + req.amount >= invoice.grand_total:
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        # Post General Ledger Journal:
        # Dr Bank Clearing (1020 for Razorpay, 1010 for Direct UPI): amount
        # Cr Accounts Receivable (1100): amount
        clearing_acc = "1020" if payment.provider.lower() == "razorpay" else "1010"
        await self.post_journal_entry(
            company_id=invoice.company_id,
            req=JournalEntryCreateRequest(
                posting_date=date.today(),
                source_type="PAYMENT_ALLOCATION",
                source_id=str(alloc_id),
                posting_kind="ORIGINAL",
                description=f"Payment allocation against Invoice {invoice.invoice_number} ({payment.provider})",
                lines=[
                    JournalLineInput(account_code=clearing_acc, debit=alloc.amount, credit=Decimal("0.00")),
                    JournalLineInput(account_code="1100", debit=Decimal("0.00"), credit=alloc.amount),
                ],
            ),
        )

        await self.db.commit()
        await self.db.refresh(alloc)
        return PaymentAllocationOut.model_validate(alloc)

    # -------------------------------------------------------------------------
    # COGS Recognition at Dispatch
    # -------------------------------------------------------------------------

    async def record_cogs_at_dispatch(
        self, company_id: uuid.UUID, shipment_id: uuid.UUID, total_cost: Decimal
    ) -> JournalEntryOut:
        """
        Record Cost of Goods Sold when shipment is dispatched:
        Dr COGS (5010): total_cost
        Cr Inventory Asset (1200): total_cost
        """
        cost = round_currency(total_cost)
        if cost <= 0:
            raise ValueError("COGS cost must be greater than zero")

        return await self.post_journal_entry(
            company_id=company_id,
            req=JournalEntryCreateRequest(
                posting_date=date.today(),
                source_type="COGS",
                source_id=str(shipment_id),
                posting_kind="ORIGINAL",
                description=f"COGS recognition for dispatched shipment {shipment_id}",
                lines=[
                    JournalLineInput(account_code="5010", debit=cost, credit=Decimal("0.00")),
                    JournalLineInput(account_code="1200", debit=Decimal("0.00"), credit=cost),
                ],
            ),
        )

    # -------------------------------------------------------------------------
    # Financial Reports Engine
    # -------------------------------------------------------------------------

    async def generate_trial_balance(self, company_id: uuid.UUID, as_of_date: date) -> TrialBalanceReport:
        """
        Authoritative Trial Balance showing debit and credit sums per account.
        Invariants: Total Debit must equal Total Credit!
        """
        await self.ensure_standard_chart_of_accounts(company_id)

        stmt = (
            select(
                Account.code,
                Account.name,
                Account.account_type,
                func.coalesce(func.sum(JournalLine.debit), Decimal("0.00")).label("total_debit"),
                func.coalesce(func.sum(JournalLine.credit), Decimal("0.00")).label("total_credit"),
            )
            .join(JournalLine, JournalLine.account_id == Account.id, isouter=True)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id, isouter=True)
            .where(
                Account.company_id == company_id,
                or_(JournalEntry.posting_date.is_(None), JournalEntry.posting_date <= as_of_date),
                or_(JournalEntry.status.is_(None), JournalEntry.status.in_([JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED])),
            )
            .group_by(Account.code, Account.name, Account.account_type)
            .order_by(Account.code)
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        items: list[TrialBalanceItem] = []
        grand_debit = Decimal("0.00")
        grand_credit = Decimal("0.00")

        for r in rows:
            td = round_currency(Decimal(str(r.total_debit)))
            tc = round_currency(Decimal(str(r.total_credit)))
            grand_debit += td
            grand_credit += tc

            # Net position
            if td >= tc:
                net_d = td - tc
                net_c = Decimal("0.00")
            else:
                net_d = Decimal("0.00")
                net_c = tc - td

            items.append(
                TrialBalanceItem(
                    account_code=r.code,
                    account_name=r.name,
                    account_type=r.account_type.value if hasattr(r.account_type, "value") else str(r.account_type),
                    total_debit=td,
                    total_credit=tc,
                    net_debit=net_d,
                    net_credit=net_c,
                )
            )

        return TrialBalanceReport(
            as_of_date=as_of_date,
            items=items,
            total_debit=grand_debit,
            total_credit=grand_credit,
            is_balanced=(grand_debit == grand_credit),
        )

    async def generate_profit_and_loss(
        self, company_id: uuid.UUID, from_date: date, to_date: date
    ) -> ProfitAndLossReport:
        """
        Statutory Profit & Loss statement based on recognized revenues and actual expenses.
        """
        await self.ensure_standard_chart_of_accounts(company_id)

        stmt = (
            select(
                Account.code,
                Account.account_type,
                func.coalesce(func.sum(JournalLine.debit), Decimal("0.00")).label("total_debit"),
                func.coalesce(func.sum(JournalLine.credit), Decimal("0.00")).label("total_credit"),
            )
            .join(JournalLine, JournalLine.account_id == Account.id)
            .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
            .where(
                Account.company_id == company_id,
                JournalEntry.posting_date >= from_date,
                JournalEntry.posting_date <= to_date,
                JournalEntry.status.in_([JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED]),
                Account.account_type.in_([AccountType.REVENUE, AccountType.EXPENSE]),
            )
            .group_by(Account.code, Account.account_type)
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        op_rev = Decimal("0.00")
        ship_rev = Decimal("0.00")
        cogs = Decimal("0.00")
        op_exp = Decimal("0.00")

        for r in rows:
            td = round_currency(Decimal(str(r.total_debit)))
            tc = round_currency(Decimal(str(r.total_credit)))
            net_cr = tc - td  # Normal for revenue
            net_dr = td - tc  # Normal for expense

            if r.code == "4010":
                op_rev += net_cr
            elif r.code == "4020":
                ship_rev += net_cr
            elif r.code == "5010":
                cogs += net_dr
            elif r.code in ("5020", "5030"):
                op_exp += net_dr

        tot_rev = op_rev + ship_rev
        gross_margin = tot_rev - cogs
        gm_pct = round_currency((gross_margin / tot_rev * Decimal("100.00"))) if tot_rev > 0 else Decimal("0.00")
        net_profit = gross_margin - op_exp
        np_pct = round_currency((net_profit / tot_rev * Decimal("100.00"))) if tot_rev > 0 else Decimal("0.00")

        return ProfitAndLossReport(
            from_date=from_date,
            to_date=to_date,
            operating_revenue=op_rev,
            shipping_revenue=ship_rev,
            total_revenue=tot_rev,
            cost_of_goods_sold=cogs,
            gross_margin=gross_margin,
            gross_margin_percentage=gm_pct,
            operating_expenses=op_exp,
            net_profit=net_profit,
            net_profit_percentage=np_pct,
        )

    async def generate_gst_subledger(
        self, company_id: uuid.UUID, from_date: date, to_date: date
    ) -> GstSubledgerReport:
        """GST output tax subledger for CGST, SGST, IGST statutory filing."""
        stmt = (
            select(
                func.coalesce(func.sum(InvoiceLine.taxable_amount), Decimal("0.00")).label("taxable_base"),
                func.coalesce(func.sum(InvoiceLine.cgst_amount), Decimal("0.00")).label("cgst_total"),
                func.coalesce(func.sum(InvoiceLine.sgst_amount), Decimal("0.00")).label("sgst_total"),
                func.coalesce(func.sum(InvoiceLine.igst_amount), Decimal("0.00")).label("igst_total"),
            )
            .join(Invoice, Invoice.id == InvoiceLine.invoice_id)
            .where(
                Invoice.company_id == company_id,
                Invoice.issue_date >= from_date,
                Invoice.issue_date <= to_date,
                Invoice.status != InvoiceStatus.VOID,
            )
        )
        res = await self.db.execute(stmt)
        r = res.first()

        taxable = round_currency(Decimal(str(r.taxable_base))) if r else Decimal("0.00")
        cgst = round_currency(Decimal(str(r.cgst_total))) if r else Decimal("0.00")
        sgst = round_currency(Decimal(str(r.sgst_total))) if r else Decimal("0.00")
        igst = round_currency(Decimal(str(r.igst_total))) if r else Decimal("0.00")

        items = [
            GstSubledgerItem(tax_type="CGST", taxable_turnover=taxable, tax_collected=cgst),
            GstSubledgerItem(tax_type="SGST", taxable_turnover=taxable, tax_collected=sgst),
            GstSubledgerItem(tax_type="IGST", taxable_turnover=taxable, tax_collected=igst),
        ]
        return GstSubledgerReport(
            from_date=from_date,
            to_date=to_date,
            items=items,
            total_tax_collected=cgst + sgst + igst,
        )

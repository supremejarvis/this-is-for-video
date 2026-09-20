"""Integration tests for Phase 5: Double-Entry Accounting, Period Controls, and Financial Reports on PostgreSQL."""
from datetime import date, datetime
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

POSTGRES_DB_URL = "postgresql+asyncpg://apollo_ecommerce:Goal%25495@127.0.0.1:5432/apollo_ecommerce"


@pytest.fixture
async def session_factory():
    engine = create_async_engine(POSTGRES_DB_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.fixture
async def db_session(session_factory):
    async with session_factory() as session:
        yield session


from app.models.accounting import (
    Account,
    FiscalPeriod,
    FiscalPeriodStatus,
    Invoice,
    InvoiceStatus,
    JournalEntry,
    JournalEntryStatus,
    PaymentAllocation,
)
from app.models.order import FulfilmentStatus, Order, OrderItem, OrderStatus, Payment, PaymentStatus
from app.schemas.accounting import (
    FiscalPeriodLockRequest,
    InvoiceIssueRequest,
    JournalEntryCreateRequest,
    JournalLineInput,
    JournalReversalRequest,
    PaymentAllocationRequest,
)
from app.services.accounting_service import AccountingService

COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest.mark.asyncio
async def test_double_entry_balance_guard(db_session: AsyncSession):
    """Every posted journal must balance: sum(debit) == sum(credit); unbalanced entries must fail."""
    service = AccountingService(db_session)
    await service.ensure_standard_chart_of_accounts(COMPANY_ID)

    # 1. Unbalanced Entry (Debits = 100, Credits = 90) -> Must fail!
    unbalanced_req = JournalEntryCreateRequest(
        posting_date=date.today(),
        source_type="MANUAL",
        source_id=f"UNBAL-{uuid.uuid4().hex[:8]}",
        posting_kind="ORIGINAL",
        description="Test unbalanced journal entry",
        lines=[
            JournalLineInput(account_code="1010", debit=Decimal("100.00"), credit=Decimal("0.00")),
            JournalLineInput(account_code="4010", debit=Decimal("0.00"), credit=Decimal("90.00")),
        ],
    )
    with pytest.raises(ValueError, match="Unbalanced journal entry"):
        await service.post_journal_entry(COMPANY_ID, unbalanced_req)

    # 2. Balanced Entry (Debits = 100, Credits = 100) -> Must succeed!
    balanced_req = JournalEntryCreateRequest(
        posting_date=date.today(),
        source_type="MANUAL",
        source_id=f"BAL-{uuid.uuid4().hex[:8]}",
        posting_kind="ORIGINAL",
        description="Test balanced journal entry",
        lines=[
            JournalLineInput(account_code="1010", debit=Decimal("100.00"), credit=Decimal("0.00")),
            JournalLineInput(account_code="4010", debit=Decimal("0.00"), credit=Decimal("100.00")),
        ],
    )
    res = await service.post_journal_entry(COMPANY_ID, balanced_req)
    assert res.status == "POSTED"
    assert len(res.lines) == 2


@pytest.mark.asyncio
async def test_locked_fiscal_period_rejects_posting(db_session: AsyncSession):
    """Posting into a locked fiscal period must be strictly prohibited."""
    service = AccountingService(db_session)
    period = await service.ensure_default_fiscal_period(COMPANY_ID, date.today())

    # Lock the fiscal period
    await service.lock_fiscal_period(period.id, FiscalPeriodLockRequest(status="LOCKED", reason="Year-end audit close"))

    # Attempt to post -> Must be rejected!
    post_req = JournalEntryCreateRequest(
        posting_date=date.today(),
        source_type="MANUAL",
        source_id=f"LOCK-TEST-{uuid.uuid4().hex[:8]}",
        posting_kind="ORIGINAL",
        description="Attempt to post into locked period",
        lines=[
            JournalLineInput(account_code="1010", debit=Decimal("50.00"), credit=Decimal("0.00")),
            JournalLineInput(account_code="4010", debit=Decimal("0.00"), credit=Decimal("50.00")),
        ],
    )
    with pytest.raises(ValueError, match="Cannot post to locked fiscal period"):
        await service.post_journal_entry(COMPANY_ID, post_req)

    # Unlock period for remaining operations
    await service.lock_fiscal_period(period.id, FiscalPeriodLockRequest(status="OPEN", reason="Reopened for testing"))


@pytest.mark.asyncio
async def test_immutable_journal_reversal(db_session: AsyncSession):
    """Posted journal entries are immutable; reversal creates a linked reversal entry with inverted debits/credits."""
    service = AccountingService(db_session)
    source_id = f"REV-SRC-{uuid.uuid4().hex[:8]}"

    # 1. Post original entry
    orig_req = JournalEntryCreateRequest(
        posting_date=date.today(),
        source_type="TEST_CORRECTION",
        source_id=source_id,
        posting_kind="ORIGINAL",
        description="Original transaction to be corrected",
        lines=[
            JournalLineInput(account_code="1100", debit=Decimal("250.00"), credit=Decimal("0.00")),
            JournalLineInput(account_code="4010", debit=Decimal("0.00"), credit=Decimal("250.00")),
        ],
    )
    original = await service.post_journal_entry(COMPANY_ID, orig_req)
    assert original.status == "POSTED"

    # 2. Reverse the entry
    reversal = await service.reverse_journal_entry(
        original.id, JournalReversalRequest(reason="Customer order canceled before dispatch")
    )
    assert reversal.posting_kind == "REVERSAL"
    assert reversal.status == "POSTED"

    # Inverted lines: 1100 has Credit 250, 4010 has Debit 250
    for line in reversal.lines:
        if line.account_code == "1100":
            assert line.credit == Decimal("250.00")
            assert line.debit == Decimal("0.00")
        elif line.account_code == "4010":
            assert line.debit == Decimal("250.00")
            assert line.credit == Decimal("0.00")

    # Original status is updated to REVERSED
    db_orig = await db_session.get(JournalEntry, original.id)
    assert db_orig.status == JournalEntryStatus.REVERSED


@pytest.mark.asyncio
async def test_invoice_issuance_and_payment_allocation(db_session: AsyncSession):
    """Issuing an invoice generates sequential invoice numbers and posts double-entry revenue; payment allocation updates status."""
    service = AccountingService(db_session)

    # 1. Create order and order items
    order = Order(
        order_number=f"ORD-ACCT-{uuid.uuid4().hex[:6]}",
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.CAPTURED,
        fulfilment_status=FulfilmentStatus.UNFULFILLED,
        subtotal_taxable=Decimal("100.00"),
        product_gst=Decimal("18.00"),
        shipping_base=Decimal("30.00"),
        shipping_gst=Decimal("5.40"),
        total_payable=Decimal("153.40"),
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        sku="APE-SC-35MM-P50",
        quantity=2,
        unit_price=Decimal("50.00"),
        line_gross=Decimal("100.00"),
        taxable_base=Decimal("84.75"),
        product_gst=Decimal("15.25"),
        gst_rate=Decimal("0.1800"),
    )
    db_session.add(item)

    payment = Payment(
        order_id=order.id,
        provider="razorpay",
        provider_payment_id=f"pay_acct_{uuid.uuid4().hex[:8]}",
        amount=Decimal("153.40"),
        status=PaymentStatus.CAPTURED,
    )
    db_session.add(payment)
    await db_session.commit()

    # 2. Issue Statutory GST Tax Invoice
    inv = await service.issue_invoice_for_order(
        InvoiceIssueRequest(order_id=order.id, series="APE", financial_year="26-27")
    )
    assert inv.invoice_number.startswith("APE/26-27/")
    assert inv.grand_total == Decimal("153.40")
    assert inv.status == "ISSUED"

    # Verify posted journal entry for invoice
    stmt = select(JournalEntry).where(JournalEntry.source_type == "INVOICE", JournalEntry.source_id == str(inv.id))
    j_entry = (await db_session.execute(stmt)).scalars().first()
    assert j_entry is not None
    assert j_entry.status == JournalEntryStatus.POSTED

    # 3. Allocate Payment against Invoice
    alloc = await service.allocate_payment(
        PaymentAllocationRequest(
            payment_id=payment.id,
            invoice_id=inv.id,
            amount=Decimal("153.40"),
        )
    )
    assert alloc.amount == Decimal("153.40")

    # Verify invoice status is updated to PAID
    inv_db = await db_session.get(Invoice, inv.id)
    assert inv_db.status == InvoiceStatus.PAID


@pytest.mark.asyncio
async def test_trial_balance_and_financial_reports(db_session: AsyncSession):
    """Trial Balance must balance (Total Debit == Total Credit); P&L must calculate gross and net profit."""
    service = AccountingService(db_session)

    # 1. Generate Trial Balance
    tb = await service.generate_trial_balance(COMPANY_ID, date.today())
    assert tb.is_balanced is True
    assert tb.total_debit == tb.total_credit

    # 2. Generate Profit and Loss
    pnl = await service.generate_profit_and_loss(COMPANY_ID, date(2026, 1, 1), date(2026, 12, 31))
    assert pnl.total_revenue >= Decimal("0.00")
    assert pnl.gross_margin == pnl.total_revenue - pnl.cost_of_goods_sold
    assert pnl.net_profit == pnl.gross_margin - pnl.operating_expenses

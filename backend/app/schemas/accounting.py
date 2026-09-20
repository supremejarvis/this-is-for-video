"""Pydantic schemas for Double-Entry Accounting, Period Controls, and Financial Reports."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any
import uuid
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------------------
# Chart of Accounts
# -------------------------------------------------------------------------

class AccountBase(BaseModel):
    code: str = Field(..., max_length=20, description="Unique account code e.g. 1010, 4010")
    name: str = Field(..., max_length=100, description="Account name")
    account_type: str = Field(..., description="ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE")
    normal_balance: str = Field(default="DEBIT", description="DEBIT or CREDIT")
    parent_id: uuid.UUID | None = None
    is_active: bool = True


class AccountCreate(AccountBase):
    pass


class AccountOut(AccountBase):
    id: uuid.UUID
    company_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------------------
# Fiscal Periods
# -------------------------------------------------------------------------

class FiscalPeriodBase(BaseModel):
    name: str = Field(..., max_length=50, description="e.g. FY 2026-2027 Q1")
    start_date: date
    end_date: date


class FiscalPeriodCreate(FiscalPeriodBase):
    pass


class FiscalPeriodOut(FiscalPeriodBase):
    id: uuid.UUID
    company_id: uuid.UUID
    status: str  # OPEN or LOCKED
    locked_at: datetime | None = None
    locked_by: uuid.UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FiscalPeriodLockRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Audit reason for locking or unlocking the fiscal period")
    status: str = Field(..., description="LOCKED or OPEN")


# -------------------------------------------------------------------------
# Invoices & Invoice Lines
# -------------------------------------------------------------------------

class InvoiceLineOut(BaseModel):
    id: uuid.UUID
    order_item_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    taxable_amount: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    order_id: uuid.UUID
    series: str
    financial_year: str
    invoice_number: str
    status: str
    issue_date: date
    due_date: date
    currency: str
    subtotal: Decimal
    tax_total: Decimal
    shipping_total: Decimal
    grand_total: Decimal
    totals_snapshot: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    lines: list[InvoiceLineOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class InvoiceIssueRequest(BaseModel):
    order_id: uuid.UUID
    series: str = Field(default="APE", max_length=20)
    financial_year: str = Field(default="26-27", max_length=10)
    due_days: int = Field(default=30, ge=0)


# -------------------------------------------------------------------------
# Credit Notes
# -------------------------------------------------------------------------

class CreditNoteLineOut(BaseModel):
    id: uuid.UUID
    order_item_id: uuid.UUID
    quantity: int
    amount: Decimal
    tax_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class CreditNoteOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    invoice_id: uuid.UUID
    credit_note_number: str
    status: str
    issue_date: date
    amount: Decimal
    tax_amount: Decimal
    reason: str
    created_at: datetime
    lines: list[CreditNoteLineOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CreditNoteCreateRequest(BaseModel):
    invoice_id: uuid.UUID
    reason: str = Field(..., min_length=5)
    items: list[dict[str, Any]] = Field(default_factory=list)


# -------------------------------------------------------------------------
# Double-Entry Journal Entries & Lines
# -------------------------------------------------------------------------

class JournalLineInput(BaseModel):
    account_code: str = Field(..., description="Chart of accounts code e.g. 1100, 4010")
    debit: Decimal = Field(default=Decimal("0.00"), ge=0)
    credit: Decimal = Field(default=Decimal("0.00"), ge=0)
    customer_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    cost_center_id: str | None = None


class JournalLineOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    account_code: str = ""
    account_name: str = ""
    debit: Decimal
    credit: Decimal
    currency: str
    customer_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    cost_center_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class JournalEntryCreateRequest(BaseModel):
    posting_date: date
    source_type: str = Field(..., max_length=50, description="e.g. MANUAL, INVOICE, PAYMENT, COGS")
    source_id: str = Field(..., max_length=100)
    posting_kind: str = Field(default="ORIGINAL", max_length=50)
    description: str = Field(..., max_length=255)
    lines: list[JournalLineInput] = Field(..., min_length=2)


class JournalEntryOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    posting_date: date
    period_id: uuid.UUID
    status: str
    source_type: str
    source_id: str
    posting_kind: str
    reversal_of: uuid.UUID | None = None
    description: str
    posted_at: datetime
    lines: list[JournalLineOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class JournalReversalRequest(BaseModel):
    reason: str = Field(..., min_length=5, description="Audit reason for reversing the posted journal entry")


# -------------------------------------------------------------------------
# Payment Allocations
# -------------------------------------------------------------------------

class PaymentAllocationRequest(BaseModel):
    payment_id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal = Field(..., gt=0)


class PaymentAllocationOut(BaseModel):
    id: uuid.UUID
    payment_id: uuid.UUID
    invoice_id: uuid.UUID
    amount: Decimal
    allocated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettlementOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    provider: str
    settlement_id: str
    settlement_date: date
    gross_amount: Decimal
    fee_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------------------
# Financial Reports
# -------------------------------------------------------------------------

class TrialBalanceItem(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    total_debit: Decimal
    total_credit: Decimal
    net_debit: Decimal
    net_credit: Decimal


class TrialBalanceReport(BaseModel):
    as_of_date: date
    items: list[TrialBalanceItem]
    total_debit: Decimal
    total_credit: Decimal
    is_balanced: bool


class GeneralLedgerTransaction(BaseModel):
    posting_date: date
    journal_id: uuid.UUID
    source_type: str
    source_id: str
    description: str
    debit: Decimal
    credit: Decimal
    running_balance: Decimal


class GeneralLedgerAccountSummary(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    opening_balance: Decimal
    transactions: list[GeneralLedgerTransaction]
    closing_balance: Decimal


class GeneralLedgerReport(BaseModel):
    from_date: date
    to_date: date
    accounts: list[GeneralLedgerAccountSummary]


class ProfitAndLossReport(BaseModel):
    from_date: date
    to_date: date
    operating_revenue: Decimal
    shipping_revenue: Decimal
    total_revenue: Decimal
    cost_of_goods_sold: Decimal
    gross_margin: Decimal
    gross_margin_percentage: Decimal
    operating_expenses: Decimal
    net_profit: Decimal
    net_profit_percentage: Decimal


class BalanceSheetReport(BaseModel):
    as_of_date: date
    total_assets: Decimal
    total_liabilities: Decimal
    total_equity: Decimal
    current_earnings: Decimal
    total_liabilities_and_equity: Decimal
    is_balanced: bool


class AgingBucket(BaseModel):
    customer_id: str
    customer_name: str
    current_0_30: Decimal
    days_31_60: Decimal
    days_61_90: Decimal
    over_90: Decimal
    total_outstanding: Decimal


class AccountsReceivableAgingReport(BaseModel):
    as_of_date: date
    buckets: list[AgingBucket]
    total_receivable: Decimal


class GstSubledgerItem(BaseModel):
    tax_type: str  # CGST, SGST, IGST
    taxable_turnover: Decimal
    tax_collected: Decimal


class GstSubledgerReport(BaseModel):
    from_date: date
    to_date: date
    items: list[GstSubledgerItem]
    total_tax_collected: Decimal

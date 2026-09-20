/**
 * Admin Double-Entry Accounting, Period Controls & Financial Reports API Client.
 */
import { apiClient } from './client';

export interface AccountItem {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  parent_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FiscalPeriodItem {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'OPEN' | 'LOCKED';
  locked_at?: string | null;
  locked_by?: string | null;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  order_item_id: string;
  quantity: number;
  unit_price: string;
  taxable_amount: string;
  cgst_rate: string;
  cgst_amount: string;
  sgst_rate: string;
  sgst_amount: string;
  igst_rate: string;
  igst_amount: string;
  line_total: string;
}

export interface InvoiceRecord {
  id: string;
  company_id: string;
  order_id: string;
  series: string;
  financial_year: string;
  invoice_number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'VOID';
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: string;
  tax_total: string;
  shipping_total: string;
  grand_total: string;
  totals_snapshot: Record<string, any>;
  created_at: string;
  lines: InvoiceLineItem[];
}

export interface JournalLineItem {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  currency: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  cost_center_id?: string | null;
}

export interface JournalRecord {
  id: string;
  company_id: string;
  posting_date: string;
  period_id: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  source_type: string;
  source_id: string;
  posting_kind: string;
  reversal_of?: string | null;
  description: string;
  posted_at: string;
  lines: JournalLineItem[];
}

export interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  net_debit: string;
  net_credit: string;
}

export interface TrialBalanceReport {
  as_of_date: string;
  items: TrialBalanceItem[];
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
}

export interface ProfitAndLossReport {
  from_date: string;
  to_date: string;
  operating_revenue: string;
  shipping_revenue: string;
  total_revenue: string;
  cost_of_goods_sold: string;
  gross_margin: string;
  gross_margin_percentage: string;
  operating_expenses: string;
  net_profit: string;
  net_profit_percentage: string;
}

export interface GstSubledgerItem {
  tax_type: string;
  taxable_turnover: string;
  tax_collected: string;
}

export interface GstSubledgerReport {
  from_date: string;
  to_date: string;
  items: GstSubledgerItem[];
  total_tax_collected: string;
}

export const adminAccountingApi = {
  // Accounts
  listAccounts: async (): Promise<AccountItem[]> => {
    return apiClient.get<AccountItem[]>('/admin/accounting/accounts');
  },

  createAccount: async (req: {
    code: string;
    name: string;
    account_type: string;
    normal_balance: string;
    parent_id?: string;
    is_active?: boolean;
  }): Promise<AccountItem> => {
    return apiClient.post<AccountItem>('/admin/accounting/accounts', req);
  },

  // Fiscal Periods
  listFiscalPeriods: async (): Promise<FiscalPeriodItem[]> => {
    return apiClient.get<FiscalPeriodItem[]>('/admin/accounting/periods');
  },

  lockFiscalPeriod: async (periodId: string, req: { status: string; reason: string }): Promise<FiscalPeriodItem> => {
    return apiClient.post<FiscalPeriodItem>(`/admin/accounting/periods/${periodId}/lock`, req);
  },

  // Invoices
  listInvoices: async (limit = 50): Promise<InvoiceRecord[]> => {
    return apiClient.get<InvoiceRecord[]>(`/admin/accounting/invoices?limit=${limit}`);
  },

  issueInvoice: async (req: { order_id: string; series?: string; financial_year?: string; due_days?: number }): Promise<InvoiceRecord> => {
    return apiClient.post<InvoiceRecord>('/admin/accounting/invoices/issue', req);
  },

  // Payment Allocations
  allocatePayment: async (req: { payment_id: string; invoice_id: string; amount: number }): Promise<any> => {
    return apiClient.post<any>('/admin/accounting/payment-allocations', req);
  },

  // Journal Entries
  listJournals: async (limit = 50): Promise<JournalRecord[]> => {
    return apiClient.get<JournalRecord[]>(`/admin/accounting/journals?limit=${limit}`);
  },

  postJournal: async (req: {
    posting_date: string;
    source_type: string;
    source_id: string;
    posting_kind?: string;
    description: string;
    lines: Array<{
      account_code: string;
      debit: number;
      credit: number;
      customer_id?: string;
      supplier_id?: string;
      cost_center_id?: string;
    }>;
  }): Promise<JournalRecord> => {
    return apiClient.post<JournalRecord>('/admin/accounting/journals', req);
  },

  reverseJournal: async (journalId: string, req: { reason: string }): Promise<JournalRecord> => {
    return apiClient.post<JournalRecord>(`/admin/accounting/journals/${journalId}/reverse`, req);
  },

  // Reports
  getTrialBalance: async (asOf?: string): Promise<TrialBalanceReport> => {
    const q = asOf ? `?as_of=${asOf}` : '';
    return apiClient.get<TrialBalanceReport>(`/admin/accounting/reports/trial-balance${q}`);
  },

  getProfitAndLoss: async (fromDate?: string, toDate?: string): Promise<ProfitAndLossReport> => {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ProfitAndLossReport>(`/admin/accounting/reports/profit-and-loss${qs}`);
  },

  getGstSubledger: async (fromDate?: string, toDate?: string): Promise<GstSubledgerReport> => {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<GstSubledgerReport>(`/admin/accounting/reports/gst-subledger${qs}`);
  },
};

/**
 * Apollo Engineering Statutory Double-Entry Accounting & Financial Reports Console.
 * Real PostgreSQL General Ledger, Tax Invoices, Trial Balance & Period Controls.
 */
import React, { useState, useEffect, useId } from 'react';
import {
  adminAccountingApi,
  AccountItem,
  FiscalPeriodItem,
  InvoiceRecord,
  JournalRecord,
  TrialBalanceReport,
  ProfitAndLossReport,
} from '../../services/api';
import {
  BookOpen,
  FileText,
  Scale,
  TrendingUp,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AccountingLedgerConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'JOURNALS' | 'INVOICES' | 'TRIAL_BALANCE' | 'PNL' | 'PERIODS'>('JOURNALS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data States
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriodItem[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [pnlReport, setPnlReport] = useState<ProfitAndLossReport | null>(null);

  // Modal States
  const [showNewJournalModal, setShowNewJournalModal] = useState(false);
  const [showIssueInvoiceModal, setShowIssueInvoiceModal] = useState(false);
  const [selectedJournalForReversal, setSelectedJournalForReversal] = useState<JournalRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [selectedPeriodForLock, setSelectedPeriodForLock] = useState<FiscalPeriodItem | null>(null);
  const [periodReason, setPeriodReason] = useState('');

  // Form IDs for accessibility
  const newJournalDescId = useId();
  const invoiceOrderIdId = useId();
  const reversalReasonId = useId();
  const periodLockReasonId = useId();

  // Manual Journal Form State
  const [journalDesc, setJournalDesc] = useState('');
  const [journalLines, setJournalLines] = useState<Array<{ account_code: string; debit: number; credit: number }>>([
    { account_code: '1010', debit: 0, credit: 0 },
    { account_code: '4010', debit: 0, credit: 0 },
  ]);

  // Invoice Issue Form State
  const [invoiceOrderId, setInvoiceOrderId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'JOURNALS') {
        const [jList, aList] = await Promise.all([
          adminAccountingApi.listJournals(50),
          adminAccountingApi.listAccounts(),
        ]);
        setJournals(jList);
        setAccounts(aList);
      } else if (activeTab === 'INVOICES') {
        const invList = await adminAccountingApi.listInvoices(50);
        setInvoices(invList);
      } else if (activeTab === 'TRIAL_BALANCE') {
        const tb = await adminAccountingApi.getTrialBalance();
        setTrialBalance(tb);
      } else if (activeTab === 'PNL') {
        const pnl = await adminAccountingApi.getProfitAndLoss();
        setPnlReport(pnl);
      } else if (activeTab === 'PERIODS') {
        const pList = await adminAccountingApi.listFiscalPeriods();
        setPeriods(pList);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Real-time journal balance calculation
  const totalDebit = journalLines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalCredit = journalLines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  const handleAddJournalLine = () => {
    setJournalLines([...journalLines, { account_code: '1100', debit: 0, credit: 0 }]);
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalLines.length <= 2) return;
    setJournalLines(journalLines.filter((_, i) => i !== index));
  };

  const handlePostManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) {
      setError('Journal entry must balance: Total Debits must equal Total Credits');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminAccountingApi.postJournal({
        posting_date: new Date().toISOString().split('T')[0],
        source_type: 'MANUAL',
        source_id: `MANUAL-${Date.now()}`,
        description: journalDesc.trim(),
        lines: journalLines.map(l => ({
          account_code: l.account_code,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
      setSuccessMsg('Manual journal entry posted authoritatively to general ledger');
      setShowNewJournalModal(false);
      setJournalDesc('');
      setJournalLines([
        { account_code: '1010', debit: 0, credit: 0 },
        { account_code: '4010', debit: 0, credit: 0 },
      ]);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to post journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleReverseJournal = async () => {
    if (!selectedJournalForReversal || !reversalReason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await adminAccountingApi.reverseJournal(selectedJournalForReversal.id, {
        reason: reversalReason.trim(),
      });
      setSuccessMsg(`Journal entry ${selectedJournalForReversal.id.slice(0, 8)} successfully reversed`);
      setSelectedJournalForReversal(null);
      setReversalReason('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to reverse journal entry');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceOrderId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await adminAccountingApi.issueInvoice({
        order_id: invoiceOrderId.trim(),
        series: 'APE',
        financial_year: '26-27',
      });
      setSuccessMsg(`Tax Invoice ${inv.invoice_number} issued successfully with statutory journal entry`);
      setShowIssueInvoiceModal(false);
      setInvoiceOrderId('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to issue tax invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePeriodLock = async () => {
    if (!selectedPeriodForLock || !periodReason.trim()) return;
    const targetStatus = selectedPeriodForLock.status === 'OPEN' ? 'LOCKED' : 'OPEN';
    setLoading(true);
    setError(null);
    try {
      await adminAccountingApi.lockFiscalPeriod(selectedPeriodForLock.id, {
        status: targetStatus,
        reason: periodReason.trim(),
      });
      setSuccessMsg(`Fiscal Period ${selectedPeriodForLock.name} is now ${targetStatus}`);
      setSelectedPeriodForLock(null);
      setPeriodReason('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update fiscal period status');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              Statutory Double-Entry Accounting Workspace
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              PostgreSQL General Ledger
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative double-entry subledger, GST tax invoices, period controls & financial statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'JOURNALS' && (
            <button
              onClick={() => setShowNewJournalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              New Journal Entry
            </button>
          )}
          {activeTab === 'INVOICES' && (
            <button
              onClick={() => setShowIssueInvoiceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              Issue Tax Invoice
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-semibold uppercase">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs font-semibold uppercase">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'JOURNALS', label: 'General Ledger Journals', icon: BookOpen },
          { id: 'INVOICES', label: 'Statutory Invoices', icon: FileText },
          { id: 'TRIAL_BALANCE', label: 'Trial Balance', icon: Scale },
          { id: 'PNL', label: 'Profit & Loss Statement', icon: TrendingUp },
          { id: 'PERIODS', label: 'Fiscal Periods & Controls', icon: Lock },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: JOURNALS */}
      {activeTab === 'JOURNALS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-sm font-semibold text-slate-300">Authoritative Subledger Entries</span>
            <span className="text-xs text-slate-500">Immutable posting with two-sided double entry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Source & Kind</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Account Lines</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No posted journal entries found.
                    </td>
                  </tr>
                ) : (
                  journals.map(j => {
                    const totalD = j.lines.reduce((acc, l) => acc + parseFloat(l.debit || '0'), 0);
                    const totalC = j.lines.reduce((acc, l) => acc + parseFloat(l.credit || '0'), 0);

                    return (
                      <tr key={j.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono text-xs text-slate-400">{j.posting_date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {j.source_type}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">({j.posting_kind})</span>
                        </td>
                        <td className="p-3 text-white max-w-xs truncate">{j.description}</td>
                        <td className="p-3 text-xs">
                          <div className="space-y-1">
                            {j.lines.map((l, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-mono text-blue-400 font-semibold">{l.account_code}</span>
                                <span className="text-slate-400 truncate max-w-[140px]">{l.account_name}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(totalD)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-blue-400">
                          {formatCurrency(totalC)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              j.status === 'POSTED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {j.status === 'POSTED' && j.posting_kind !== 'REVERSAL' && (
                            <button
                              onClick={() => setSelectedJournalForReversal(j)}
                              className="px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-950/40 rounded border border-amber-800/60 transition inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-sm font-semibold text-slate-300">GST Statutory Tax Invoice Register</span>
            <span className="text-xs text-slate-500">Atomic sequential numbering & line-level GST</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3 text-right">Taxable Base</th>
                  <th className="p-3 text-right">Total GST</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No tax invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                      <td className="p-3 text-slate-400 text-xs font-mono">{inv.issue_date}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{inv.order_id.slice(0, 8)}...</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(inv.subtotal)}</td>
                      <td className="p-3 text-right font-mono text-amber-400">{formatCurrency(inv.tax_total)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(inv.grand_total)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeTab === 'TRIAL_BALANCE' && trialBalance && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Statement Balance Status</span>
              <div className="flex items-center gap-2 mt-1">
                {trialBalance.is_balanced ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    BALANCED (Sum Debit == Sum Credit)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    UNBALANCED VIOLATION
                  </span>
                )}
                <span className="text-xs text-slate-500">As of {trialBalance.as_of_date}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-xs text-slate-400">Total Debits</span>
                <p className="text-lg font-mono font-bold text-emerald-400">
                  {formatCurrency(trialBalance.total_debit)}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Total Credits</span>
                <p className="text-lg font-mono font-bold text-blue-400">
                  {formatCurrency(trialBalance.total_credit)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Total Debit</th>
                  <th className="p-3 text-right">Total Credit</th>
                  <th className="p-3 text-right">Net Debit</th>
                  <th className="p-3 text-right">Net Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {trialBalance.items.map(it => (
                  <tr key={it.account_code} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-mono font-bold text-blue-400">{it.account_code}</td>
                    <td className="p-3 text-white font-medium">{it.account_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                        {it.account_type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{formatCurrency(it.total_debit)}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(it.total_credit)}</td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                      {parseFloat(it.net_debit) > 0 ? formatCurrency(it.net_debit) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-blue-400">
                      {parseFloat(it.net_credit) > 0 ? formatCurrency(it.net_credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROFIT & LOSS */}
      {activeTab === 'PNL' && pnlReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Revenue</span>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(pnlReport.total_revenue)}
              </p>
              <span className="text-xs text-slate-500">Products & Shipping Income</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Cost of Goods Sold (COGS)</span>
              <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                {formatCurrency(pnlReport.cost_of_goods_sold)}
              </p>
              <span className="text-xs text-slate-500">SS304 raw materials & stamping</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Gross Margin</span>
              <p className="text-xl font-bold font-mono text-blue-400 mt-1">
                {formatCurrency(pnlReport.gross_margin)}
              </p>
              <span className="text-xs text-blue-400 font-semibold">{pnlReport.gross_margin_percentage}% margin</span>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Net Statutory Profit</span>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(pnlReport.net_profit)}
              </p>
              <span className="text-xs text-emerald-400 font-semibold">{pnlReport.net_profit_percentage}% net</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Statutory Income & Expense Breakdown ({pnlReport.from_date} to {pnlReport.to_date})
            </h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Sales Revenue (Solar Drain Clips & Engineering Hardware)</span>
                <span className="text-white font-semibold">{formatCurrency(pnlReport.operating_revenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300">Shipping & Freight Income</span>
                <span className="text-white font-semibold">{formatCurrency(pnlReport.shipping_revenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-amber-400">
                <span>Less: Cost of Goods Sold (Dispatched stock material valuation)</span>
                <span>- {formatCurrency(pnlReport.cost_of_goods_sold)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-700 text-blue-400 font-bold">
                <span>GROSS MARGIN</span>
                <span>{formatCurrency(pnlReport.gross_margin)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
                <span>Less: Operating Expenses (Payment Gateway fees & Freight logistics)</span>
                <span>- {formatCurrency(pnlReport.operating_expenses)}</span>
              </div>
              <div className="flex justify-between py-3 text-emerald-400 font-bold text-base bg-slate-950/60 px-4 rounded-lg">
                <span>NET OPERATING PROFIT</span>
                <span>{formatCurrency(pnlReport.net_profit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FISCAL PERIODS */}
      {activeTab === 'PERIODS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-sm font-semibold text-slate-300">Financial Periods & Audit Year-End Locking</span>
            <span className="text-xs text-slate-500">Locked periods strictly prohibit retroactive backdated posting</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Period Name</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Locked At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {periods.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">{p.start_date}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">{p.end_date}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                          p.status === 'OPEN'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {p.status === 'OPEN' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 font-mono">
                      {p.locked_at ? new Date(p.locked_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPeriodForLock(p)}
                        className={`px-3 py-1 rounded text-xs font-medium border transition ${
                          p.status === 'OPEN'
                            ? 'border-red-800 text-red-400 hover:bg-red-950/40'
                            : 'border-emerald-800 text-emerald-400 hover:bg-emerald-950/40'
                        }`}
                      >
                        {p.status === 'OPEN' ? 'Lock Period' : 'Reopen Period'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: New Manual Journal Entry */}
      {showNewJournalModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Post Manual Double-Entry Journal
              </h3>
              <button onClick={() => setShowNewJournalModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handlePostManualJournal} className="space-y-4">
              <div>
                <label htmlFor={newJournalDescId} className="block text-xs font-semibold text-slate-300 mb-1">Journal Description / Narration *</label>
                <input
                  id={newJournalDescId}
                  type="text"
                  required
                  value={journalDesc}
                  onChange={e => setJournalDesc(e.target.value)}
                  placeholder="e.g. Month-end adjustment or manual capitalization"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Journal Lines (Debits & Credits)</span>
                  <button
                    type="button"
                    onClick={handleAddJournalLine}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {journalLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={line.account_code}
                      onChange={e => {
                        const updated = [...journalLines];
                        updated[idx].account_code = e.target.value;
                        setJournalLines(updated);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    >
                      {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} - {acc.name} ({acc.account_type})
                        </option>
                      ))}
                    </select>

                    <div className="w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Debit"
                        value={line.debit || ''}
                        onChange={e => {
                          const updated = [...journalLines];
                          updated[idx].debit = parseFloat(e.target.value) || 0;
                          if (updated[idx].debit > 0) updated[idx].credit = 0;
                          setJournalLines(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-emerald-400 font-mono"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Credit"
                        value={line.credit || ''}
                        onChange={e => {
                          const updated = [...journalLines];
                          updated[idx].credit = parseFloat(e.target.value) || 0;
                          if (updated[idx].credit > 0) updated[idx].debit = 0;
                          setJournalLines(updated);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-blue-400 font-mono"
                      />
                    </div>

                    {journalLines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveJournalLine(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Real-time balance checker banner */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
                  isJournalBalanced
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/40 border-red-800 text-red-300'
                }`}
              >
                <span>Total Debit: {formatCurrency(totalDebit)}</span>
                <span>Total Credit: {formatCurrency(totalCredit)}</span>
                <span className="font-bold">
                  {isJournalBalanced ? '✓ BALANCED' : `Diff: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewJournalModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isJournalBalanced || loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-md"
                >
                  {loading ? 'Posting...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Tax Invoice */}
      {showIssueInvoiceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Issue Statutory Tax Invoice
              </h3>
              <button onClick={() => setShowIssueInvoiceModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueInvoice} className="space-y-4">
              <div>
                <label htmlFor={invoiceOrderIdId} className="block text-xs font-semibold text-slate-300 mb-1">Target Order UUID *</label>
                <input
                  id={invoiceOrderIdId}
                  type="text"
                  required
                  value={invoiceOrderId}
                  onChange={e => setInvoiceOrderId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white font-mono focus:border-blue-500"
                />
              </div>

              <p className="text-xs text-slate-400">
                Issuing this invoice creates sequential invoice number APE/26-27/xxxx and authoritatively posts Dr Accounts Receivable (1100), Cr Sales Revenue (4010), and Cr Output GST (2010/2020).
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIssueInvoiceModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md"
                >
                  {loading ? 'Issuing...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reversal Confirmation */}
      {selectedJournalForReversal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Reverse Posted Journal Entry
            </h3>
            <p className="text-xs text-slate-400">
              Posted entries are immutable. Reversing creates a compensating entry with inverted debits & credits, marked with posting kind REVERSAL.
            </p>
            <div>
              <label htmlFor={reversalReasonId} className="block text-xs font-semibold text-slate-300 mb-1">Reason for Reversal *</label>
              <textarea
                id={reversalReasonId}
                required
                rows={3}
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="Audit explanation for journal reversal"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedJournalForReversal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseJournal}
                disabled={!reversalReason.trim() || loading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-sm"
              >
                {loading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Period Lock Confirmation */}
      {selectedPeriodForLock && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              {selectedPeriodForLock.status === 'OPEN' ? 'Lock Fiscal Period' : 'Reopen Fiscal Period'}
            </h3>
            <div>
              <label htmlFor={periodLockReasonId} className="block text-xs font-semibold text-slate-300 mb-1">Audit Justification *</label>
              <textarea
                id={periodLockReasonId}
                required
                rows={3}
                value={periodReason}
                onChange={e => setPeriodReason(e.target.value)}
                placeholder="Audit reason for locking/reopening this fiscal period"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPeriodForLock(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleTogglePeriodLock}
                disabled={!periodReason.trim() || loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

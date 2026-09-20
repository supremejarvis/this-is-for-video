'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  QrCode,
  RotateCcw,
  X,
  FileCheck,
  Check,
  TrendingUp,
} from 'lucide-react';
import {
  adminPaymentApi,
  PaymentItem,
  PaymentReconciliationSummary,
  RefundResponse,
} from '../../services/api';

export const PaymentReconciliationConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'RECONCILIATION'>('PAYMENTS');
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [reconciliation, setReconciliation] = useState<PaymentReconciliationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Direct UPI Verification Modal State
  const [upiModalPayment, setUpiModalPayment] = useState<PaymentItem | null>(null);
  const [upiUtr, setUpiUtr] = useState<string>('');
  const [upiNotes, setUpiNotes] = useState<string>('');
  const [upiSubmitting, setUpiSubmitting] = useState<boolean>(false);

  // Refund Modal State
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentItem | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Customer cancellation / size return');
  const [refundSubmitting, setRefundSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminPaymentApi.getPayments(statusFilter || undefined);
      setPayments(data);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const data = await adminPaymentApi.getReconciliation();
      setReconciliation(data);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUpi = async () => {
    if (!upiModalPayment) return;
    if (!upiUtr || upiUtr.trim().length < 6) {
      setError('A valid 12-digit UPI reference / Bank UTR is required.');
      return;
    }

    setUpiSubmitting(true);
    setError(null);
    try {
      await adminPaymentApi.verifyUpi(upiModalPayment.id, upiUtr, upiNotes);
      setSuccessMsg(`UPI Payment verified successfully with UTR ${upiUtr}!`);
      setUpiModalPayment(null);
      setUpiUtr('');
      setUpiNotes('');
      await loadPayments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'UPI verification failed');
    } finally {
      setUpiSubmitting(false);
    }
  };

  const handleIssueRefund = async () => {
    if (!refundModalPayment) return;
    const amountNum = parseFloat(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid refund amount.');
      return;
    }

    setRefundSubmitting(true);
    setError(null);
    try {
      const res = await adminPaymentApi.issueRefund({
        order_id: refundModalPayment.order_id,
        payment_id: refundModalPayment.id,
        amount: refundAmount,
        reason: refundReason,
        idempotency_key: `rfnd-${refundModalPayment.id.slice(0, 8)}-${Date.now()}`,
      });
      setSuccessMsg(`Refund of ₹${res.amount} processed successfully (Ref: ${res.provider_reference})!`);
      setRefundModalPayment(null);
      setRefundAmount('');
      await loadPayments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Refund failed');
    } finally {
      setRefundSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CAPTURED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'REFUNDED':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'PARTIALLY_REFUNDED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'FAILED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'razorpay':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'direct_upi':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cod':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payments & Gateway Reconciliation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Razorpay HMAC Webhooks • Direct UPI Verification Desk • Authoritative Refunds & Allocations
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'PAYMENTS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => {
              setActiveTab('RECONCILIATION');
              loadReconciliation();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'RECONCILIATION' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gateway vs Ledger
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: All Payments */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">All Statuses</option>
                <option value="CAPTURED">Captured</option>
                <option value="PENDING">Pending (UPI / Gateway)</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <button
              onClick={loadPayments}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Payment ID / Date</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Gateway Reference / UTR</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading payments...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No payments found matching filter.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {p.id.slice(0, 8)}...
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(p.created_at).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase ${getProviderBadge(
                            p.provider
                          )}`}
                        >
                          {p.provider}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        {p.provider_payment_id || (
                          <span className="text-slate-400 italic">Pending Capture</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {p.status === 'PENDING' && p.provider === 'direct_upi' && (
                          <button
                            onClick={() => {
                              setUpiModalPayment(p);
                              setUpiUtr('');
                              setUpiNotes('');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            Verify UPI
                          </button>
                        )}
                        {p.status === 'CAPTURED' && (
                          <button
                            onClick={() => {
                              setRefundModalPayment(p);
                              setRefundAmount(p.amount);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-md border border-slate-200 transition-colors"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Reconciliation Desk */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-6">
          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total Captured
                </span>
                <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                  ₹{reconciliation.total_captured_amount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Across {reconciliation.total_payments_count} transactions
                </span>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                  Allocated to Invoices
                </span>
                <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                  ₹{reconciliation.total_allocated_amount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Matched double-entry accounts receivable
                </span>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                  Unallocated Balance
                </span>
                <span className="text-2xl font-extrabold text-amber-700 mt-1 block">
                  ₹{reconciliation.total_unallocated_amount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Unmatched customer clearing advances
                </span>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">
                  Total Refunded
                </span>
                <span className="text-2xl font-extrabold text-purple-700 mt-1 block">
                  ₹{reconciliation.total_refunded_amount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Approved return & cancellation refunds
                </span>
              </div>
            </div>
          )}

          {/* Reconciliation Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Payment Allocation Audit Log
              </h3>
              <button
                onClick={loadReconciliation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Re-calculate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Provider / Reference</th>
                    <th className="py-3 px-4">Invoice Number</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Allocated</th>
                    <th className="py-3 px-4">Unallocated Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliation?.items.map((it) => (
                    <tr key={it.payment_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {it.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 uppercase text-[11px]">
                          {it.provider}:
                        </span>{' '}
                        <span className="font-mono text-slate-500">
                          {it.provider_payment_id || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {it.invoice_number || (
                          <span className="text-slate-400 italic">Pending Issue</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{it.amount}</td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">₹{it.allocated_amount}</td>
                      <td className="py-3 px-4 text-amber-700 font-bold">
                        ₹{it.unallocated_balance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct UPI Manual Verification Desk */}
      {upiModalPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              Direct UPI Payment Verification Desk
            </h3>
            <p className="text-xs text-slate-600">
              Statutory verification rule: Never mark an order PAID from customer claims alone. Verify bank credit and enter the authoritative 12-digit UTR below.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID:</span>
                <span className="font-mono font-bold">{upiModalPayment.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payable Amount:</span>
                <span className="font-extrabold text-emerald-800">₹{upiModalPayment.amount}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank UTR / Transaction Reference <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={upiUtr}
                onChange={(e) => setUpiUtr(e.target.value)}
                placeholder="e.g. 426189371089"
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Notes (Optional)
              </label>
              <input
                type="text"
                value={upiNotes}
                onChange={(e) => setUpiNotes(e.target.value)}
                placeholder="e.g. Verified on HDFC Current Account Statement"
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUpiModalPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyUpi}
                disabled={upiSubmitting}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {upiSubmitting ? 'Verifying...' : 'Approve & Mark Captured'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Authoritative Refund Desk */}
      {refundModalPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-purple-600" />
              Issue Authoritative Refund
            </h3>
            <p className="text-xs text-slate-600">
              Process an idempotent refund against payment transaction. This records an immutable audit trail and triggers compensating accounting postings.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Original Amount:</span>
                <span className="font-bold">₹{refundModalPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Provider:</span>
                <span className="font-mono uppercase">{refundModalPayment.provider}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Refund Amount (INR)
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                step="0.01"
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statutory Reason
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModalPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueRefund}
                disabled={refundSubmitting}
                className="px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {refundSubmitting ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

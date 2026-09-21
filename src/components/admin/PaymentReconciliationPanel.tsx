import React, { useState } from 'react';
import { 
  CreditCard, Landmark, CheckCircle2, Clock, AlertTriangle, 
  Download, Filter, Search, ShieldCheck, ArrowUpRight, DollarSign,
  FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PaymentReconciliationRecord } from '../../types';

export const PaymentReconciliationPanel: React.FC = () => {
  const { showToast, orders } = useStore();

  const derivedRecords = React.useMemo<PaymentReconciliationRecord[]>(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map((ord, idx) => {
      const isCod = ord.paymentDetail?.method === 'COD';
      const isDirectUpi = ord.paymentDetail?.method === 'UPI' && !ord.paymentDetail?.razorpayPaymentId;
      const method: 'RAZORPAY_PREPAID' | 'COD' | 'DIRECT_UPI_NEFT' = isCod 
        ? 'COD' 
        : isDirectUpi 
        ? 'DIRECT_UPI_NEFT' 
        : 'RAZORPAY_PREPAID';
      
      const gross = Number(ord.pricingSummary?.grandTotal) || 0;
      let fee = 0;
      let feeGst = 0;
      if (method === 'RAZORPAY_PREPAID') {
        fee = Number((gross * 0.02).toFixed(2));
        feeGst = Number((fee * 0.18).toFixed(2));
      } else if (method === 'COD') {
        fee = Number((gross * 0.025).toFixed(2));
        feeGst = Number((fee * 0.18).toFixed(2));
      }
      const net = Number((gross - fee - feeGst).toFixed(2));

      return {
        id: `recon_${ord.id || idx}`,
        date: ord.createdAt ? ord.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        orderNumber: ord.orderNumber || ord.id,
        customerName: ord.customerName || ord.deliveryAddress?.fullName || 'Customer',
        method,
        grossAmount: gross,
        gatewayFee: fee,
        gatewayGst: feeGst,
        netSettlement: net,
        status: ord.paymentDetail?.paymentStatus === 'PAID' ? 'RECONCILED' : 'IN_TRANSIT',
        settlementDate: ord.paymentDetail?.paidAt ? ord.paymentDetail.paidAt.split('T')[0] : undefined,
        referenceId: ord.paymentDetail?.transactionId || ord.orderNumber
      };
    });
  }, [orders]);

  const [records, setRecords] = useState<PaymentReconciliationRecord[]>(derivedRecords);

  React.useEffect(() => {
    setRecords(derivedRecords);
  }, [derivedRecords]);
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'RAZORPAY' | 'COD' | 'DIRECT_UPI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter(r => {
    if (methodFilter === 'RAZORPAY' && r.method !== 'RAZORPAY_PREPAID') return false;
    if (methodFilter === 'COD' && r.method !== 'COD') return false;
    if (methodFilter === 'DIRECT_UPI' && r.method !== 'DIRECT_UPI_NEFT') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.orderNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.referenceId.toLowerCase().includes(q)
    );
  });

  const totalGross = filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalFees = filteredRecords.reduce((sum, r) => sum + r.gatewayFee + r.gatewayGst, 0);
  const totalNetSettled = filteredRecords.reduce((sum, r) => sum + r.netSettlement, 0);
  const codInTransit = filteredRecords.filter(r => r.method === 'COD' && r.status === 'IN_TRANSIT').reduce((sum, r) => sum + r.grossAmount, 0);

  const handleExportCsv = () => {
    const headers = 'ID,Date,Order_Number,Customer,Payment_Method,Gross_Amount,Gateway_Fee,Gateway_GST,Net_Settlement,Status,Reference_ID\n';
    const rows = filteredRecords.map(r => 
      `"${r.id}","${r.date}","${r.orderNumber}","${r.customerName}","${r.method}",${r.grossAmount},${r.gatewayFee},${r.gatewayGst},${r.netSettlement},"${r.status}","${r.referenceId}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payment_Reconciliation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Payment reconciliation report exported to CSV!', 'success');
  };

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold mb-2">
            <Landmark className="w-3 h-3 text-emerald-600" />
            FINANCIAL RECONCILIATION & SETTLEMENT ENGINE
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight text-slate-900 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Payment Gateway & COD Settlement Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Reconcile online Razorpay payments, payment gateway processing fees (2% + 18% GST), Cash on Delivery collections, and direct bank transfers.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Reconciliation (CSV)</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Gross Customer Payments</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            ₹{totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">{filteredRecords.length} recorded transactions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Gateway Fees & Surcharges</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            -₹{totalFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">2% MDR + 18% statutory GST</span>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block">Net Bank Realization</span>
          <div className="text-xl font-black text-emerald-950 font-mono mt-1">
            ₹{totalNetSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-700 font-sans mt-0.5 block font-semibold">Credited to ICICI Bank Kathwada</span>
        </div>

        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-amber-900 uppercase block">COD In-Transit with Courier</span>
          <div className="text-xl font-black text-amber-950 font-mono mt-1">
            ₹{codInTransit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-amber-800 font-sans mt-0.5 block">Pending delivery cash remittal</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Transactions' },
            { id: 'RAZORPAY', label: 'Razorpay Online' },
            { id: 'COD', label: 'Cash on Delivery (COD)' },
            { id: 'DIRECT_UPI', label: 'Direct UPI / NEFT' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMethodFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                methodFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order, buyer, or payment ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Date & Order No.</th>
                <th className="p-3.5">Customer / Entity</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5 text-right">Gross Paid</th>
                <th className="p-3.5 text-right">MDR / Fee</th>
                <th className="p-3.5 text-right">Fee GST (18%)</th>
                <th className="p-3.5 text-right">Net Settled</th>
                <th className="p-3.5 text-center">Settlement Status</th>
                <th className="p-3.5">Reference / UTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">No Reconciliation Records Found</h4>
                      <p className="text-xs text-slate-500 font-sans">
                        {searchQuery ? 'No payment records match your active search or filter criteria.' : 'Settlement and reconciliation entries will automatically appear here as real prepaid, direct UPI, and COD orders are placed.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Date & Order */}
                  <td className="p-3.5 font-mono">
                    <div className="font-bold text-slate-900">{r.orderNumber}</div>
                    <div className="text-slate-500 text-[11px]">{r.date}</div>
                  </td>

                  {/* Customer */}
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900">{r.customerName}</div>
                  </td>

                  {/* Method */}
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      r.method === 'RAZORPAY_PREPAID'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : r.method === 'COD'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {r.method.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Gross */}
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    ₹{r.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Fee */}
                  <td className="p-3.5 text-right font-mono text-rose-600">
                    -₹{r.gatewayFee.toFixed(2)}
                  </td>

                  {/* Fee GST */}
                  <td className="p-3.5 text-right font-mono text-slate-500">
                    -₹{r.gatewayGst.toFixed(2)}
                  </td>

                  {/* Net */}
                  <td className="p-3.5 text-right font-mono font-black text-emerald-800">
                    ₹{r.netSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Status */}
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      r.status === 'RECONCILED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : r.status === 'SETTLED'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {r.status}
                    </span>
                  </td>

                  {/* Reference */}
                  <td className="p-3.5 font-mono text-[11px] text-slate-600">
                    {r.referenceId}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

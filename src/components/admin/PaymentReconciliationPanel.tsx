import React, { useState } from 'react';
import { 
  CreditCard, Landmark, CheckCircle2, Clock, AlertTriangle, 
  Download, Filter, Search, ShieldCheck, ArrowUpRight, DollarSign,
  FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PaymentReconciliationRecord } from '../../types';

const INITIAL_RECONCILIATION_RECORDS: PaymentReconciliationRecord[] = [
  {
    id: 'recon_01',
    date: '2026-09-11',
    orderNumber: 'APE-ORD-8821',
    customerName: 'Rajesh Patel',
    method: 'RAZORPAY_PREPAID',
    grossAmount: 38400,
    gatewayFee: 768, // 2%
    gatewayGst: 138.24, // 18% on fee
    netSettlement: 37493.76,
    status: 'RECONCILED',
    settlementDate: '2026-09-12',
    referenceId: 'pay_rzp_live_99214'
  },
  {
    id: 'recon_02',
    date: '2026-09-10',
    orderNumber: 'APE-ORD-8819',
    customerName: 'SunPower Renewable Infra',
    method: 'DIRECT_UPI_NEFT',
    grossAmount: 92500,
    gatewayFee: 0,
    gatewayGst: 0,
    netSettlement: 92500,
    status: 'RECONCILED',
    settlementDate: '2026-09-10',
    referenceId: 'UTR-HDFC-992817263'
  },
  {
    id: 'recon_03',
    date: '2026-09-09',
    orderNumber: 'APE-ORD-8818',
    customerName: 'Manoj Verma',
    method: 'COD',
    grossAmount: 1980,
    gatewayFee: 49.50, // 2.5% COD collection surcharge
    gatewayGst: 8.91,
    netSettlement: 1921.59,
    status: 'IN_TRANSIT',
    referenceId: 'COD-SPEEDPOST-382430-8818'
  },
  {
    id: 'recon_04',
    date: '2026-09-08',
    orderNumber: 'APE-ORD-8815',
    customerName: 'Rajasthan Solar Green Ltd',
    method: 'RAZORPAY_PREPAID',
    grossAmount: 48600,
    gatewayFee: 972,
    gatewayGst: 174.96,
    netSettlement: 47453.04,
    status: 'RECONCILED',
    settlementDate: '2026-09-09',
    referenceId: 'pay_rzp_live_88471'
  },
  {
    id: 'recon_05',
    date: '2026-09-07',
    orderNumber: 'APE-ORD-8812',
    customerName: 'Gujarat Solar EPC Hardware',
    method: 'RAZORPAY_PREPAID',
    grossAmount: 14500,
    gatewayFee: 290,
    gatewayGst: 52.20,
    netSettlement: 14157.80,
    status: 'SETTLED',
    settlementDate: '2026-09-08',
    referenceId: 'pay_rzp_live_77312'
  }
];

export const PaymentReconciliationPanel: React.FC = () => {
  const { showToast } = useStore();
  const [records, setRecords] = useState<PaymentReconciliationRecord[]>(INITIAL_RECONCILIATION_RECORDS);
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
              {filteredRecords.map((r) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

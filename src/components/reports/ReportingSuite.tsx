import React, { useState } from 'react';
import { 
  FileText, Download, CheckCircle2, DollarSign, 
  TrendingUp, Truck, PieChart, Filter, Calendar, Building2 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE } from '../../services/logisticsService';

export const ReportingSuite: React.FC = () => {
  const { orders, showToast } = useStore();
  const [activeReportTab, setActiveReportTab] = useState<'GST' | 'COD' | 'SHIPPING' | 'SALES'>('GST');

  const handleExportCsv = (reportName: string) => {
    showToast(`Exported ${reportName} dataset to Excel / CSV format`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border border-rose-800/60 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold">
              MULTI-DIMENSIONAL FINANCIAL REPORTING
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">GST, COD, Freight & Sales Analytics</h1>
          <p className="text-xs text-slate-400">
            Real-time tax filings, APE Shipping freight expenditure audits, and daily/weekly/monthly revenue reports.
          </p>
        </div>

        <button
          onClick={() => handleExportCsv(activeReportTab)}
          className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export {activeReportTab} Report (CSV)
        </button>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'GST', label: '📊 GSTR-1 & Tax Compliance', icon: FileText },
          { key: 'COD', label: '💰 COD & Payment Reconciliation', icon: DollarSign },
          { key: 'SHIPPING', label: '🚚 Customer-Wise Shipping Costs', icon: Truck },
          { key: 'SALES', label: '📈 Sales Velocity (Day/Week/Month)', icon: TrendingUp }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveReportTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              activeReportTab === tab.key
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: GST Reports */}
      {activeReportTab === 'GST' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">GSTR-1 Ready Tax Report (Table 4A - B2B & B2C Slices)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Government GST portal compatible invoice-level summary</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Legal Entity</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Place of Supply</th>
                  <th className="p-3">Taxable Val</th>
                  <th className="p-3">CGST</th>
                  <th className="p-3">SGST</th>
                  <th className="p-3">IGST</th>
                  <th className="p-3 font-bold text-white text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-950/60 transition-colors">
                    <td className="p-3 font-bold text-amber-400">{ord.invoiceNumber}</td>
                    <td className="p-3 text-slate-300">{new Date(ord.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="p-3 text-white font-sans font-bold">{ord.customerName}</td>
                    <td className="p-3 text-blue-400">{ord.gstin || 'UNREGISTERED (B2C)'}</td>
                    <td className="p-3 text-slate-300">{ord.deliveryAddress.state} ({ord.deliveryAddress.stateCode})</td>
                    <td className="p-3 text-slate-200">₹{ord.pricingSummary.taxableValue.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-slate-400">₹{ord.pricingSummary.cgstAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-slate-400">₹{ord.pricingSummary.sgstAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-slate-400">₹{ord.pricingSummary.igstAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-bold text-white text-right">₹{ord.pricingSummary.grandTotal.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: COD & Payment Reconciliation */}
      {activeReportTab === 'COD' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Cash on Delivery (COD) & Post Office Collection Ledger</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tracks cash collected at destination Sub Post Offices vs bank remittances</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3">Order Number</th>
                  <th className="p-3">APE Tracking AWB</th>
                  <th className="p-3">Destination Delivery Hub</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Collection Status</th>
                  <th className="p-3 text-right">Bank Settlement Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-950/60 transition-colors">
                    <td className="p-3 font-bold text-white">{ord.orderNumber}</td>
                    <td className="p-3 text-amber-400">{ord.shipments[0]?.shippingDetail.articleNumber}</td>
                    <td className="p-3 text-slate-300 font-sans">{ord.deliveryAddress.postOffice.name} ({ord.deliveryAddress.pincode})</td>
                    <td className="p-3 text-blue-400 font-bold">{ord.paymentDetail.method}</td>
                    <td className="p-3 font-bold text-white">₹{ord.pricingSummary.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {ord.paymentDetail.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-400">{ord.paymentDetail.transactionId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Customer-Wise Shipping Costs */}
      {activeReportTab === 'SHIPPING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Customer-Wise Freight & APE Shipping Cost Analysis</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison between APE actual postage costs from Origin <strong className="text-white font-mono">{ORIGIN_HUB_PINCODE}</strong> vs customer shipping charges
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3">Customer / Entity</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Destination Postal Hub</th>
                  <th className="p-3">Actual APE Shipping Cost</th>
                  <th className="p-3">Charged to Customer</th>
                  <th className="p-3 text-right">Freight Margin / Subsidy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {orders.map((ord) => {
                  const actualCost = ord.shipments[0]?.shippingDetail.totalPostage || 45;
                  const charged = ord.pricingSummary.shippingTotal;
                  const diff = charged - actualCost;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="p-3 font-sans font-bold text-white">{ord.customerName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ord.orderType === 'B2B' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {ord.orderType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans">{ord.deliveryAddress.postOffice.name} ({ord.deliveryAddress.pincode})</td>
                      <td className="p-3 text-slate-200">₹{actualCost.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-amber-400">₹{charged.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold">
                        {diff >= 0 ? (
                          <span className="text-emerald-400">+₹{diff.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-rose-400">-₹{Math.abs(diff).toLocaleString('en-IN')} (Subsidized)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Sales Velocity */}
      {activeReportTab === 'SALES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-white text-sm">Today (Day Wise)</h4>
            <div className="text-3xl font-black text-emerald-400 font-mono">₹1,48,900</div>
            <p className="text-xs text-slate-400">24 orders processed via APE Shipping hub</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-white text-sm">This Week (Week Wise)</h4>
            <div className="text-3xl font-black text-amber-400 font-mono">₹9,84,200</div>
            <p className="text-xs text-slate-400">182 orders processed across Gujarat & Metro hubs</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="font-bold text-white text-sm">This Month (Month Wise)</h4>
            <div className="text-3xl font-black text-blue-400 font-mono">₹42,50,000</div>
            <p className="text-xs text-slate-400">840 orders (B2B wholesale + B2C retail)</p>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { 
  Printer, X, FileText, CheckCircle2, ShieldCheck, 
  Truck, CreditCard, Clock, MapPin, Building2 
} from 'lucide-react';
import { Order } from '../../types';
import { numberToIndianWords } from '../../utils/numberToWords';

interface GstInvoiceProps {
  order: Order;
  onClose: () => void;
}

const InvoiceAddressLines: React.FC<{ address?: Order['deliveryAddress'] }> = ({ address }) => {
  if (!address) return null;
  return (
    <>
      <div className="text-slate-700 leading-snug">
        {address.flatBuilding}, {address.streetArea}
      </div>
      <div className="text-slate-700 font-semibold">
        {address.city}, {address.state} - {address.pincode}
      </div>
    </>
  );
};

export const GstInvoice: React.FC<GstInvoiceProps> = ({ order, onClose }) => {
  const stateCode = order.deliveryAddress?.stateCode || '24';
  const isIntrastate = stateCode === '24' || (order.deliveryAddress?.state || '').toLowerCase().includes('gujarat');

  const firstShipment = order.shipments?.[0];
  const items = (firstShipment?.items && firstShipment.items.length > 0)
    ? firstShipment.items
    : order.shipments?.flatMap((s) => s.items) || [];

  const grandTotal = order.pricingSummary?.grandTotal || items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  const shippingTotal = order.pricingSummary?.shippingTotal ?? firstShipment?.shippingDetail?.totalPostage ?? 0;
  const shippingBase = Math.round((shippingTotal / 1.18) * 100) / 100;
  const shippingGst = Math.round((shippingTotal - shippingBase) * 100) / 100;

  const taxableValue = order.pricingSummary?.taxableValue || Math.round(((grandTotal - shippingTotal) / 1.18) * 100) / 100;
  const totalTax = order.pricingSummary?.totalTax || Math.round((grandTotal - shippingTotal - taxableValue) * 100) / 100;
  const halfTax = Math.round((totalTax / 2) * 100) / 100;

  const isCod = order.paymentDetail?.method === 'COD' || Boolean(order.pricingSummary?.codFee);
  const codFee = order.pricingSummary?.codFee || 0;

  const trackingArticle = firstShipment?.shippingDetail?.articleNumber || `APE${order.id.slice(-8).toUpperCase()}IN`;
  const paymentMethodLabel = isCod
    ? 'Cash on Delivery (COD)'
    : (order.paymentDetail?.method === 'UPI' ? 'UPI Instant Payment (Prepaid)' : 'Razorpay Secure Payment (Prepaid)');

  const paymentStatus = order.paymentDetail?.paymentStatus || (isCod ? 'COD_VERIFIED' : 'PAID');
  const isPaid = paymentStatus === 'PAID';

  const transactionRef = order.paymentDetail?.transactionId || order.paymentDetail?.razorpayPaymentId || `TXN_${order.id.slice(-8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:bg-white">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between no-print text-white">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Official Statutory GST Tax Invoice (Section 31 of CGST Act 2017)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close invoice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Canvas Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-800/40 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div 
            id="gst-tax-invoice-printable"
            className="w-full max-w-3xl bg-white text-slate-900 font-sans p-6 sm:p-8 rounded-2xl shadow-xl space-y-5 print:shadow-none print:border-none print:p-4 text-xs"
          >
            {/* Header: Logo, Company & Invoice Title */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-3.5">
                <img 
                  src="/logo.webp" 
                  alt="Apollo Engineering Logo" 
                  className="h-12 w-auto object-contain" 
                />
                <div>
                  <h1 className="font-black text-xl text-[#0054A6] tracking-tight">APOLLO ENGINEERING</h1>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    Solar Panel Cleaning Hardware & Fittings Manufacturer
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - 382430
                  </p>
                  <div className="font-mono text-[11px] font-bold text-slate-800 mt-0.5">
                    GSTIN: <span className="text-[#0054A6]">24AAAPA1234F1Z9</span> | State Code: <strong>24 (Gujarat)</strong>
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1 sm:min-w-[200px]">
                <div className="inline-block bg-[#0054A6]/10 border border-[#0054A6]/30 px-3 py-1 rounded-xl text-right">
                  <h2 className="font-black text-sm text-[#0054A6]">GST TAX INVOICE</h2>
                  <p className="text-[9px] text-slate-600 font-bold uppercase">Original for Recipient</p>
                </div>
                <div className="text-[11px] font-mono space-y-0.5 pt-1 text-slate-700">
                  <div>Invoice No: <strong className="text-slate-900 font-black">{order.invoiceNumber || `INV-${order.id.slice(-8).toUpperCase()}`}</strong></div>
                  <div>Order ID: <strong className="text-slate-900">{order.orderNumber || order.id}</strong></div>
                  <div>Invoice Date: <strong>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                  <div>Place of Supply: <strong>{order.deliveryAddress?.state || 'Gujarat'} ({stateCode})</strong></div>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              {/* Billed To */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-[#0054A6]" />
                  <span>Buyer / Billed To:</span>
                </div>
                <div className="font-black text-sm text-slate-900">
                  {order.deliveryAddress?.fullName || order.customerName || 'Valued Customer'}
                </div>
                <InvoiceAddressLines address={order.deliveryAddress} />
                <div className="text-slate-600 font-mono text-[11px]">
                  Phone: {order.deliveryAddress?.phone || order.customerPhone || 'Verified Contact'}
                </div>
                {Boolean(order.gstin || order.deliveryAddress?.gstin) && (
                  <div className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                    Buyer GSTIN: {order.gstin || order.deliveryAddress?.gstin}
                  </div>
                )}
              </div>

              {/* Shipped To Destination */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#0054A6]" />
                  <span>Shipping Destination & Consignee:</span>
                </div>
                <div className="font-black text-sm text-slate-900">
                  {order.deliveryAddress?.fullName || order.customerName}
                </div>
                <div className="text-[#0054A6] font-bold text-[11px]">
                  Delivery Hub: {order.deliveryAddress?.postOffice?.name || 'Local Sub Post Office'}
                </div>
                <InvoiceAddressLines address={order.deliveryAddress} />
                <div className="text-slate-500 font-mono text-[10px]">
                  Facility ID: {order.deliveryAddress?.postOffice?.facilityId || `PO${order.deliveryAddress?.pincode}`}
                </div>
              </div>
            </div>

            {/* 🚚 SHIPPING & LOGISTICS DETAILS (Speed Post) */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-[#0054A6]">
                  <Truck className="w-4 h-4 text-[#0054A6]" />
                  <span>Logistics & Shipping Details: India Post Speed Post (Priority Doorstep Express)</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-mono font-bold">
                  Official Carrier Partner
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Speed Post Consignment / AWB:</span>
                  <span className="font-mono font-black text-[#0054A6] text-xs">{trackingArticle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Origin Logistics Hub:</span>
                  <span className="font-bold text-slate-800">Kathwada GIDC (382430)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Destination Facility:</span>
                  <span className="font-bold text-slate-800">{order.deliveryAddress?.city} ({order.deliveryAddress?.pincode})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Postage Freight & GST:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{shippingBase.toFixed(2)} + 18% GST (₹{shippingGst.toFixed(2)}) = ₹{shippingTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 💳 PAYMENT DETAILS */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>Payment Information & Settlement Mode</span>
                </div>
                <div>
                  {isPaid ? (
                    <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>PAID & SETTLED</span>
                    </span>
                  ) : (
                    <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold font-mono">
                      ⚡ CASH ON DELIVERY (Collect ₹{grandTotal} at Doorstep)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Payment Method:</span>
                  <span className="font-bold text-slate-900">{paymentMethodLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Transaction Reference ID:</span>
                  <span className="font-mono font-bold text-slate-800">{transactionRef}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Payment Status:</span>
                  <span className={`font-mono font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {paymentStatus}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">COD Handling Surcharge:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {isCod && codFee > 0 ? `₹${codFee.toFixed(2)} (2.5%)` : '₹0.00 (Prepaid Free)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Goods Table */}
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-slate-600 mb-1.5">
                Itemized Description of Goods (Section 31 CGST Act):
              </div>
              <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Item Description</th>
                    <th className="p-2 border-r border-slate-300 font-mono">HSN</th>
                    <th className="p-2 border-r border-slate-300 text-center font-mono">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right font-mono">Unit Rate (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-right font-mono">Taxable Val (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-center font-mono">GST %</th>
                    <th className="p-2 text-right font-mono">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const lineGross = it.unitPrice * it.quantity;
                    const lineTaxable = Math.round((lineGross / 1.18) * 100) / 100;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{it.productTitle}</div>
                          <div className="text-[10px] text-slate-500 font-mono">SKU: {it.sku} {it.variantTitle ? `• ${it.variantTitle}` : ''}</div>
                        </td>
                        <td className="p-2 border-r border-slate-300 font-mono text-slate-600">{it.hsnCode || '73269099'}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-r border-slate-300 text-right font-mono">₹{lineTaxable.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-semibold">18%</td>
                        <td className="p-2 text-right font-mono font-bold">₹{lineGross.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations & Statutory Breakdown Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-300">
              <div className="space-y-2 text-[11px] text-slate-600">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Total Invoice Value in Words:</div>
                  <div className="font-semibold text-slate-800 italic">
                    {numberToIndianWords(grandTotal, { suffix: 'Rupees only' })}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  <p>• Whether tax is payable on reverse charge basis: <strong>NO</strong></p>
                  <p>• Warranty: 10-Year Rust-Proof Warranty (covers rust/corrosion only).</p>
                  <p>• Origin Warehouse: Kathwada GIDC Central Hub, Ahmedabad, Gujarat.</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Goods Taxable Base:</span>
                  <span className="font-mono font-bold">₹{taxableValue.toLocaleString('en-IN')}</span>
                </div>

                {isIntrastate ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST @ 9%:</span>
                      <span className="font-mono">₹{halfTax.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST @ 9%:</span>
                      <span className="font-mono">₹{halfTax.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST @ 18%:</span>
                    <span className="font-mono">₹{totalTax.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>India Post Speed Post Base Freight:</span>
                  <span className="font-mono">₹{shippingBase.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping GST @ 18%:</span>
                  <span className="font-mono">₹{shippingGst.toLocaleString('en-IN')}</span>
                </div>

                {Boolean(isCod && codFee > 0) && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>APE COD Convenience Surcharge (2.5%):</span>
                    <span className="font-mono">₹{codFee.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline text-slate-950">
                  <span className="font-black text-sm">Authoritative Grand Total:</span>
                  <span className="font-mono font-black text-lg text-[#0054A6]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Declaration & Authorized Signatory */}
            <div className="border-t border-slate-300 pt-4 flex flex-wrap items-end justify-between gap-4 text-[10px] text-slate-600">
              <div className="space-y-1 max-w-sm">
                <p className="font-bold text-slate-800">Statutory Tax Invoice Declaration:</p>
                <p>
                  We declare that this tax invoice shows the actual price of the goods described and that all particulars are true, correct, and compliant with Section 31 of CGST Act 2017.
                </p>
              </div>

              <div className="text-center space-y-1 min-w-[200px]">
                <div className="font-bold text-slate-900">For APOLLO ENGINEERING</div>
                <div className="h-9 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-slate-400 text-xs select-none">
                    Digitally Authorized IRN
                  </span>
                </div>
                <div className="border-t border-slate-400 pt-1 uppercase font-bold text-[9px] text-slate-700">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (no-print) */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0054A6] to-blue-700 hover:from-[#004285] hover:to-blue-800 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Tax Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

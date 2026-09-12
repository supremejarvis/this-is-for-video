import React from 'react';
import { Printer, X, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Order } from '../../types';

interface GstInvoiceProps {
  order: Order;
  onClose: () => void;
}

export const GstInvoice: React.FC<GstInvoiceProps> = ({ order, onClose }) => {
  const isIntrastate = order.deliveryAddress.stateCode === '24';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Controls */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <FileText className="w-4 h-4 text-blue-400" />
            Official GST Tax Invoice (Section 31 of CGST Act 2017)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body Canvas */}
        <div className="p-6 overflow-y-auto bg-slate-800/50 flex justify-center">
          <div 
            id="gst-invoice"
            className="w-full max-w-2xl bg-white text-black font-sans p-8 rounded-xl shadow-2xl space-y-6 print:border-none print:shadow-none print:p-2 text-xs"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">TAX INVOICE</h2>
                <p className="text-[10px] text-slate-600 font-semibold">ORIGINAL FOR RECIPIENT</p>
                <div className="mt-2 text-xs">
                  <div className="font-black text-sm">APOLLO ENGINEERING</div>
                  <div className="text-slate-700">100 / Gopinath Industrial Landmark, Kathwada GIDC</div>
                  <div className="font-bold">Ahmedabad, Gujarat, PIN: 382430</div>
                  <div className="font-mono">GSTIN: <strong>24AAACP9999P1Z2</strong> | State Code: <strong>24 (Gujarat)</strong></div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-300">
                  <div className="text-[10px] text-slate-500 font-bold">INVOICE NUMBER:</div>
                  <div className="font-mono font-black text-sm">{order.invoiceNumber}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">INVOICE DATE:</div>
                  <div className="font-mono font-bold">{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To Details */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-4">
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">BUYER / BILLED TO:</span>
                <div className="font-bold text-sm text-slate-900">{order.customerName}</div>
                <div className="text-slate-700">{order.deliveryAddress.flatBuilding}, {order.deliveryAddress.streetArea}</div>
                <div className="text-slate-700">City: {order.deliveryAddress.city}, State: {order.deliveryAddress.state} ({order.deliveryAddress.stateCode})</div>
                <div className="font-mono font-bold">PIN: {order.deliveryAddress.pincode}</div>
                {order.gstin && (
                  <div className="mt-1 font-mono font-bold text-blue-700">Buyer GSTIN: {order.gstin}</div>
                )}
              </div>

              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block mb-1">SHIPPING DESTINATION (APE LOGISTICS):</span>
                <div className="font-bold text-slate-900">{order.deliveryAddress.fullName}</div>
                <div className="text-slate-700 font-bold text-blue-900">
                  Delivery Postal Hub: {order.deliveryAddress.postOffice.name}
                </div>
                <div className="text-slate-700">Destination Pincode: {order.deliveryAddress.pincode}</div>
                <div className="font-mono text-slate-700">APE Tracking AWB: {order.shipments[0]?.shippingDetail.articleNumber}</div>
                <div className="font-mono text-slate-700">Place of Supply: {order.deliveryAddress.state} ({order.deliveryAddress.stateCode})</div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="space-y-2">
              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-100 font-bold text-[10px] uppercase text-slate-700">
                    <th className="border border-slate-300 p-1.5">#</th>
                    <th className="border border-slate-300 p-1.5">Description of Goods</th>
                    <th className="border border-slate-300 p-1.5">HSN/SAC</th>
                    <th className="border border-slate-300 p-1.5 text-center">Qty</th>
                    <th className="border border-slate-300 p-1.5 text-right">Unit Rate</th>
                    <th className="border border-slate-300 p-1.5 text-right">Taxable Val</th>
                    <th className="border border-slate-300 p-1.5 text-right">GST %</th>
                    <th className="border border-slate-300 p-1.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {order.shipments.flatMap((s) => s.items).map((item, idx) => {
                    const rowTotal = item.unitPrice * item.quantity;
                    const rowTaxable = Math.round((rowTotal / 1.18) * 100) / 100;
                    return (
                      <tr key={item.sku} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5">
                          <div className="font-bold text-slate-900">{item.productTitle}</div>
                          <span className="text-[10px] text-slate-600 font-mono">SKU: {item.sku} | {item.variantTitle}</span>
                        </td>
                        <td className="border border-slate-300 p-1.5 font-mono">{item.hsnCode}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">₹{rowTaxable.toLocaleString('en-IN')}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">18%</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">₹{rowTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Taxable Value:</span>
                  <span className="font-mono font-bold">₹{order.pricingSummary.taxableValue.toLocaleString('en-IN')}</span>
                </div>
                {isIntrastate ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CGST @ 9%:</span>
                      <span className="font-mono">₹{order.pricingSummary.cgstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">SGST @ 9%:</span>
                      <span className="font-mono">₹{order.pricingSummary.sgstAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-slate-600">IGST @ 18%:</span>
                    <span className="font-mono">₹{order.pricingSummary.igstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">APE Shipping Postage:</span>
                  <span className="font-mono">₹{order.pricingSummary.shippingTotal.toLocaleString('en-IN')}</span>
                </div>
                {Boolean(order.pricingSummary.codFee) && (
                  <div className="flex justify-between font-bold text-amber-800">
                    <span>APE COD Fee (2.5%):</span>
                    <span className="font-mono">₹{order.pricingSummary.codFee?.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-2 border-t-2 border-slate-900 flex justify-between font-black text-sm text-slate-950">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{order.pricingSummary.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Declaration & Authorized Signatory */}
            <div className="border-t border-slate-300 pt-4 flex items-end justify-between text-[10px] text-slate-600">
              <div className="space-y-1 max-w-sm">
                <p>1. Whether tax is payable under Reverse Charge: <strong>NO</strong></p>
                <p>2. We declare that this invoice shows the actual price of goods described and particulars are true & correct.</p>
              </div>
              <div className="text-center space-y-3">
                <div className="font-bold text-slate-900">For PRAVIN PRIME E-COMMERCE PVT LTD</div>
                <div className="font-mono text-[9px] text-slate-400">Digitally Signed & Validated IRN</div>
                <div className="font-bold uppercase text-[9px]">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

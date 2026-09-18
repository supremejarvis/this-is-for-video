import React, { useRef, useState } from 'react';
import { Printer, Download, X, Check, ShieldCheck, Building2 } from 'lucide-react';
import { Order } from '../../types';
import { numberToIndianWords } from '../../utils/numberToWords';

interface StandardTaxInvoiceProps {
  order: Order;
  onClose: () => void;
}

interface AddressBlockProps {
  title: string;
  name: string;
  address: string;
  state: string;
  pincode: string;
  stateCode: string;
}

const InvoiceAddressCard: React.FC<AddressBlockProps> = ({
  title,
  name,
  address,
  state,
  pincode,
  stateCode,
}) => (
  <div className="space-y-0.5">
    <div className="font-bold uppercase text-[10px] text-slate-800">{title} :</div>
    <div className="font-black text-xs uppercase">{name}</div>
    <div className="text-[10.5px] text-slate-800 leading-snug uppercase">
      {address}<br />
      {state.toUpperCase()}, {pincode}<br />
      IN
    </div>
    <div className="font-mono text-[10.5px]">
      <strong>State/UT Code:</strong> {stateCode}
    </div>
  </div>
);

export const StandardTaxInvoice: React.FC<StandardTaxInvoiceProps> = ({ order, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [copyType, setCopyType] = useState<'Triplicate for Supplier' | 'Original for Recipient' | 'Duplicate for Transporter'>('Triplicate for Supplier');

  const customerName = order.deliveryAddress?.fullName || order.customerName || 'Rohan Patel';
  const addressLine = [
    order.deliveryAddress?.flatBuilding,
    order.deliveryAddress?.streetArea,
    order.deliveryAddress?.city
  ].filter(Boolean).join(', ') || '21, Mangalya Row House, Nr Ragini Mata mandir';

  const state = order.deliveryAddress?.state || 'GUJARAT';
  const pincode = order.deliveryAddress?.pincode || '380061';
  const stateCode = order.deliveryAddress?.stateCode || (state.toLowerCase().includes('gujarat') ? '24' : '37');
  const isGujarat = stateCode === '24' || state.toLowerCase().includes('gujarat');

  const orderNumber = order.orderNumber || '403-6931268-9523547';
  const invoiceNumber = order.invoiceNumber || `IN-${order.id.slice(-4).toUpperCase() || '25'}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '.');

  const grandTotal = order.pricingSummary?.grandTotal || 60;
  const taxableTotal = order.pricingSummary?.taxableValue || (grandTotal / 1.18);
  const totalTax = grandTotal - taxableTotal;

  // Extract items or fallback to standard product matching reference PDF
  const shipmentItems = order.shipments?.flatMap(s => s.items) || [];
  const rawItems = shipmentItems.length > 0 ? shipmentItems : [
    {
      sku: 'B0GSRXJFD9',
      productTitle: 'Apollo SS304 Solar Panel Drain Clip | Stainless Steel Auto Water Drain Clip for Solar Panel Frame | Check Frame Thickness Before Order | Prevent Water Stagnation, Dark Spots & Fire Risk (35mm) | B0GSRXJFD9 ( DZ-K6JS-CCOO )',
      variantTitle: 'DZ-K6JS-CCOO',
      quantity: 1,
      unitPrice: 50.84,
      gstRate: 18,
      hsnCode: '73269090'
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-100 border border-slate-300 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Control Ribbon */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="Apollo Engineering Logo" className="h-8 w-auto object-contain" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display flex items-center gap-2">
                <span>GST Statutory Tax Invoice / Bill of Supply</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Triplicate for Supplier
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Invoice: <strong className="text-slate-900">{invoiceNumber}</strong> • Order: {orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Copy Type Switcher */}
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="Triplicate for Supplier">Triplicate for Supplier</option>
              <option value="Original for Recipient">Original for Recipient</option>
              <option value="Duplicate for Transporter">Duplicate for Transporter</option>
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Page Container (A4 Printable Area) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200">
          <div
            ref={printRef}
            id="statutory-tax-invoice"
            className="w-full max-w-[210mm] bg-white text-black font-sans p-6 md:p-8 shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Top Header Banner: Original Apollo Engineering Logo + Document Title */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2.5">
              {/* Brand Logo (Original /logo.webp) */}
              <div className="space-y-0.5">
                <img 
                  src="/logo.webp" 
                  alt="Apollo Engineering" 
                  className="h-10 md:h-11 w-auto object-contain" 
                />
              </div>

              {/* Document Title & Copy Type (Exact PDF Match) */}
              <div className="text-right">
                <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                  Tax Invoice/Bill of Supply/Cash Memo
                </h2>
                <div className="text-[11px] font-bold text-slate-700 font-mono mt-0.5">
                  ({copyType})
                </div>
              </div>
            </div>

            {/* Sold By vs Billing/Shipping Addresses Grid (2 Columns) */}
            <div className="grid grid-cols-2 gap-6 py-2.5 border-b border-black text-[11px]">
              {/* Left Column: Sold By Block */}
              <div className="space-y-0.5">
                <div className="font-bold uppercase text-[10px] text-slate-800">Sold By :</div>
                <div className="font-black text-xs uppercase">NILESHKUMAR BHARATBHAI PATEL</div>
                <div className="text-[9px] text-slate-400">*</div>
                <div className="text-[10.5px] text-slate-800 leading-snug uppercase">
                  UNIT NO.FF/B/111, SHREEHARI INDUSTRIAL<br />
                  PARK/ESTATE, NEAR HINGLAJ MATAJI<br />
                  MANDIR, Ahmedabad<br />
                  Ahmedabad, GUJARAT, 382430<br />
                  IN
                </div>
                <div className="pt-1.5 space-y-0.5 font-mono text-[10.5px]">
                  <div><strong>PAN No:</strong> DDPPS7036E</div>
                  <div><strong>GST Registration No:</strong> 24DDPPS7036E1ZG</div>
                </div>
              </div>

              {/* Right Column: Billing & Shipping Address Block */}
              <div className="space-y-2">
                <InvoiceAddressCard
                  title="Billing Address"
                  name={customerName}
                  address={addressLine}
                  state={state}
                  pincode={pincode}
                  stateCode={stateCode}
                />

                <div className="space-y-0.5 pt-1.5 border-t border-slate-200">
                  <InvoiceAddressCard
                    title="Shipping Address"
                    name={customerName}
                    address={addressLine}
                    state={state}
                    pincode={pincode}
                    stateCode={stateCode}
                  />
                  <div className="text-[10px] font-mono pt-0.5 flex items-center gap-3">
                    <span><strong>Place of supply:</strong> {state.toUpperCase()}</span>
                    <span><strong>Place of delivery:</strong> {state.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order & Invoice Details Bar */}
            <div className="grid grid-cols-2 gap-6 py-2 border-b border-black text-[11px] font-mono">
              <div className="space-y-0.5">
                <div><strong>Order Number:</strong> {orderNumber}</div>
                <div><strong>Order Date:</strong> {invoiceDate}</div>
              </div>
              <div className="space-y-0.5">
                <div><strong>Invoice Number :</strong> {invoiceNumber}</div>
                <div><strong>Invoice Details :</strong> GJ-{order.id.slice(-9)}-2627</div>
                <div><strong>Invoice Date :</strong> {invoiceDate}</div>
              </div>
            </div>

            {/* Itemized Statutory Tax Table (Matching Page 2) */}
            <div className="py-2.5">
              <table className="w-full text-left text-[11px] border border-black border-collapse font-sans">
                <thead>
                  <tr className="border-b border-black divide-x divide-black bg-slate-50 text-[9.5px] font-black uppercase text-center">
                    <th className="p-1.5 w-7">Sl.<br />No</th>
                    <th className="p-1.5 text-left">Description</th>
                    <th className="p-1.5 w-14 text-right">Unit<br />Price</th>
                    <th className="p-1.5 w-9 text-center">Qty</th>
                    <th className="p-1.5 w-16 text-right">Net<br />Amount</th>
                    <th className="p-1.5 w-10 text-center">Tax<br />Rate</th>
                    <th className="p-1.5 w-10 text-center">Tax<br />Type</th>
                    <th className="p-1.5 w-16 text-right">Tax<br />Amount</th>
                    <th className="p-1.5 w-16 text-right">Total<br />Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {rawItems.map((item, idx) => {
                    const gross = (item.unitPrice * item.quantity);
                    const net = (gross / 1.18);
                    const halfTax = (gross - net) / 2;
                    const isIntraState = isGujarat;

                    if (isIntraState) {
                      return (
                        <React.Fragment key={idx}>
                          <tr className="divide-x divide-black text-[10.5px]">
                            <td rowSpan={2} className="p-1.5 text-center font-mono align-top">{idx + 1}</td>
                            <td rowSpan={2} className="p-1.5 leading-snug align-top">
                              <div className="font-bold text-slate-900">{item.productTitle}</div>
                              <div className="text-[9px] font-mono text-slate-700 mt-0.5 font-bold">
                                HSN:{item.hsnCode || '73269090'}
                              </div>
                            </td>
                            <td rowSpan={2} className="p-1.5 text-right font-mono align-middle">₹{item.unitPrice.toFixed(2)}</td>
                            <td rowSpan={2} className="p-1.5 text-center font-mono font-bold align-middle">{item.quantity}</td>
                            <td rowSpan={2} className="p-1.5 text-right font-mono align-middle">₹{net.toFixed(2)}</td>
                            <td className="p-1 text-center font-mono">9%</td>
                            <td className="p-1 text-center font-mono font-bold">CGST</td>
                            <td className="p-1 text-right font-mono">₹{halfTax.toFixed(2)}</td>
                            <td rowSpan={2} className="p-1.5 text-right font-mono font-black align-middle">₹{gross.toFixed(2)}</td>
                          </tr>
                          <tr className="divide-x divide-black text-[10.5px] border-t border-slate-200">
                            <td className="p-1 text-center font-mono">9%</td>
                            <td className="p-1 text-center font-mono font-bold">SGST</td>
                            <td className="p-1 text-right font-mono">₹{halfTax.toFixed(2)}</td>
                          </tr>
                        </React.Fragment>
                      );
                    } else {
                      const fullTax = gross - net;
                      return (
                        <tr key={idx} className="divide-x divide-black text-[10.5px]">
                          <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="p-1.5 leading-snug">
                            <div className="font-bold text-slate-900">{item.productTitle}</div>
                            <div className="text-[9px] font-mono text-slate-700 mt-0.5 font-bold">
                              HSN:{item.hsnCode || '73269090'}
                            </div>
                          </td>
                          <td className="p-1.5 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="p-1.5 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="p-1.5 text-right font-mono">₹{net.toFixed(2)}</td>
                          <td className="p-1.5 text-center font-mono">18%</td>
                          <td className="p-1.5 text-center font-mono font-bold">IGST</td>
                          <td className="p-1.5 text-right font-mono">₹{fullTax.toFixed(2)}</td>
                          <td className="p-1.5 text-right font-mono font-black">₹{gross.toFixed(2)}</td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black divide-x divide-black bg-slate-50 font-mono font-black text-[11px]">
                    <td colSpan={7} className="p-1.5 text-right uppercase font-bold">TOTAL:</td>
                    <td className="p-1.5 text-right">₹{totalTax.toFixed(2)}</td>
                    <td className="p-1.5 text-right text-xs">₹{grandTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Amount in Words + Authorized Signatory Row (Exact PDF Match) */}
            <div className="grid grid-cols-2 gap-6 py-2 border-t border-b border-black text-[11px]">
              <div className="space-y-0.5">
                <div className="font-bold text-[10.5px]">Amount in Words:</div>
                <div className="font-black text-xs italic capitalize">
                  {numberToIndianWords(grandTotal)}
                </div>
                <div className="pt-3 text-[10.5px] text-slate-800">
                  Whether tax is payable under reverse charge - <strong>No</strong>
                </div>
              </div>

              {/* Authorized Signatory Box */}
              <div className="border border-black p-2.5 text-right flex flex-col justify-between">
                <div className="font-bold text-[10.5px]">For NILESHKUMAR BHARATBHAI PATEL:</div>
                <div className="py-1 flex justify-end">
                  <div className="font-serif italic text-base font-bold tracking-widest text-slate-900 pr-3">
                    N. B. Patel
                  </div>
                </div>
                <div className="text-[9.5px] font-bold text-slate-800 border-t border-slate-300 pt-0.5">
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* Payment Transaction Details Table */}
            <div className="py-2.5">
              <table className="w-full text-left text-[11px] border border-black border-collapse font-mono">
                <tbody>
                  <tr className="divide-x divide-black border-b border-black">
                    <td className="p-1.5 w-1/2">
                      <span className="text-slate-500 block text-[9px]">Payment Transaction ID:</span>
                      <strong className="text-[11px]">
                        {order.paymentDetail?.transactionId || '1111OK3FT3cpNGb19Q0lbwWUx'}
                      </strong>
                    </td>
                    <td className="p-1.5 w-1/4">
                      <span className="text-slate-500 block text-[9px]">Date & Time:</span>
                      <strong className="text-[11px]">{invoiceDate}, 15:55:02 hrs</strong>
                    </td>
                    <td className="p-1.5 w-1/4">
                      <span className="text-slate-500 block text-[9px]">Invoice Value:</span>
                      <strong className="text-[11px] font-black">{grandTotal.toFixed(2)}</strong>
                    </td>
                  </tr>
                  <tr className="divide-x divide-black">
                    <td colSpan={3} className="p-1.5">
                      <span className="text-slate-500 block text-[9px]">Mode of Payment:</span>
                      <strong className="text-[11px] uppercase">
                        {order.paymentDetail?.method || 'Prepaid UPI / Razorpay'}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legal Footnotes (Exact PDF Match) */}
            <div className="pt-3 border-t border-slate-300 text-[8px] text-slate-500 font-mono space-y-0.5 text-center">
              <div>
                *Apollo Engineering Works — Direct Factory Hub (Kathwada GIDC, Ahmedabad — 382430).
              </div>
              <div>
                Customers desirous of availing input GST credit are requested to provide registered GSTIN at time of purchase.
              </div>
              <div>
                Please note that this invoice is not a demand for payment
              </div>
              <div className="pt-1 font-bold text-slate-700 text-right">
                Page 1 of 1
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Embedded CSS for Exact Single-Page A4 Invoice Printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden;
          }
          #statutory-tax-invoice, #statutory-tax-invoice * {
            visibility: visible;
          }
          #statutory-tax-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 7mm 9mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            background: #fff !important;
          }
          @page {
            size: 210mm 297mm;
            margin: 0 !important;
          }
        }
      `}} />
    </div>
  );
};

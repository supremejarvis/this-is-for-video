import React from 'react';
import { Printer, X, Truck, ShieldCheck } from 'lucide-react';
import { Order } from '../../types';

interface ThermalShippingLabelProps {
  order: Order;
  packageIndex?: number;
  onClose: () => void;
}

export const ThermalShippingLabel: React.FC<ThermalShippingLabelProps> = ({ order, packageIndex = 0, onClose }) => {
  const shipment = order.shipments[packageIndex] || order.shipments[0];
  const shipping = shipment.shippingDetail;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Controls Bar */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            <Printer className="w-4 h-4 text-amber-400" />
            4x6 Standard Thermal Shipping Label (APE Express Cargo)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Label
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable 4x6 Label Canvas */}
        <div className="p-6 overflow-y-auto flex justify-center bg-slate-800/40">
          <div 
            id="thermal-label"
            className="w-[380px] bg-white text-black font-sans p-4 rounded-none shadow-2xl border-2 border-black space-y-3 print:border-none print:shadow-none print:w-full"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2">
              <div>
                <div className="font-black text-lg tracking-tight uppercase leading-none text-[#0054A6]">APE SHIPPING</div>
                <div className="text-[11px] font-black tracking-widest uppercase text-slate-800">APE PRIORITY DISPATCH</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-sm">{shipping.articleNumber}</div>
                <div className="text-[10px] font-bold uppercase text-emerald-700">APE CARGO LOGISTICS</div>
              </div>
            </div>

            {/* Barcode 128 Box */}
            <div className="py-2 border-b-2 border-black flex flex-col items-center justify-center space-y-1">
              {/* Simulated Code-128 Barcode lines */}
              <div className="h-14 w-full flex items-center justify-center gap-[2px] px-2 bg-white">
                {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3, 1, 5, 2, 4, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3, 1, 5].map((h, i) => (
                  <div 
                    key={i} 
                    className="bg-black" 
                    style={{ width: `${(i % 3) + 1.5}px`, height: `${35 + (h * 3)}px` }} 
                  />
                ))}
              </div>
              <span className="font-mono font-bold text-xs tracking-widest">*{shipping.articleNumber}*</span>
            </div>

            {/* Destination Address (Customer) */}
            <div className="border-b-2 border-black pb-2 text-xs space-y-1">
              <div className="font-bold uppercase text-[10px] text-slate-700">SHIP TO DESTINATION:</div>
              <div className="font-black text-sm">{order.deliveryAddress.fullName}</div>
              <div className="text-xs">{order.deliveryAddress.flatBuilding}, {order.deliveryAddress.streetArea}</div>
              
              {/* LOCKED SUB POST OFFICE */}
              <div className="bg-slate-100 p-1.5 border border-black my-1">
                <div className="font-black text-xs uppercase">
                  📮 DELIVERY POSTAL HUB: {order.deliveryAddress.postOffice.name}
                </div>
                <div className="font-bold text-xs">
                  CITY: {order.deliveryAddress.city}, STATE: {order.deliveryAddress.state}
                </div>
                <div className="font-mono font-black text-base tracking-wider">
                  PINCODE: {order.deliveryAddress.pincode}
                </div>
              </div>
              <div className="font-mono text-[11px]">Contact Phone: {order.deliveryAddress.phone}</div>
            </div>

            {/* Origin Return Address (Kathwada Hub 382430) */}
            <div className="border-b-2 border-black pb-2 text-[11px] space-y-0.5">
              <div className="font-bold uppercase text-[9px] text-slate-600">IF UNDELIVERED, RETURN TO:</div>
              <div className="font-bold">APOLLO ENGINEERING CENTRAL LOGISTICS HUB</div>
              <div>100 / Gopinath Industrial Landmark, Kathwada GIDC</div>
              <div className="font-bold">
                Origin Pincode: <strong className="font-mono font-black">382430</strong> (Kathwada GIDC S.O.)
              </div>
            </div>

            {/* Package & Order Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-b-2 border-black pb-2">
              <div>
                <div>ORDER #: <strong>{order.orderNumber}</strong></div>
                <div>WEIGHT: <strong>{(shipping.weightGrams / 1000).toFixed(2)} KG</strong></div>
              </div>
              <div className="text-right">
                <div>DATE: <strong>{new Date(order.createdAt).toLocaleDateString('en-IN')}</strong></div>
                <div className="font-bold">{order.paymentDetail.method === 'COD' ? 'CASH ON DELIVERY' : 'PREPAID'}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 pt-1">
              <span>MANIFEST: {shipping.manifestId}</span>
              <span>ROUTING: {shipping.originPincode} ➔ {shipping.destinationPincode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

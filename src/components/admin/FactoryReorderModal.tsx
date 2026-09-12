import React, { useState } from 'react';
import { 
  X, Printer, Download, Factory, AlertTriangle, CheckCircle2, 
  Layers, Package, ShieldCheck, FileText, IndianRupee, Clock
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';
import { ORIGIN_HUB_PINCODE } from '../../services/logisticsService';

interface FactoryReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  threshold?: number;
}

export const FactoryReorderModal: React.FC<FactoryReorderModalProps> = ({
  isOpen,
  onClose,
  threshold = 500
}) => {
  const { products, showToast } = useStore();
  const [poNumber] = useState(() => `PO-APE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [poDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Filter low stock variants
  const lowStockItems: {
    asin: string;
    productTitle: string;
    sku: string;
    variantTitle: string;
    currentStock: number;
    threshold: number;
    recommendedOrder: number;
    material: string;
    estUnitCost: number;
  }[] = [];

  products.forEach((p) => {
    p.variants.forEach((v) => {
      const itemThreshold = v.lowStockThreshold || threshold;
      const currentStock = v.inventory || 0;
      if (currentStock <= itemThreshold) {
        // Calculate recommended replenishment run (bring up to 3x threshold or min 1000)
        const targetStock = Math.max(1000, itemThreshold * 2.5);
        const recommendedOrder = Math.ceil((targetStock - currentStock) / 50) * 50;
        
        lowStockItems.push({
          asin: p.asin,
          productTitle: p.title,
          sku: v.sku,
          variantTitle: v.title || 'Standard',
          currentStock,
          threshold: itemThreshold,
          recommendedOrder: Math.max(100, recommendedOrder),
          material: v.attributes?.material || 'AISI SS304 Stainless Steel',
          estUnitCost: v.b2bTierPricing?.[0]?.pricePerUnit ? Math.round(v.b2bTierPricing[0].pricePerUnit * 0.6) : 15
        });
      }
    });
  });

  const totalReplenishmentUnits = lowStockItems.reduce((acc, i) => acc + i.recommendedOrder, 0);
  const totalEstimatedCost = lowStockItems.reduce((acc, i) => acc + (i.recommendedOrder * i.estUnitCost), 0);

  const handleExportJson = () => {
    const poPayload = {
      poNumber,
      date: poDate,
      factoryHub: `Apollo Engineering Works, Shed 14, Kathwada GIDC, Ahmedabad (${ORIGIN_HUB_PINCODE})`,
      totalItems: lowStockItems.length,
      totalUnits: totalReplenishmentUnits,
      totalEstimatedCost,
      lineItems: lowStockItems
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(poPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${poNumber}_Factory_Reorder.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Purchase Order ${poNumber} exported to JSON!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                  Manufacturing Plant Work Order
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-mono">
                  {poNumber}
                </span>
              </div>
              <h2 className="text-xl font-black font-display tracking-tight text-white mt-0.5">
                Factory Reorder & Production Sheet
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PO Meta Details */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Manufacturing Unit:</span>
            <strong className="text-slate-900 text-sm block mt-0.5">Apollo Engineering Works</strong>
            <span className="text-slate-600 text-[11px]">Shed 14, Kathwada GIDC ({ORIGIN_HUB_PINCODE})</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">PO Date & Turnaround:</span>
            <strong className="text-slate-900 text-sm block mt-0.5">{poDate}</strong>
            <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> 3-5 Working Days Run
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Replenishment Scope:</span>
            <strong className="text-amber-700 text-sm block mt-0.5 font-sans">
              {totalReplenishmentUnits.toLocaleString('en-IN')} Units
            </strong>
            <span className="text-slate-600 text-[11px]">{lowStockItems.length} SKUs below minimum threshold</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12 bg-emerald-50 rounded-2xl border border-emerald-200 p-8 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-emerald-950 text-base">All Inventory Levels Healthy</h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                No SKUs are currently below the {threshold} unit threshold. Live warehouse stock is adequate for active order dispatch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">SKU / Item Description</th>
                    <th className="p-3 text-center">Grade / Spec</th>
                    <th className="p-3 text-center">Current Stock</th>
                    <th className="p-3 text-center">Min Threshold</th>
                    <th className="p-3 text-center text-amber-900 font-black">Production Run (Qty)</th>
                    <th className="p-3 text-right">Est. Unit Cost</th>
                    <th className="p-3 text-right">Total Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {lowStockItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.productTitle}</div>
                        <div className="font-mono text-[11px] text-slate-500">{item.sku}</div>
                      </td>
                      <td className="p-3 text-center text-slate-600 text-[11px] font-mono">
                        {item.material}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          item.currentStock === 0 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.currentStock} pcs
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">
                        {item.threshold} pcs
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black font-mono text-xs shadow-xs">
                          +{item.recommendedOrder} pcs
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        ₹{item.estUnitCost}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{(item.recommendedOrder * item.estUnitCost).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td colSpan={4} className="p-3 text-right uppercase font-mono text-slate-600">
                      Total Production Run Estimate:
                    </td>
                    <td className="p-3 text-center font-mono font-black text-amber-900">
                      {totalReplenishmentUnits.toLocaleString('en-IN')} Pcs
                    </td>
                    <td className="p-3 text-right text-slate-500 font-mono">Total Budget:</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-800 text-sm">
                      ₹{totalEstimatedCost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Authorization Notes */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Plant Manager Authorization Protocol</span>
            </div>
            <p className="text-amber-900 text-[11px] leading-relaxed">
              This factory purchase order sheet instructs the Apollo Engineering stamping and CNC machining shop at Kathwada GIDC to commence raw SS304 coil slitting and press stamping. Finished goods will be transferred to warehouse inventory upon QC approval.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-500">
            Certified AISI SS304 Raw Material Standard · Kathwada Manufacturing Unit
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportJson}
              disabled={lowStockItems.length === 0}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PO (JSON)</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={lowStockItems.length === 0}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Production Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

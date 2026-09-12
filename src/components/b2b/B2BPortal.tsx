import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, CheckCircle2, AlertCircle, 
  CreditCard, Users, FileText, ShoppingCart, ArrowRight, Upload, Plus 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiService } from '../../services/apiService';

export const B2BPortal: React.FC = () => {
  const { currentOrg, updateOrgDetails, products, addToCart, showToast } = useStore();

  const [testGstin, setTestGstin] = useState(currentOrg.gstin);
  const [isVerifyingGstin, setIsVerifyingGstin] = useState(false);
  const [bulkMatrixSelections, setBulkMatrixSelections] = useState<Record<string, number>>({});

  const handleVerifyGstin = async () => {
    setIsVerifyingGstin(true);
    try {
      const response = await apiService.verifyGstin(testGstin);
      if (response.success && response.data?.isValid) {
        updateOrgDetails({
          gstin: response.data.gstin,
          isGstVerified: true,
          kycStatus: 'VERIFIED',
          companyName: response.data.legalName || currentOrg.companyName,
          tradeName: response.data.tradeName || currentOrg.tradeName,
          stateCode: response.data.stateCode || currentOrg.stateCode
        });
        showToast(`GSTIN ${response.data.gstin} verified successfully! State: ${response.data.stateName}`, 'success');
      } else {
        showToast(response.error || `GSTIN ${testGstin} invalid. Must be 15 alphanumeric characters.`, 'error');
      }
    } catch {
      showToast('GST verification service error. Please try again.', 'error');
    } finally {
      setIsVerifyingGstin(false);
    }
  };

  const handleBulkMatrixAdd = () => {
    let totalAdded = 0;
    Object.entries(bulkMatrixSelections).forEach(([sku, qtyVal]) => {
      const qty = Number(qtyVal);
      if (qty > 0) {
        const parentProd = products.find((p) => p.variants.some((v) => v.sku === sku));
        const variant = parentProd?.variants.find((v) => v.sku === sku);
        if (parentProd && variant) {
          const seller = parentProd.sellerListings[variant.sku]?.[0] || {
            sellerName: 'Apex Direct Industrial',
            fulfillmentType: 'FBF'
          };
          addToCart({
            sku: variant.sku,
            parentAsin: parentProd.asin,
            productTitle: parentProd.title,
            variantTitle: variant.title,
            attributes: variant.attributes as Record<string, string>,
            imageUrl: variant.images[0],
            unitPrice: variant.b2cPrice,
            mrp: variant.mrp,
            gstRate: variant.gstRatePercent,
            hsnCode: variant.hsnCode,
            sellerId: seller.sellerName,
            sellerName: seller.sellerName,
            fulfillmentType: seller.fulfillmentType,
            weightGrams: variant.weightGrams,
            isB2BPricingApplied: true
          }, qty);
          totalAdded += qty;
        }
      }
    });

    if (totalAdded > 0) {
      showToast(`Added ${totalAdded} wholesale units across multiple SKUs to cart!`, 'success');
      setBulkMatrixSelections({});
    }
  };

  const availableCredit = currentOrg.creditLimit - currentOrg.creditUsed;
  const creditUsagePercent = Math.round((currentOrg.creditUsed / currentOrg.creditLimit) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border border-blue-900/60 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-mono font-bold">
              APE STORE B2B ENTERPRISE ACCOUNT
            </span>
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> GST Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{currentOrg.companyName}</h1>
          <p className="text-xs text-slate-400 font-mono">
            Legal Entity: {currentOrg.tradeName} | GSTIN: <strong className="text-amber-400">{currentOrg.gstin}</strong> (State: 24)
          </p>
        </div>

        {/* Credit Line Status Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 w-full sm:w-auto min-w-[280px] space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">Net 30 Corporate Credit:</span>
            <strong className="text-emerald-400 font-mono">₹{availableCredit.toLocaleString('en-IN')} Avail</strong>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-amber-500 transition-all duration-500" 
              style={{ width: `${creditUsagePercent}%` }} 
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Used: ₹{currentOrg.creditUsed.toLocaleString('en-IN')}</span>
            <span>Total Limit: ₹{currentOrg.creditLimit.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 3-Column Enterprise Operations Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Organization & GSTIN Verification */}
        <div className="lg:col-span-4 space-y-6">
          {/* GSTIN Verification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              GSTIN & Tax Verification Engine
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">GST Portal Validation</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testGstin}
                  onChange={(e) => setTestGstin(e.target.value.toUpperCase())}
                  placeholder="24AAACP1234F1Z8"
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleVerifyGstin}
                  disabled={isVerifyingGstin}
                  className="px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex-shrink-0"
                >
                  {isVerifyingGstin ? 'Verifying...' : 'Validate'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>CIN Number:</span>
                <strong className="text-white font-mono">{currentOrg.cin}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tax Status:</span>
                <strong className="text-emerald-400">ACTIVE - REGULAR</strong>
              </div>
              <div className="flex justify-between">
                <span>Input Tax Credit (ITC):</span>
                <strong className="text-blue-400">100% Eligible</strong>
              </div>
            </div>
          </div>

          {/* Org Hierarchy & Approvers */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Team & Approval Hierarchy
              </h3>
              <span className="text-xs text-slate-400">{currentOrg.members.length} Members</span>
            </div>

            <div className="space-y-3">
              {currentOrg.members.map((m) => (
                <div key={m.userId} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-white">{m.name}</strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                      {m.role.replace('B2B_', '')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{m.department}</span>
                    <span className="font-mono text-emerald-400">Limit: ₹{m.spendingLimit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: B2B Wholesale Quick-Order Matrix */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                B2B Bulk Wholesale Quick-Order Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct quantity entry across all product variants with automated volume pricing
              </p>
            </div>

            <button
              onClick={handleBulkMatrixAdd}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-amber-500 hover:opacity-90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Add All Selected to Cart
            </button>
          </div>

          {/* Quick Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3">Product ASIN / SKU</th>
                  <th className="p-3">Variant Specification</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">Bulk Tier (50+ pcs)</th>
                  <th className="p-3 text-right">Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.flatMap((p) => p.variants.map((v) => {
                  const bulkTierPrice = v.b2bTierPricing[v.b2bTierPricing.length - 1]?.pricePerUnit || v.b2cPrice;
                  return (
                    <tr key={v.sku} className="hover:bg-slate-950/60 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white truncate max-w-[180px]">{p.title}</div>
                        <span className="font-mono text-[10px] text-slate-400">{v.sku}</span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {v.title}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {v.inventory} pcs
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        ₹{v.b2cPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        ₹{bulkTierPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={v.inventory}
                          value={bulkMatrixSelections[v.sku] || ''}
                          onChange={(e) => setBulkMatrixSelections({
                            ...bulkMatrixSelections,
                            [v.sku]: parseInt(e.target.value, 10) || 0
                          })}
                          placeholder="0"
                          className="w-16 h-8 px-2 text-center bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

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

          // Compute wholesale tiered price based on ordered volume
          const tiers = variant.b2bTierPricing || [];
          const applicableTier = [...tiers]
            .reverse()
            .find((t) => qty >= t.minQty) || tiers[0];
          const unitPrice = applicableTier ? applicableTier.pricePerUnit : variant.b2cPrice;

          addToCart({
            sku: variant.sku,
            parentAsin: parentProd.asin,
            productTitle: parentProd.title,
            variantTitle: variant.title,
            attributes: variant.attributes as Record<string, string>,
            imageUrl: variant.images[0],
            unitPrice: unitPrice,
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
      <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-3xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-[#0054A6] text-xs font-mono font-bold">
              APE STORE B2B ENTERPRISE ACCOUNT
            </span>
            <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> GST Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{currentOrg.companyName}</h1>
          <p className="text-xs text-slate-500 font-mono">
            Legal Entity: {currentOrg.tradeName} | GSTIN: <strong className="text-amber-600">{currentOrg.gstin}</strong> (State: 24)
          </p>
        </div>

        {/* Credit Line Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 w-full sm:w-auto min-w-[280px] space-y-2.5 shadow-sm">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Net 30 Corporate Credit:</span>
            <strong className="text-emerald-700 font-mono">₹{availableCredit.toLocaleString('en-IN')} Avail</strong>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-amber-500 transition-all duration-500" 
              style={{ width: `${creditUsagePercent}%` }} 
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-500">
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
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-[#0054A6]" />
              GSTIN & Tax Verification Engine
            </h3>

            <div className="space-y-2">
              <label htmlFor="b2b-gstin-input" className="block text-xs font-semibold text-slate-700">GST Portal Validation</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="b2b-gstin-input"
                  name="gstin"
                  value={testGstin}
                  onChange={(e) => setTestGstin(e.target.value.toUpperCase())}
                  placeholder="24AAACP1234F1Z8"
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#0054A6] focus:outline-none placeholder:text-slate-400"
                />
                <button
                  onClick={handleVerifyGstin}
                  disabled={isVerifyingGstin}
                  className="px-3 bg-[#0054A6] hover:bg-[#004285] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex-shrink-0 cursor-pointer"
                >
                  {isVerifyingGstin ? 'Verifying...' : 'Validate'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>CIN Number:</span>
                <strong className="text-slate-900 font-mono">{currentOrg.cin}</strong>
              </div>
              <div className="flex justify-between">
                <span>Tax Status:</span>
                <strong className="text-emerald-700">ACTIVE - REGULAR</strong>
              </div>
              <div className="flex justify-between">
                <span>Input Tax Credit (ITC):</span>
                <strong className="text-blue-700">100% Eligible</strong>
              </div>
            </div>
          </div>

          {/* Org Hierarchy & Approvers */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                Team & Approval Hierarchy
              </h3>
              <span className="text-xs text-slate-500">{currentOrg.members.length} Members</span>
            </div>

            <div className="space-y-3">
              {currentOrg.members.map((m) => (
                <div key={m.userId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-900">{m.name}</strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 border border-blue-200 text-[#0054A6]">
                      {m.role.replace('B2B_', '')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{m.department}</span>
                    <span className="font-mono text-emerald-700">Limit: ₹{m.spendingLimit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: B2B Wholesale Quick-Order Matrix */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                B2B Bulk Wholesale Quick-Order Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct quantity entry across all product variants with automated volume pricing
              </p>
            </div>

            <button
              onClick={handleBulkMatrixAdd}
              className="px-4 py-2 bg-gradient-to-r from-[#0054A6] to-blue-700 hover:from-[#004285] hover:to-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add All Selected to Cart
            </button>
          </div>

          {/* Quick Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="p-3">Product ASIN / SKU</th>
                  <th className="p-3">Variant Specification</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">Bulk Tier (50+ pcs)</th>
                  <th className="p-3 text-right">Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.flatMap((p) => p.variants.map((v) => {
                  const bulkTierPrice = v.b2bTierPricing[v.b2bTierPricing.length - 1]?.pricePerUnit || v.b2cPrice;
                  return (
                    <tr key={v.sku} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 truncate max-w-[180px]">{p.title}</div>
                        <span className="font-mono text-[10px] text-slate-500">{v.sku}</span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {v.title}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {v.inventory} pcs
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        ₹{v.b2cPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600">
                        ₹{bulkTierPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          id={`b2b-qty-${v.sku}`}
                          name={`qty_${v.sku}`}
                          aria-label={`Order quantity for ${v.title} (${v.sku})`}
                          min={0}
                          max={v.inventory}
                          value={bulkMatrixSelections[v.sku] || ''}
                          onChange={(e) => setBulkMatrixSelections({
                            ...bulkMatrixSelections,
                            [v.sku]: parseInt(e.target.value, 10) || 0
                          })}
                          placeholder="0"
                          className="w-16 h-8 px-2 text-center bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
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

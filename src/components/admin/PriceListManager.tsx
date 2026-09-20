'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, RefreshCw, AlertCircle, CheckCircle2, Calculator, ShieldCheck, Tag, Layers, ChevronRight, X, Percent } from 'lucide-react';
import { adminPricingApi, PriceList, TaxProfile, PricingPreviewResult } from '../../services/api/adminPricingApi';
import { adminCatalogApi, AdminVariantListItem } from '../../services/api/adminCatalogApi';

export const PriceListManager: React.FC = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [variants, setVariants] = useState<AdminVariantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Price List State
  const [isCreatingPriceList, setIsCreatingPriceList] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlPriority, setNewPlPriority] = useState('10');
  const [newPlIsDefault, setNewPlIsDefault] = useState(false);

  // New Price Rule State
  const [selectedPlId, setSelectedPlId] = useState<string | null>(null);
  const [ruleVariantId, setRuleVariantId] = useState('');
  const [ruleMinQty, setRuleMinQty] = useState('1');
  const [ruleMaxQty, setRuleMaxQty] = useState('');
  const [ruleUnitPrice, setRuleUnitPrice] = useState('20.00');

  // Calculator State
  const [calcVariantId, setCalcVariantId] = useState('');
  const [calcQty, setCalcQty] = useState('50');
  const [calcCustomerGroup, setCalcCustomerGroup] = useState('RETAIL_B2C');
  const [calcStateCode, setCalcStateCode] = useState('24');
  const [calcIsInclusive, setCalcIsInclusive] = useState(true);
  const [calcResult, setCalcResult] = useState<PricingPreviewResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pls, tps, vars] = await Promise.all([
        adminPricingApi.listPriceLists(),
        adminPricingApi.listTaxProfiles(),
        adminCatalogApi.listVariants({ limit: 100 }),
      ]);
      setPriceLists(pls);
      setTaxProfiles(tps);
      setVariants(vars.items);
      if (pls.length > 0 && !selectedPlId) {
        setSelectedPlId(pls[0].id);
      }
      if (vars.items.length > 0 && !calcVariantId) {
        setCalcVariantId(vars.items[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load pricing configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePriceList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    setError(null);
    try {
      await adminPricingApi.createPriceList({
        name: newPlName.trim(),
        priority: parseInt(newPlPriority, 10) || 0,
        is_default: newPlIsDefault,
      });
      setSuccessMsg(`Price list '${newPlName}' created.`);
      setNewPlName('');
      setIsCreatingPriceList(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create price list.');
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlId || !ruleVariantId || !ruleUnitPrice) return;
    setError(null);
    try {
      await adminPricingApi.addPriceRule(selectedPlId, {
        variant_id: ruleVariantId,
        min_qty: parseInt(ruleMinQty, 10) || 1,
        max_qty_exclusive: ruleMaxQty ? parseInt(ruleMaxQty, 10) : null,
        unit_price: parseFloat(ruleUnitPrice),
      });
      setSuccessMsg('Price rule added.');
      setRuleMaxQty('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add price rule.');
    }
  };

  const runCalculator = async () => {
    if (!calcVariantId) return;
    setCalcLoading(true);
    try {
      const res = await adminPricingApi.previewPricing({
        variant_id: calcVariantId,
        quantity: parseInt(calcQty, 10) || 1,
        customer_group_code: calcCustomerGroup,
        customer_state_code: calcStateCode,
        is_tax_inclusive: calcIsInclusive,
      });
      setCalcResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate quote preview.');
    } finally {
      setCalcLoading(false);
    }
  };

  const activePriceList = priceLists.find((pl) => pl.id === selectedPlId);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Price Lists, Quantity Slabs & GST Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic precedence (Contractor/B2B vs B2C), quantity intervals, and line-total statutory GST calculations.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Left: Price Lists & Slabs | Right: Live GST Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Price Lists & Rules */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Active Price Lists
              </h3>
              <button
                onClick={() => setIsCreatingPriceList(!isCreatingPriceList)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingPriceList ? 'Cancel' : 'New Price List'}
              </button>
            </div>

            {/* New Price List Form */}
            {isCreatingPriceList && (
              <form onSubmit={handleCreatePriceList} className="p-4 rounded-xl bg-slate-50 border border-emerald-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Create Commercial Price List</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">List Name</label>
                    <input
                      type="text"
                      required
                      value={newPlName}
                      onChange={(e) => setNewPlName(e.target.value)}
                      placeholder="e.g. Contractor B2B Wholesale"
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Priority (Higher wins)</label>
                    <input
                      type="number"
                      value={newPlPriority}
                      onChange={(e) => setNewPlPriority(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newPlIsDefault}
                      onChange={(e) => setNewPlIsDefault(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Is System Default Price List
                  </label>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                  >
                    Save Price List
                  </button>
                </div>
              </form>
            )}

            {/* Price Lists Horizontal Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {priceLists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setSelectedPlId(pl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedPlId === pl.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{pl.name}</span>
                  {pl.is_default && <span className="text-[9px] px-1 py-0.2 rounded bg-white/20">DEFAULT</span>}
                </button>
              ))}
            </div>

            {/* Selected Price List Rules & Add Rule Form */}
            {activePriceList && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    Quantity Slab Rules for "{activePriceList.name}"
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Priority: {activePriceList.priority}</span>
                </div>

                {/* Rules Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Variant</th>
                        <th className="p-2.5">Quantity Slab</th>
                        <th className="p-2.5">Unit Price (INR)</th>
                        <th className="p-2.5">Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activePriceList.rules.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400 font-sans text-xs">
                            No rules added yet. Add a quantity slab below.
                          </td>
                        </tr>
                      ) : (
                        activePriceList.rules.map((r) => {
                          const vObj = variants.find((v) => v.id === r.variant_id);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-sans font-medium text-slate-900">
                                {vObj ? vObj.sku : r.variant_id.slice(0, 8)}
                              </td>
                              <td className="p-2.5 text-slate-600">
                                [{r.min_qty} - {r.max_qty_exclusive ?? '∞'})
                              </td>
                              <td className="p-2.5 font-bold text-emerald-700">₹{r.unit_price}</td>
                              <td className="p-2.5 text-slate-500 text-[10px] font-sans">{r.price_basis}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Rule Inline Form */}
                <form onSubmit={handleAddRule} className="pt-2 flex flex-wrap items-end gap-2 text-xs">
                  <div className="w-40">
                    <label className="text-[10px] font-semibold text-slate-500">Variant</label>
                    <select
                      value={ruleVariantId}
                      onChange={(e) => setRuleVariantId(e.target.value)}
                      required
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                    >
                      <option value="">Select Variant</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sku} ({v.frame_thickness})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16">
                    <label className="text-[10px] font-semibold text-slate-500">Min Qty</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={ruleMinQty}
                      onChange={(e) => setRuleMinQty(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] font-semibold text-slate-500">Max Qty (opt)</label>
                    <input
                      type="number"
                      placeholder="∞"
                      value={ruleMaxQty}
                      onChange={(e) => setRuleMaxQty(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] font-semibold text-slate-500">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={ruleUnitPrice}
                      onChange={(e) => setRuleUnitPrice(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-none font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow-sm"
                  >
                    Add Slab Rule
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Live Statutory Quote & Tax Calculator */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Live Statutory GST Quote Calculator
            </h3>
            <p className="text-xs text-slate-500">
              Evaluates backend pricing engine precedence, quantity interval, and line-total statutory GST.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="font-semibold text-slate-600">Target Variant</label>
                <select
                  value={calcVariantId}
                  onChange={(e) => setCalcVariantId(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none"
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.sku} - {v.display_label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={calcQty}
                    onChange={(e) => setCalcQty(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Customer Group</label>
                  <select
                    value={calcCustomerGroup}
                    onChange={(e) => setCalcCustomerGroup(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="RETAIL_B2C">Retail B2C</option>
                    <option value="CONTRACTOR_B2B">Contractor B2B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600">Destination State Code</label>
                  <select
                    value={calcStateCode}
                    onChange={(e) => setCalcStateCode(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none font-mono"
                  >
                    <option value="24">24 - Gujarat (Intra-state: CGST+SGST)</option>
                    <option value="27">27 - Maharashtra (Inter-state: IGST)</option>
                    <option value="08">08 - Rajasthan (Inter-state: IGST)</option>
                    <option value="07">07 - Delhi (Inter-state: IGST)</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={calcIsInclusive}
                      onChange={(e) => setCalcIsInclusive(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Tax Inclusive (B2C)
                  </label>
                </div>
              </div>

              <button
                onClick={runCalculator}
                disabled={calcLoading || !calcVariantId}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {calcLoading ? 'Calculating...' : 'Preview Statutory Quote'}
              </button>

              {/* Calculator Output */}
              {calcResult && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white font-mono space-y-2 border border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-400 font-sans pb-1 border-b border-slate-800">
                    <span>Applied: {calcResult.price_list_name}</span>
                    <span>Slab: {calcResult.rule_slab}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Unit Price:</span>
                    <span className="font-bold text-emerald-400">₹{calcResult.applied_unit_price}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taxable Base:</span>
                    <span>₹{calcResult.taxable_base}</span>
                  </div>
                  {calcResult.is_interstate ? (
                    <div className="flex justify-between text-xs text-blue-300">
                      <span>IGST (18%):</span>
                      <span>₹{calcResult.igst_amount}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs text-blue-300">
                        <span>CGST (9%):</span>
                        <span>₹{calcResult.cgst_amount}</span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-300">
                        <span>SGST (9%):</span>
                        <span>₹{calcResult.sgst_amount}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Total GST:</span>
                    <span>₹{calcResult.total_tax}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-amber-400">
                    <span>Final Payable Total:</span>
                    <span>₹{calcResult.total_amount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

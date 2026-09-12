import React, { useState } from 'react';
import { 
  Tag, Plus, Edit3, Trash2, Check, X, Percent, Calendar, 
  DollarSign, Truck, CheckCircle2, AlertCircle, Eye, Copy, Sparkles
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { CouponType } from '../../types';

export const CouponManagementPanel: React.FC = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, showToast } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<CouponType>('PERCENTAGE');
  const [formValue, setFormValue] = useState(10);
  const [formMinOrder, setFormMinOrder] = useState(500);
  const [formMaxDiscount, setFormMaxDiscount] = useState(1000);
  const [formUsageLimit, setFormUsageLimit] = useState(100);
  const [formValidUntil, setFormValidUntil] = useState('2026-12-31');

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormType('PERCENTAGE');
    setFormValue(10);
    setFormMinOrder(500);
    setFormMaxDiscount(1000);
    setFormUsageLimit(100);
    setFormValidUntil('2026-12-31');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      showToast('Coupon code is required', 'error');
      return;
    }
    const existing = coupons.find(c => c.code.toUpperCase() === formCode.trim().toUpperCase());
    if (existing) {
      showToast(`Coupon code "${formCode}" already exists!`, 'error');
      return;
    }
    addCoupon({
      code: formCode.trim().toUpperCase(),
      description: formDescription || `${formType === 'PERCENTAGE' ? `${formValue}% off` : formType === 'FLAT_AMOUNT' ? `₹${formValue} off` : 'Free shipping'}`,
      type: formType,
      value: formValue,
      minOrderAmount: formMinOrder,
      maxDiscount: formType === 'PERCENTAGE' ? formMaxDiscount : undefined,
      validFrom: new Date().toISOString(),
      validUntil: new Date(formValidUntil + 'T23:59:59Z').toISOString(),
      usageLimit: formUsageLimit,
      isActive: true,
    });
    setIsCreating(false);
    resetForm();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Coupon code "${code}" copied!`, 'success');
    });
  };

  const typeColors: Record<CouponType, string> = {
    PERCENTAGE: 'bg-blue-50 border-blue-200 text-[#0054A6]',
    FLAT_AMOUNT: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    FREE_SHIPPING: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const typeIcons: Record<CouponType, React.ReactNode> = {
    PERCENTAGE: <Percent className="w-3.5 h-3.5" />,
    FLAT_AMOUNT: <DollarSign className="w-3.5 h-3.5" />,
    FREE_SHIPPING: <Truck className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            Coupon & Discount Management
          </h2>
          <p className="text-xs text-slate-600">
            Create, manage, and track promotional coupons. Active coupons: {coupons.filter(c => c.isActive).length}/{coupons.length}
          </p>
        </div>
        <button
          onClick={() => { setIsCreating(true); setEditingId(null); resetForm(); }}
          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Coupon
        </button>
      </div>

      {/* Create Coupon Form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white/95 backdrop-blur-xl border border-amber-200 rounded-3xl p-6 shadow-xl space-y-5 text-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-700 flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4" />
              New Coupon Configuration
            </h3>
            <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Coupon Code */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Coupon Code *</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="APOLLO20"
                required
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="20% off on all products"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Discount Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as CouponType)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT_AMOUNT">Flat Amount (₹)</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
              </select>
            </div>

            {/* Value */}
            {formType !== 'FREE_SHIPPING' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  {formType === 'PERCENTAGE' ? 'Discount %' : 'Flat Discount (₹)'}
                </label>
                <input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(Number(e.target.value))}
                  min={1}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            )}

            {/* Min Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Min Order Amount (₹)</label>
              <input
                type="number"
                value={formMinOrder}
                onChange={(e) => setFormMinOrder(Number(e.target.value))}
                min={0}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>

            {/* Max Discount (for %) */}
            {formType === 'PERCENTAGE' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Max Discount Cap (₹)</label>
                <input
                  type="number"
                  value={formMaxDiscount}
                  onChange={(e) => setFormMaxDiscount(Number(e.target.value))}
                  min={0}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            )}

            {/* Usage Limit */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Usage Limit</label>
              <input
                type="number"
                value={formUsageLimit}
                onChange={(e) => setFormUsageLimit(Number(e.target.value))}
                min={1}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Valid Until</label>
              <input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Create Coupon
            </button>
          </div>
        </form>
      )}

      {/* Coupons List */}
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-sm">No coupons created yet</p>
            <p className="text-xs mt-1">Create your first promotional coupon above</p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const isExpired = new Date(coupon.validUntil) < new Date();
            const usagePercent = Math.round((coupon.usedCount / coupon.usageLimit) * 100);
            
            return (
              <div
                key={coupon.id}
                className={`bg-white/95 backdrop-blur-xl border rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 transition-all shadow-md ${
                  coupon.isActive && !isExpired ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Coupon Code Badge */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="px-4 py-2 rounded-2xl bg-slate-50 border-2 border-dashed border-amber-500/60 text-amber-700 font-mono font-black text-base tracking-widest hover:border-amber-500 transition-all flex items-center gap-2 group shadow-inner"
                    >
                      {coupon.code}
                      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${typeColors[coupon.type]}`}>
                      {typeIcons[coupon.type]}
                      {coupon.type === 'PERCENTAGE' ? `${coupon.value}% OFF` : coupon.type === 'FLAT_AMOUNT' ? `₹${coupon.value} OFF` : 'FREE SHIP'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{coupon.description}</p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-mono">
                      <span>Min: ₹{coupon.minOrderAmount.toLocaleString('en-IN')}</span>
                      {coupon.maxDiscount && <span>Max: ₹{coupon.maxDiscount.toLocaleString('en-IN')}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Until {new Date(coupon.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {/* Usage Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{coupon.usedCount}/{coupon.usageLimit} used</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {isExpired ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">EXPIRED</span>
                  ) : coupon.isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-bold">PAUSED</span>
                  )}

                  {/* Toggle Active */}
                  <button
                    onClick={() => updateCoupon(coupon.id, { isActive: !coupon.isActive })}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      coupon.isActive
                        ? 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {coupon.isActive ? 'Pause' : 'Activate'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete coupon "${coupon.code}"?`)) {
                        deleteCoupon(coupon.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[10px] font-bold transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

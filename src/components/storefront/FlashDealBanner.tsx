import React, { useState, useEffect } from 'react';
import { Flame, Clock, Zap, ShoppingCart, ShieldCheck, CheckCircle2, ArrowRight, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const FlashDealBanner: React.FC = () => {
  const { addToCart, showToast, appMode, currentUser } = useStore();
  const isB2B = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));

  const dealPrice = isB2B ? 12.75 : 18.0;
  const dealMrp = 25.0;
  const discountPercent = Math.round(((dealMrp - dealPrice) / dealMrp) * 100);

  // 4-Hour Countdown Timer
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 3,
    minutes: 42,
    seconds: 15
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClaimDeal = () => {
    addToCart({
      sku: 'AE-CLIP-35MM-SS',
      parentAsin: 'AP-CLIP-35MM',
      productTitle: 'Apollo SS304 Solar Auto Drain Clips (35mm Frame Size)',
      variantTitle: isB2B ? 'Pack of 50 Pcs - B2B Factory Wholesale Tier' : 'Pack of 10 Pcs - Retail Flash Deal',
      attributes: { size: '35mm', material: 'SS304' },
      imageUrl: '/Drain_clips.webp',
      unitPrice: dealPrice,
      mrp: dealMrp,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 48,
      isB2BPricingApplied: isB2B
    }, isB2B ? 50 : 10);

    showToast(
      isB2B 
        ? 'Claimed B2B Wholesale Deal: 50x SS304 Clips added to Cart at ₹12.75!'
        : 'Claimed Retail Flash Deal: 10x SS304 Clips added to Cart at ₹18.00!', 
      'success'
    );
  };

  return (
    <div className={`rounded-3xl p-6 text-slate-950 shadow-xl flex flex-wrap items-center justify-between gap-6 relative overflow-hidden ${
      isB2B 
        ? 'bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white border border-blue-700/50 shadow-blue-900/20' 
        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-orange-500/10'
    }`}>
      
      {/* Decorative background glow */}
      <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      {/* Left content */}
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 ${
          isB2B 
            ? 'bg-blue-600/30 text-amber-400 border-blue-400/40 backdrop-blur-md' 
            : 'bg-white/20 text-slate-950 border-white/30 backdrop-blur-md'
        }`}>
          {isB2B ? <Building2 className="w-8 h-8" /> : <Flame className="w-8 h-8 animate-bounce" />}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-wider ${
              isB2B ? 'bg-amber-400 text-slate-950' : 'bg-slate-950 text-amber-400'
            }`}>
              {isB2B ? '🏢 B2B Commercial Batch Deal' : '🛒 Retail Deal of the Day'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
              isB2B ? 'bg-blue-900/50 text-blue-200 border-blue-500/40' : 'bg-white/20 text-slate-950 border-white/30'
            }`}>
              {discountPercent}% {isB2B ? 'B2B Wholesale Discount' : 'Consumer Discount'}
            </span>
          </div>
          <h3 className={`text-lg md:text-xl font-black font-display tracking-tight ${
            isB2B ? 'text-white' : 'text-slate-950'
          }`}>
            Apollo AISI SS304 Universal Drain Clips ({isB2B ? 'Pack of 50 Batch' : 'Pack of 10 Retail Pack'})
          </h3>
          <p className={`text-xs font-medium ${
            isB2B ? 'text-blue-200' : 'text-slate-900'
          }`}>
            Kathwada GIDC Central Hub Dispatch • 100% Guaranteed Corrosion-Proof
          </p>
        </div>
      </div>

      {/* Center: Live Countdown & Progress Bar */}
      <div className="space-y-2 relative z-10 w-full md:w-auto">
        <div className={`flex items-center gap-2 text-xs font-mono font-black justify-start md:justify-center ${
          isB2B ? 'text-blue-100' : 'text-slate-950'
        }`}>
          <Clock className="w-4 h-4" />
          <span>Deal Expires In:</span>
          <div className="flex items-center gap-1 font-mono text-sm">
            <span className={`px-2 py-0.5 rounded-lg ${isB2B ? 'bg-blue-950 text-amber-400 border border-blue-800' : 'bg-slate-950 text-white'}`}>
              {String(timeLeft.hours).padStart(2, '0')}h
            </span>
            <span>:</span>
            <span className={`px-2 py-0.5 rounded-lg ${isB2B ? 'bg-blue-950 text-amber-400 border border-blue-800' : 'bg-slate-950 text-white'}`}>
              {String(timeLeft.minutes).padStart(2, '0')}m
            </span>
            <span>:</span>
            <span className={`px-2 py-0.5 rounded-lg ${isB2B ? 'bg-blue-950 text-amber-400 border border-blue-800' : 'bg-slate-950 text-white'}`}>
              {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className={`flex justify-between text-[11px] font-mono font-bold ${
            isB2B ? 'text-blue-200' : 'text-slate-950'
          }`}>
            <span>78% Claimed</span>
            <span>220 units remaining</span>
          </div>
          <div className={`w-full md:w-56 h-2 rounded-full overflow-hidden ${
            isB2B ? 'bg-blue-950' : 'bg-slate-950/20'
          }`}>
            <div className={`h-full rounded-full w-[78%] ${
              isB2B ? 'bg-amber-400' : 'bg-slate-950'
            }`} />
          </div>
        </div>
      </div>

      {/* Right: Price & CTA */}
      <div className="flex items-center gap-4 relative z-10 w-full md:w-auto justify-between md:justify-end">
        <div>
          <div className={`text-xs line-through font-mono ${
            isB2B ? 'text-blue-300/60' : 'text-slate-900/60'
          }`}>
            MRP: ₹{dealMrp}/pc
          </div>
          <div className={`text-2xl font-black font-mono ${
            isB2B ? 'text-amber-400' : 'text-slate-950'
          }`}>
            ₹{dealPrice.toFixed(2)} <span className="text-xs font-normal">/pc</span>
          </div>
          {isB2B && (
            <div className="text-[10px] font-mono text-emerald-400 font-bold">
              +18% GST ITC Claimable
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleClaimDeal}
          className={`px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 ${
            isB2B 
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20' 
              : 'bg-slate-950 hover:bg-slate-900 text-white shadow-black/20'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{isB2B ? 'Claim B2B Batch (50 Pcs)' : 'Claim Retail Deal (10 Pcs)'}</span>
        </button>
      </div>
    </div>
  );
};

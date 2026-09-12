import React, { useState, useMemo } from 'react';
import { Calculator, Zap, Package, ShoppingCart, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SolarBOMCalculator: React.FC = () => {
  const { addToCart, showToast, appMode, currentUser, setIsAuthModalOpen } = useStore();
  const isB2B = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));

  const [plantCapacityKw, setPlantCapacityKw] = useState<number>(10);
  const [wattsPerPanel, setWattsPerPanel] = useState<number>(550); // Standard 540-550W mono-perc

  // Presets from 1 kW home/residential up to full Megawatt (1 MW) scale
  const presets = [
    { label: '1 kW (Home)', kw: 1 },
    { label: '3 kW (Surya Ghar)', kw: 3 },
    { label: '5 kW (Residential)', kw: 5 },
    { label: '10 kW (Commercial)', kw: 10 },
    { label: '50 kW (Rooftop)', kw: 50 },
    { label: '100 kW (Factory)', kw: 100 },
    { label: '500 kW (Industrial)', kw: 500 },
    { label: '1 MW (Megawatt Scale)', kw: 1000 },
  ];

  // Calculations
  const totalPanels = useMemo(() => {
    return Math.max(1, Math.ceil((plantCapacityKw * 1000) / wattsPerPanel));
  }, [plantCapacityKw, wattsPerPanel]);

  // Drain clips: 2 clips per solar panel (minimum 2)
  const clipsNeeded = useMemo(() => Math.max(2, totalPanels * 2), [totalPanels]);

  // AetherWash Sprinklers: 1 sprinkler covers 4 panels (minimum 1)
  const sprinklersNeeded = useMemo(() => Math.max(1, Math.ceil(totalPanels / 4)), [totalPanels]);

  // SS304 GI Clamps: 1 clamp per panel (minimum 2)
  const clampsNeeded = useMemo(() => Math.max(2, Math.ceil(totalPanels * 0.8)), [totalPanels]);

  // Pricing calculations
  const clipRetailRate = 20;
  const clipB2bRate = 12.75;

  const sprinklerRetailRate = 220;
  const sprinklerB2bRate = 185;

  const clampRetailRate = 45;
  const clampB2bRate = 32;

  const totalRetailPrice = useMemo(() => {
    return (clipsNeeded * clipRetailRate) + (sprinklersNeeded * sprinklerRetailRate) + (clampsNeeded * clampRetailRate);
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded]);

  const totalB2bPrice = useMemo(() => {
    return Math.round((clipsNeeded * clipB2bRate) + (sprinklersNeeded * sprinklerB2bRate) + (clampsNeeded * clampB2bRate));
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded]);

  const totalSavings = useMemo(() => {
    return totalRetailPrice - totalB2bPrice;
  }, [totalRetailPrice, totalB2bPrice]);

  const totalWeightKg = useMemo(() => {
    const clipsWeightKg = (clipsNeeded * 48) / 1000;
    const sprinklersWeightKg = (sprinklersNeeded * 140) / 1000;
    const clampsWeightKg = (clampsNeeded * 120) / 1000;
    return Number((clipsWeightKg + sprinklersWeightKg + clampsWeightKg).toFixed(1));
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded]);

  const handleAddEntireBOMToCart = () => {
    // Add Drain Clips
    addToCart({
      sku: 'AE-CLIP-35MM-SS',
      parentAsin: 'AP-CLIP-35MM',
      productTitle: 'Apollo SS304 Solar Auto Drain Clips (35mm)',
      variantTitle: '35mm Frame Size - Kit Allocation',
      attributes: { size: '35mm', material: 'SS304' },
      imageUrl: '/Drain_clips.webp',
      unitPrice: isB2B ? clipB2bRate : clipRetailRate,
      mrp: clipRetailRate,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 48,
      isB2BPricingApplied: isB2B
    }, clipsNeeded);

    // Add Sprinklers
    addToCart({
      sku: 'AE-SPRINKLER-180',
      parentAsin: 'AP-SPRINKLER-180',
      productTitle: 'Apollo SS304 Shadowless Solar Sprinkler (180° Curtain)',
      variantTitle: '180° Curtain - ½" BSP Male Thread',
      attributes: { size: '½" BSP', material: 'SS304' },
      imageUrl: '/solar_sprinkler.webp',
      unitPrice: isB2B ? sprinklerB2bRate : sprinklerRetailRate,
      mrp: sprinklerRetailRate,
      gstRate: 18,
      hsnCode: '84248990',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 140,
      isB2BPricingApplied: isB2B
    }, sprinklersNeeded);

    const capacityDisplay = plantCapacityKw >= 1000 
      ? `${(plantCapacityKw / 1000).toFixed(plantCapacityKw % 1000 === 0 ? 0 : 2)} MW (${plantCapacityKw.toLocaleString('en-IN')} kW)`
      : `${plantCapacityKw} kW`;

    showToast(
      isB2B 
        ? `Added Complete ${capacityDisplay} Solar Cleaning BOM to Cart with B2B Wholesale Pricing!`
        : `Added Complete ${capacityDisplay} Solar Hardware Kit to Cart!`, 
      'success'
    );
  };

  const scrollToCatalogProduct = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-[#0054A6]', 'ring-offset-2', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-[#0054A6]', 'ring-offset-2');
      }, 2500);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden space-y-6">
      
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_top_right,rgba(0,84,166,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0054A6]/10 text-[#0054A6] border border-[#0054A6]/20 flex items-center justify-center font-bold shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0054A6] font-mono tracking-wide">
                {isB2B ? '🏢 B2B Commercial EPC Engineering Tool' : '⚡ Solar Plant Hardware Sizing Calculator'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                isB2B ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
              }`}>
                {isB2B ? 'Wholesale BOM Tier' : 'Retail Sizing'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display tracking-tight">
              Solar Plant Hardware Bill of Materials (BOM) Estimator
            </h2>
          </div>
        </div>
      </div>

      {/* Interactive Sliders: Balanced 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        
        {/* Capacity Slider Card with Nested Quick Sizes */}
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <label htmlFor="plant-capacity-slider" className="text-xs font-bold text-slate-800">
              Total Solar Plant Target Capacity:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-sm focus-within:ring-2 focus-within:ring-[#0054A6] focus-within:border-[#0054A6]">
                <input
                  id="plant-capacity-number-input"
                  type="number"
                  min={1}
                  max={5000}
                  value={plantCapacityKw}
                  aria-label="Direct Plant Capacity in kW"
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(5000, Number(e.target.value) || 1));
                    setPlantCapacityKw(val);
                  }}
                  className="w-16 font-mono font-black text-sm text-[#0054A6] text-right bg-transparent focus:outline-none"
                />
                <span className="font-mono text-xs font-bold text-slate-600 ml-1">kW</span>
              </div>
              <span className="text-sm font-black text-[#0054A6] font-mono">
                {plantCapacityKw >= 1000 ? `(${(plantCapacityKw / 1000).toFixed(plantCapacityKw % 1000 === 0 ? 0 : 2)} MW)` : ''}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (~{totalPanels.toLocaleString('en-IN')} Panels)
              </span>
            </div>
          </div>

          <input
            id="plant-capacity-slider"
            type="range"
            min={1}
            max={1000}
            step={1}
            value={Math.min(1000, plantCapacityKw)}
            aria-label="Total Solar Plant Target Capacity in kilowatts or megawatts"
            onChange={(e) => setPlantCapacityKw(Number(e.target.value))}
            className="w-full h-3.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#0054A6] hover:bg-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0054A6] focus-visible:ring-offset-2"
          />

          <div className="flex justify-between text-[11px] sm:text-xs font-mono text-slate-600 font-medium pt-0.5">
            <span>1 kW (Home)</span>
            <span>10 kW (Res)</span>
            <span>50 kW (Rooftop)</span>
            <span>100 kW (Factory)</span>
            <span>500 kW (Industrial)</span>
            <span>1 MW (Megawatt)</span>
          </div>

          {/* Quick Sizes Presets Nested Under Slider */}
          <div className="pt-3 border-t border-slate-200/70">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono" role="group" aria-label="Quick Plant Sizes">
              <span className="text-slate-600 font-bold mr-1">Quick Sizes:</span>
              {presets.map(p => (
                <button
                  key={p.kw}
                  type="button"
                  aria-pressed={plantCapacityKw === p.kw}
                  onClick={() => setPlantCapacityKw(p.kw)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all border text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                    plantCapacityKw === p.kw
                      ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Wattage Selector */}
        <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <label htmlFor="panel-rating-select" className="text-xs font-bold text-slate-800 block mb-1">
              Solar Panel Rating (Watts):
            </label>
            <select
              id="panel-rating-select"
              value={wattsPerPanel}
              aria-label="Solar Panel Rating in Watts"
              onChange={(e) => setWattsPerPanel(Number(e.target.value))}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0054A6] shadow-sm"
            >
              <option value={400}>400W (Poly / Small Commercial)</option>
              <option value={450}>450W (Mono-Perc Standard)</option>
              <option value={540}>540W (Tier-1 Bifacial)</option>
              <option value={550}>550W (Utility Standard 72-Cell)</option>
              <option value={580}>580W (TopCon High Efficiency)</option>
            </select>
          </div>
          <span className="text-xs text-slate-600 font-mono block">
            Automatic calculation of clip & sprinkler hardware ratios.
          </span>
        </div>
      </div>

      {/* Generated BOM Matrix Cards with Small Product Images & Direct Catalog Connection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        
        {/* Item 1: Clips */}
        <div 
          onClick={() => scrollToCatalogProduct('catalog-product-drain-clips')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToCatalogProduct('catalog-product-drain-clips'); }}
          aria-label="View SS304 Drain Clips in Catalog"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-[#0054A6] hover:shadow-md transition-all cursor-pointer group relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-[#0054A6] transition-all shadow-inner">
              <img 
                src="/Drain_clips.webp" 
                alt="SS304 Drain Clips" 
                className="w-full h-full object-contain" 
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">SS304 Drain Clips</span>
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#0054A6] border border-blue-200 inline-block mt-0.5">
                2 per panel
              </span>
              <span className="text-[11px] font-semibold text-[#0054A6] flex items-center gap-1 mt-1 group-hover:underline">
                View in Catalog <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {clipsNeeded.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Pcs</span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between border-t border-slate-100 pt-1.5 font-mono">
            <span>{isB2B ? 'Wholesale Rate:' : 'Retail Rate:'}</span>
            <strong className={isB2B ? 'text-emerald-700' : 'text-slate-900'}>
              ₹{isB2B ? clipB2bRate : clipRetailRate}/pc
            </strong>
          </div>
        </div>

        {/* Item 2: Sprinklers */}
        <div 
          onClick={() => scrollToCatalogProduct('catalog-product-sprinkler')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToCatalogProduct('catalog-product-sprinkler'); }}
          aria-label="View 180° SS304 Sprinklers in Catalog"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-[#0054A6] hover:shadow-md transition-all cursor-pointer group relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-[#0054A6] transition-all shadow-inner">
              <img 
                src="/solar_sprinkler.webp" 
                alt="180° SS304 Sprinklers" 
                className="w-full h-full object-contain" 
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">180° SS304 Sprinklers</span>
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 inline-block mt-0.5">
                1 per 4 panels
              </span>
              <span className="text-[11px] font-semibold text-[#0054A6] flex items-center gap-1 mt-1 group-hover:underline">
                View in Catalog <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {sprinklersNeeded.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Pcs</span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between border-t border-slate-100 pt-1.5 font-mono">
            <span>{isB2B ? 'Wholesale Rate:' : 'Retail Rate:'}</span>
            <strong className={isB2B ? 'text-emerald-700' : 'text-slate-900'}>
              ₹{isB2B ? sprinklerB2bRate : sprinklerRetailRate}/pc
            </strong>
          </div>
        </div>

        {/* Item 3: Hardware Clamps */}
        <div 
          onClick={() => scrollToCatalogProduct('catalog-product-drain-clips')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToCatalogProduct('catalog-product-drain-clips'); }}
          aria-label="View Piping Mount Clamps in Catalog"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-[#0054A6] hover:shadow-md transition-all cursor-pointer group relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-[#0054A6] transition-all shadow-inner">
              <img 
                src="/gi_pipe_clamp.webp" 
                alt="Piping Mount Clamps" 
                className="w-full h-full object-contain" 
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">Piping Mount Clamps</span>
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 inline-block mt-0.5">
                Galvanized SS
              </span>
              <span className="text-[11px] font-semibold text-[#0054A6] flex items-center gap-1 mt-1 group-hover:underline">
                View in Catalog <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {clampsNeeded.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Pcs</span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between border-t border-slate-100 pt-1.5 font-mono">
            <span>{isB2B ? 'Wholesale Rate:' : 'Retail Rate:'}</span>
            <strong className={isB2B ? 'text-emerald-700' : 'text-slate-900'}>
              ₹{isB2B ? clampB2bRate : clampRetailRate}/pc
            </strong>
          </div>
        </div>

        {/* Item 4: Total Freight Weight */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 p-1 shrink-0 flex items-center justify-center text-emerald-700 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">Dispatch Freight</span>
              </div>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 inline-block mt-0.5">
                Kathwada Hub
              </span>
              <span className="text-[11px] text-emerald-700 font-medium block mt-1">Speed Post Parcel</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalWeightKg.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">Kg</span>
          </div>
          <div className="text-xs text-slate-600 flex justify-between border-t border-slate-100 pt-1.5 font-mono">
            <span>Logistics:</span>
            <strong className="text-xs font-bold text-slate-900">Direct Factory Parcel</strong>
          </div>
        </div>

      </div>

      {/* Action CTA Bar & Separation */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          {isB2B ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 line-through font-mono">Retail: ₹{totalRetailPrice.toLocaleString('en-IN')}</span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 font-mono">₹{totalB2bPrice.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-black">
                  Save ₹{totalSavings.toLocaleString('en-IN')} (Direct Factory B2B Rate)
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Includes 18% GST Input Tax Credit (ITC) claimable: <strong>₹{Math.round(totalB2bPrice * 0.18 / 1.18).toLocaleString('en-IN')}</strong>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 uppercase font-bold font-mono">Estimated Retail Kit Cost:</span>
                <span className="text-xl md:text-2xl font-black text-slate-900 font-mono">₹{totalRetailPrice.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-xs font-mono font-bold">
                  Standard Consumer Pricing
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Includes India Post Speed Post Express Doorstep Parcel Dispatch with GST tax invoice.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddEntireBOMToCart}
          aria-label={isB2B 
            ? `Add Entire ${plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Wholesale BOM Kit` 
            : `Add Complete ${plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Hardware Kit`}
          className={`h-11 px-6 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            isB2B 
              ? 'bg-[#0054A6] hover:bg-[#003d7a] text-white focus-visible:ring-brand-blue'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-slate-950 focus-visible:ring-amber-500'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> 
          <span>
            {isB2B 
              ? `Add Entire ${plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Wholesale BOM to Cart` 
              : `Add Complete ${plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Kit to Cart`}
          </span>
        </button>
      </div>

    </div>
  );
};

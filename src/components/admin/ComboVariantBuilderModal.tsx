import React, { useState, useMemo } from 'react';
import { 
  X, Layers, Plus, Trash2, CheckCircle2, ShieldCheck, Zap, 
  Package, Calculator, Sparkles, Building2, ShoppingCart, Info, Check, ArrowRight, DollarSign
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product, ProductVariant, ComboComponentItem } from '../../types';

interface ComboVariantBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct?: Product | null;
}

export const ComboVariantBuilderModal: React.FC<ComboVariantBuilderModalProps> = ({
  isOpen,
  onClose,
  targetProduct
}) => {
  const { products, updateProduct, showToast } = useStore();

  // Selected Target ASIN
  const [selectedAsin, setSelectedAsin] = useState<string>(
    targetProduct?.asin || 'AP-FULLKIT-05'
  );

  // Mode: 'AUTO_SOLAR_KIT' vs 'MANUAL_COMBO'
  const [builderMode, setBuilderMode] = useState<'AUTO_SOLAR_KIT' | 'MANUAL_COMBO'>('AUTO_SOLAR_KIT');

  // Solar Kit Formula Inputs
  const [plantKw, setPlantKw] = useState<number>(3);
  const [panelCount, setPanelCount] = useState<number>(6); // ~2 panels per kW for 540-550W mono perc
  const [panelThicknessMm, setPanelThicknessMm] = useState<number>(35);

  // Components List (Product X, Y, Z with exact photos, motor specs, and unit prices)
  const [components, setComponents] = useState<ComboComponentItem[]>([
    {
      asin: 'AP-SPRINKLER-180',
      sku: 'AE-SPRINKLER-180',
      productTitle: 'Apollo SS304 Shadowless Sprinkler (180° Curtain)',
      imageUrl: '/solar_sprinkler.webp',
      quantity: 6,
      unitPrice: 60,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: 'AISI SS304 Stainless Steel',
        flowRateLpm: 7,
        size: '½" BSP Thread',
        hsnCode: '84248990',
        specs: { 'Ratio': '1 Sprinkler per Panel (6 Pcs)', 'Coverage': '180° Full Curtain' }
      }
    },
    {
      asin: 'AP-CLIP-35MM',
      sku: 'AE-CLIP-35MM-SS',
      productTitle: 'Apollo SS304 Auto Drain Clips (Frame Thickness: 35mm)',
      imageUrl: '/Drain_clips.webp',
      quantity: 12,
      unitPrice: 20,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: 'AISI SS304 Corrosion-Proof',
        size: '35mm Frame Thickness',
        hsnCode: '73269099',
        specs: { 'Ratio': '2 Clips per Panel (12 Pcs)' }
      }
    },
    {
      asin: 'AP-CLAMP-GI',
      sku: 'AE-CLAMP-GI-20MM',
      productTitle: 'Heavy Galvanized GI Piping Support Clamps',
      imageUrl: '/gi_pipe_clamp.webp',
      quantity: 6,
      unitPrice: 25,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: 'Hot-Dip Galvanized Iron (GI)',
        size: '20mm / 25mm Universal Fit',
        hsnCode: '73269099',
        specs: { 'Ratio': '1 Clamp per Panel (6 Pcs)' }
      }
    },
    {
      asin: 'AP-TIMER-07',
      sku: 'AE-TIMER-PROG',
      productTitle: 'Apollo Digital Programmable Solar Cleaning Automation Controller',
      imageUrl: '/auto_timer.webp',
      quantity: 1,
      unitPrice: 850,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: 'IP65 Weatherproof Enclosure',
        electricalPhase: 'Single Phase 220V AC',
        specs: { 'Operation': '1 Timer Unit per Plant Kit' }
      }
    },
    {
      asin: 'AP-PUMP-06',
      sku: 'AE-PUMP-42LPM',
      productTitle: 'High-Pressure Booster Motor (42 LPM · 0.5 HP · Single Phase)',
      imageUrl: '/pump.webp',
      quantity: 1,
      unitPrice: 1700,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: '100% Copper Winding · SS Impeller',
        flowRateLpm: 42,
        motorHp: '0.5 HP',
        electricalPhase: 'Single Phase 220V/230V AC (50Hz)',
        specs: { 'Rating': '42 LPM Output · 0.5 HP · Single Phase 220V', 'Formula': '6 Panels × 7 LPM = 42 LPM' }
      }
    },
    {
      asin: 'AP-TEE-UPVC',
      sku: 'AE-TEE-UPVC-15MM',
      productTitle: 'UPVC Threaded Brass Insert Tees (Matches Sprinkler Count)',
      imageUrl: '/cpvc_upvc.webp',
      quantity: 6,
      unitPrice: 33,
      unitOfMeasure: 'PCS',
      technicalDetails: {
        material: 'Schedule 80 UPVC with Brass Thread',
        size: '½" FPT × 20mm Socket',
        specs: { 'Ratio': 'Equal to Number of Sprinklers (6 Pcs)' }
      }
    }
  ]);

  // Variant Identity
  const [comboTitle, setComboTitle] = useState('3 kW Complete Solar Cleaning Combo Kit (6 Panels · 42 LPM Motor · 0.5 HP Single Phase)');
  const [comboSku, setComboSku] = useState(`AE-KIT-${Date.now().toString().slice(-4)}`);
  const [comboMrp, setComboMrp] = useState<number>(4999);
  const [comboB2cPrice, setComboB2cPrice] = useState<number>(3499);
  const [comboB2bPrice, setComboB2bPrice] = useState<number>(2950);
  const [comboInventory, setComboInventory] = useState<number>(100);

  // Suggestion notice
  const [pipeNotice, setPipeNotice] = useState(
    'Suggestion: Pipes and other common plumbing fittings are recommended to be purchased from your local hardware market for on-site cut-to-fit savings.'
  );

  // Total Math Sum of Components: Price × Quantity
  const totalComponentCalculatedPrice = useMemo(() => {
    return components.reduce((sum, item) => sum + ((item.unitPrice || 0) * item.quantity), 0);
  }, [components]);

  if (!isOpen) return null;

  // Handler: Re-calculate according to User's Exact Formula
  const handleApplySolarKitFormula = () => {
    const panels = panelCount > 0 ? panelCount : Math.ceil(plantKw * 2);
    const motorLpm = panels * 7; // 7 LPM per panel
    const motorHp = panels <= 8 ? '0.5 HP' : panels <= 15 ? '1.0 HP' : '2.0 HP';
    const electricalPhase = panels > 25 ? '3-Phase 415V' : 'Single Phase 220V/230V AC (50Hz)';
    const motorPrice = panels <= 8 ? 1700 : panels <= 15 ? 2400 : 4200;

    const autoComponents: ComboComponentItem[] = [
      {
        asin: 'AP-SPRINKLER-180',
        sku: 'AE-SPRINKLER-180',
        productTitle: 'Apollo SS304 Shadowless Sprinkler (180° Curtain)',
        imageUrl: '/solar_sprinkler.webp',
        quantity: panels, // 1 per panel
        unitPrice: 60,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          material: 'AISI SS304 Stainless Steel',
          flowRateLpm: 7,
          size: '½" BSP Male Thread',
          specs: { 'Formula': `1 Sprinkler per Panel = ${panels} Pcs` }
        }
      },
      {
        asin: 'AP-CLIP-35MM',
        sku: `AE-CLIP-${panelThicknessMm}MM-SS`,
        productTitle: `Apollo SS304 Auto Drain Clips (Frame Thickness: ${panelThicknessMm}mm)`,
        imageUrl: '/Drain_clips.webp',
        quantity: panels * 2, // 2 per panel
        unitPrice: 20,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          material: 'AISI SS304 Corrosion-Proof',
          size: `${panelThicknessMm}mm Frame Thickness`,
          specs: { 'Formula': `2 Clips per Panel = ${panels * 2} Pcs` }
        }
      },
      {
        asin: 'AP-CLAMP-GI',
        sku: 'AE-CLAMP-GI-20MM',
        productTitle: 'Heavy Galvanized GI Piping Support Clamps',
        imageUrl: '/gi_pipe_clamp.webp',
        quantity: panels, // 1 per panel
        unitPrice: 25,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          material: 'Hot-Dip Galvanized Iron (GI)',
          specs: { 'Formula': `1 Clamp per Panel = ${panels} Pcs` }
        }
      },
      {
        asin: 'AP-TIMER-07',
        sku: 'AE-TIMER-PROG',
        productTitle: 'Apollo Digital Programmable Solar Cleaning Controller',
        imageUrl: '/auto_timer.webp',
        quantity: 1, // 1 timer per kit
        unitPrice: 850,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          material: 'IP65 Weatherproof Enclosure',
          electricalPhase: 'Single Phase 220V AC',
          specs: { 'Operation': '1 Master Automation Timer Unit' }
        }
      },
      {
        asin: 'AP-PUMP-06',
        sku: `AE-PUMP-${motorLpm}LPM`,
        productTitle: `High-Pressure Booster Motor (${motorLpm} LPM · ${motorHp} · ${electricalPhase})`,
        imageUrl: '/pump.webp',
        quantity: 1,
        unitPrice: motorPrice,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          flowRateLpm: motorLpm,
          motorHp: motorHp,
          electricalPhase: electricalPhase,
          specs: { 'Formula': `${panels} Panels × 7 LPM = ${motorLpm} LPM · ${motorHp} · ${electricalPhase}` }
        }
      },
      {
        asin: 'AP-TEE-UPVC',
        sku: 'AE-TEE-UPVC-15MM',
        productTitle: 'UPVC Threaded Brass Insert Tees (Matches Sprinklers)',
        imageUrl: '/cpvc_upvc.webp',
        quantity: panels, // Equal to sprinklers
        unitPrice: 33,
        unitOfMeasure: 'PCS',
        technicalDetails: {
          specs: { 'Formula': `Equal to Sprinkler Count = ${panels} Pcs` }
        }
      }
    ];

    setComponents(autoComponents);
    setComboTitle(`${plantKw} kW Complete Solar Cleaning Combo Kit (${panels} Panels · ${motorLpm} LPM Motor · ${motorHp} Single Phase · ${panelThicknessMm}mm Clips)`);
    setComboSku(`AE-KIT-${plantKw}KW-${panelThicknessMm}MM`);

    // Calculate total bundle math
    const totalLineSum = (panels * 60) + (panels * 2 * 20) + (panels * 25) + 850 + motorPrice + (panels * 33);
    setComboB2cPrice(totalLineSum);
    setComboMrp(Math.round(totalLineSum * 1.35));
    setComboB2bPrice(Math.round(totalLineSum * 0.82));

    showToast(`Calculated Solar Kit Formula: ${plantKw} kW (${panels} Panels · ${motorLpm} LPM · ${motorHp} · ₹${totalLineSum})`, 'success');
  };

  // Add a Generic Product Component from Catalog
  const handleAddCatalogProduct = (asinToAdd: string) => {
    const prod = products.find(p => p.asin === asinToAdd);
    if (!prod) return;
    const variant = prod.variants[0];

    // Pick proper photo
    let img = variant?.images[0] || '/logo.webp';
    if (prod.asin === 'AP-SPRINKLER-180') img = '/solar_sprinkler.webp';
    if (prod.asin === 'AP-CLIP-35MM') img = '/Drain_clips.webp';
    if (prod.asin === 'AP-CLAMP-GI') img = '/gi_pipe_clamp.webp';
    if (prod.asin === 'AP-TIMER-07') img = '/auto_timer.webp';
    if (prod.asin === 'AP-PUMP-06') img = '/pump.webp';
    if (prod.asin === 'AP-TEE-UPVC') img = '/cpvc_upvc.webp';

    const newItem: ComboComponentItem = {
      asin: prod.asin,
      sku: variant?.sku || prod.asin,
      productTitle: prod.title,
      imageUrl: img,
      quantity: 1,
      unitPrice: variant?.b2cPrice || 60,
      unitOfMeasure: variant?.unitOfMeasure || 'PCS',
      technicalDetails: {
        material: variant?.attributes?.material || prod.category,
        hsnCode: variant?.hsnCode || '84248990',
        specs: { 'Standard': 'Catalog Component' }
      }
    };

    setComponents(prev => [...prev, newItem]);
    showToast(`Added ${prod.title} to Combo Variant`, 'info');
  };

  // Remove Component
  const handleRemoveComponent = (idx: number) => {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  };

  // Update Component Quantity (Fixed for buyer)
  const handleUpdateComponentQty = (idx: number, qty: number) => {
    setComponents(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  // Update Component Unit Price (for line calculation)
  const handleUpdateComponentPrice = (idx: number, price: number) => {
    setComponents(prev => prev.map((item, i) => i === idx ? { ...item, unitPrice: Math.max(0, price) } : item));
  };

  // Save Combo Variant into Target Product
  const handleSaveComboVariant = () => {
    const target = products.find(p => p.asin === selectedAsin);
    if (!target) {
      showToast('Target Product ASIN not found', 'error');
      return;
    }

    const newVariant: ProductVariant = {
      sku: comboSku || `AE-COMBO-${Date.now()}`,
      title: comboTitle,
      attributes: {
        material: 'Complete Combo Kit',
        packSize: `${plantKw} kW Kit (${panelCount} Panels)`
      },
      mrp: comboMrp,
      b2cPrice: comboB2cPrice,
      b2bTierPricing: [
        { minQty: 1, maxQty: 4, pricePerUnit: comboB2cPrice, discountPercent: 0 },
        { minQty: 5, maxQty: 19, pricePerUnit: comboB2bPrice, discountPercent: comboB2cPrice > 0 ? Math.round(((comboB2cPrice - comboB2bPrice) / comboB2cPrice) * 100) : 0 },
        { minQty: 20, pricePerUnit: Math.round(comboB2bPrice * 0.9), discountPercent: 25 }
      ],
      inventory: comboInventory,
      barcode: `89085${Date.now().toString().slice(-8)}`,
      images: ['/solar_cleaning_fullset.webp'],
      weightGrams: 5000,
      dimensionsCm: { length: 45, width: 30, height: 25 },
      hsnCode: '84248990',
      gstRatePercent: 18,
      unitOfMeasure: 'SET',
      isComboVariant: true,
      comboComponents: components,
      solarKitConfig: {
        plantCapacityKw: plantKw,
        panelCount: panelCount,
        panelThicknessMm: panelThicknessMm,
        sprinklerPcs: components.find(c => c.asin === 'AP-SPRINKLER-180')?.quantity || panelCount,
        drainClipsPcs: components.find(c => c.asin === 'AP-CLIP-35MM')?.quantity || (panelCount * 2),
        giClampsPcs: components.find(c => c.asin === 'AP-CLAMP-GI')?.quantity || panelCount,
        timerPcs: components.find(c => c.asin === 'AP-TIMER-07')?.quantity || 1,
        motorLpm: panelCount * 7,
        motorHp: panelCount <= 8 ? '0.5 HP' : panelCount <= 15 ? '1.0 HP' : '2.0 HP',
        electricalPhase: panelCount > 25 ? '3-Phase 415V' : 'Single Phase 220V/230V AC (50Hz)',
        upvcTeePcs: components.find(c => c.asin === 'AP-TEE-UPVC')?.quantity || panelCount,
        localPipeNotice: pipeNotice
      }
    };

    // Append to product variants
    const existingIndex = target.variants.findIndex(v => v.sku === newVariant.sku);
    let updatedVariants: ProductVariant[];
    if (existingIndex >= 0) {
      updatedVariants = target.variants.map((v, i) => i === existingIndex ? newVariant : v);
    } else {
      updatedVariants = [...target.variants, newVariant];
    }

    const updatedProduct: Product = {
      ...target,
      isComboBundle: true,
      comboFormulaEnabled: true,
      variants: updatedVariants,
      selectedVariantSku: newVariant.sku
    };

    updateProduct(selectedAsin, updatedProduct);
    showToast(`Successfully Created Combo Variant: ${comboTitle}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-[1700px] h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#002d5a] to-[#0054A6] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                  Industrial Combo Variant Builder
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 text-[10px] font-mono border border-blue-400/30">
                  Fixed Non-Editable Bundle
                </span>
              </div>
              <h2 className="text-lg font-black font-display tracking-tight text-white">
                Multi-Product Bundle & Solar Plant Kit Configurator
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          
          {/* Top Controls: Target ASIN & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="md:col-span-6 space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Target Product ASIN (Where this combo will be added):
              </label>
              <select
                value={selectedAsin}
                onChange={(e) => setSelectedAsin(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0054A6]"
              >
                {products.map(p => (
                  <option key={p.asin} value={p.asin}>
                    {p.asin} — {p.title.slice(0, 55)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 space-y-1.5">
              <label className="font-bold text-slate-700 block">
                Combo Assembly Mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBuilderMode('AUTO_SOLAR_KIT')}
                  className={`h-10 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    builderMode === 'AUTO_SOLAR_KIT'
                      ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Solar Kit Auto Formula</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBuilderMode('MANUAL_COMBO')}
                  className={`h-10 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    builderMode === 'MANUAL_COMBO'
                      ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Custom Products (X, Y, Z)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 1: SOLAR KIT FORMULA GENERATOR (ASIN: AP-FULLKIT-05)  */}
          {/* ───────────────────────────────────────────────────────────── */}
          {builderMode === 'AUTO_SOLAR_KIT' && (
            <div className="p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-amber-50/30 border border-blue-200 rounded-3xl space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black font-display text-sm text-[#0054A6] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Automatic Solar Cleaning Kit Sizing Calculator
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    1 Sprinkler/Panel • 2 Drain Clips/Panel • 1 GI Clamp/Panel • 1 Timer • Motor = 7 LPM × Panels (HP & Single Phase) • UPVC Tees = Sprinklers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplySolarKitFormula}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md flex items-center gap-2 hover:scale-105 transition-all text-xs"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Re-Calculate Combo Components</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Plant Capacity (kW):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={plantKw}
                      onChange={(e) => {
                        const kw = Number(e.target.value) || 1;
                        setPlantKw(kw);
                        setPanelCount(kw * 2); // Default 2 panels per kW (540-550W standard)
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900"
                    />
                    <span className="font-mono text-xs font-bold text-slate-500">kW</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Solar Panel Count:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={500}
                      value={panelCount}
                      onChange={(e) => setPanelCount(Number(e.target.value) || 2)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900"
                    />
                    <span className="font-mono text-xs font-bold text-slate-500">Panels</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Panel Frame Thickness (for Drain Clips):</label>
                  <select
                    value={panelThicknessMm}
                    onChange={(e) => setPanelThicknessMm(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-900"
                  >
                    <option value={30}>30 mm (Modern Bifacial Frame)</option>
                    <option value={35}>35 mm (Standard Industrial Frame)</option>
                    <option value={40}>40 mm (Heavy Utility Frame)</option>
                  </select>
                </div>
              </div>

              {/* Live Sizing Formula Preview */}
              <div className="bg-white p-3 rounded-2xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
                <div className="flex flex-wrap items-center gap-2 text-slate-700">
                  <span className="font-bold text-blue-900">Motor Specification:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                    Flow: {panelCount * 7} LPM ({panelCount} panels × 7 LPM)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    Power: {panelCount <= 8 ? '0.5 HP' : panelCount <= 15 ? '1.0 HP' : '2.0 HP'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
                    Supply: Single Phase 220V/230V AC
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Total Component Line Sum: </span>
                  <strong className="text-[#0054A6] text-xs">₹{totalComponentCalculatedPrice.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 2: COMBO IDENTITY & PRICING                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700 block">Combo Variant Title:</label>
              <input
                type="text"
                value={comboTitle}
                onChange={(e) => setComboTitle(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0054A6]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Variant SKU:</label>
              <input
                type="text"
                value={comboSku}
                onChange={(e) => setComboSku(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Inventory Stock:</label>
              <input
                type="number"
                value={comboInventory}
                onChange={(e) => setComboInventory(Number(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Retail MRP (₹):</label>
              <input
                type="number"
                value={comboMrp}
                onChange={(e) => setComboMrp(Number(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-700 block">B2C Selling Price (₹):</label>
                <button
                  type="button"
                  onClick={() => {
                    setComboB2cPrice(totalComponentCalculatedPrice);
                    setComboMrp(Math.round(totalComponentCalculatedPrice * 1.35));
                    setComboB2bPrice(Math.round(totalComponentCalculatedPrice * 0.82));
                    showToast(`Synced Selling Price to Component Sum: ₹${totalComponentCalculatedPrice}`, 'info');
                  }}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Sync to Sum (₹{totalComponentCalculatedPrice})
                </button>
              </div>
              <input
                type="number"
                value={comboB2cPrice}
                onChange={(e) => setComboB2cPrice(Number(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-slate-50 border border-amber-400 rounded-xl text-xs font-mono font-black text-amber-700"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">B2B Wholesale Price (₹):</label>
              <input
                type="number"
                value={comboB2bPrice}
                onChange={(e) => setComboB2bPrice(Number(e.target.value) || 0)}
                className="w-full h-9 px-3 bg-slate-50 border border-blue-400 rounded-xl text-xs font-mono font-black text-[#0054A6]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Buyer Modification Lock:</label>
              <div className="h-9 px-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Qty Fixed for Buyer</span>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 3: INCLUDED COMBO COMPONENTS TABLE                    */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black font-display text-sm text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0054A6]" />
                  Included Combo Components & Price Math (Price × Qty = Final Line Price)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Each product includes authentic photo, exact specifications, and transparent math calculation.
                </p>
              </div>

              {/* Add Catalog Component Quick Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddCatalogProduct(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="h-8 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add Product from Catalog...</option>
                  {products.map(p => (
                    <option key={p.asin} value={p.asin}>
                      + {p.title.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Components Grid */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Component / Product Photo</th>
                    <th className="p-3">Technical Specifications</th>
                    <th className="p-3 text-center w-28">Unit Price (₹)</th>
                    <th className="p-3 text-center w-24">Fixed Qty</th>
                    <th className="p-3 text-right">Price × Qty = Line Price</th>
                    <th className="p-3 text-right w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {components.map((comp, idx) => {
                    const linePrice = (comp.unitPrice || 0) * comp.quantity;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={comp.imageUrl || '/logo.webp'} 
                              alt={comp.productTitle} 
                              className="w-12 h-12 object-contain rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 shadow-sm"
                            />
                            <div>
                              <strong className="block text-slate-900 text-xs">{comp.productTitle}</strong>
                              <span className="font-mono text-[10px] text-amber-700">ASIN: {comp.asin}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5 font-mono text-[10px] text-slate-600">
                            {/* Motor Specs: LPM, HP, Phase */}
                            {comp.technicalDetails?.flowRateLpm && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                  {comp.technicalDetails.flowRateLpm} LPM Flow
                                </span>
                                {comp.technicalDetails?.motorHp && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                                    {comp.technicalDetails.motorHp}
                                  </span>
                                )}
                                {comp.technicalDetails?.electricalPhase && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                    {comp.technicalDetails.electricalPhase}
                                  </span>
                                )}
                              </div>
                            )}
                            {comp.technicalDetails?.material && (
                              <div>Material: <strong className="text-slate-800">{comp.technicalDetails.material}</strong></div>
                            )}
                            {comp.technicalDetails?.size && (
                              <div>Size: <strong className="text-blue-700">{comp.technicalDetails.size}</strong></div>
                            )}
                            {comp.technicalDetails?.specs && (
                              <div className="text-slate-500">
                                {Object.entries(comp.technicalDetails.specs).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-mono text-slate-400">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={comp.unitPrice || 0}
                              onChange={(e) => handleUpdateComponentPrice(idx, Number(e.target.value) || 0)}
                              className="w-16 h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs text-slate-900"
                            />
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={comp.quantity}
                            onChange={(e) => handleUpdateComponentQty(idx, Number(e.target.value) || 1)}
                            className="w-16 h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono font-bold text-xs text-slate-900"
                          />
                        </td>

                        <td className="p-3 text-right">
                          <div className="font-mono text-xs font-bold text-slate-900">
                            ₹{linePrice.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {comp.quantity} {comp.unitOfMeasure || 'pcs'} × ₹{comp.unitPrice || 0}
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(idx)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                            title="Remove item from combo bundle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total Calculation Strip */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <span className="text-slate-600">
                  Calculated Component Sum ({components.length} products):
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-[#0054A6]">
                    ₹{totalComponentCalculatedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    (Formula: Σ Price × Qty)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 4: PIPE & LOCAL HARDWARE RECOMMENDATION NOTICE       */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Plumbing Pipe & Fitting Sizing Suggestion Notice (Displayed on Storefront):</span>
            </div>
            <textarea
              rows={2}
              value={pipeNotice}
              onChange={(e) => setPipeNotice(e.target.value)}
              className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-sans"
              placeholder="Advice for customers regarding on-site piping purchases..."
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-mono">
            Total Components: <strong>{components.length} products</strong> · Bundled Units: <strong>{components.reduce((acc, c) => acc + c.quantity, 0)} items</strong> · Bundle Value: <strong>₹{totalComponentCalculatedPrice.toLocaleString('en-IN')}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveComboVariant}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 hover:scale-105 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save & Publish Combo Variant</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

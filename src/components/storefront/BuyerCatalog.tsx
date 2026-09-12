import React, { useEffect, useState, useMemo } from 'react';
import { Layers, ShoppingCart, Flame } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ApiProduct, ApiProductVariant } from '../../services/catalogService';
import { getTranslation } from '../../utils/i18n';

const CATALOG_CATEGORIES = [
  'ALL',
  'SS304 GRADE',
  'GI SERIES',
  'FITTING SERIES',
  'COMPLETE KIT',
  'POWER SERIES',
  'CONTROL SERIES'
];

export const BuyerCatalog: React.FC = () => {
  const { 
    apiCatalogProducts, apiCatalogLoading,
    fetchApiCatalog, addToCart, selectedLanguage,
    setIsCartDrawerOpen, searchQuery, selectedCategory, setSelectedCategory
  } = useStore();

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const t = getTranslation(selectedLanguage);

  useEffect(() => {
    fetchApiCatalog();
  }, [fetchApiCatalog]);

  // Production catalog filtering: remove test fixtures, deduplicate, filter by search/category
  const filteredProducts = useMemo(() => {
    const testPattern = /test|rbac|concurrency|reconciliation|exclusion|header match|thickness|currency|oversubscription|mock|draft|fixture|bulk|rails/i;
    const testSkuPattern = /TEST|COMMIT|IDEMP|APE-TAX|APE-MOQ|APE-PR|CONCUR|LATE|EXP|ORDER|CHECK/i;

    const seenNames = new Set<string>();
    const validProducts: ApiProduct[] = [];

    for (const p of apiCatalogProducts) {
      if (!p.is_active || testPattern.test(p.name)) continue;

      const validVariants = (p.variants || []).filter(v => !testSkuPattern.test(v.sku));
      if (validVariants.length === 0) continue;

      const normName = p.name.trim().toLowerCase();
      if (seenNames.has(normName)) continue;
      seenNames.add(normName);

      validProducts.push({
        ...p,
        variants: validVariants
      });
    }

    return validProducts.filter((p) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.variants.some(v => v.sku.toLowerCase().includes(q));

      const cat = (selectedCategory || 'ALL').toUpperCase();
      const isSprinkler = p.name.toLowerCase().includes('sprinkler');
      const isClamp = p.name.toLowerCase().includes('clamp') || p.name.toLowerCase().includes('drain');
      const prodCat = ((p as any).category || '').toUpperCase();

      const matchesCategory = 
        cat === 'ALL' ||
        (prodCat && prodCat.includes(cat)) ||
        (cat === 'SS304 GRADE' && (isSprinkler || isClamp || prodCat.includes('SS304'))) ||
        (cat === 'GI SERIES' && (prodCat.includes('GI') || (!isSprinkler && !isClamp))) ||
        (cat === 'FITTING SERIES' && (prodCat.includes('FITTING') || (!isSprinkler && !isClamp))) ||
        (cat === 'COMPLETE KIT' && (prodCat.includes('KIT') || isSprinkler || isClamp)) ||
        (cat === 'POWER SERIES' && (prodCat.includes('POWER') || isSprinkler)) ||
        (cat === 'CONTROL SERIES' && (prodCat.includes('CONTROL') || isSprinkler));

      return matchesSearch && matchesCategory;
    });
  }, [apiCatalogProducts, searchQuery, selectedCategory]);

  // Default selection when products arrive
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const initialMap: Record<string, string> = {};
      filteredProducts.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          const pref = p.variants.find(v => v.frame_thickness_mm === 35) || 
                       p.variants.find(v => v.frame_thickness_mm === 30) || 
                       p.variants[0];
          initialMap[p.id] = pref.sku;
        }
      });
      setSelectedVariants(initialMap);
    }
  }, [filteredProducts]);

  const handleSelectVariant = (productId: string, sku: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: sku }));
  };

  const handleAddToCart = (product: ApiProduct, variant: ApiProductVariant) => {
    const isSprinkler = product.name.toLowerCase().includes('sprinkler') || variant.sku.toLowerCase().includes('sprinkler');
    const isDrain = product.name.toLowerCase().includes('drain') || product.name.toLowerCase().includes('clamp');
    const productImage = (product as any).image || (isSprinkler ? '/solar_sprinkler.webp' : (isDrain ? '/Drain_clips.webp' : '/logo.webp'));
    const unitPrice = typeof variant.unit_price === 'number' && variant.unit_price > 0 
      ? variant.unit_price 
      : (isSprinkler ? 220 : 20);

    addToCart({
      sku: variant.sku,
      productId: product.id,
      variantId: variant.id || variant.sku,
      parentAsin: product.id,
      asin: product.id,
      productTitle: product.name,
      variantTitle: variant.display_label || (isSprinkler ? 'SS304 Solar Sprinkler' : `${variant.frame_thickness_mm || ''} mm SS304 Solar Clamp`),
      attributes: {
        size: variant.display_label || `${variant.frame_thickness_mm || ''} mm`,
        fit_mode: variant.fit_mode || 'SNAP_FIT',
        material: 'AISI SS304 Stainless Steel',
      },
      imageUrl: productImage,
      unitPrice: unitPrice,
      mrp: Math.round(unitPrice * 1.5),
      gstRate: 18,
      hsnCode: product.hsn_code || (isSprinkler ? '84248990' : '73269099'),
      sellerId: 'apollo_kathwada_hub',
      sellerName: 'Apollo Engineering Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: isSprinkler ? 180 : 45,
      isB2BPricingApplied: false,
    }, 1);
  };

  return (
    <div className="space-y-8 w-full py-2">
      {/* Sleek Integrated Catalog Filter Toolbar */}
      <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 pt-1 border-b border-slate-200/80">
        <span className="text-xs font-bold font-mono text-slate-500 mr-2 flex-shrink-0 uppercase tracking-wider">
          Filter Catalog:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {CATALOG_CATEGORIES.map((cat) => {
            const isSelected = (selectedCategory || 'ALL') === cat;
            return (
              <button
                key={cat}
                type="button"
                data-testid={`catalog-filter-${cat.replace(/\s+/g, '-')}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                  isSelected
                    ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm ring-1 ring-[#0054A6]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border-slate-200/90 shadow-sm'
                }`}
              >
                {cat === 'ALL' && <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {apiCatalogLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="grid grid-cols-5 gap-2 pt-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-16 bg-slate-100 rounded-xl" />
                ))}
              </div>
              <div className="h-12 bg-slate-200 rounded-xl w-full mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!apiCatalogLoading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <Layers className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">No Products Found</h3>
          <p className="text-xs text-slate-500">The database catalog is currently undergoing replenishment.</p>
        </div>
      )}

      {/* Live Product Cards */}
      {!apiCatalogLoading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProducts.map((product) => {
            const isSprinkler = product.name.toLowerCase().includes('sprinkler');
            const selectedSku = selectedVariants[product.id] || product.variants[0]?.sku;
            const currentVariant = product.variants.find(v => v.sku === selectedSku) || product.variants[0];
            const isVariantInStock = currentVariant && currentVariant.available_stock > 0;
            const unitPrice = typeof currentVariant?.unit_price === 'number' && currentVariant.unit_price > 0
              ? currentVariant.unit_price
              : (isSprinkler ? 220 : 20);
            const productImage = isSprinkler ? '/solar_sprinkler.webp' : '/Drain_clips.webp';

            const productAnchorId = isSprinkler ? 'catalog-product-sprinkler' : 'catalog-product-drain-clips';

            return (
              <div 
                key={product.id}
                id={productAnchorId}
                className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all scroll-mt-24"
              >
                {/* Product Image & Badges */}
                <div className="relative h-64 bg-slate-50 flex items-center justify-center p-6 border-b border-slate-100 group">
                  <img
                    src={productImage}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wider uppercase">
                      AISI SS304
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold">
                      10-Year Rust Warranty
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    {isVariantInStock ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {t.inStock}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold">
                        {t.outOfStock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Top / Details */}
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        HSN: {product.hsn_code || (isSprinkler ? '84248990' : '73269099')} • SKU: {currentVariant?.sku}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {product.description || (isSprinkler ? 'High-efficiency 180° water curtain solar cleaning sprinkler engineered in AISI SS304.' : 'Precision engineered AISI SS304 solar panel mounting clamps.')}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 inline-flex items-center gap-1">
                          ⚡ Connected to BOM Estimator ({isSprinkler ? '1 per 4 panels' : '2 per panel'})
                        </span>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-slate-900 font-mono">
                        ₹{unitPrice}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Incl. 18% GST
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Database Variant Selector (if multi-variant) */}
                  {product.variants.length > 1 && (
                    <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#0054A6]" />
                          {t.frameThicknessLabel}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0054A6] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                          {currentVariant?.display_label || `${currentVariant?.frame_thickness_mm} mm`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {product.variants.map((variant) => {
                          const isSelected = variant.sku === selectedSku;
                          const mm = variant.frame_thickness_mm ? Number(variant.frame_thickness_mm) : 0;
                          const badgeLabel = mm === 35 
                            ? t.popularRooftop 
                            : mm === 30 
                            ? t.bifacialTopcon 
                            : mm === 28 
                            ? t.thinProfile 
                            : mm === 40 
                            ? t.utility72Cell 
                            : t.polyMonoStandard;

                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => handleSelectVariant(product.id, variant.sku)}
                              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 ${
                                isSelected
                                  ? 'bg-white border-[#0054A6] ring-2 ring-[#0054A6] text-slate-900 shadow-md font-bold'
                                  : 'bg-white/80 border-slate-200 hover:border-blue-300 text-slate-700'
                              }`}
                            >
                              <span className="font-mono text-base font-black text-slate-900">
                                {mm > 0 ? `${mm} mm` : variant.display_label}
                              </span>
                              <span className="text-[9px] font-bold text-[#0054A6] bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 truncate w-full text-center">
                                {badgeLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Material & Spec Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Grade</span>
                      <strong className="text-slate-900">AISI SS304 Steel</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Statutory Tax</span>
                      <strong className="text-slate-900">18% GST Included</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block">Dispatch Hub</span>
                      <strong className="text-slate-900 font-mono">Kathwada 382430</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action / Add to Cart */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
                      Fast Dispatch
                    </span>
                    <span className="text-xs text-slate-600">
                      Direct from Kathwada GIDC
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (currentVariant) {
                        handleAddToCart(product, currentVariant);
                        setIsCartDrawerOpen(true);
                      }
                    }}
                    disabled={!isVariantInStock}
                    className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md ${
                      isVariantInStock
                        ? 'bg-gradient-to-r from-[#0054A6] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/20 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t.addToCart}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Star, ShieldCheck, Truck, Zap, ShoppingCart, Eye, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';

export const ProductGrid: React.FC = () => {
  const { 
    products, setSelectedProduct, addToCart, 
    searchQuery, selectedCategory, appMode, activeAddress 
  } = useStore();

  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  const filteredProducts = products.filter((p) => {
    if (p.isLive === false) return false;
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variants.some((v) => v.hsnCode.includes(searchQuery) || v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Category & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>{selectedCategory === 'ALL' ? 'Featured Catalog' : selectedCategory}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
              {filteredProducts.length} ASINs Active
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-vendor Buy Box pricing & APE Express guaranteed delivery
          </p>
        </div>

        {/* B2B Mode Banner */}
        {appMode === 'B2B' && (
          <div className="bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 text-blue-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Showing B2B Wholesale Tier Pricing & 18% Input Tax Credit</span>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product, pIdx) => {
          const selectedVariant = 
            product.variants.find((v) => v.sku === product.selectedVariantSku) || 
            product.variants[0];

          const bestSeller = 
            product.sellerListings[selectedVariant.sku]?.[0] || {
              sellerName: 'Apex Direct Industrial',
              fulfillmentType: 'FBF',
              price: selectedVariant.b2cPrice
            };

          const itemQty = productQuantities[product.asin] || 1;
          const setItemQty = (qty: number) => 
            setProductQuantities((prev) => ({ ...prev, [product.asin]: qty }));

          let effectiveUnitPrice = selectedVariant.b2cPrice;
          if (appMode === 'B2B' && selectedVariant.b2bTierPricing && selectedVariant.b2bTierPricing.length > 0) {
            const matchedTier = [...selectedVariant.b2bTierPricing]
              .reverse()
              .find((t) => itemQty >= t.minQty) || selectedVariant.b2bTierPricing[0];
            if (matchedTier) {
              effectiveUnitPrice = matchedTier.pricePerUnit;
            }
          }

          return (
            <div
              key={`${product.asin}-${pIdx}`}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-[#0054A6]/50 hover:shadow-xl transition-all duration-300 flex flex-col group shadow-sm"
            >
              {/* Image Container */}
              <div 
                onClick={() => setSelectedProduct(product)}
                className="relative aspect-square bg-slate-50 p-4 flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-100"
              >
                <img
                  src={selectedVariant.images[0]}
                  alt={product.title}
                  loading={pIdx < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={pIdx < 2 ? 'high' : 'low'}
                  width={300}
                  height={300}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badge */}
                {product.badges.length > 0 && (
                  <div className="absolute top-3 left-3 flex gap-1">
                    {product.badges.map((b, idx) => (
                      <span key={idx} className="text-xs font-bold uppercase bg-amber-500/10 text-amber-700 border border-amber-500/30 px-2 py-0.5 rounded-md shadow-xs">
                        {b.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prime / FBF Tag */}
                <div className="absolute bottom-3 right-3 bg-white/95 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold text-[#0054A6] flex items-center gap-1 backdrop-blur-sm shadow-xs">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  APE Express 1-Day
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{product.brand}</span>
                  <h3 
                    onClick={() => setSelectedProduct(product)}
                    className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#0054A6] cursor-pointer mt-0.5 leading-snug"
                  >
                    {product.title}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-500" />
                      ))}
                    </div>
                    <span className="font-bold text-slate-700">{product.rating}</span>
                    <span className="text-slate-400">({product.reviewCount})</span>
                  </div>
                </div>

                {/* Variant Quick Pills */}
                {product.variants.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 overflow-x-auto no-scrollbar">
                    <span className="font-semibold text-slate-400">Variants:</span>
                    {product.variants.map((v) => (
                      <span
                        key={v.sku}
                        className={`px-2 py-0.5 rounded-md border whitespace-nowrap text-xs ${
                          v.sku === selectedVariant.sku 
                            ? 'bg-blue-50 border-blue-300 text-[#0054A6] font-bold' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {v.attributes.color || v.attributes.packSize || v.sku}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price & Action */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        ₹{effectiveUnitPrice.toLocaleString('en-IN')}
                      </div>
                      <span className="text-xs line-through text-slate-400 font-mono">
                        ₹{selectedVariant.mrp.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {appMode === 'B2B' && selectedVariant.b2bTierPricing.length > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200">
                        Bulk from ₹{selectedVariant.b2bTierPricing[selectedVariant.b2bTierPricing.length - 1].pricePerUnit}
                      </span>
                    )}
                    {appMode !== 'B2B' && (
                      <span className="text-xs text-slate-400 line-through ml-2">MRP: ₹{selectedVariant.mrp.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        aria-label={`View details for ${product.title}`}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>

                      <div className="flex items-center justify-end gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                        <label className="text-[11px] text-slate-500 font-medium">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          max={selectedVariant.inventory || 10}
                          value={itemQty}
                          onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 h-6 px-1 bg-white border border-slate-300 rounded text-center text-slate-900 font-mono font-bold text-xs focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">pcs</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        addToCart({
                          sku: selectedVariant.sku,
                          parentAsin: product.asin,
                          productTitle: product.title,
                          variantTitle: selectedVariant.title,
                          attributes: selectedVariant.attributes as Record<string, string>,
                          imageUrl: selectedVariant.images[0],
                          unitPrice: effectiveUnitPrice,
                          mrp: selectedVariant.mrp,
                          gstRate: selectedVariant.gstRatePercent,
                          hsnCode: selectedVariant.hsnCode,
                          sellerId: bestSeller.sellerName,
                          sellerName: bestSeller.sellerName,
                          fulfillmentType: bestSeller.fulfillmentType,
                          weightGrams: selectedVariant.weightGrams,
                          isB2BPricingApplied: appMode === 'B2B'
                        }, itemQty);
                      }}
                      aria-label={`Add ${product.title} to cart`}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

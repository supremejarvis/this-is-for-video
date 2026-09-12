import React, { useState } from 'react';
import { Star, ShieldCheck, Truck, Zap, ShoppingCart, Eye, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Product } from '../../types';

export const ProductGrid: React.FC = () => {
  const { 
    products, setSelectedProduct, addToCart, 
    searchQuery, selectedCategory, appMode, activeAddress 
  } = useStore();

  const [selectedQty, setSelectedQty] = useState(1);

  const filteredProducts = products.filter((p) => {
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>{selectedCategory === 'ALL' ? 'Featured Catalog' : selectedCategory}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredProducts.length} ASINs Active
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-vendor Buy Box pricing & APE Express guaranteed delivery
          </p>
        </div>

        {/* B2B Mode Banner */}
        {appMode === 'B2B' && (
          <div className="bg-blue-950/60 border border-blue-800/60 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>Showing B2B Wholesale Tier Pricing & 18% Input Tax Credit</span>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const selectedVariant = 
            product.variants.find((v) => v.sku === product.selectedVariantSku) || 
            product.variants[0];

          const bestSeller = 
            product.sellerListings[selectedVariant.sku]?.[0] || {
              sellerName: 'Apex Direct Industrial',
              fulfillmentType: 'FBF',
              price: selectedVariant.b2cPrice
            };

          return (
            <div
              key={product.asin}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col group"
            >
              {/* Image Container */}
              <div 
                onClick={() => setSelectedProduct(product)}
                className="relative aspect-square bg-slate-950 p-4 flex items-center justify-center cursor-pointer overflow-hidden"
              >
                <img
                  src={selectedVariant.images[0]}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badge */}
                {product.badges.length > 0 && (
                  <div className="absolute top-3 left-3 flex gap-1">
                    {product.badges.map((b, idx) => (
                      <span key={idx} className="text-xs font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        {b.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prime / FBF Tag */}
                <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 rounded-md text-xs font-bold text-amber-400 flex items-center gap-1 backdrop-blur-sm">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  APE Express 1-Day
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
                  <h3 
                    onClick={() => setSelectedProduct(product)}
                    className="font-bold text-sm text-white line-clamp-2 hover:text-amber-400 cursor-pointer mt-0.5 leading-snug"
                  >
                    {product.title}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-slate-300">{product.rating}</span>
                    <span className="text-slate-500">({product.reviewCount})</span>
                  </div>
                </div>

                {/* Variant Quick Pills */}
                {product.variants.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 overflow-x-auto no-scrollbar">
                    <span className="font-semibold text-slate-500">Variants:</span>
                    {product.variants.map((v) => (
                      <span
                        key={v.sku}
                        className={`px-2 py-0.5 rounded-md border whitespace-nowrap text-xs ${
                          v.sku === selectedVariant.sku 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {v.attributes.color || v.attributes.packSize || v.sku}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price & Action */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-lg font-black text-white font-mono">
                        ₹{selectedVariant.b2cPrice.toLocaleString('en-IN')}
                      </div>
                      <span className="text-xs line-through text-slate-500 font-mono">
                        ₹{selectedVariant.mrp.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {appMode === 'B2B' && selectedVariant.b2bTierPricing.length > 0 && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-bold">
                        Bulk from ₹{selectedVariant.b2bTierPricing[selectedVariant.b2bTierPricing.length - 1].pricePerUnit}
                      </span>
                    )}
                    {appMode !== 'B2B' && (
                      <span className="text-xs text-slate-500 line-through ml-2">MRP: ₹{selectedVariant.mrp.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-300">Qty:</label>
                      <input
                        type="number"
                        min={1}
                        max={selectedVariant.inventory || 10}
                        value={selectedQty}
                        onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-8 px-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">units</span>
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
                          unitPrice: selectedVariant.b2cPrice,
                          mrp: selectedVariant.mrp,
                          gstRate: selectedVariant.gstRatePercent,
                          hsnCode: selectedVariant.hsnCode,
                          sellerId: bestSeller.sellerName,
                          sellerName: bestSeller.sellerName,
                          fulfillmentType: bestSeller.fulfillmentType,
                          weightGrams: selectedVariant.weightGrams,
                          isB2BPricingApplied: appMode === 'B2B'
                        }, selectedQty);
                      }}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-lg shadow-amber-500/20 transition-colors"
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

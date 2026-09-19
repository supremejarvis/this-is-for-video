'use client';

import React from 'react';
import { Heart, ShoppingCart, Trash2, Package, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const WishlistPage: React.FC = () => {
  const { wishlist, removeFromWishlist, moveWishlistToCart, setSelectedProduct, products } = useStore();

  const handleViewProduct = (asin: string) => {
    const product = products.find(p => p.asin === asin);
    if (product) setSelectedProduct(product);
  };

  if (wishlist.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-6 animate-fadeIn">
        <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg">
          <Heart className="w-12 h-12 text-amber-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 font-display">Your Wishlist is Empty</h2>
          <p className="text-sm text-slate-600 max-w-md">
            Save solar cleaning hardware you love by clicking the ♥ button. Come back later to purchase them with factory direct dispatch.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/store'}
          className="px-6 py-3.5 bg-gradient-to-r from-[#0054A6] to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Explore APE Store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-solar-gold/15 border border-solar-gold/40 text-solar-gold text-xs font-mono font-bold">
              SAVED FOR LATER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 font-display">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            My Wishlist
            <span className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
            </span>
          </h1>
        </div>

        {wishlist.length > 0 && (
          <button
            onClick={() => {
              wishlist.forEach(item => moveWishlistToCart(item.id));
            }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Move All to Cart
          </button>
        )}
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlist.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            {/* Product Image */}
            <div 
              className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer"
              onClick={() => handleViewProduct(item.asin)}
            >
              <img
                src={item.imageUrl}
                alt={item.productTitle}
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWishlist(item.id);
                }}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
              <h3 
                className="text-sm font-bold text-slate-900 line-clamp-2 cursor-pointer hover:text-[#0054A6] transition-colors"
                onClick={() => handleViewProduct(item.asin)}
              >
                {item.productTitle}
              </h3>
              <p className="text-xs text-slate-500">{item.variantTitle}</p>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-slate-900">₹{item.price.toLocaleString('en-IN')}</span>
                {item.mrp > item.price && (
                  <>
                    <span className="text-xs text-slate-400 line-through">₹{item.mrp.toLocaleString('en-IN')}</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% off
                    </span>
                  </>
                )}
              </div>

              {/* Added Date */}
              <p className="text-[10px] text-slate-400 font-mono">
                Added {new Date(item.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => moveWishlistToCart(item.id)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Move to Cart
                </button>
                <button
                  onClick={() => handleViewProduct(item.asin)}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

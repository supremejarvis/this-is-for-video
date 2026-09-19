'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, ArrowRight, ArrowLeft, Trash2, 
  ShieldCheck, Truck, Sparkles, Building2, AlertCircle 
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { CartItem } from '@/components/cart/CartItem';
import { Button } from '@/components/ui/Button';

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    appMode,
    currentQuote,
    fetchAuthoritativeQuote,
    quoteStatus,
    destinationPincode,
    setDestinationPincode,
    setIsCheckoutOpen,
  } = useStore();

  const [pincode, setPincode] = useState(destinationPincode || '382430');
  const isB2B = appMode === 'B2B';

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Monetary totals calculation
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice ?? item.b2cPrice ?? 0) * item.quantity, 0);
  const estimatedShipping = currentQuote?.shipping_total ? Number(currentQuote.shipping_total) : (subtotal > 2000 ? 0 : 90);
  const estimatedTotal = subtotal + estimatedShipping;

  const handleProceedToCheckout = () => {
    router.push('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mb-6">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Your Cart is Empty
        </h2>
        <p className="text-slate-500 text-sm max-w-sm mb-8">
          Explore our AISI SS304 solar panel cleaning sprinklers and drain clips.
        </p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0054A6] text-white font-bold hover:bg-[#003d7a] transition-all shadow-lg shadow-[#0054A6]/20"
        >
          <ArrowLeft className="w-4 h-4" /> Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {totalQuantity} item{totalQuantity > 1 ? 's' : ''} in your order
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cart.map((item) => (
              <CartItem
                key={item.sku}
                item={item}
                onUpdateQuantity={(q) => updateCartQuantity(item.sku, q)}
                onRemove={() => removeFromCart(item.sku)}
                isB2B={isB2B}
              />
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link
              href="/store"
              className="text-xs font-bold text-slate-500 hover:text-[#0054A6] flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
            <span className="text-xs text-slate-400">
              Dispatched from Kathwada GIDC (Ahmedabad)
            </span>
          </div>
        </div>

        {/* Order Summary & Shipping */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
              Order Summary
            </h3>

            {/* Pincode Check */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Speed Post Destination Pincode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="382430"
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDestinationPincode(pincode);
                    fetchAuthoritativeQuote();
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> India Post Speed Post
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {estimatedShipping === 0 ? 'FREE' : `₹${estimatedShipping.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax Breakdown</span>
                <span className="text-xs font-medium text-slate-500">
                  {isB2B ? '+ 18% GST Extra' : '18% GST Included'}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    Estimated Total
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Final authoritative total calculated at checkout
                  </div>
                </div>
                <div className="text-2xl font-black text-[#0054A6]">
                  ₹{estimatedTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <Button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 rounded-2xl font-black text-base shadow-xl shadow-[#0054A6]/20 flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </Button>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Genuine SS304 Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

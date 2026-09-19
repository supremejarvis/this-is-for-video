'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, setIsCheckoutOpen, isCheckoutOpen, currentUser } = useStore();

  useEffect(() => {
    // Open checkout flow
    setIsCheckoutOpen(true);
    return () => {
      setIsCheckoutOpen(false);
    };
  }, [setIsCheckoutOpen]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Your cart is empty
        </h2>
        <p className="text-slate-500 text-xs max-w-sm mb-6">
          Add solar cleaning hardware products to your cart before proceeding to checkout.
        </p>
        <Link
          href="/store"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0054A6] text-white font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#0054A6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Cart
        </Link>
        <span className="text-xs font-semibold text-slate-400">
          Secure Checkout • Kathwada GIDC Hub (382430)
        </span>
      </div>

      <CheckoutModal />
    </div>
  );
}

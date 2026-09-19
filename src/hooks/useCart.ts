'use client';

import { useStore } from '../store/useStore';
import { cartService, CartCalculationResult } from '../services/cart.service';
import { ORIGIN_HUB_PINCODE } from '../constants';
import { useMemo } from 'react';

export function useCart() {
  const {
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    appMode,
    destinationPincode,
    setDestinationPincode,
    currentQuote,
    fetchAuthoritativeQuote,
  } = useStore();

  const isB2B = appMode === 'B2B';

  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totals: CartCalculationResult = useMemo(() => {
    return cartService.calculateTotals(cart, {
      isB2B,
      shippingBase: currentQuote?.base_shipping ? Number(currentQuote.base_shipping) : 0,
      applyCod: false,
    });
  }, [cart, isB2B, currentQuote]);

  return {
    cart,
    itemCount,
    totals,
    isCartOpen: isCartDrawerOpen,
    openCart: () => setIsCartDrawerOpen(true),
    closeCart: () => setIsCartDrawerOpen(false),
    toggleCart: () => setIsCartDrawerOpen(!isCartDrawerOpen),
    addToCart,
    updateQuantity: updateCartQuantity,
    removeItem: removeFromCart,
    clearCart,
    originHubPincode: ORIGIN_HUB_PINCODE,
    destinationPincode,
    setDestinationPincode,
    currentQuote,
    fetchAuthoritativeQuote,
  };
}

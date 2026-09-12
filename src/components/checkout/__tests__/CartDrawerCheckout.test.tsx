import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartDrawer } from '../CartDrawer';
import { useStore } from '../../../store/useStore';
import { CartItem } from '../../../types';

describe('CartDrawer Checkout Flow & Invariant Tests', () => {
  const mockItem: CartItem = {
    sku: 'DZ-K6JS-CCOO',
    parentAsin: 'B0C7XY8902',
    productTitle: 'Apollo SS304 Solar Drain Clip - 30mm Frame Size',
    variantTitle: '30mm Frame Size',
    attributes: { material: 'AISI SS304', size: '30mm' },
    imageUrl: '/Drain_clips.webp',
    unitPrice: 20,
    mrp: 30,
    gstRate: 18,
    hsnCode: '73269099',
    sellerId: 'apollo_mfg',
    sellerName: 'Apollo Engineering',
    fulfillmentType: 'FBF',
    weightGrams: 25,
    quantity: 2,
    isB2BPricingApplied: false
  };

  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.getState().setIsCartDrawerOpen(true);
    useStore.getState().setIsCheckoutOpen(false);
    useStore.getState().setIsAuthModalOpen(false);
  });

  it('keeps Proceed to Secure Checkout disabled until quote is valid', () => {
    useStore.getState().addToCart(mockItem, 2);

    render(<CartDrawer />);

    const checkoutBtn = screen.getByRole('button', { name: /Proceed to Secure Checkout/i });
    expect(checkoutBtn).toBeDisabled();
  });

  it('routes guest to AuthModal with CHECKOUT destination when valid quote exists', () => {
    useStore.getState().addToCart(mockItem, 2);
    useStore.setState({
      authStatus: 'GUEST',
      quoteStatus: 'QUOTE_VALID',
      currentQuote: {
        quote_id: 'q-test-1',
        quote_number: 'APE-Q-TEST-1',
        idempotency_key: null,
        calculation_version: '1.0.0',
        catalog_version: '1.0.0',
        destination_pincode: '382430',
        items: [],
        subtotal_taxable: '33.90',
        total_product_gst: '6.10',
        total_product_gross: '40.00',
        base_shipping: '60.00',
        shipping_gst: '10.80',
        shipping_total: '70.80',
        prepaid_total: '110.80',
        cod_surcharge: '2.77',
        cod_raw_total: '113.57',
        cod_total: '115.00',
        rounding_multiple: 5,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    });

    render(<CartDrawer />);

    const checkoutBtn = screen.getByRole('button', { name: /Proceed to Secure Checkout/i });
    expect(checkoutBtn).not.toBeDisabled();

    fireEvent.click(checkoutBtn);

    // Guest should be redirected to AuthModal for 4-digit OTP login
    expect(useStore.getState().isCartDrawerOpen).toBe(false);
    expect(useStore.getState().isAuthModalOpen).toBe(true);
    expect(useStore.getState().authDestination).toBe('CHECKOUT');
    expect(useStore.getState().isCheckoutOpen).toBe(false);
  });

  it('opens CheckoutModal directly when user is authenticated and quote is valid', () => {
    useStore.getState().addToCart(mockItem, 2);
    useStore.setState({
      authStatus: 'AUTHENTICATED',
      quoteStatus: 'QUOTE_VALID',
      currentQuote: {
        quote_id: 'q-test-2',
        quote_number: 'APE-Q-TEST-2',
        idempotency_key: null,
        calculation_version: '1.0.0',
        catalog_version: '1.0.0',
        destination_pincode: '382430',
        items: [],
        subtotal_taxable: '33.90',
        total_product_gst: '6.10',
        total_product_gross: '40.00',
        base_shipping: '60.00',
        shipping_gst: '10.80',
        shipping_total: '70.80',
        prepaid_total: '110.80',
        cod_surcharge: '2.77',
        cod_raw_total: '113.57',
        cod_total: '115.00',
        rounding_multiple: 5,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    });

    render(<CartDrawer />);

    const checkoutBtn = screen.getByRole('button', { name: /Proceed to Secure Checkout/i });
    expect(checkoutBtn).not.toBeDisabled();

    fireEvent.click(checkoutBtn);

    // Authenticated user should proceed to checkout
    expect(useStore.getState().isCartDrawerOpen).toBe(false);
    expect(useStore.getState().isCheckoutOpen).toBe(true);
  });
});

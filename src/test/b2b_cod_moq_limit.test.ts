import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

describe('B2B COD Prohibition, Wholesale Pooling MOQ & B2C COD Limit Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    const store = useStore.getState();
    store.clearCart();
    store.setAppMode('B2C');
    store.setQuotePaymentMethod('PREPAID');
    store.setB2cCodLimit(10000);
  });

  it('strictly prohibits COD in B2B mode and forces PREPAID', () => {
    const store = useStore.getState();
    
    // In B2C mode, COD is selectable
    store.setQuotePaymentMethod('COD');
    expect(useStore.getState().quotePaymentMethod).toBe('COD');

    // Switching to B2B mode automatically resets COD to PREPAID
    store.setAppMode('B2B');
    expect(useStore.getState().quotePaymentMethod).toBe('PREPAID');

    // Attempting to set COD while in B2B mode is immediately overridden to PREPAID
    store.setQuotePaymentMethod('COD');
    expect(useStore.getState().quotePaymentMethod).toBe('PREPAID');
  });

  it('allows mixed-size wholesale batch pooling in B2B without clamping individual items to 50', () => {
    const store = useStore.getState();
    store.setAppMode('B2B');

    // Contractor adds: 20 Sprinklers
    store.addToCart({
      sku: 'APE-SPK-304-01',
      productId: 'prod_sprinkler',
      variantId: 'var_sprinkler',
      parentAsin: 'prod_sprinkler',
      asin: 'prod_sprinkler',
      productTitle: 'SS304 Solar Sprinkler',
      variantTitle: 'Standard Brass Nozzle',
      attributes: { size: '1/2 inch', material: 'AISI SS304' },
      imageUrl: '/solar_sprinkler.webp',
      unitPrice: 180,
      mrp: 270,
      gstRate: 18,
      hsnCode: '84248990',
      sellerId: 'apollo_kathwada_hub',
      sellerName: 'Apollo Engineering Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 180,
      isB2BPricingApplied: true,
    }, 20);

    // Contractor adds: 20x 28mm Drain Clips
    store.addToCart({
      sku: 'APE-DC-304-28MM',
      productId: 'prod_drain_clip',
      variantId: 'var_dc_28',
      parentAsin: 'prod_drain_clip',
      asin: 'prod_drain_clip',
      productTitle: 'SS304 Solar Drain Clip',
      variantTitle: '28mm Frame Profile',
      attributes: { size: '28 mm', material: 'AISI SS304' },
      imageUrl: '/Drain_clips.webp',
      unitPrice: 15,
      mrp: 25,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'apollo_kathwada_hub',
      sellerName: 'Apollo Engineering Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 45,
      isB2BPricingApplied: true,
    }, 20);

    // Contractor adds: 500x 30mm Drain Clips
    store.addToCart({
      sku: 'APE-DC-304-30MM',
      productId: 'prod_drain_clip',
      variantId: 'var_dc_30',
      parentAsin: 'prod_drain_clip',
      asin: 'prod_drain_clip',
      productTitle: 'SS304 Solar Drain Clip',
      variantTitle: '30mm Frame Profile',
      attributes: { size: '30 mm', material: 'AISI SS304' },
      imageUrl: '/Drain_clips.webp',
      unitPrice: 14,
      mrp: 25,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'apollo_kathwada_hub',
      sellerName: 'Apollo Engineering Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 45,
      isB2BPricingApplied: true,
    }, 500);

    const cart = useStore.getState().cart;
    expect(cart.length).toBe(3);
    expect(cart.find(i => i.sku === 'APE-SPK-304-01')?.quantity).toBe(20);
    expect(cart.find(i => i.sku === 'APE-DC-304-28MM')?.quantity).toBe(20);
    expect(cart.find(i => i.sku === 'APE-DC-304-30MM')?.quantity).toBe(500);

    // Total pooled wholesale units = 20 + 20 + 500 = 540 units
    const totalPooledUnits = cart.reduce((sum, i) => sum + i.quantity, 0);
    expect(totalPooledUnits).toBe(540);
    expect(totalPooledUnits >= 50).toBe(true);
  });

  it('allows Admin to configure and persist B2C COD order limit', () => {
    const store = useStore.getState();
    expect(store.b2cCodLimit).toBe(10000);

    // Admin updates limit to ₹15,000
    store.setB2cCodLimit(15000);
    expect(useStore.getState().b2cCodLimit).toBe(15000);
    expect(localStorage.getItem('apollo_b2c_cod_limit')).toBe('15000');

    // Admin updates limit to ₹5,000
    store.setB2cCodLimit(5000);
    expect(useStore.getState().b2cCodLimit).toBe(5000);
    expect(localStorage.getItem('apollo_b2c_cod_limit')).toBe('5000');
  });
});

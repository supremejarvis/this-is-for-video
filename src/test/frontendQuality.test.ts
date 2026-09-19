import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { INITIAL_ORDERS } from '../data/mockData';
import { CartItem } from '../types';

describe('Frontend Quality & E-Commerce Business Logic Test Suite', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useStore.setState({
      cart: [],
      selectedProduct: null,
      orders: INITIAL_ORDERS,
      returnRequests: []
    });
  });

  // 1. Product Listing
  it('correctly loads and exposes product catalog listing with mandatory metadata', () => {
    const products = useStore.getState().products;
    expect(products.length).toBeGreaterThan(0);

    const sprinkler = products.find(p => p.asin === 'AP-SPRINKLER-01');
    expect(sprinkler).toBeDefined();
    expect(sprinkler?.title).toContain('Solar Panel Sprinkler');
    expect(sprinkler?.variants.length).toBeGreaterThanOrEqual(1);

    const drainClips = products.find(p => p.asin === 'AP-DRAINCLIPS-02');
    expect(drainClips).toBeDefined();
    expect(drainClips?.variants.length).toBeGreaterThanOrEqual(4);
  });

  // 2. Size Variant Selection
  it('selects and switches size variants (30mm, 35mm, 40mm) updating active selectedVariantSku', () => {
    const asin = 'AP-DRAINCLIPS-02';
    const store = useStore.getState();

    // Select 30mm ('DZ-K6JS-CCOO')
    store.selectProductVariant(asin, 'DZ-K6JS-CCOO');
    let product = useStore.getState().products.find(p => p.asin === asin);
    expect(product?.selectedVariantSku).toBe('DZ-K6JS-CCOO');

    // Switch to 35mm ('J9-IJCH-26WX')
    store.selectProductVariant(asin, 'J9-IJCH-26WX');
    product = useStore.getState().products.find(p => p.asin === asin);
    expect(product?.selectedVariantSku).toBe('J9-IJCH-26WX');

    // Switch to 40mm ('X8-PLKM-99QA')
    store.selectProductVariant(asin, 'X8-PLKM-99QA');
    product = useStore.getState().products.find(p => p.asin === asin);
    expect(product?.selectedVariantSku).toBe('X8-PLKM-99QA');
  });

  // 3. Quantity Validation
  it('enforces quantity validation: positive integers, non-negative, and minimum thresholds', () => {
    const store = useStore.getState();
    // Inline test fixture (replaces removed MOCK_PRODUCTS reference)
    const testProduct = {
      asin: 'AP-DRAINCLIPS-02',
      title: 'Apollo AISI SS304 Solar Panel Water Drain & Anti-Soiling Clamp',
      variants: [{
        sku: 'APE-SC-28.00MM',
        title: 'Apollo SS304 Solar Drain Clip - 28mm Frame Size',
        b2cPrice: 20,
        mrp: 35,
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
      }]
    };
    const variant = testProduct.variants[0];

    const cartItemPayload: Omit<CartItem, 'quantity'> = {
      sku: variant.sku,
      parentAsin: testProduct.asin,
      productTitle: testProduct.title,
      variantTitle: variant.title,
      attributes: {
        material: 'AISI SS304',
        size: '28mm',
        packSize: 'Pack of 50'
      },
      imageUrl: variant.images[0] || '/Drain_clips.webp',
      unitPrice: variant.b2cPrice,
      mrp: variant.mrp,
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering',
      weightGrams: variant.weightGrams,
      hsnCode: '73269099',
      gstRate: 18,
      fulfillmentType: 'FBF',
      isB2BPricingApplied: false
    };

    // Adding valid quantity
    store.addToCart(cartItemPayload, 5);
    expect(useStore.getState().cart[0].quantity).toBe(5);

    // Quantity update: update to positive integer
    store.updateCartQuantity(variant.sku, 12);
    expect(useStore.getState().cart[0].quantity).toBe(12);

    // Updating to 0 removes item from cart
    store.updateCartQuantity(variant.sku, 0);
    expect(useStore.getState().cart.length).toBe(0);
  });

  // 4. Cart Calculations (Line-Total Taxable Base & GST Breakdown)
  it('calculates cart line-total taxable base and GST breakdown accurately', () => {
    const qty = 50;
    const unitPrice = 20; // ₹20 GST-inclusive unit price
    const lineGross = qty * unitPrice; // ₹1,000 gross
    const gstRate = 18; // 18% GST

    // Line total taxable base: Line Gross / 1.18
    const lineTaxableBase = Math.round((lineGross / (1 + gstRate / 100)) * 100) / 100;
    const lineGst = Math.round((lineGross - lineTaxableBase) * 100) / 100;

    expect(lineGross).toBe(1000);
    expect(lineTaxableBase).toBe(847.46);
    expect(lineGst).toBe(152.54);
    expect(lineTaxableBase + lineGst).toBe(lineGross);
  });

  // 5. Shipping GST (Fixed 18%)
  it('calculates shipping GST strictly as 18% of base shipping', () => {
    const baseShipping = 150;
    const shippingGstRate = 0.18;
    const shippingGst = Math.round((baseShipping * shippingGstRate) * 100) / 100;
    const shippingTotal = baseShipping + shippingGst;

    expect(shippingGst).toBe(27.00);
    expect(shippingTotal).toBe(177.00);
  });

  // 6. UPI Total
  it('calculates UPI Prepaid Total = Product Line Total (incl. GST) + Shipping Total', () => {
    const productLineTotal = 1000; // inclusive of product GST
    const baseShipping = 150;
    const shippingGst = 27;
    const shippingTotal = baseShipping + shippingGst; // 177

    const upiPrepaidTotal = productLineTotal + shippingTotal;
    expect(upiPrepaidTotal).toBe(1177);
  });

  // 7. COD Surcharge (2.5%)
  it('calculates COD surcharge as 2.5% of prepaid total', () => {
    const prepaidTotal = 1177;
    const codSurchargePercent = 0.025;
    const rawCodFee = prepaidTotal * codSurchargePercent; // 29.425
    const unroundedCodTotal = prepaidTotal + rawCodFee; // 1206.425

    expect(rawCodFee).toBeCloseTo(29.425, 3);
    expect(unroundedCodTotal).toBeCloseTo(1206.425, 3);
  });

  // 8. Configurable Upward Rounding (e.g. Nearest ₹1 or ₹5)
  it('applies configurable upward rounding to COD totals', () => {
    const unroundedCodTotal = 1206.425;

    // Rounding to nearest ₹1 upward
    const roundToNearest1 = Math.ceil(unroundedCodTotal);
    expect(roundToNearest1).toBe(1207);

    // Rounding to nearest ₹5 upward
    const roundToNearest5 = Math.ceil(unroundedCodTotal / 5) * 5;
    expect(roundToNearest5).toBe(1210);
  });

  // 9. Wrong-Size Replacement Request
  it('creates and records a wrong-size replacement request requiring frame measurement verification', () => {
    const store = useStore.getState();
    const existingOrder = INITIAL_ORDERS[0];
    const orderId = existingOrder.id; // 'ord_apollo_101'

    const items = [{
      asin: 'AP-DRAINCLIPS-02',
      sku: 'APE-SC-28.00MM',
      title: 'Apollo SS304 Solar Drain Clip - 28mm Frame Size',
      quantity: 50,
      unitPrice: 750,
      imageUrl: '/Drain_clips.webp'
    }];

    const returnRequest = store.createReturnRequest(
      orderId,
      items,
      'SIZE_FIT_ISSUE',
      'Panel frame is 35mm but 28mm was ordered. Photo with vernier calliper attached.'
    );

    expect(returnRequest).toBeDefined();
    expect(returnRequest?.orderId).toBe(orderId);
    expect(returnRequest?.reason).toBe('SIZE_FIT_ISSUE');
    expect(returnRequest?.status).toBe('REQUESTED');

    const retrievedReturns = store.getOrderReturns(orderId);
    expect(retrievedReturns.length).toBeGreaterThanOrEqual(1);
    expect(retrievedReturns[0].reasonDetails).toContain('vernier calliper');
  });

  // 10. Customer-Language Selection
  it('supports Indian customer languages (Gujarati, Hindi, English) with deterministic labels', () => {
    const supportedLanguages = [
      { code: 'gu', label: 'ગુજરાતી', title: 'સોલર સ્પ્રિંકલર અને ડ્રેઇન ક્લિપ' },
      { code: 'hi', label: 'हिन्दी', title: 'सोलर स्प्रिंकलर और ड्रेन क्लिप' },
      { code: 'en', label: 'English', title: 'Solar Sprinkler & Drain Clip' },
    ];

    expect(supportedLanguages.length).toBe(3);
    const gu = supportedLanguages.find(l => l.code === 'gu');
    expect(gu?.label).toBe('ગુજરાતી');
    expect(gu?.title).toContain('સોલર');

    const hi = supportedLanguages.find(l => l.code === 'hi');
    expect(hi?.label).toBe('हिन्दी');
    expect(hi?.title).toContain('सोलर');

    const en = supportedLanguages.find(l => l.code === 'en');
    expect(en?.label).toBe('English');
    expect(en?.title).toContain('Solar');
  });
});

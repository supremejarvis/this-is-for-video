import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';
import { DeliveryAddress, CartItem } from '../../types';

describe('Zustand State Store Actions & Order Workflow', () => {
  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.getState().setAppMode('B2C');
  });

  it('initializes with default products and empty cart', () => {
    const state = useStore.getState();
    expect(state.products.length).toBeGreaterThan(0);
    expect(state.cart.length).toBe(0);
  });

  it('adds items to cart and computes split shipments accurately', () => {
    const item: CartItem = {
      sku: 'AE-SPRINK-SS304-01',
      parentAsin: 'B0C7XY8901',
      productTitle: 'SS304 Solar Sprinkler',
      variantTitle: 'Standard',
      attributes: { material: 'SS304' },
      imageUrl: '/solar_sprinkler.webp',
      unitPrice: 220,
      mrp: 350,
      gstRate: 18,
      hsnCode: '84248990',
      sellerId: 'apollo_factory',
      sellerName: 'Apollo Engineering Hub',
      fulfillmentType: 'FBF',
      weightGrams: 200,
      quantity: 5,
      isB2BPricingApplied: false
    };

    useStore.getState().addToCart(item, 5);

    const cart = useStore.getState().cart;
    expect(cart.length).toBe(1);
    expect(cart[0].quantity).toBe(5);

    const splitShipments = useStore.getState().getSplitShipments();
    expect(splitShipments.length).toBe(1);
    expect(splitShipments[0].subtotal).toBe(1100);
    expect(splitShipments[0].taxAmount).toBeGreaterThan(0);
  });

  it('switches to B2B mode and applies organization profile', () => {
    useStore.getState().setAppMode('B2B');
    expect(useStore.getState().appMode).toBe('B2B');

    useStore.getState().updateOrgDetails({
      companyName: 'Apex Solar EPC Private Limited',
      isGstVerified: true,
      kycStatus: 'VERIFIED'
    });

    const org = useStore.getState().currentOrg;
    expect(org.companyName).toBe('Apex Solar EPC Private Limited');
    expect(org.isGstVerified).toBe(true);
    expect(org.kycStatus).toBe('VERIFIED');
  });

  it('creates order with NET_30_PO payment method and advances shipment milestones', () => {
    const item: CartItem = {
      sku: 'AE-SPRINK-SS304-01',
      parentAsin: 'B0C7XY8901',
      productTitle: 'SS304 Solar Sprinkler',
      variantTitle: 'Standard',
      attributes: { material: 'SS304' },
      imageUrl: '/solar_sprinkler.webp',
      unitPrice: 220,
      mrp: 350,
      gstRate: 18,
      hsnCode: '84248990',
      sellerId: 'apollo_factory',
      sellerName: 'Apollo Engineering Hub',
      fulfillmentType: 'FBF',
      weightGrams: 200,
      quantity: 10,
      isB2BPricingApplied: true
    };

    useStore.getState().addToCart(item, 10);
    const order = useStore.getState().createOrder('NET_30_PO', true);

    expect(order).toBeDefined();
    expect(order.paymentDetail.method).toBe('NET_30_PO');
    expect(order.isInputTaxCreditClaimed).toBe(true);
    expect(order.shipments.length).toBeGreaterThan(0);

    const initialStatus = order.shipments[0].status;
    expect(initialStatus).toBe('CONFIRMED');

    // Advance status to IN_TRANSIT
    useStore.getState().updateOrderStatus(
      order.id,
      order.shipments[0].packageId,
      'IN_TRANSIT',
      'Dispatched to NSH Sorting Center',
      'AHMEDABAD NSH'
    );

    const updatedOrder = useStore.getState().orders.find((o) => o.id === order.id);
    expect(updatedOrder?.shipments[0].status).toBe('IN_TRANSIT');
  });

  it('updates cart quantity and removes item on quantity 0', () => {
    const item: CartItem = {
      sku: 'AE-CLIPS-SS304-02',
      parentAsin: 'B0C7XY8902',
      productTitle: 'SS304 Drain Clips',
      variantTitle: 'Snap-On',
      attributes: {},
      imageUrl: '/Drain_clips.webp',
      unitPrice: 750,
      mrp: 999,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'apollo_factory',
      sellerName: 'Apollo Engineering Hub',
      fulfillmentType: 'FBF',
      weightGrams: 150,
      quantity: 2,
      isB2BPricingApplied: false
    };

    useStore.getState().addToCart(item, 2);
    expect(useStore.getState().cart[0].quantity).toBe(2);

    useStore.getState().updateCartQuantity('AE-CLIPS-SS304-02', 0);
    expect(useStore.getState().cart.length).toBe(0);
  });

  it('manages customer delivery addresses', () => {
    const newAddress: DeliveryAddress = {
      id: 'addr_unit_test',
      userId: 'usr_1',
      fullName: 'Vikas Sharma',
      phone: '9988776655',
      addressType: 'WAREHOUSE',
      flatBuilding: 'Plot 100, Gopinath Landmark',
      streetArea: 'Kathwada GIDC',
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      pincode: '382430',
      postOffice: {
        name: 'KATHWADA GIDC S.O.',
        branchType: 'Sub Post Office',
        deliveryStatus: 'Delivery',
        circle: 'Gujarat',
        district: 'Ahmedabad',
        state: 'Gujarat',
        facilityId: '21260024'
      },
      landmark: 'Near Ring Road',
      isDefault: true
    };

    useStore.getState().addAddress(newAddress);
    expect(useStore.getState().addresses.some((a) => a.id === 'addr_unit_test')).toBe(true);
    expect(useStore.getState().activeAddress?.id).toBe('addr_unit_test');
  });

  it('automatically decreases live stock inventory when order is placed', () => {
    const products = useStore.getState().products;
    const testProd = products[0];
    const testVariant = testProd.variants[0];
    const initialStock = testVariant.inventory;

    // Simulate order placement deducting 25 units
    useStore.getState().decrementInventory([{ sku: testVariant.sku, quantity: 25 }]);

    const updatedProd = useStore.getState().products.find(p => p.asin === testProd.asin);
    const updatedVariant = updatedProd?.variants.find(v => v.sku === testVariant.sku);
    expect(updatedVariant?.inventory).toBe(initialStock - 25);
  });

  it('allows updating and persisting B2B MOQ for variants', () => {
    const products = useStore.getState().products;
    const testProd = products[0];
    const testVariant = testProd.variants[0];

    useStore.getState().updateVariantDetails(testProd.asin, testVariant.sku, { b2bMoq: 120 });

    const updatedProd = useStore.getState().products.find(p => p.asin === testProd.asin);
    const updatedVariant = updatedProd?.variants.find(v => v.sku === testVariant.sku);
    expect(updatedVariant?.b2bMoq).toBe(120);
  });

  it('combines multiple catalog products into 1 parent listing with child variations (Amazon style)', () => {
    const products = useStore.getState().products;
    expect(products.length).toBeGreaterThanOrEqual(2);

    const asinsToCombine = products.slice(0, 3).map(p => p.asin);
    const combined = useStore.getState().combineProductsIntoParentListing(asinsToCombine, 'Apollo Multi-Item Master Family');

    expect(combined).not.toBeNull();
    expect(combined?.asin).toMatch(/^AP-PAR-/);
    expect(combined?.title).toBe('Apollo Multi-Item Master Family');
    expect(combined?.variants.length).toBeGreaterThanOrEqual(3);

    // Each variant has a seller listing configured
    combined?.variants.forEach(v => {
      expect(combined.sellerListings?.[v.sku]).toBeDefined();
      expect(combined.sellerListings?.[v.sku][0].price).toBeGreaterThan(0);
    });

    // Product is stored in products state
    const stored = useStore.getState().products.find(p => p.asin === combined?.asin);
    expect(stored).toBeDefined();
    expect(stored?.variants.length).toBe(combined?.variants.length);
  });
});

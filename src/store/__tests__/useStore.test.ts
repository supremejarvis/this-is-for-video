import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { DeliveryAddress, CartItem } from '../../types';
import { MOCK_PRODUCTS } from '../../data/mockData';
import { ApiProduct } from '../../services/catalogService';

vi.mock('../../services/api/catalogApi', () => ({
  catalogApi: {
    getCatalog: vi.fn().mockResolvedValue([]),
    getProduct: vi.fn().mockResolvedValue(null),
    createProduct: vi.fn().mockResolvedValue({}),
    updateProduct: vi.fn().mockResolvedValue({}),
    archiveProduct: vi.fn().mockResolvedValue({}),
  },
}));

const mockApiProducts: ApiProduct[] = MOCK_PRODUCTS.map(p => ({
  id: p.asin,
  sku_prefix: p.asin,
  name: p.title,
  description: p.description,
  hsn_code: '73269099',
  is_active: p.isLive,
  is_archived: false,
  version: 1,
  created_at: p.createdAt || '2026-01-01T00:00:00Z',
  updated_at: p.createdAt || '2026-01-01T00:00:00Z',
  category: p.category,
  image: p.variants[0]?.images?.[0] || '/logo.webp',
  variants: p.variants.map(v => ({
    id: v.sku,
    product_id: p.asin,
    sku: v.sku,
    fit_mode: 'EXACT',
    frame_thickness_mm: null,
    min_thickness_mm: null,
    max_thickness_mm: null,
    display_label: v.title,
    frame_thickness: '',
    pack_size: 1,
    is_active: true,
    is_archived: false,
    version: 1,
    available_stock: v.inventory,
    unit_price: v.b2cPrice,
    tax_mode: 'GST_INCLUSIVE',
    created_at: p.createdAt || '2026-01-01T00:00:00Z',
  })),
  rawProduct: p
}));

describe('Zustand State Store Actions & Order Workflow', () => {
  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.getState().setAppMode('B2C');
    useStore.setState({ 
      products: JSON.parse(JSON.stringify(MOCK_PRODUCTS)),
      apiCatalogProducts: JSON.parse(JSON.stringify(mockApiProducts))
    });
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

  it('clears B2B organization details and reverts to Retail B2C mode', () => {
    useStore.getState().updateOrgDetails({
      companyName: 'Test Solar Infra',
      gstin: '24ABCDE1234F1Z5'
    });
    expect(useStore.getState().appMode).toBe('B2B');
    expect(useStore.getState().currentUser.role).toBe('B2B_BUYER');

    useStore.getState().clearOrgDetails();
    expect(useStore.getState().appMode).toBe('B2C');
    expect(useStore.getState().currentUser.role).toBe('B2C_CUSTOMER');
    expect(useStore.getState().currentOrg.companyName).toBe('');
    expect(useStore.getState().currentOrg.gstin).toBe('');
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

  it('synchronizes admin product title and category edits directly to apiCatalogProducts', () => {
    const products = useStore.getState().products;
    const testProd = products[0];
    const newTitle = 'SS304 Premium High-Pressure Cleaning Sprinkler';

    useStore.getState().updateProduct(testProd.asin, {
      title: newTitle,
      category: 'SS304 GRADE',
    });

    // Check products state
    const updatedProd = useStore.getState().products.find(p => p.asin === testProd.asin);
    expect(updatedProd?.title).toBe(newTitle);

    // Check apiCatalogProducts state (which buyer catalog renders)
    const apiProds = useStore.getState().apiCatalogProducts;
    const matchingApi = apiProds.find(p => p.id === testProd.asin || p.rawProduct?.asin === testProd.asin);
    expect(matchingApi).toBeDefined();
    expect(matchingApi?.name).toBe(newTitle);
  });

  it('permanently removes deleted product from both products and apiCatalogProducts', () => {
    const products = useStore.getState().products;
    const prodToDelete = products[products.length - 1];
    const targetAsin = prodToDelete.asin;

    useStore.getState().deleteProduct(targetAsin);

    // Verify removed from products
    expect(useStore.getState().products.some(p => p.asin === targetAsin)).toBe(false);

    // Verify removed from apiCatalogProducts (buyer catalog)
    expect(useStore.getState().apiCatalogProducts.some(p => p.id === targetAsin || p.rawProduct?.asin === targetAsin)).toBe(false);
  });

  it('persists buyer user profile name, email, and address details', () => {
    const newUser = {
      id: 'usr_buyer_test_101',
      name: 'Rajesh Patel',
      email: 'rajesh.patel@example.com',
      phone: '9876543210',
      role: 'B2C_CUSTOMER' as const,
      isPrime: false,
      createdAt: new Date().toISOString()
    };

    useStore.getState().setCurrentUser(newUser);
    expect(useStore.getState().currentUser.name).toBe('Rajesh Patel');
    expect(useStore.getState().currentUser.email).toBe('rajesh.patel@example.com');
    expect(useStore.getState().authStatus).toBe('AUTHENTICATED');

    // Update profile
    useStore.getState().updateUserProfile({ name: 'Rajesh K. Patel' });
    expect(useStore.getState().currentUser.name).toBe('Rajesh K. Patel');
  });

  it('instant live update: updateProductStock reflects immediately across products, apiCatalogProducts, and selectedProduct', () => {
    const products = useStore.getState().products;
    const target = products[0];
    const targetSku = target.variants[0].sku;

    // Set as currently active / viewed product
    useStore.getState().setSelectedProduct(target);
    expect(useStore.getState().selectedProduct?.asin).toBe(target.asin);

    // Admin updates stock to 777
    useStore.getState().updateProductStock(target.asin, targetSku, 777);

    // 1. Verify updated in products
    const updatedProd = useStore.getState().products.find(p => p.asin === target.asin);
    expect(updatedProd?.variants.find(v => v.sku === targetSku)?.inventory).toBe(777);

    // 2. Verify updated in apiCatalogProducts (buyer catalog)
    const updatedApi = useStore.getState().apiCatalogProducts.find(p => p.id === target.asin || p.rawProduct?.asin === target.asin);
    expect(updatedApi).toBeDefined();
    const apiVariant = updatedApi?.variants.find(v => v.sku === targetSku || v.display_label?.includes(targetSku));
    expect(apiVariant?.available_stock).toBe(777);

    // 3. Verify updated in currently open selectedProduct (PDP)
    const currentSelected = useStore.getState().selectedProduct;
    expect(currentSelected).toBeDefined();
    expect(currentSelected?.variants.find(v => v.sku === targetSku)?.inventory).toBe(777);
  });

  it('instant live update: updateVariantPricing updates price across products, apiCatalogProducts, and selectedProduct', () => {
    const products = useStore.getState().products;
    const target = products[0];
    const targetSku = target.variants[0].sku;

    useStore.getState().setSelectedProduct(target);

    // Admin updates variant price to ₹99
    useStore.getState().updateVariantPricing(target.asin, targetSku, 99, 1);

    // 1. Verify in products
    const updatedProd = useStore.getState().products.find(p => p.asin === target.asin);
    expect(updatedProd?.variants.find(v => v.sku === targetSku)?.b2cPrice).toBe(99);

    // 2. Verify in apiCatalogProducts
    const updatedApi = useStore.getState().apiCatalogProducts.find(p => p.id === target.asin || p.rawProduct?.asin === target.asin);
    expect(updatedApi).toBeDefined();
    const apiVariant = updatedApi?.variants.find(v => v.sku === targetSku || v.display_label?.includes(targetSku));
    expect(apiVariant?.unit_price).toBe(99);

    // 3. Verify in selectedProduct
    expect(useStore.getState().selectedProduct?.variants.find(v => v.sku === targetSku)?.b2cPrice).toBe(99);
  });

  it('instant live update: admin toggle isLive false/true instantly toggles is_active in apiCatalogProducts', () => {
    const products = useStore.getState().products;
    const target = products[0];

    // Toggle to Inactive (isLive: false)
    useStore.getState().updateProduct(target.asin, { isLive: false });

    // In products: isLive is false
    expect(useStore.getState().products.find(p => p.asin === target.asin)?.isLive).toBe(false);

    // In apiCatalogProducts: is_active is false (hidden from storefront)
    const apiInactive = useStore.getState().apiCatalogProducts.find(p => p.id === target.asin || p.rawProduct?.asin === target.asin);
    expect(apiInactive?.is_active).toBe(false);

    // Toggle back to Active (isLive: true)
    useStore.getState().updateProduct(target.asin, { isLive: true });

    // In products: isLive is true
    expect(useStore.getState().products.find(p => p.asin === target.asin)?.isLive).toBe(true);

    // In apiCatalogProducts: is_active is true (visible in storefront immediately)
    const apiActive = useStore.getState().apiCatalogProducts.find(p => p.id === target.asin || p.rawProduct?.asin === target.asin);
    expect(apiActive?.is_active).toBe(true);
  });

  describe('B2B Dynamic Multi-Tier Pricing & Cross-Size Family Pooling', () => {
    it('in B2C mode, retail customer pays B2C price regardless of quantity', () => {
      useStore.getState().setAppMode('B2C');
      const prod = useStore.getState().products.find(p => p.asin === 'AP-DRAINCLIPS-02')!;
      const v28 = prod.variants.find(v => v.sku.includes('28'))!;

      const item: CartItem = {
        sku: v28.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v28.title,
        attributes: { size: '28mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: v28.b2cPrice,
        b2cPrice: v28.b2cPrice,
        mrp: v28.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v28.weightGrams,
        quantity: 1500,
        isB2BPricingApplied: false,
      };

      useStore.getState().addToCart(item, 1500);
      const cart = useStore.getState().cart;
      expect(cart[0].unitPrice).toBe(20);
      expect(cart[0].isB2BPricingApplied).toBe(false);
    });

    it('in B2B mode, single variant under 1000 pcs pays base B2B price (₹17)', () => {
      useStore.getState().setAppMode('B2B');
      const prod = useStore.getState().products.find(p => p.asin === 'AP-DRAINCLIPS-02')!;
      const v28 = prod.variants.find(v => v.sku.includes('28'))!;

      const item: CartItem = {
        sku: v28.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v28.title,
        attributes: { size: '28mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v28.b2cPrice,
        mrp: v28.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v28.weightGrams,
        quantity: 500,
        isB2BPricingApplied: true,
      };

      useStore.getState().addToCart(item, 500);
      const cart = useStore.getState().cart;
      expect(cart[0].unitPrice).toBe(17);
      expect(cart[0].isB2BPricingApplied).toBe(true);
    });

    it('in B2B mode, buying 500 pcs of 28mm + 500 pcs of 35mm pools to 1000 pcs and gives ₹15 to both', () => {
      useStore.getState().setAppMode('B2B');
      const prod = useStore.getState().products.find(p => p.asin === 'AP-DRAINCLIPS-02')!;
      const v28 = prod.variants.find(v => v.sku.includes('28'))!;
      const v35 = prod.variants.find(v => v.sku.includes('35'))!;

      const item28: CartItem = {
        sku: v28.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v28.title,
        attributes: { size: '28mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v28.b2cPrice,
        mrp: v28.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v28.weightGrams,
        quantity: 500,
        isB2BPricingApplied: true,
      };

      const item35: CartItem = {
        sku: v35.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v35.title,
        attributes: { size: '35mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v35.b2cPrice,
        mrp: v35.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v35.weightGrams,
        quantity: 500,
        isB2BPricingApplied: true,
      };

      useStore.getState().addToCart(item28, 500);
      useStore.getState().addToCart(item35, 500);

      const cart = useStore.getState().cart;
      expect(cart.length).toBe(2);
      expect(cart.find(i => i.sku === v28.sku)?.unitPrice).toBe(15);
      expect(cart.find(i => i.sku === v35.sku)?.unitPrice).toBe(15);
    });

    it('in B2B mode, buying 1500 pcs of 28mm + 1000 pcs of 35mm pools to 2500 pcs and gives ₹10 to both', () => {
      useStore.getState().setAppMode('B2B');
      const prod = useStore.getState().products.find(p => p.asin === 'AP-DRAINCLIPS-02')!;
      const v28 = prod.variants.find(v => v.sku.includes('28'))!;
      const v35 = prod.variants.find(v => v.sku.includes('35'))!;

      const item28: CartItem = {
        sku: v28.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v28.title,
        attributes: { size: '28mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v28.b2cPrice,
        mrp: v28.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v28.weightGrams,
        quantity: 1500,
        isB2BPricingApplied: true,
      };

      const item35: CartItem = {
        sku: v35.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v35.title,
        attributes: { size: '35mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v35.b2cPrice,
        mrp: v35.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v35.weightGrams,
        quantity: 1000,
        isB2BPricingApplied: true,
      };

      useStore.getState().addToCart(item28, 1500);
      useStore.getState().addToCart(item35, 1000);

      const cart = useStore.getState().cart;
      expect(cart.find(i => i.sku === v28.sku)?.unitPrice).toBe(10);
      expect(cart.find(i => i.sku === v35.sku)?.unitPrice).toBe(10);
    });

    it('switching from B2B to B2C recalculates cart items to B2C price, and vice versa', () => {
      useStore.getState().setAppMode('B2B');
      const prod = useStore.getState().products.find(p => p.asin === 'AP-DRAINCLIPS-02')!;
      const v28 = prod.variants.find(v => v.sku.includes('28'))!;

      const item28: CartItem = {
        sku: v28.sku,
        parentAsin: prod.asin,
        productTitle: prod.title,
        variantTitle: v28.title,
        attributes: { size: '28mm' },
        imageUrl: v28.images?.[0] ?? '/Drain_clips.webp',
        unitPrice: 17,
        b2cPrice: v28.b2cPrice,
        mrp: v28.mrp,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 'apollo_factory',
        sellerName: 'Apollo Engineering Hub',
        fulfillmentType: 'FBF',
        weightGrams: v28.weightGrams,
        quantity: 1000,
        isB2BPricingApplied: true,
      };

      useStore.getState().addToCart(item28, 1000);
      expect(useStore.getState().cart[0].unitPrice).toBe(15);

      // Switch to B2C
      useStore.getState().setAppMode('B2C');
      expect(useStore.getState().cart[0].unitPrice).toBe(20);
      expect(useStore.getState().cart[0].isB2BPricingApplied).toBe(false);

      // Switch back to B2B
      useStore.getState().setAppMode('B2B');
      expect(useStore.getState().cart[0].unitPrice).toBe(15);
      expect(useStore.getState().cart[0].isB2BPricingApplied).toBe(true);
    });
  });
});


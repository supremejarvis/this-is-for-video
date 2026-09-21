import { create } from 'zustand';
import { 
  AppMode, UserProfile, UserRole, B2BOrganization, DeliveryAddress, Product, 
  CartItem, Order, SplitShipmentPackage, ProductVariant, PostOfficeInfo, OrderStatus,
  SellerListing, WishlistItem, ProductReview, Coupon, ReturnRequest, ReturnReason, ReturnStatus,
  AuthStatus, QuoteStatus, AdminRole, AdminAuditLog, SolarContractorInquiry
} from '../types';
import { 
  LEGACY_ASIN_SPRINKLER, LEGACY_ASIN_DRAINCLIPS
} from '../data/mockData';
import { calculateSpeedPostTariff, generateIndiaPostBooking } from '../services/logisticsService';
import { ORIGIN_HUB_PINCODE, DEFAULT_GST_RATE_PERCENT, ORIGIN_STATE_CODE } from '../constants';
import { calculateInclusiveGst } from '../utils/gstCalculations';
import { AuthoritativeQuote, QuoteLineItem, QuoteService } from '../services/quoteService';
import { ApiProduct, CatalogService } from '../services/catalogService';
import { SupportedLanguage } from '../utils/i18n';
import { runStorageMigration } from '../utils/storageMigration';
import { apiService } from '../services/apiService';
import { authApi, catalogApi, quoteApi, orderApi, paymentApi, inventoryApi, CustomerProfile } from '../services/api';

// Run storage migration immediately
runStorageMigration();

export type AuthDestination = 'HEADER' | 'CART' | 'CHECKOUT' | null;
export type { CartItem };

export const EMPTY_B2B_ORG: B2BOrganization = {
  id: '',
  companyName: '',
  tradeName: '',
  gstin: '',
  pan: '',
  cin: '',
  stateCode: '',
  isGstVerified: false,
  creditLimit: 0,
  creditUsed: 0,
  creditTerms: 'PREPAID',
  kycStatus: 'PENDING',
  spendingThresholdForApproval: 0,
  members: []
};

export interface AppStore {
  // Navigation & Mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Users & Organizations & Backend Session
  authStatus: AuthStatus;
  authDestination: AuthDestination;
  setAuthDestination: (dest: AuthDestination) => void;
  checkAuthSession: () => Promise<void>;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  customerProfile: CustomerProfile | null;
  setCustomerProfile: (profile: CustomerProfile | null) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  currentOrg: B2BOrganization;
  updateOrgDetails: (org: Partial<B2BOrganization>) => void;
  clearOrgDetails: () => void;
  allUsers: UserProfile[];
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;

  // Delivery & Addresses & Dual Billing/Shipping
  addresses: DeliveryAddress[];
  activeAddress: DeliveryAddress | null;
  billingAddress: DeliveryAddress | null;
  shippingAddress: DeliveryAddress | null;
  isShippingSameAsBilling: boolean;
  setIsShippingSameAsBilling: (same: boolean) => void;
  setBillingAddress: (addr: DeliveryAddress) => void;
  setShippingAddress: (addr: DeliveryAddress) => void;
  addAddress: (addr: Omit<DeliveryAddress, 'id'> | DeliveryAddress) => void;
  updateAddress: (addrId: string, updates: Partial<DeliveryAddress>) => void;
  deleteAddress: (addrId: string) => void;
  setActiveAddress: (addrId: string) => void;

  // Catalog & Search
  products: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  selectProductVariant: (asin: string, sku: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  updateProductStock: (asin: string, sku: string, deltaQty: number) => void;
  addNewProduct: (p: Product) => void;
  updateProduct: (asin: string, updates: Partial<Product>) => void;
  deleteProduct: (asin: string) => void;
  updateVariantDetails: (asin: string, sku: string, updates: Partial<ProductVariant>) => void;
  addNewVariantToProduct: (asin: string, variant: ProductVariant) => void;
  deleteVariantFromProduct: (asin: string, sku: string) => void;
  combineProductsIntoParentListing: (asins: string[], parentTitle?: string) => Product | null;

  // Listing & Marketplace Operations
  listingMode: 'B2C' | 'B2B' | 'AdminPublish';
  setListingMode: (mode: 'B2C' | 'B2B' | 'AdminPublish') => void;
  publishProduct: (product: Omit<Product, 'asin' | 'createdAt' | 'lastUpdated'>) => string;
  updateProductListing: (asin: string, updates: Partial<Product>) => void;
  deleteProductListing: (asin: string) => void;
  updateVariantPricing: (asin: string, sku: string, price: number, quantity?: number) => void;
  getWinningSellerForASIN: (asin: string) => SellerListing | null;
  updateBuyBoxScore: (asin: string, sellerId: string, price: number, deliveryDays: number, rating: number, fulfillment: 'FBF' | 'FBM') => void;
  reorderProduct?: (asin: string) => void;

  // Cart & Optimistic Checkout
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  updateCartQuantity: (sku: string, qty: number) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  getSplitShipments: () => SplitShipmentPackage[];

  // Authoritative Quote & Statutory Engine (Gate 2C)
  currentQuote: AuthoritativeQuote | null;
  quoteStatus: QuoteStatus;
  quoteError: string | null;
  quotePaymentMethod: 'PREPAID' | 'COD';
  setQuotePaymentMethod: (method: 'PREPAID' | 'COD') => void;
  destinationPincode: string;
  setDestinationPincode: (pincode: string) => void;
  fetchAuthoritativeQuote: () => Promise<AuthoritativeQuote | null>;

  // Statutory E-Commerce Policies & COD Limits
  b2cCodLimit: number;
  setB2cCodLimit: (limit: number) => void;

  // Database-driven Catalog API (Gate 2C)
  apiCatalogProducts: ApiProduct[];
  apiCatalogLoading: boolean;
  apiCatalogError: string | null;
  fetchApiCatalog: () => Promise<void>;
  isHydrated: boolean;

  // Multi-Lingual Architecture
  selectedLanguage: SupportedLanguage;
  setSelectedLanguage: (lang: SupportedLanguage) => void;

  // Orders & Logistics
  orders: Order[];
  createOrder: (
    paymentMethod: Order['paymentDetail']['method'],
    gstinClaim: boolean,
    paymentMeta?: {
      id?: string;
      orderNumber?: string;
      order_number?: string;
      invoiceNumber?: string;
      invoice_number?: string;
      transactionId?: string;
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
      total_payable?: number;
      [key: string]: any;
    }
  ) => Order;
  decrementInventory: (items: { sku: string; quantity: number }[]) => void;
  updateOrderStatus: (orderId: string, packageId: string, status: OrderStatus, milestoneDesc: string, location: string) => void;
  schedulePickupForOrder: (orderId: string, packageId: string, slot: string, courier: string, date: string) => void;
  confirmPackedAndReady: (orderId: string, packageId: string) => void;
  confirmHandoverToCourier: (orderId: string, packageId: string) => void;
  confirmDelivered: (orderId: string, packageId: string) => void;
  verifyDirectUpiPayment: (orderId: string, utrNumber: string, notes?: string) => void;
  batchSchedulePickup: (orderIds: string[], slot: string, courier: string, date: string) => void;
  redispatchOrder: (orderId: string) => void;
  selectedOrderForDetail: Order | null;
  setSelectedOrderForDetail: (o: Order | null) => void;
  orderFilterStatus: 'ALL' | 'DELIVERED' | 'NOT_DELIVERED';
  setOrderFilterStatus: (filter: 'ALL' | 'DELIVERED' | 'NOT_DELIVERED') => void;

  // Modals & UI states
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAddressModalOpen: boolean;
  setIsAddressModalOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;

  // Wishlist
  wishlist: WishlistItem[];
  addToWishlist: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => void;
  removeFromWishlist: (id: string) => void;
  moveWishlistToCart: (id: string) => void;
  isInWishlist: (asin: string, sku: string) => boolean;

  // Product Reviews
  reviews: ProductReview[];
  addReview: (review: Omit<ProductReview, 'id' | 'createdAt' | 'helpfulCount'>) => void;
  deleteReview: (reviewId: string) => void;
  markReviewHelpful: (reviewId: string) => void;
  getProductReviews: (asin: string) => ProductReview[];
  getAverageRating: (asin: string) => { avg: number; count: number };

  // Coupons & Discounts
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usedCount'>) => void;
  updateCoupon: (couponId: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (couponId: string) => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;

  // Return / Refund Management
  returnRequests: ReturnRequest[];
  createReturnRequest: (orderId: string, items: ReturnRequest['items'], reason: ReturnReason, reasonDetails?: string) => ReturnRequest | null;
  updateReturnStatus: (returnId: string, status: ReturnStatus, adminNotes?: string) => void;
  getOrderReturns: (orderId: string) => ReturnRequest[];

  // Enterprise RBAC & Audit Trails
  activeAdminRole: AdminRole;
  setActiveAdminRole: (role: AdminRole) => void;
  adminAuditLogs: AdminAuditLog[];
  addAuditLog: (log: Omit<AdminAuditLog, 'id' | 'timestamp'>) => void;

  // Solar Contractor Inquiries & Call Desk
  contractorInquiries: SolarContractorInquiry[];
  addContractorInquiry: (inquiry: Omit<SolarContractorInquiry, 'id' | 'createdAt' | 'lastContactedAt'>) => void;
  updateContractorInquiry: (id: string, updates: Partial<SolarContractorInquiry>) => void;
  deleteContractorInquiry: (id: string) => void;

  // Toast / Notifications
  toastMessage: { text: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

// In-Memory Storage Fallback for Private Browsing / Quota Exceeded Modes
const memoryStore: Record<string, string> = {};

export const loadStored = <T>(key: string, fallback: T): T => {
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = localStorage.getItem(key);
    }
    if (!raw && memoryStore[key]) {
      raw = memoryStore[key];
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const saveStored = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    memoryStore[key] = serialized;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, serialized);
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && ('name' in err && (err as { name: string }).name === 'QuotaExceededError' || 'code' in err && (err as { code: number }).code === 22)) {
      try {
        // Clear non-critical temporary session logs if quota exceeded
        localStorage.removeItem('apollo_temp_manifest');
      } catch {
        // Keep in memory store safely
      }
    }
  }
};

export const loadSessionCart = (): CartItem[] => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = sessionStorage.getItem('apollo_cart') || sessionStorage.getItem('cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
};

export const saveSessionCart = (cart: CartItem[]): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const serialized = JSON.stringify(cart);
      sessionStorage.setItem('apollo_cart', serialized);
      sessionStorage.setItem('cart', serialized);
    }
  } catch {}
};

export const isDrainClipCartItem = (i: { sku?: string; parentAsin?: string; productTitle?: string }) => {
  const s = (i.sku || '').toUpperCase();
  const p = (i.parentAsin || '').toUpperCase();
  const t = (i.productTitle || '').toLowerCase();
  return s.startsWith('APE-SC') || s.includes('CLIP') || s.includes('DRAIN') || p.includes('CLIP') || p === 'AP-DRAIN-02' || t.includes('drain clip');
};

export const recalculateCartVolumeTiers = (
  cartItems: CartItem[],
  explicitMode?: AppMode,
  catalogProducts?: Product[]
): CartItem[] => {
  if (!cartItems || cartItems.length === 0) return [];

  // Determine current mode: explicit parameter -> localStorage -> fallback 'B2C'
  let currentMode: AppMode = explicitMode || 'B2C';
  if (!explicitMode) {
    try {
      if (typeof window !== 'undefined') {
        const storedMode = localStorage.getItem('apollo_app_mode');
        if (storedMode === '"B2B"' || storedMode === 'B2B') {
          currentMode = 'B2B';
        }
      }
    } catch {}
  }

  // Resolve available products list for tier definitions
  let productsList: Product[] = catalogProducts || [];
  if (productsList.length === 0) {
    try {
      productsList = loadStored<Product[]>('apollo_products', []);
    } catch {
      productsList = [];
    }
  }

  // Group items by product family (parentAsin, or product id, or matching prefix) for cross-size volume pooling
  const productFamilyGroups = new Map<string, { totalQty: number; items: CartItem[] }>();

  cartItems.forEach((item) => {
    const familyKey = item.parentAsin || item.productId || (item.sku ? item.sku.split('-').slice(0, 2).join('-') : 'default');
    if (!productFamilyGroups.has(familyKey)) {
      productFamilyGroups.set(familyKey, { totalQty: 0, items: [] });
    }
    const group = productFamilyGroups.get(familyKey)!;
    group.totalQty += (item.quantity || 0);
    group.items.push(item);
  });

  return cartItems.map((item) => {
    // Find the product and variant in catalog
    const product = productsList.find((p) =>
      p.asin === item.parentAsin ||
      p.asin === item.productId ||
      (p.variants && p.variants.some((v) => v.sku === item.sku))
    );
    const variant = product?.variants?.find((v) => v.sku === item.sku) || product?.variants?.[0];

    const isB2B = currentMode === 'B2B';

    if (!isB2B) {
      // B2C Mode: STRICTLY B2C price (never apply B2B bulk tiers)
      const b2cRate = variant?.b2cPrice ?? item.b2cPrice ?? item.unitPrice;
      return {
        ...item,
        unitPrice: b2cRate,
        isB2BPricingApplied: false,
      };
    }

    // B2B Mode: Cross-size variant pooling ("koi pn size ma")
    const familyKey = item.parentAsin || item.productId || (item.sku ? item.sku.split('-').slice(0, 2).join('-') : 'default');
    const group = productFamilyGroups.get(familyKey);
    const pooledQty = group ? group.totalQty : item.quantity;

    // Resolve B2B tiers: variant tiers -> product tiers -> fallback
    const tiers = (variant?.b2bTierPricing && variant.b2bTierPricing.length > 0)
      ? variant.b2bTierPricing
      : ((product as any)?.b2bTierPricing || (item as any).b2bTierPricing || []);

    if (tiers && tiers.length > 0) {
      // Sort tiers descending by minQty (e.g. 2500, 1000, 50, 1)
      const sortedTiers = [...tiers].sort((a, b) => (b.minQty || 0) - (a.minQty || 0));
      const matchedTier = sortedTiers.find((t) => pooledQty >= t.minQty);
      if (matchedTier && typeof matchedTier.pricePerUnit === 'number') {
        return {
          ...item,
          unitPrice: matchedTier.pricePerUnit,
          isB2BPricingApplied: true,
        };
      }
      // If below lowest tier minQty, use lowest tier price or base B2B price
      const lowestTier = sortedTiers[sortedTiers.length - 1];
      if (lowestTier && typeof lowestTier.pricePerUnit === 'number') {
        return {
          ...item,
          unitPrice: lowestTier.pricePerUnit,
          isB2BPricingApplied: true,
        };
      }
    }

    // Fallback B2B price if no tiers defined
    const baseB2bPrice = (variant as any)?.b2bPrice ?? Math.round((variant?.b2cPrice || item.unitPrice) * 0.75);
    return {
      ...item,
      unitPrice: baseB2bPrice,
      isB2BPricingApplied: true,
    };
  });
};

export const syncUserToList = (user: UserProfile, existingUsers: UserProfile[]): UserProfile[] => {
  const index = existingUsers.findIndex(u => u.id === user.id || (u.phone && user.phone && u.phone.slice(-10) === user.phone.slice(-10)));
  if (index >= 0) {
    return existingUsers.map((u, i) => i === index ? user : u);
  }
  return [user, ...existingUsers];
};

export const createMockSprinklerItem = (quantity = 2) => ({
  sku: 'AE-SPRINKLER-SS304',
  parentAsin: 'AP-SPRINKLER-01',
  productTitle: 'SS304 Solar Panel Sprinkler',
  variantTitle: '180° Uniform Curtain / ½" BSP Male',
  attributes: { material: 'SS304' },
  imageUrl: '/solar_sprinkler.webp',
  unitPrice: 220,
  mrp: 350,
  gstRate: 18,
  hsnCode: '84248990',
  sellerId: 'apollo_mfg',
  sellerName: 'Apollo Engineering',
  fulfillmentType: 'FBF' as const,
  weightGrams: 180,
  quantity,
  isB2BPricingApplied: false
});

export const createScheduledPickupShipment = (
  shp: Order['shipments'][number],
  slot: string,
  courier: string,
  date: string,
  isBatch = false
): Order['shipments'][number] => ({
  ...shp,
  status: 'PROCESSING_PICK_PACK' as OrderStatus,
  pickupDetail: {
    slot,
    date,
    courier,
    scheduledAt: new Date().toISOString()
  },
  milestones: [
    ...shp.milestones,
    {
      status: 'PICKUP_SCHEDULED',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: 'Kathwada GIDC Hub (382430)',
      description: isBatch
        ? `Batch pickup scheduled for ${date} (${slot}) with ${courier}`
        : `Pickup scheduled for ${date} (${slot}) with ${courier}`,
      isCompleted: true
    }
  ]
});

export const syncBillingToShipping = (
  billing: DeliveryAddress,
  existingShippingId?: string,
  isB2B = false
): DeliveryAddress => ({
  ...billing,
  id: existingShippingId || `addr_shipping_${Date.now()}`,
  addressType: isB2B ? 'WAREHOUSE' : 'HOME'
});

export const persistShippingAddress = (
  addr: DeliveryAddress,
  existingAddresses: DeliveryAddress[]
): void => {
  saveStored('apollo_shipping_address', addr);
  saveStored('apollo_addresses', [addr, ...existingAddresses.filter(a => a.id !== addr.id)]);
};

export const GUEST_USER: UserProfile = {
  id: 'usr_guest',
  name: '',
  email: '',
  phone: '',
  role: 'GUEST',
  isPrime: false,
  createdAt: ''
};

const DEFAULT_SAMPLE_ORDERS: Order[] = [];

// Strict Session & PII State Defaults (Deterministic for Server-Side Rendering & Hydration)
const initialUsers: UserProfile[] = [];
const initialCurrentUser: UserProfile = GUEST_USER;
const initialAddresses: DeliveryAddress[] = [];
const initialShippingAddress: DeliveryAddress | null = null;
const initialBillingAddress: DeliveryAddress | null = null;
const initialActiveAddress: DeliveryAddress | null = null;
const initialOrders: Order[] = loadStored<Order[]>('apollo_orders', []).filter(o => !o.id?.startsWith('ord_sample_'));
const initialDeletedProductAsins: string[] = [];
export const deletedProductAsinsSet = new Set<string>(initialDeletedProductAsins);

// Deterministic server-safe catalog initialization (single source of truth in PostgreSQL)
const initialProducts: Product[] = [];
const initialWishlist: WishlistItem[] = [];
const initialReviews = loadStored<ProductReview[]>('apollo_reviews', []);
const initialCoupons = loadStored<Coupon[]>('apollo_coupons', [
  {
    id: 'coup_001',
    code: 'APOLLO10',
    description: '10% off on first order',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: 500,
    maxDiscount: 1000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 100,
    usedCount: 0,
    isActive: true
  },
  {
    id: 'coup_002',
    code: 'FREESHIP',
    description: 'Free shipping on orders above ₹2,000',
    type: 'FREE_SHIPPING',
    value: 0,
    minOrderAmount: 2000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 500,
    usedCount: 0,
    isActive: true
  },
  {
    id: 'coup_003',
    code: 'BULK500',
    description: '₹500 flat off on B2B orders above ₹10,000',
    type: 'FLAT_AMOUNT',
    value: 500,
    minOrderAmount: 10000,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2026-12-31T23:59:59Z',
    usageLimit: 50,
    usedCount: 0,
    isActive: true,
    applicableCategories: ['SS304 GRADE']
  }
]);
const initialReturns = loadStored<ReturnRequest[]>('apollo_returns', []);
const initialAuditLogs = loadStored<AdminAuditLog[]>('apollo_admin_audit_logs', []).filter(
  l => !l.id?.startsWith('log_')
);
const initialContractorInquiries = loadStored<SolarContractorInquiry[]>('apollo_contractor_inquiries', []).filter(
  i => !i.id?.startsWith('inq_00') && !i.id?.startsWith('inq_sample')
);

/**
 * Authoritative converter from local Product to API Catalog ApiProduct
 */
export function mapProductToApiProduct(
  p: Product,
  defaultReviewCount = 1,
  defaultBadges: string[] = ['NEW_LAUNCH']
): ApiProduct {
  const primaryVariant = p.variants?.[0];
  return {
    id: p.asin,
    sku_prefix: primaryVariant?.sku?.split('-').slice(0, 2).join('-') || p.asin,
    name: p.title,
    description: p.description || '',
    hsn_code: primaryVariant?.hsnCode || '73269099',
    is_active: p.isLive !== false,
    is_archived: false,
    version: 1,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.lastUpdated || new Date().toISOString(),
    category: p.category || 'SS304 GRADE',
    image: primaryVariant?.images?.[0] || p.aPlusContent?.[0]?.imageUrl || '/solar_sprinkler.webp',
    images: primaryVariant?.images || (p.variants || []).flatMap(v => v.images || []),
    brand: p.brand || 'Apollo Engineering',
    rating: p.rating || 4.9,
    reviewCount: p.reviewCount || defaultReviewCount,
    badges: p.badges || defaultBadges,
    highlights: p.highlights || [],
    rawProduct: p,
    variants: (p.variants || []).map(v => ({
      id: `${p.asin}-${v.sku}`,
      product_id: p.asin,
      sku: v.sku,
      fit_mode: (v.attributes?.size && v.attributes.size.includes('mm')) ? 'EXACT' : 'NOT_APPLICABLE',
      frame_thickness_mm: v.attributes?.size ? parseFloat(v.attributes.size) || null : null,
      min_thickness_mm: null,
      max_thickness_mm: null,
      display_label: v.title || `${p.title} (${v.sku})`,
      frame_thickness: v.attributes?.size || 'Standard',
      pack_size: v.attributes?.packSize ? parseInt(v.attributes.packSize.replace(/\D/g, '')) || 1 : 1,
      is_active: true,
      is_archived: false,
      version: 1,
      available_stock: v.inventory ?? 100,
      unit_price: v.b2cPrice ?? 20,
      mrp: v.mrp || Math.round((v.b2cPrice ?? 20) * 1.5),
      b2bTierPricing: v.b2bTierPricing || [],
      images: v.images || [],
      weightGrams: v.weightGrams,
      hsnCode: v.hsnCode || '73269099',
      tax_mode: 'GST_INCLUSIVE',
      created_at: p.createdAt || new Date().toISOString(),
    }))
  };
}

/**
 * Helper to immutably update shipments across matching order IDs
 */
type OrderShipment = Order['shipments'][number];

function updateOrderShipmentHelper(
  orders: Order[],
  orderId: string,
  packageId: string,
  updater: (shp: OrderShipment, ord: Order) => OrderShipment
): Order[] {
  return orders.map((ord) => {
    if (ord.id === orderId || ord.orderNumber === orderId) {
      return {
        ...ord,
        shipments: ord.shipments.map((shp) => {
          if (shp.packageId === packageId || ord.shipments.length === 1) {
            return updater(shp, ord);
          }
          return shp;
        })
      };
    }
    return ord;
  });
}

export function mapApiProductToProduct(ap: ApiProduct, existingProducts: Product[] = []): Product {
  const asinToBackendPrefix: Record<string, string> = {
    'AP-SPRINKLER-01': 'AE-SPRINKLER',
    'AP-DRAINCLIPS-02': 'APE-SC',
    'AP-GICLAMP-03': 'AE-CLAMP-GI',
    'AP-FITTINGTEE-04': 'AE-PIPE-FITTING',
    'AP-PUMP-06': 'AE-PUMP-DC',
    'AP-TIMER-07': 'AE-TIMER-AUTO',
    'AP-FULLKIT-05': 'AE-KIT-FULL',
  };

  const pMatch = ap.rawProduct || existingProducts.find(p =>
    p.asin === ap.id ||
    p.asin === ap.sku_prefix ||
    (ap.sku_prefix && asinToBackendPrefix[p.asin] === ap.sku_prefix) ||
    (p.variants && p.variants.some(v => v.sku === ap.sku_prefix || v.sku.startsWith(ap.sku_prefix)))
  );

  let assignedAsin = pMatch?.asin || ap.id;
  if (!assignedAsin || assignedAsin.length < 3) {
    if (ap.sku_prefix === 'APE-SC') assignedAsin = 'AP-DRAINCLIPS-02';
    else if (ap.sku_prefix === 'AE-SPRINKLER') assignedAsin = 'AP-SPRINKLER-01';
    else if (ap.sku_prefix === 'AE-CLAMP-GI') assignedAsin = 'AP-GICLAMP-03';
    else if (ap.sku_prefix === 'AE-PIPE-FITTING') assignedAsin = 'AP-FITTINGTEE-04';
    else if (ap.sku_prefix === 'AE-PUMP-DC') assignedAsin = 'AP-PUMP-06';
    else if (ap.sku_prefix === 'AE-TIMER-AUTO') assignedAsin = 'AP-TIMER-07';
    else if (ap.sku_prefix === 'AE-KIT-FULL') assignedAsin = 'AP-FULLKIT-05';
    else assignedAsin = ap.sku_prefix || `AP-${Date.now()}`;
  }

  let defaultImg = '/solar_sprinkler.webp';
  const cleanPrefix = (ap.sku_prefix || '').toUpperCase();
  const cleanName = (ap.name || '').toLowerCase();
  if (cleanPrefix.includes('SC') || cleanName.includes('drain')) defaultImg = '/Drain_clips.webp';
  else if (cleanPrefix.includes('SPRINKLER') || cleanName.includes('sprinkler')) defaultImg = '/solar_sprinkler.webp';
  else if (cleanPrefix.includes('CLAMP') || cleanPrefix.includes('GI') || cleanName.includes('gi ')) defaultImg = '/gi_pipe_clamp.webp';
  else if (cleanPrefix.includes('FITTING') || cleanPrefix.includes('PIPE') || cleanName.includes('fitting') || cleanName.includes('tee')) defaultImg = '/cpvc_upvc.webp';
  else if (cleanPrefix.includes('PUMP') || cleanName.includes('pump')) defaultImg = '/pump.webp';
  else if (cleanPrefix.includes('TIMER') || cleanName.includes('timer')) defaultImg = '/auto_timer.webp';
  else if (cleanPrefix.includes('KIT') || cleanName.includes('kit') || cleanName.includes('full set')) defaultImg = '/solar_cleaning_fullset.webp';

  const primaryImg = pMatch?.variants?.[0]?.images?.[0] || (pMatch as any)?.image || pMatch?.aPlusContent?.[0]?.imageUrl || ap.image || defaultImg;
  const allImgs = pMatch?.variants?.flatMap((v: any) => v.images || [])?.length ? pMatch.variants.flatMap((v: any) => v.images || []) : (ap.images || [primaryImg]);

  const category = pMatch?.category || (
    (cleanPrefix.includes('SC') || cleanName.includes('drain') || cleanPrefix.includes('SPRINKLER') || cleanName.includes('sprinkler')) ? 'SS304 GRADE' :
    (cleanPrefix.includes('CLAMP') || cleanPrefix.includes('GI') || cleanName.includes('gi ')) ? 'GI SERIES' :
    (cleanPrefix.includes('FITTING') || cleanPrefix.includes('PIPE') || cleanName.includes('fitting')) ? 'FITTING SERIES' :
    (cleanPrefix.includes('PUMP') || cleanName.includes('pump')) ? 'POWER SERIES' :
    (cleanPrefix.includes('TIMER') || cleanName.includes('timer')) ? 'CONTROL SERIES' :
    (cleanPrefix.includes('KIT') || cleanName.includes('kit')) ? 'COMPLETE KIT' : 'SS304 GRADE'
  );

  const variants: ProductVariant[] = (ap.variants && ap.variants.length > 0)
    ? ap.variants.map((v) => {
        const matchingLocalV = pMatch?.variants?.find((lv: any) => lv.sku === v.sku || (v.frame_thickness_mm && lv.attributes?.size && parseFloat(lv.attributes.size) === Number(v.frame_thickness_mm)));
        const rawBackendPrice = (v as any).b2c_price ?? v.unit_price;
        const price = (rawBackendPrice !== undefined && rawBackendPrice !== null && !isNaN(Number(rawBackendPrice)))
          ? Number(rawBackendPrice)
          : (matchingLocalV?.b2cPrice ?? 20);
        const rawBackendStock = v.available_stock;
        const inv = (rawBackendStock !== undefined && rawBackendStock !== null && !isNaN(Number(rawBackendStock)))
          ? Number(rawBackendStock)
          : (matchingLocalV?.inventory ?? 100);

        return {
          sku: v.sku,
          title: v.display_label || matchingLocalV?.title || `${ap.name} - ${v.sku}`,
          inventory: inv,
          b2cPrice: price,
          mrp: matchingLocalV?.mrp || v.mrp || Math.round(price * 1.5),
          weightGrams: matchingLocalV?.weightGrams || v.weightGrams || 150,
          hsnCode: matchingLocalV?.hsnCode || v.hsnCode || ap.hsn_code || '84248990',
          gstRatePercent: 18,
          unitOfMeasure: 'PCS',
          attributes: {
            size: v.frame_thickness || (v.frame_thickness_mm ? `${v.frame_thickness_mm}mm` : (matchingLocalV?.attributes?.size || 'Standard')),
            material: category,
            specs: matchingLocalV?.attributes?.specs || {}
          },
          images: matchingLocalV?.images || v.images || allImgs,
          b2bTierPricing: matchingLocalV?.b2bTierPricing || v.b2bTierPricing || [
            { minQty: 50, pricePerUnit: Math.round(price * 0.75), discountPercentage: 25 },
            { minQty: 200, pricePerUnit: Math.round(price * 0.65), discountPercentage: 35 }
          ]
        };
      })
    : (pMatch?.variants || [
        {
          sku: `${assignedAsin}-01`,
          title: ap.name,
          inventory: 500,
          b2cPrice: 20,
          mrp: 30,
          weightGrams: 150,
          hsnCode: ap.hsn_code || '84248990',
          gstRatePercent: 18,
          unitOfMeasure: 'PCS',
          attributes: { size: 'Standard', material: category, specs: {} },
          images: allImgs,
          b2bTierPricing: [{ minQty: 50, pricePerUnit: 15, discountPercentage: 25 }]
        }
      ]);

  const sellerListings: Record<string, SellerListing[]> = {};
  variants.forEach((v) => {
    sellerListings[v.sku] = [
      {
        sellerId: 'seller_apollo_mfg',
        sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
        rating: 5.0,
        ratingCount: 1,
        fulfillmentType: 'FBF',
        price: v.b2cPrice || 0,
        shippingFee: 0,
        deliveryDays: 1,
        stock: v.inventory || 0,
        isWinningBuyBox: true,
        buyBoxScore: 100
      }
    ];
  });

  return {
    asin: assignedAsin,
    title: ap.name,
    brand: 'Apollo Engineering',
    category,
    subCategory: 'Solar Cleaning Hardware',
    description: ap.description || `${ap.name} manufactured at Kathwada Factory Hub.`,
    highlights: [
      'Direct Factory Dispatch from Kathwada GIDC (382430)',
      '100% Guaranteed Industrial Grade Quality',
      'GST Statutory Invoice Included with 18% ITC Support'
    ],
    variants,
    selectedVariantSku: variants[0]?.sku || '',
    sellerListings,
    aPlusContent: [],
    badges: ['PRIME', 'ENTERPRISE_ASSURED'],
    rating: ap.rating || 0,
    reviewCount: ap.reviewCount || 0,
    isLive: ap.is_active && !ap.is_archived,
    createdAt: ap.created_at || new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

export function syncCatalogProducts(_products: Product[], existingApi: ApiProduct[] = []): ApiProduct[] {
  // Authoritative PostgreSQL backend is the single source of truth
  if (existingApi && existingApi.length > 0) {
    const validBackendProducts: ApiProduct[] = [];

    for (const ap of existingApi) {
      if (!ap || ap.is_archived) {
        continue;
      }

      // Match corresponding product in _products if available
      const matchingLocalProd = _products.find(p => p.asin === ap.id || (ap.rawProduct && ap.rawProduct.asin === p.asin) || p.asin === ap.sku_prefix);

      // Resolve high-resolution official WebP image
      let defaultImg = '/solar_sprinkler.webp';
      const cleanPrefix = (ap.sku_prefix || '').toUpperCase();
      const cleanName = (ap.name || '').toLowerCase();
      if (cleanPrefix.includes('SC') || cleanName.includes('drain')) defaultImg = '/Drain_clips.webp';
      else if (cleanPrefix.includes('SPRINKLER') || cleanName.includes('sprinkler')) defaultImg = '/solar_sprinkler.webp';
      else if (cleanPrefix.includes('CLAMP') || cleanPrefix.includes('GI') || cleanName.includes('gi ')) defaultImg = '/gi_pipe_clamp.webp';
      else if (cleanPrefix.includes('FITTING') || cleanPrefix.includes('PIPE') || cleanName.includes('fitting') || cleanName.includes('tee')) defaultImg = '/cpvc_upvc.webp';
      else if (cleanPrefix.includes('PUMP') || cleanName.includes('pump')) defaultImg = '/pump.webp';
      else if (cleanPrefix.includes('TIMER') || cleanName.includes('timer')) defaultImg = '/auto_timer.webp';
      else if (cleanPrefix.includes('KIT') || cleanName.includes('kit') || cleanName.includes('full set')) defaultImg = '/solar_cleaning_fullset.webp';

      const primaryImg = ap.image || defaultImg;
      const allImgs = (ap.images && ap.images.length > 0) ? ap.images : [primaryImg];

      const category = matchingLocalProd?.category || (
        (cleanPrefix.includes('SC') || cleanName.includes('drain') || cleanPrefix.includes('SPRINKLER') || cleanName.includes('sprinkler')) ? 'SS304 GRADE' :
        (cleanPrefix.includes('CLAMP') || cleanPrefix.includes('GI') || cleanName.includes('gi ')) ? 'GI SERIES' :
        (cleanPrefix.includes('FITTING') || cleanPrefix.includes('PIPE') || cleanName.includes('fitting')) ? 'FITTING SERIES' :
        (cleanPrefix.includes('PUMP') || cleanName.includes('pump')) ? 'POWER SERIES' :
        (cleanPrefix.includes('TIMER') || cleanName.includes('timer')) ? 'CONTROL SERIES' :
        (cleanPrefix.includes('KIT') || cleanName.includes('kit')) ? 'COMPLETE KIT' : 'SS304 GRADE'
      );

      const syncedVariants = (ap.variants || []).map(av => {
        const matchingLocalVar = matchingLocalProd?.variants.find(v => v.sku === av.sku);
        const rawPrice = matchingLocalVar?.b2cPrice ?? (av as any).b2c_price ?? av.unit_price ?? 0;
        const parsedPrice = typeof rawPrice === 'number' ? rawPrice : (parseFloat(String(rawPrice)) || 0);
        const stock = matchingLocalVar?.inventory ?? (typeof av.available_stock === 'number' ? av.available_stock : 0);
        const tierPricing = matchingLocalVar?.b2bTierPricing || (av as any).b2b_tier_pricing || av.b2bTierPricing || [];

        return {
          ...av,
          display_label: av.display_label || av.sku || 'Standard',
          images: av.images && av.images.length > 0 ? av.images : allImgs,
          available_stock: stock,
          unit_price: parsedPrice,
          mrp: av.mrp || Math.round(parsedPrice * 1.5),
          b2bTierPricing: tierPricing,
          weightGrams: av.weightGrams || (cleanPrefix.includes('SPRINKLER') ? 180 : 25),
          hsnCode: av.hsnCode || ap.hsn_code || '73269099',
          tax_mode: av.tax_mode || 'GST_INCLUSIVE',
          b2bMoq: 50,
          b2cPrice: parsedPrice,
          b2bPrice: (tierPricing && tierPricing[0]?.pricePerUnit) || Math.round(parsedPrice * 0.75),
        } as any;
      });

      const converted: ApiProduct = {
        id: ap.id,
        sku_prefix: ap.sku_prefix,
        name: matchingLocalProd?.title || ap.name,
        description: matchingLocalProd?.description || ap.description || '',
        hsn_code: ap.hsn_code || '73269099',
        is_active: matchingLocalProd ? Boolean(matchingLocalProd.isLive) : ap.is_active,
        is_archived: ap.is_archived,
        version: ap.version || 1,
        created_at: ap.created_at || new Date().toISOString(),
        updated_at: ap.updated_at || new Date().toISOString(),
        category,
        image: primaryImg,
        images: allImgs,
        brand: 'Apollo Engineering',
        badges: ['PRIME', 'ENTERPRISE_ASSURED'],
        highlights: [
          'Direct Factory Dispatch from Kathwada GIDC (382430)',
          '100% Guaranteed Industrial Grade Quality',
          'GST Statutory Invoice Included with 18% ITC Support'
        ],
        variants: syncedVariants,
        rawProduct: matchingLocalProd || ap.rawProduct
      };

      validBackendProducts.push(converted);
    }

    return validBackendProducts;
  }

  // If backend catalog has zero products, return empty array — NEVER substitute demo products
  return [];
}

let catalogBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    catalogBroadcastChannel = new BroadcastChannel('apollo_catalog_live_sync');
    catalogBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'CATALOG_SYNC' && Array.isArray(event.data?.products)) {
        const incomingProducts: Product[] = event.data.products;
        const currentSelected = useStore.getState().selectedProduct;
        const newSelected = currentSelected
          ? (incomingProducts.find(p => p.asin === currentSelected.asin) || null)
          : null;
        const newApiProds = syncCatalogProducts(incomingProducts, useStore.getState().apiCatalogProducts);
        useStore.setState({
          products: incomingProducts,
          selectedProduct: newSelected,
          apiCatalogProducts: newApiProds
        });
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel initialization skipped', e);
  }
}

export function broadcastCatalogUpdate(products: Product[]) {
  if (catalogBroadcastChannel) {
    try {
      catalogBroadcastChannel.postMessage({
        type: 'CATALOG_SYNC',
        products,
        timestamp: Date.now()
      });
    } catch {}
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'apollo_products' && event.newValue) {
      try {
        const incomingProducts: Product[] = JSON.parse(event.newValue);
        if (Array.isArray(incomingProducts)) {
          const currentSelected = useStore.getState().selectedProduct;
          const newSelected = currentSelected
            ? (incomingProducts.find(p => p.asin === currentSelected.asin) || null)
            : null;
          const newApiProds = syncCatalogProducts(incomingProducts, useStore.getState().apiCatalogProducts);
          useStore.setState({
            products: incomingProducts,
            selectedProduct: newSelected,
            apiCatalogProducts: newApiProds
          });
        }
      } catch {}
    }
  });
}

export function commitCatalogProductsUpdate(
  updated: Product[],
  currentSelected: Product | null,
  apiProducts: ApiProduct[],
  targetAsin?: string
) {
  saveStored('apollo_products', updated);
  broadcastCatalogUpdate(updated);
  const selectedProduct = currentSelected
    ? (updated.find(p => p.asin === (targetAsin || currentSelected.asin)) || null)
    : null;
  const apiCatalogProducts = syncCatalogProducts(updated, apiProducts);
  return { products: updated, selectedProduct, apiCatalogProducts };
}

export const DEFAULT_API_CATALOG_PRODUCTS: ApiProduct[] = [];

export const useStore = create<AppStore>((set, get) => ({
  appMode: 'B2C',
  setAppMode: (mode) => {
    saveStored('apollo_app_mode', mode);
    const currentCart = get().cart;
    const revaluedCart = recalculateCartVolumeTiers(currentCart, mode, get().products);
    saveSessionCart(revaluedCart);
    const updates: Partial<AppStore> = { appMode: mode, cart: revaluedCart };
    if (mode === 'B2B' && get().quotePaymentMethod === 'COD') {
      updates.quotePaymentMethod = 'PREPAID';
      updates.quoteStatus = 'QUOTE_REQUIRED';
      updates.currentQuote = null;
    }
    set(updates);
    get().showToast(`Switched storefront mode to ${mode === 'B2B' ? '🏢 B2B Wholesale' : '🛒 B2C Retail'}`, 'info');
  },
  b2cCodLimit: 10000,
  setB2cCodLimit: (limit: number) => {
    const valid = Math.max(0, Number(limit) || 0);
    saveStored('apollo_b2c_cod_limit', valid);
    set({ b2cCodLimit: valid });
    get().showToast(`B2C Cash on Delivery limit updated to ₹${valid.toLocaleString('en-IN')}`, 'success');
  },
  activeTab: 'store',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Session & Auth State (Gate 2C - Backend Authoritative) ──
  authStatus: 'GUEST' as AuthStatus,
  authDestination: null as AuthDestination,
  setAuthDestination: (dest) => set({ authDestination: dest }),
  customerProfile: null as CustomerProfile | null,
  setCustomerProfile: (profile) => set({ customerProfile: profile }),
  checkAuthSession: async () => {
    set({ authStatus: 'AUTH_CHECKING' });
    try {
      const sessionResult = await authApi.getSession().catch(() => null);
      if (sessionResult?.authenticated && sessionResult.user) {
        const u = sessionResult.user;
        const prof = sessionResult.customer_profile;
        const isPrivileged = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'INVENTORY_MANAGER', 'ORDER_OPERATIONS', 'FINANCE', 'SUPPORT', 'AUDITOR'].includes(u.role) || Boolean((u as any).is_superuser);
        const resolvedRole: UserRole = isPrivileged
          ? (u.role === 'OWNER' ? 'OWNER' : (u.role === 'SUPPORT' ? 'SUPPORT' : (u.role === 'AUDITOR' ? 'AUDITOR' : 'SUPER_ADMIN')))
          : ((prof?.account_type === 'B2B' || u.role.includes('B2B')) ? 'B2B_BUYER' : 'B2C_CUSTOMER');

        const isSynthetic = (email?: string | null) => {
          if (!email) return false;
          return email.includes('@phone.apolloengineering.co.in') || email.includes('@ape-store.com');
        };

        let rawPhone = prof?.phone || u.phone || '';
        if (!rawPhone && u.email) {
          const phoneMatch = u.email.match(/^(\+?91)?([6-9]\d{9})@/);
          if (phoneMatch) rawPhone = phoneMatch[2];
        }
        const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
        const resolvedPhone = cleanDigits ? `+91 ${cleanDigits}` : '';
        const resolvedEmail = isSynthetic(u.email)
          ? (prof?.email && !isSynthetic(prof.email) ? prof.email : '')
          : (prof?.email || u.email || '');

        let resolvedName = prof?.full_name || u.name || (u as any).full_name || '';
        if (resolvedName.startsWith('Customer ') || resolvedName.startsWith('Customer +91') || resolvedName.startsWith('Customer (') || resolvedName === 'Valued Customer') {
          resolvedName = '';
        }

        const mappedUser: UserProfile = {
          id: u.id,
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          role: resolvedRole,
          isPrime: isPrivileged || false,
          createdAt: u.created_at || new Date().toISOString()
        };

        // If customer has B2B organization details in PostgreSQL
        let orgUpdates: B2BOrganization = get().currentOrg;
        if (prof?.account_type === 'B2B' && (prof.company_name || prof.gstin)) {
          orgUpdates = {
            ...get().currentOrg,
            companyName: prof.company_name || '',
            gstin: prof.gstin || '',
            isGstVerified: Boolean(prof.gstin),
            stateCode: prof.gstin ? prof.gstin.slice(0, 2) : '24',
          };
          saveStored('apollo_org', orgUpdates);
        }

        // Fetch user's persistent addresses from backend
        try {
          const backendAddrs = await authApi.getCustomerAddresses();
          if (Array.isArray(backendAddrs) && backendAddrs.length > 0) {
            const mappedAddrs: DeliveryAddress[] = backendAddrs.map(ba => ({
              id: ba.id,
              userId: u.id,
              fullName: ba.full_name,
              phone: ba.phone,
              alternatePhone: ba.alternate_phone || undefined,
              addressType: ba.address_type === 'OFFICE' || ba.address_type === 'WAREHOUSE' ? 'OFFICE' : 'HOME',
              flatBuilding: ba.flat_building,
              streetArea: ba.street_area,
              city: ba.city,
              state: ba.state,
              stateCode: ba.state_code,
              pincode: ba.pincode,
              postOffice: {
                name: `${ba.city} S.O`,
                branchType: 'Sub Post Office',
                deliveryStatus: 'Delivery',
                circle: ba.state,
                district: ba.city,
                state: ba.state,
                facilityId: `PO-${ba.pincode}`,
              },
              landmark: ba.landmark || undefined,
              companyName: ba.company_name || undefined,
              gstin: ba.gstin || undefined,
              isDefault: ba.is_default
            }));
            const defaultAddr = mappedAddrs.find(a => a.isDefault) || mappedAddrs[0];
            set({
              addresses: mappedAddrs,
              activeAddress: defaultAddr,
              shippingAddress: defaultAddr,
              billingAddress: defaultAddr
            });
            saveStored('apollo_addresses', mappedAddrs);
          }
        } catch {}

        saveStored('apollo_current_user', mappedUser);
        set({
          authStatus: 'AUTHENTICATED',
          currentUser: mappedUser,
          customerProfile: prof || null,
          currentOrg: orgUpdates,
          appMode: (resolvedRole === 'SUPER_ADMIN' || resolvedRole === 'OWNER') ? 'ADMIN' : (resolvedRole === 'B2B_BUYER' ? 'B2B' : 'B2C')
        });
        return;
      }
    } catch {
      // Backend unreachable or network error
    }

    // Default to clean guest state - do NOT trust client-side localStorage flags for authentication
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('apollo_session_24h');
      localStorage.removeItem('apollo_current_user');
    }

    set({ 
      authStatus: 'GUEST', 
      currentUser: GUEST_USER, 
      customerProfile: null,
      activeAddress: null, 
      billingAddress: null, 
      shippingAddress: null 
    });
  },
  currentUser: initialCurrentUser,
  setCurrentUser: (user) => {
    saveStored('apollo_current_user', user);
    const updatedUsers = syncUserToList(user, get().allUsers);
    saveStored('apollo_users', updatedUsers);
    const newMode: AppMode = (user.role && user.role.includes('B2B')) ? 'B2B' : user.role === 'SUPER_ADMIN' ? 'ADMIN' : get().appMode;
    if (newMode === 'B2B') {
      saveStored('apollo_app_mode', 'B2B');
    }
    set({ 
      currentUser: user, 
      allUsers: updatedUsers, 
      appMode: newMode,
      authStatus: user.id && user.id !== 'usr_guest' ? 'AUTHENTICATED' : 'GUEST'
    });
  },
  updateUserProfile: (updates) => {
    const user = { ...get().currentUser, ...updates };
    saveStored('apollo_current_user', user);
    const updatedUsers = syncUserToList(user, get().allUsers);
    saveStored('apollo_users', updatedUsers);
    set({ currentUser: user, allUsers: updatedUsers });

    // Sync authoritative profile update to backend
    if (updates.name || updates.email) {
      authApi.updateProfile({
        ...(updates.name ? { full_name: updates.name } : {}),
        ...(updates.email && !updates.email.includes('@ape-store.com') ? { email: updates.email } : {})
      }).catch(() => {});
    }
    get().showToast('Profile details updated successfully', 'success');
  },
  currentOrg: (() => {
    const loaded = loadStored<B2BOrganization>('apollo_org', EMPTY_B2B_ORG);
    if (loaded && (loaded.gstin === '24AAACP9999P1Z2' || loaded.id === 'org_solar_epc' || loaded.companyName === 'Apollo Engineering & Solar EPC Partners')) {
      saveStored('apollo_org', EMPTY_B2B_ORG);
      return EMPTY_B2B_ORG;
    }
    return loaded || EMPTY_B2B_ORG;
  })(),
  updateOrgDetails: (orgUpdates) => set((state) => {
    const updatedOrg = { ...state.currentOrg, ...orgUpdates };
    saveStored('apollo_org', updatedOrg);

    const hasB2bCredentials = Boolean((updatedOrg.gstin && updatedOrg.gstin.trim()) || (updatedOrg.companyName && updatedOrg.companyName.trim()));
    if (hasB2bCredentials) {
      saveStored('apollo_app_mode', 'B2B');
      const updatedUser: UserProfile = {
        ...state.currentUser,
        role: 'B2B_BUYER'
      };
      saveStored('apollo_current_user', updatedUser);
      const updatedUsers = syncUserToList(updatedUser, state.allUsers);
      saveStored('apollo_users', updatedUsers);
      return {
        currentOrg: updatedOrg,
        appMode: 'B2B',
        currentUser: updatedUser,
        allUsers: updatedUsers
      };
    } else {
      // B2B credentials removed or cleared -> Revert to B2C retail customer mode
      saveStored('apollo_app_mode', 'B2C');
      const updatedUser: UserProfile = {
        ...state.currentUser,
        role: state.currentUser.role === 'B2B_BUYER' ? 'B2C_CUSTOMER' : state.currentUser.role
      };
      saveStored('apollo_current_user', updatedUser);
      const updatedUsers = syncUserToList(updatedUser, state.allUsers);
      saveStored('apollo_users', updatedUsers);
      return {
        currentOrg: updatedOrg,
        appMode: 'B2C',
        currentUser: updatedUser,
        allUsers: updatedUsers
      };
    }
  }),
  clearOrgDetails: () => {
    saveStored('apollo_org', EMPTY_B2B_ORG);
    saveStored('apollo_app_mode', 'B2C');
    const updatedUser: UserProfile = {
      ...get().currentUser,
      role: get().currentUser.role === 'B2B_BUYER' ? 'B2C_CUSTOMER' : get().currentUser.role
    };
    saveStored('apollo_current_user', updatedUser);
    set({
      currentOrg: EMPTY_B2B_ORG,
      appMode: 'B2C',
      currentUser: updatedUser
    });
    get().showToast('B2B organization details removed. Switched to Retail (B2C).', 'info');
  },
  allUsers: initialUsers,
  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('apollo_session_24h');
      localStorage.removeItem('apollo_current_user');
      localStorage.removeItem('apollo_org');
      localStorage.setItem('apollo_app_mode', 'B2C');
      // DO NOT delete apollo_users or apollo_addresses! Customer profile and address book are retained!
    }
    set({ 
      authStatus: 'GUEST',
      currentUser: GUEST_USER, 
      customerProfile: null,
      currentOrg: EMPTY_B2B_ORG,
      activeAddress: null, 
      billingAddress: null, 
      shippingAddress: null, 
      orders: [],
      appMode: 'B2C', 
      isAccountModalOpen: false, 
      isAuthModalOpen: false,
      isCheckoutOpen: false,
      activeTab: 'store'
    });
    get().showToast('Logged out successfully. Session terminated.', 'info');
  },
  logoutAll: async () => {
    try {
      await authApi.logoutAll();
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('apollo_session_24h');
      localStorage.removeItem('apollo_current_user');
      localStorage.removeItem('apollo_org');
      localStorage.setItem('apollo_app_mode', 'B2C');
    }
    set({ 
      authStatus: 'GUEST',
      currentUser: GUEST_USER, 
      customerProfile: null,
      currentOrg: EMPTY_B2B_ORG,
      activeAddress: null, 
      billingAddress: null, 
      shippingAddress: null, 
      orders: [],
      appMode: 'B2C', 
      isAccountModalOpen: false, 
      isAuthModalOpen: false,
      isCheckoutOpen: false,
      activeTab: 'store'
    });
    get().showToast('Logged out of all sessions across all devices.', 'info');
  },

  addresses: initialAddresses,
  activeAddress: initialActiveAddress,
  billingAddress: initialBillingAddress,
  shippingAddress: initialShippingAddress,
  isShippingSameAsBilling: true,
  setIsShippingSameAsBilling: (same) => {
    saveStored('apollo_same_as_billing', same);
    if (same) {
      const billing = get().billingAddress;
      if (billing) {
        const syncedShipping = syncBillingToShipping(
          billing,
          get().shippingAddress?.id,
          get().currentUser.role.includes('B2B')
        );
        persistShippingAddress(syncedShipping, get().addresses);
        set({ isShippingSameAsBilling: true, shippingAddress: syncedShipping, activeAddress: syncedShipping });
        get().showToast('Shipping address synced with Billing address', 'success');
        return;
      }
    }
    set({ isShippingSameAsBilling: same });
  },
  setBillingAddress: (addr) => {
    saveStored('apollo_billing_address', addr);
    if (get().isShippingSameAsBilling) {
      const syncedShipping = syncBillingToShipping(
        addr,
        get().shippingAddress?.id,
        get().currentUser.role.includes('B2B')
      );
      persistShippingAddress(syncedShipping, get().addresses);
      set({ billingAddress: addr, shippingAddress: syncedShipping, activeAddress: syncedShipping });
    } else {
      set({ billingAddress: addr });
    }
    get().showToast(`Billing address updated: ${addr.postOffice.name} (${addr.pincode})`, 'success');
  },
  setShippingAddress: (addr) => {
    persistShippingAddress(addr, get().addresses);
    set({ shippingAddress: addr, activeAddress: addr });
    get().showToast(`Shipping address updated: ${addr.postOffice.name} (${addr.pincode})`, 'success');
  },
  isAccountModalOpen: false,
  setIsAccountModalOpen: (open) => set({ isAccountModalOpen: open }),
  addAddress: (addrData) => {
    const newAddr: DeliveryAddress = {
      ...addrData,
      id: ('id' in addrData && typeof (addrData as { id?: string }).id === 'string' && (addrData as { id?: string }).id) 
        ? (addrData as { id: string }).id 
        : `addr_${Date.now()}`
    };
    const updated = [newAddr, ...get().addresses.filter(a => a.id !== newAddr.id)];
    saveStored('apollo_addresses', updated);
    saveStored('apollo_shipping_address', newAddr);
    set({
      addresses: updated,
      activeAddress: newAddr,
      shippingAddress: newAddr
    });
    get().showToast(`Address in ${newAddr.postOffice.name} saved successfully`, 'success');
  },
  updateAddress: (addrId, updates) => {
    const currentList = get().addresses;
    const updated = currentList.map(a => a.id === addrId ? { ...a, ...updates } : a);
    saveStored('apollo_addresses', updated);

    const updatedAddr = updated.find(a => a.id === addrId);
    let nextActive = get().activeAddress?.id === addrId && updatedAddr ? updatedAddr : get().activeAddress;
    let nextShipping = get().shippingAddress?.id === addrId && updatedAddr ? updatedAddr : get().shippingAddress;
    let nextBilling = get().billingAddress?.id === addrId && updatedAddr ? updatedAddr : get().billingAddress;

    if (get().activeAddress?.id === addrId && updatedAddr) {
      saveStored('apollo_shipping_address', updatedAddr);
    }
    if (get().billingAddress?.id === addrId && updatedAddr) {
      saveStored('apollo_billing_address', updatedAddr);
    }

    set({
      addresses: updated,
      activeAddress: nextActive,
      shippingAddress: nextShipping,
      billingAddress: nextBilling
    });
    get().showToast('Address details updated successfully', 'success');
  },
  deleteAddress: (addrId) => {
    const currentList = get().addresses;
    const updated = currentList.filter(a => a.id !== addrId);
    saveStored('apollo_addresses', updated);
    
    let nextActive = get().activeAddress?.id === addrId ? (updated[0] || null) : get().activeAddress;
    let nextShipping = get().shippingAddress?.id === addrId ? (updated[0] || null) : get().shippingAddress;
    let nextBilling = get().billingAddress?.id === addrId ? (updated[0] || null) : get().billingAddress;

    saveStored('apollo_shipping_address', nextActive);
    saveStored('apollo_billing_address', nextBilling);

    set({
      addresses: updated,
      activeAddress: nextActive,
      shippingAddress: nextShipping,
      billingAddress: nextBilling
    });
    get().showToast('Address removed successfully', 'info');
  },
  setActiveAddress: (addrId) => {
    const state = get();
    const allKnown = [
      ...(state.billingAddress ? [state.billingAddress] : []),
      ...(state.shippingAddress ? [state.shippingAddress] : []),
      ...state.addresses,
    ];
    const found = allKnown.find((a) => a.id === addrId);
    if (found) {
      saveStored('apollo_shipping_address', found);
      set({ 
        activeAddress: found, 
        shippingAddress: found,
        destinationPincode: found.pincode 
      });
      get().showToast(`Delivery location set to ${found.postOffice?.name || found.city} (${found.pincode})`, 'info');
      get().fetchAuthoritativeQuote();
    }
  },

  products: initialProducts,
  selectedProduct: null,
  setSelectedProduct: (p) => set({ selectedProduct: p }),
selectProductVariant: (asin, sku) => {
    set((state) => ({
      products: state.products.map((p) => {
        if (p.asin === asin) {
          return { ...p, selectedVariantSku: sku };
        }
        return p;
      }),
      selectedProduct: state.selectedProduct && state.selectedProduct.asin === asin
        ? { ...state.selectedProduct, selectedVariantSku: sku }
        : state.selectedProduct
    }));
  },
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  selectedCategory: 'ALL',
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  updateProductStock: (asin, sku, newOrDeltaQty) => {
    let oldInv = 0;
    let newInv = 0;
    let prodTitle = '';
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        prodTitle = p.title;
        return {
          ...p,
          variants: p.variants.map((v) => {
            if (v.sku === sku) {
              oldInv = v.inventory || 0;
              newInv = Math.max(0, newOrDeltaQty);
              return { ...v, inventory: newInv };
            }
            return v;
          })
        };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().addAuditLog({
      userEmail: 'admin@apolloengineering.co.in',
      actionType: 'STOCK_UPDATE',
      entityId: `${asin}:${sku}`,
      entityTitle: prodTitle || asin,
      oldValue: `${oldInv} pcs`,
      newValue: `${newInv} pcs`,
      notes: `Fulfillable inventory updated to ${newInv} units`
    });

    // Background sync to backend inventory ledger
    const delta = newInv - oldInv;
    if (delta !== 0) {
      inventoryApi.adjustStock({
        sku,
        quantity_delta: delta,
        reason: 'Admin Stock Adjustment',
        idempotency_key: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      }).catch(() => {});
    }
  },
  addNewProduct: async (newProd) => {
    const primaryV = newProd.variants?.[0];
    const rawPrefix = primaryV?.sku?.split('-').slice(0, 2).join('-') || newProd.asin.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanPrefix = rawPrefix.slice(0, 48).toUpperCase();

    // Clean variants matching backend ProductVariantCreate schema (extra="forbid")
    const backendVariants = (newProd.variants || []).map((v, idx) => {
      const isExact = !!(v.attributes?.size && v.attributes.size.includes('mm'));
      const thickness = isExact ? parseFloat(v.attributes?.size || '') || null : null;
      return {
        sku: (v.sku || `${cleanPrefix}-${idx + 1}`).slice(0, 50).toUpperCase(),
        fit_mode: isExact && thickness ? 'EXACT' : 'NOT_APPLICABLE',
        frame_thickness_mm: isExact && thickness ? thickness : null,
        display_label: (v.title || `${newProd.title} (${v.sku})`).slice(0, 100),
        frame_thickness: v.attributes?.size || 'Standard',
        pack_size: 1,
        initial_stock: v.inventory ?? 0,
      };
    });

    try {
      const created = await catalogApi.createProduct({
        sku_prefix: cleanPrefix,
        name: newProd.title,
        description: newProd.description || '',
        hsn_code: primaryV?.hsnCode || '73269099',
        variants: backendVariants as any,
        is_active: newProd.isLive !== false
      });

      if (created && created.id) {
        const b2cPrice = primaryV?.b2cPrice ?? 0;
        const b2bTiers = primaryV?.b2bTierPricing && primaryV.b2bTierPricing.length > 0
          ? primaryV.b2bTierPricing
          : [{ minQty: 50, pricePerUnit: Math.round(b2cPrice * 0.75) }];

        await catalogApi.updateProduct(created.id, {
          name: newProd.title,
          description: newProd.description || '',
          hsn_code: primaryV?.hsnCode || '73269099',
          is_active: newProd.isLive !== false,
          version: created.version || 1,
          b2c_price: b2cPrice,
          b2b_tier_pricing: b2bTiers,
          inventory_stock: primaryV?.inventory ?? 0
        } as any);

        get().showToast(`Product ${newProd.title} created successfully in authoritative catalog`, 'success');
      }
      await get().fetchApiCatalog();
    } catch (err: any) {
      console.error('Backend product creation error:', err);
      get().showToast(err?.message || 'Failed to create product in backend catalog.', 'error');
    }
  },
  updateProduct: async (asin, updates) => {
    // 1. Optimistically update local products & apiCatalogProducts immediately
    const updated = get().products.map((p) => (p.asin === asin ? { ...p, ...updates } : p));
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);

    // 2. Identify backend catalog product and sync to authoritative FastAPI backend
    const matchingBackend = get().apiCatalogProducts.find(p =>
      p.id === asin ||
      p.sku_prefix === asin ||
      (p.rawProduct && p.rawProduct.asin === asin) ||
      (p.variants && p.variants.some(v => v.sku === asin || v.sku.startsWith(asin)))
    );

    if (matchingBackend && matchingBackend.id) {
      const primaryUpdatedV = updates.variants?.[0];
      const payload: Record<string, any> = {
        name: updates.title || matchingBackend.name,
        description: updates.description !== undefined ? updates.description : matchingBackend.description,
        is_active: updates.isLive !== undefined ? updates.isLive : matchingBackend.is_active,
        version: matchingBackend.version || 1,
      };

      if (primaryUpdatedV?.hsnCode) payload.hsn_code = primaryUpdatedV.hsnCode;
      if (primaryUpdatedV?.b2cPrice !== undefined) payload.b2c_price = primaryUpdatedV.b2cPrice;
      if (primaryUpdatedV?.b2bTierPricing) payload.b2b_tier_pricing = primaryUpdatedV.b2bTierPricing;
      if (primaryUpdatedV?.inventory !== undefined) payload.inventory_stock = primaryUpdatedV.inventory;

      try {
        await catalogApi.updateProduct(matchingBackend.id, payload as any);
        get().showToast(`Product ${updates.title || matchingBackend.name} updated in backend catalog.`, 'success');
        await get().fetchApiCatalog();
      } catch (err: any) {
        console.error('Backend product update error:', err);
      }
    }
  },
  deleteProduct: async (asin) => {
    const matchingBackend = get().apiCatalogProducts.find(p =>
      p.id === asin ||
      p.sku_prefix === asin ||
      (p.rawProduct && p.rawProduct.asin === asin) ||
      (p.variants && p.variants.some(v => v.sku === asin || v.sku.startsWith(asin)))
    );

    // 1. Optimistically delete from both products and apiCatalogProducts
    const filteredProducts = get().products.filter(p => p.asin !== asin);
    const filteredApi = get().apiCatalogProducts.filter(p => p.id !== asin && p.rawProduct?.asin !== asin && p.sku_prefix !== asin);
    const currSelected = get().selectedProduct;
    const newSelected = (currSelected && (currSelected.asin === asin || (currSelected as any).id === asin)) ? null : currSelected;

    set({
      products: filteredProducts,
      apiCatalogProducts: filteredApi,
      selectedProduct: newSelected
    });
    saveStored('apollo_products', filteredProducts);
    broadcastCatalogUpdate(filteredProducts);

    // 2. Archive on authoritative FastAPI backend
    if (matchingBackend && matchingBackend.id) {
      try {
        await catalogApi.archiveProduct(matchingBackend.id);
        get().showToast(`Product ${matchingBackend.name} archived successfully.`, 'success');
        await get().fetchApiCatalog();
      } catch (err: any) {
        console.error('Backend product archive error:', err);
      }
    }
  },
  updateVariantDetails: (asin, sku, updates) => {
    const validUpdateKeys = new Set([
      'title', 'attributes', 'b2cPrice', 'mrp', 'b2bTierPricing',
      'inventory', 'barcode', 'images', 'videoUrl', 'weightGrams',
      'dimensionsCm', 'hsnCode', 'gstRatePercent', 'b2bMoq'
    ]);
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => validUpdateKeys.has(key))
    );
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        return {
          ...p,
          variants: p.variants.map((v) => (v.sku === sku ? { ...v, ...filteredUpdates } : v))
        };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().showToast(`Variant ${sku} updated successfully`, 'success');
  },
  addNewVariantToProduct: (asin, newVariant) => {
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        return {
          ...p,
          variants: [...p.variants, newVariant]
        };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().showToast(`New variant SKU ${newVariant.sku} added to ASIN ${asin}`, 'success');
  },
  deleteVariantFromProduct: (asin, sku) => {
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        const remainingVariants = p.variants.filter((v) => v.sku !== sku);
        const newSelectedSku = p.selectedVariantSku === sku 
          ? (remainingVariants[0]?.sku || '') 
          : p.selectedVariantSku;
        return {
          ...p,
          variants: remainingVariants,
          selectedVariantSku: newSelectedSku
        };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().showToast(`Variant ${sku} removed from product`, 'info');
  },
  combineProductsIntoParentListing: (asins, parentTitle) => {
    const currentProducts = get().products;
    const matched = asins.map((id) => currentProducts.find((p) => p.asin === id)).filter(Boolean) as Product[];
    if (matched.length === 0) return null;

    const combinedVariants: ProductVariant[] = [];
    matched.forEach((p, pIdx) => {
      p.variants.forEach((v, vIdx) => {
        const sizeOrName = v.attributes?.size || v.title || `Option ${combinedVariants.length + 1}`;
        combinedVariants.push({
          ...v,
          sku: v.sku || `APE-VAR-${pIdx + 1}-${vIdx + 1}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          title: v.title || `${p.title} - ${sizeOrName}`,
          attributes: {
            ...v.attributes,
            size: v.attributes?.size || sizeOrName
          }
        });
      });
    });

    const baseProduct = matched[0];
    const newAsin = `AP-PAR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const title = parentTitle || `Apollo Combined Variation Family - ${baseProduct.title.replace(/\s*\(.*?\)\s*/g, '')}`;

    const sellerListings: Record<string, SellerListing[]> = {};
    combinedVariants.forEach((v) => {
      sellerListings[v.sku] = [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering Direct Hub (382430)',
          rating: 5.0,
          ratingCount: 25,
          fulfillmentType: 'FBF',
          price: v.b2cPrice || 20,
          shippingFee: 0,
          deliveryDays: 1,
          stock: v.inventory || 500,
          isWinningBuyBox: true,
          buyBoxScore: 100
        }
      ];
    });

    const combinedProduct: Product = {
      ...baseProduct,
      asin: newAsin,
      title,
      variants: combinedVariants,
      selectedVariantSku: combinedVariants[0]?.sku || 'SKU-01',
      sellerListings,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    const updated = [combinedProduct, ...currentProducts];
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      newAsin
    );
    set(catalogState);
    get().showToast(`Combined ${matched.length} items into 1 parent listing (${combinedVariants.length} variations)!`, 'success');
    return combinedProduct;
  },

  // ── Product Listing & Marketplace ──────────────────────────────
  listingMode: 'B2C' as const,
  setListingMode: (mode) => set({ listingMode: mode }),
  
  publishProduct: (product) => {
    const asin = `AP-${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newProduct: Product = {
      ...product,
      asin,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    const updated = [newProduct, ...get().products];
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().showToast(`Product published with ASIN ${asin}`, 'success');
    return asin;
  },
  
  updateProductListing: (asin, updates) => {
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        return { ...p, ...updates, lastUpdated: new Date().toISOString() };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set(catalogState);
    get().showToast(`Product ${asin} updated successfully`, 'success');
  },
  
  deleteProductListing: (asin) => {
    get().deleteProduct(asin);
  },
  
  updateVariantPricing: (asin, sku, price, quantity) => {
    const qty = quantity || 1;
    const updated = get().products.map((p) => {
      if (p.asin === asin) {
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.sku === sku
              ? { ...v, b2cPrice: price, mrp: Math.round(price * 1.5 * 100) / 100 }
              : v
          ),
          lastUpdated: new Date().toISOString()
        };
      }
      return p;
    });
    const catalogState = commitCatalogProductsUpdate(
      updated,
      get().selectedProduct,
      get().apiCatalogProducts,
      asin
    );
    set({ ...catalogState, listingMode: 'B2B' });
    get().showToast(`Variant ${sku} pricing updated to ₹${price} (qty: ${qty})`, 'success');
  },
  
  getWinningSellerForASIN: (asin) => {
    const product = get().products.find((p) => p.asin === asin);
    if (!product?.sellerListings) return null;
    
    let bestScore = -1;
    let bestListing: SellerListing | null = null;
    
    for (const [sku, listings] of Object.entries(product.sellerListings)) {
      for (const listing of listings) {
        if (listing.buyBoxScore > bestScore) {
          bestScore = listing.buyBoxScore;
          bestListing = listing;
        }
      }
    }
    
    return bestListing || null;
  },
  
updateBuyBoxScore: (asin: string, sellerId: string, price: number, deliveryDays: number, rating: number, fulfillment: 'FBF' | 'FBM') => {
    set((state) => {
      const product = state.products.find((p) => p.asin === asin);
      if (!product?.sellerListings) return state;
      
      const shippingScoreMap: Record<string, number> = {
        'FAST': 1.0,
        'MODERATE': 0.8, 
        'SLOW': 0.5
      };
      
      const shippingSpeed = state.activeAddress?.pincode 
        ? (deliveryDays <= 1 ? 'FAST' : deliveryDays <= 3 ? 'MODERATE' : 'SLOW')
        : 'MODERATE';
      
      const priceScore = Math.max(0, 1 - (price - 100) / 5000);
      const ratingScore = rating / 5.0;
      const fulfillmentScore = fulfillment === 'FBF' ? 1.0 : 0.9;
      const shippingScore = shippingScoreMap[shippingSpeed] || 0.8;
      
      const weights = { price: 0.40, shipping: 0.25, rating: 0.20, fulfillment: 0.15 };
      const buyBoxScore = Math.round(
        (weights.price * priceScore) + 
        (weights.shipping * shippingScore) + 
        (weights.rating * ratingScore) + 
        (weights.fulfillment * fulfillmentScore)
      * 100) / 100;
      
      const updatedListings: Record<string, SellerListing[]> = {};
      
      for (const [sku, listings] of Object.entries(product.sellerListings)) {
        const updated = listings.map((listing) => {
          if (listing.sellerId === sellerId) {
            return { ...listing, buyBoxScore };
          }
          return listing;
        });
        updatedListings[sku] = updated;
      }
      
      return {
        products: state.products.map((p) =>
          p.asin === asin 
            ? { ...p, sellerListings: updatedListings, lastUpdated: new Date().toISOString() }
            : p
        )
      };
    });
    get().showToast(`Buy Box score calculated for seller ${sellerId}`, 'info');
  },

  // Cart logic with B2B wholesale pricing rules
  cart: [],
  addToCart: (itemData, qty = 1) => {
    const { cart, appMode } = get();
    const existingIndex = cart.findIndex((i) => 
      (itemData.variantId && i.variantId && i.variantId === itemData.variantId) ||
      i.sku === itemData.sku
    );
    let updatedCart = [...cart];
    
    let finalUnitPrice = itemData.unitPrice;
    let isB2B = appMode === 'B2B';
    
    let effectiveAddQty = qty;
    const existingQty = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (isB2B) {
      // Find matching product in local products OR in apiCatalogProducts
      const product = get().products.find(
        (p) => p.asin === itemData.asin || 
               p.asin === itemData.parentAsin || 
               (p as any).id === itemData.productId ||
               p.variants?.some((v) => v.sku === itemData.sku)
      );

      const apiProduct = get().apiCatalogProducts.find(
        (ap) => ap.id === itemData.asin || 
                ap.id === itemData.productId || 
                ap.id === itemData.parentAsin ||
                ap.sku_prefix === itemData.sku ||
                ap.variants?.some((v) => v.sku === itemData.sku)
      );

      const productVariant = product?.variants?.find((v) => v.sku === itemData.sku);
      const apiVariant = apiProduct?.variants?.find((v) => v.sku === itemData.sku);

      // Resolve available inventory (support both inventory and available_stock fields)
      const availableStock = productVariant?.inventory ?? (apiVariant as any)?.available_stock ?? 50000;

      const checkTotalQty = existingQty + effectiveAddQty;
      if (availableStock < checkTotalQty) {
        get().showToast(`Only ${availableStock} units available for SKU ${itemData.sku}`, 'error');
        return;
      }

      // Check B2B tier pricing
      const tierPricing = productVariant?.b2bTierPricing || (apiVariant as any)?.b2bTierPricing;
      if (tierPricing && Array.isArray(tierPricing) && tierPricing.length > 0) {
        const tier = tierPricing.find((t: any) => checkTotalQty >= t.minQty && (!t.maxQty || checkTotalQty <= t.maxQty)) ||
                     tierPricing.find((t: any) => checkTotalQty >= t.minQty);
        if (tier && typeof tier.pricePerUnit === 'number') {
          finalUnitPrice = tier.pricePerUnit;
        } else if (tierPricing[0]?.pricePerUnit) {
          finalUnitPrice = tierPricing[0].pricePerUnit;
        }
      }
    }

    const newTotalQty = existingQty + effectiveAddQty;

    if (existingIndex > -1) {
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        ...itemData,
        quantity: newTotalQty,
        unitPrice: finalUnitPrice,
        isB2BPricingApplied: isB2B
      };
    } else {
      updatedCart.push({
        ...itemData,
        quantity: effectiveAddQty,
        unitPrice: finalUnitPrice,
        isB2BPricingApplied: isB2B
      });
    }

    updatedCart = recalculateCartVolumeTiers(updatedCart, isB2B ? 'B2B' : 'B2C', get().products);

    saveSessionCart(updatedCart);
    set({ 
      cart: updatedCart, 
      quoteStatus: 'QUOTE_REQUIRED',
      currentQuote: null,
      quoteError: null
    });
    // Note: Do not auto-open cart drawer on add to cart, keep customer in shop flow

    const currentItem = updatedCart.find(i => i.sku === itemData.sku);
    const activeRate = currentItem?.unitPrice || finalUnitPrice;
    const sameProductItems = updatedCart.filter(i => (itemData.parentAsin && i.parentAsin === itemData.parentAsin) || (itemData.sku && i.sku.startsWith(itemData.sku.slice(0, 6))));
    const totalFamilyQty = sameProductItems.reduce((acc, i) => acc + i.quantity, 0);

    if (isB2B) {
      get().showToast(`Added ${effectiveAddQty}x ${itemData.variantTitle} to cart (Wholesale Tier: ₹${activeRate}/pc across ${totalFamilyQty} pcs)`, 'success');
    } else {
      get().showToast(`Added ${effectiveAddQty}x ${itemData.variantTitle} to cart (₹${activeRate}/pc)`, 'success');
    }
  },
  updateCartQuantity: (sku, qty) => {
    if (qty <= 0) {
      get().removeFromCart(sku);
      return;
    }
    const updatedCart = recalculateCartVolumeTiers(
      get().cart.map((item) => item.sku === sku ? { ...item, quantity: qty } : item),
      get().appMode,
      get().products
    );

    saveSessionCart(updatedCart);
    set({
      cart: updatedCart,
      quoteStatus: 'QUOTE_REQUIRED',
      currentQuote: null,
      quoteError: null
    });
    get().fetchAuthoritativeQuote();
  },
  removeFromCart: (sku) => {
    const remaining = recalculateCartVolumeTiers(
      get().cart.filter((item) => item.sku !== sku),
      get().appMode,
      get().products
    );

    saveSessionCart(remaining);
    set({
      cart: remaining,
      quoteStatus: remaining.length === 0 ? 'EMPTY_CART' : 'QUOTE_REQUIRED',
      currentQuote: null,
      quoteError: null
    });
    get().showToast('Item removed from cart', 'info');
    if (remaining.length > 0) {
      get().fetchAuthoritativeQuote();
    }
  },
  clearCart: () => {
    saveSessionCart([]);
    set({ cart: [], currentQuote: null, quoteStatus: 'EMPTY_CART', quoteError: null });
  },
  isCartDrawerOpen: false,
  setIsCartDrawerOpen: (open) => {
    set({ isCartDrawerOpen: open });
    if (open) {
      const { cart } = get();
      if (cart.length === 0) {
        set({ quoteStatus: 'EMPTY_CART', currentQuote: null });
      }
    }
  },

  // ── Authoritative Quote Engine (Gate 2C) ─────────────────────
  currentQuote: null,
  quoteStatus: 'EMPTY_CART' as QuoteStatus,
  quoteError: null,
  quotePaymentMethod: 'PREPAID',
  setQuotePaymentMethod: (method) => {
    const effectiveMethod = (get().appMode === 'B2B' && method === 'COD') ? 'PREPAID' : method;
    const { currentQuote, quoteStatus } = get();
    // If a valid quote snapshot already exists, preserve QUOTE_VALID so payment toggle is instantaneous with 0ms delay and no loading spinner
    const nextStatus = (currentQuote && quoteStatus === 'QUOTE_VALID') ? 'QUOTE_VALID' : 'QUOTE_REQUIRED';
    set({ quotePaymentMethod: effectiveMethod, quoteStatus: nextStatus });
  },
  destinationPincode: '382430',
  setDestinationPincode: (pincode) => {
    set({ destinationPincode: pincode, quoteStatus: 'QUOTE_REQUIRED' });
  },
  fetchAuthoritativeQuote: async () => {
    const { cart, destinationPincode, quotePaymentMethod, appMode } = get();
    const effectivePaymentMethod = (appMode === 'B2B' && quotePaymentMethod === 'COD') ? 'PREPAID' : quotePaymentMethod;
    saveSessionCart(cart);
    if (cart.length === 0) {
      set({ currentQuote: null, quoteStatus: 'EMPTY_CART', quoteError: null });
      return null;
    }
    const cleanPin = destinationPincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      set({ quoteStatus: 'QUOTE_ERROR', quoteError: 'Valid 6-digit Indian PIN code required.' });
      return null;
    }

    set({ quoteStatus: 'QUOTE_LOADING', quoteError: null });
    try {
      const isUuid = (val?: string): boolean =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

      const items = cart.map((i) => ({
        ...(isUuid(i.variantId) ? { variant_id: i.variantId } : {}),
        ...(i.sku ? { sku: i.sku } : {}),
        quantity: i.quantity,
      }));

      const quote = await quoteApi.requestQuote({
        items,
        destination_pincode: cleanPin,
        channel: get().appMode === 'B2B' ? 'B2B' : 'B2C',
        payment_method: effectivePaymentMethod,
      });

      set({ currentQuote: quote, quoteStatus: 'QUOTE_VALID', quoteError: null });
      return quote;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to calculate total quote. Backend quote service unreachable.';
      set({ quoteStatus: 'QUOTE_ERROR', quoteError: errorMsg, currentQuote: null });
      return null;
    }
  },

  // ── Database-Driven Catalog API (Gate 2C) ─────────────────────
  isHydrated: false,
  apiCatalogProducts: [],
  apiCatalogLoading: false,
  apiCatalogError: null,
  fetchApiCatalog: async () => {
    set({ apiCatalogLoading: true, apiCatalogError: null });
    try {
      const prods = await catalogApi.getCatalog();
      if (prods && prods.length > 0) {
        const synced = syncCatalogProducts([], prods);
        const frontendProducts = synced.map((ap) => mapApiProductToProduct(ap));
        set({
          apiCatalogProducts: synced,
          products: frontendProducts,
          apiCatalogLoading: false,
          apiCatalogError: null,
        });
        saveStored('apollo_products', frontendProducts);
        broadcastCatalogUpdate(frontendProducts);
      } else {
        // Backend returned empty catalog — show clean empty state, NEVER demo catalog
        set({ 
          apiCatalogProducts: [], 
          products: [], 
          apiCatalogLoading: false, 
          apiCatalogError: null 
        });
        saveStored('apollo_products', []);
        broadcastCatalogUpdate([]);
      }
    } catch {
      // Backend unreachable — show explicit error state, NEVER fallback to mock products
      set({ 
        apiCatalogLoading: false, 
        apiCatalogError: 'Backend catalog service unavailable. Please check your network connection and retry.' 
      });
    }
  },

  // ── Multi-Lingual Architecture ───────────────────────────────
  selectedLanguage: 'en',
  setSelectedLanguage: (lang) => {
    saveStored('apollo_lang', lang);
    set({ selectedLanguage: lang });
  },

  getSplitShipments: () => {
    const { cart, activeAddress, appMode, destinationPincode } = get();
    if (cart.length === 0) return [];

    const groupedBySeller: Record<string, CartItem[]> = {};
    cart.forEach((item) => {
      if (!groupedBySeller[item.sellerId]) {
        groupedBySeller[item.sellerId] = [];
      }
      groupedBySeller[item.sellerId].push(item);
    });

    const isB2B = appMode === 'B2B';
    const deliveryDays = isB2B ? 3 : 2;
    const effectivePin = activeAddress?.pincode || destinationPincode || '382430';

    return Object.entries(groupedBySeller).map(([sellerId, items], idx) => {
      const seller = { name: items[0]?.sellerName || 'Apollo Engineering', fulfillment: items[0]?.fulfillmentType || 'FBF' };
      const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
      const isIntraState = effectivePin.startsWith(ORIGIN_STATE_CODE);
      const taxAmount = calculateInclusiveGst(subtotal, DEFAULT_GST_RATE_PERCENT, isIntraState).totalTax;
      const totalWeightGrams = items.reduce((sum, i) => sum + (i.weightGrams * i.quantity), 0);
      const tariff = calculateSpeedPostTariff(effectivePin, totalWeightGrams);

      const estDate = new Date();
      estDate.setDate(estDate.getDate() + (isB2B ? 3 : tariff.deliveryDaysEstimate));
      const formattedDate = estDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const dateString = isB2B
        ? `3 to 4 Working Days Industrial Freight (${formattedDate})`
        : `APE Express Delivery (${formattedDate})`;

      return {
        packageId: `pkg_${idx + 1}_${Date.now()}`,
        sellerId,
        sellerName: seller.name,
        fulfillmentType: seller.fulfillment,
        items,
        subtotal,
        taxAmount,
        shippingFee: tariff.totalPostage,
        estimatedDeliveryDate: dateString,
        speedPostService: isB2B
          ? 'SPEED_POST_NATIONAL'
          : tariff.distanceZone === 'LOCAL'
          ? 'SPEED_POST_LOCAL'
          : tariff.distanceZone === 'METRO'
          ? 'SPEED_POST_METRO'
          : 'SPEED_POST_NATIONAL'
      };
    });
  },

  orders: initialOrders,
  createOrder: (paymentMethod, gstinClaim, paymentMeta) => {
    const { cart, activeAddress, currentUser, appMode, currentOrg, getSplitShipments, destinationPincode, currentQuote } = get();
    const splitShipments = getSplitShipments();
    const orderNum = paymentMeta?.order_number || paymentMeta?.orderNumber || `ORD-AE-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const invNum = paymentMeta?.invoice_number || paymentMeta?.invoiceNumber || `INV-AE-2026-08-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderId = paymentMeta?.id ? String(paymentMeta.id) : `ord_${Date.now()}`;

    let itemsTotal = 0;
    let taxableValue = 0;
    let totalTax = 0;

    if (currentQuote && currentQuote.items && currentQuote.items.length > 0) {
      itemsTotal = Number(currentQuote.total_product_gross || 0);
      taxableValue = Number(currentQuote.subtotal_taxable || 0);
      totalTax = Number(currentQuote.total_product_gst || 0);
    } else {
      cart.forEach((i) => {
        const lineGross = i.unitPrice * i.quantity;
        const r = (i.gstRate || 18) / 100;
        const lineTaxable = Math.round((lineGross / (1 + r)) * 100) / 100;
        const lineGst = Math.round((lineGross - lineTaxable) * 100) / 100;

        itemsTotal += lineGross;
        taxableValue += lineTaxable;
        totalTax += lineGst;
      });

      itemsTotal = Math.round(itemsTotal * 100) / 100;
      taxableValue = Math.round(taxableValue * 100) / 100;
      totalTax = Math.round(totalTax * 100) / 100;
    }
    
    const isIntrastate = (activeAddress?.stateCode || '24') === '24';
    const cgstAmount = isIntrastate ? Math.round((totalTax / 2) * 100) / 100 : 0;
    const sgstAmount = isIntrastate ? Math.round((totalTax - cgstAmount) * 100) / 100 : 0;
    const igstAmount = !isIntrastate ? totalTax : 0;

    let shippingTotal = splitShipments.reduce((sum, p) => sum + p.shippingFee, 0);
    if (currentQuote?.shipping_total) {
      shippingTotal = Number(currentQuote.shipping_total);
    }

    const prepaidTotal = itemsTotal + shippingTotal;
    
    // Strict AGENTS.md Rule 3C: COD adds 2.5% surcharge to the complete prepaid total
    let codFee = paymentMethod === 'COD' ? Math.round((prepaidTotal * 0.025) * 100) / 100 : 0;
    let grandTotal = prepaidTotal;
    if (paymentMethod === 'COD') {
      if (currentQuote?.cod_payable_total || currentQuote?.cod_total) {
        codFee = Number(currentQuote.cod_charge_raw || currentQuote.cod_surcharge || codFee);
        grandTotal = Number(currentQuote.cod_payable_total || currentQuote.cod_total);
      } else {
        const codRawTotal = prepaidTotal + codFee;
        const roundingMultiple = 5;
        grandTotal = Math.ceil(codRawTotal / roundingMultiple) * roundingMultiple;
      }
    } else {
      if (currentQuote?.prepaid_total) {
        grandTotal = Number(currentQuote.prepaid_total);
      }
    }
    if (paymentMeta?.total_payable) {
      grandTotal = Number(paymentMeta.total_payable);
    }

    const effectiveAddress: DeliveryAddress = activeAddress || {
      id: 'addr_checkout_active',
      userId: currentUser.id,
      fullName: currentUser.name || 'Valued Customer',
      phone: currentUser.phone || '',
      addressType: 'HOME',
      flatBuilding: '',
      streetArea: '',
      pincode: destinationPincode || '382430',
      postOffice: {
        name: 'Kathwada GIDC S.O.',
        branchType: 'Sub Post Office',
        deliveryStatus: 'Delivery',
        circle: 'Gujarat',
        district: 'Ahmedabad',
        state: 'Gujarat',
        facilityId: 'PO382430'
      },
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      isDefault: true
    };

    const processedShipments = splitShipments.map((pkg) => {
      const booking = generateIndiaPostBooking(effectiveAddress, pkg.items);
      return {
        packageId: pkg.packageId,
        sellerId: pkg.sellerId,
        sellerName: pkg.sellerName,
        items: pkg.items,
        shippingDetail: booking,
        status: 'CONFIRMED' as const,
        milestones: [
          { status: 'Order Confirmed', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: 'Apollo Platform Engine', description: 'Order verified & APE Priority Dispatch initiated', isCompleted: true },
          { status: 'Warehouse Allocated', timestamp: 'Pending', location: `Kathwada Factory Hub (${ORIGIN_HUB_PINCODE})`, description: 'Item queued for barcode scan & thermal label affix', isCompleted: false },
          { status: 'APE Dispatch Booked', timestamp: 'Pending', location: 'Kathwada APE Logistics Hub', description: `Article ${booking.articleNumber} registered in manifest`, isCompleted: false },
          { status: 'In Transit', timestamp: 'Pending', location: 'Ahmedabad Nodal Sorting Hub', description: 'En route to destination delivery hub', isCompleted: false },
          { status: 'Out for Delivery', timestamp: 'Pending', location: `${effectiveAddress.postOffice.name} (${effectiveAddress.pincode})`, description: 'Assigned to delivery executive for doorstep delivery', isCompleted: false },
          { status: 'Delivered', timestamp: 'Pending', location: effectiveAddress.city, description: 'Doorstep verification completed', isCompleted: false }
        ]
      };
    });

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      invoiceNumber: invNum,
      userId: currentUser.id,
      customerName: activeAddress?.fullName || currentUser.name || 'Valued Customer',
      customerEmail: currentUser.email,
      customerPhone: activeAddress?.phone || currentUser.phone,
      orderType: appMode === 'B2B' ? 'B2B' : 'B2C',
      b2bOrgId: appMode === 'B2B' ? currentOrg.id : undefined,
      gstin: gstinClaim ? (activeAddress?.gstin || currentOrg.gstin) : undefined,
      isInputTaxCreditClaimed: gstinClaim,
      deliveryAddress: effectiveAddress,
      shipments: processedShipments,
      pricingSummary: {
        itemsTotal,
        discountTotal: 0,
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        shippingTotal,
        codFee,
        grandTotal
      },
      paymentDetail: {
        method: paymentMethod,
        transactionId: paymentMeta?.razorpayPaymentId || paymentMeta?.transactionId || `TXN-AE-${Math.floor(100000000 + Math.random() * 900000000)}`,
        paymentStatus: paymentMethod === 'NET_30_PO' ? 'PENDING_PO_APPROVAL' : paymentMethod === 'COD' ? 'COD_VERIFIED' : 'PAID',
        paidAt: paymentMethod !== 'NET_30_PO' && paymentMethod !== 'COD' ? new Date().toISOString() : undefined,
        idempotencyKey: `IDEMP-${orderNum}`,
        razorpayPaymentId: paymentMeta?.razorpayPaymentId,
        razorpayOrderId: paymentMeta?.razorpayOrderId,
        razorpaySignature: paymentMeta?.razorpaySignature,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (appMode === 'B2B' && paymentMethod === 'NET_30_PO') {
      set((state) => ({
        currentOrg: {
          ...state.currentOrg,
          creditUsed: state.currentOrg.creditUsed + grandTotal
        }
      }));
    }

    const updatedOrders = [newOrder, ...get().orders];
    saveStored('apollo_orders', updatedOrders);

    // Authoritative inventory reduction for placed order
    get().decrementInventory(cart);
    
    set({
      orders: updatedOrders,
      cart: [],
      selectedOrderForDetail: newOrder
    });

    get().showToast(`Order #${orderNum} placed! APE Tracking AWB generated successfully.`, 'success');
    return newOrder;
  },

  decrementInventory: (items) => {
    if (!items || items.length === 0) return;
    const itemMap = new Map<string, number>();
    items.forEach((item) => {
      itemMap.set(item.sku, (itemMap.get(item.sku) || 0) + item.quantity);
    });

    const updatedProducts = get().products.map((p) => {
      let productChanged = false;
      const updatedVariants = p.variants.map((v) => {
        const qtyToDeduct = itemMap.get(v.sku);
        if (qtyToDeduct && qtyToDeduct > 0) {
          productChanged = true;
          return {
            ...v,
            inventory: Math.max(0, (v.inventory || 0) - qtyToDeduct)
          };
        }
        return v;
      });

      return productChanged ? { ...p, variants: updatedVariants } : p;
    });

    saveStored('apollo_products', updatedProducts);
    const currSelected = get().selectedProduct;
    const updatedSelected = currSelected
      ? updatedProducts.find((p) => p.asin === currSelected.asin) || null
      : currSelected;

    set({ products: updatedProducts, selectedProduct: updatedSelected });
  },

  updateOrderStatus: (orderId, packageId, status, milestoneDesc, location) => {
    const updatedOrders = get().orders.map((ord) => {
      if (ord.id === orderId) {
        return {
          ...ord,
          shipments: ord.shipments.map((shp) => {
            if (shp.packageId === packageId) {
              const updatedMilestones = [...shp.milestones];
              const milestoneIndex = updatedMilestones.findIndex((m) => m.status.toLowerCase().includes(status.toLowerCase().replace(/_/g, ' ')));
              if (milestoneIndex > -1) {
                updatedMilestones[milestoneIndex].isCompleted = true;
                updatedMilestones[milestoneIndex].timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                updatedMilestones[milestoneIndex].description = milestoneDesc;
                updatedMilestones[milestoneIndex].location = location;
              }
              return { ...shp, status, milestones: updatedMilestones };
            }
            return shp;
          })
        };
      }
      return ord;
    });

    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    apiService.updateBackendOrderStatus(orderId, status).catch(() => {});
    get().showToast(`Shipment status updated to ${status}`, 'info');
  },
  redispatchOrder: (orderId) => {
    const target = get().orders.find((o) => o.id === orderId);
    if (!target) return;

    const newBooking = generateIndiaPostBooking(target.deliveryAddress, target.shipments[0]?.items || []);
    const updatedOrders = get().orders.map((ord) => {
      if (ord.id === orderId) {
        return {
          ...ord,
          shipments: ord.shipments.map((shp) => ({
            ...shp,
            shippingDetail: newBooking,
            status: 'PROCESSING_PICK_PACK' as OrderStatus,
            milestones: [
              { status: 'Order Confirmed', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: 'Apollo Platform Engine', description: 'Re-dispatch authorized & new APE Priority booking initiated', isCompleted: true },
              { status: 'Warehouse Allocated', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: `Kathwada Factory Hub (${ORIGIN_HUB_PINCODE})`, description: 'New package queued for barcode scan & thermal label affix', isCompleted: true },
              { status: 'APE Dispatch Booked', timestamp: 'Pending', location: 'Kathwada Logistics Hub', description: `New Article ${newBooking.articleNumber} registered in manifest`, isCompleted: false },
              { status: 'In Transit', timestamp: 'Pending', location: 'Ahmedabad Nodal Sorting Hub', description: 'En route to destination delivery postal hub', isCompleted: false },
              { status: 'Out for Delivery', timestamp: 'Pending', location: `${ord.deliveryAddress.postOffice.name} (${ord.deliveryAddress.pincode})`, description: 'Assigned to delivery agent for doorstep delivery', isCompleted: false },
              { status: 'Delivered', timestamp: 'Pending', location: ord.deliveryAddress.city, description: 'Doorstep OTP verification pending', isCompleted: false }
            ]
          })),
          updatedAt: new Date().toISOString()
        };
      }
      return ord;
    });

    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Order #${target.orderNumber} re-dispatched with new AWB (${newBooking.articleNumber})!`, 'success');
  },

  schedulePickupForOrder: (orderId, packageId, slot, courier, date) => {
    const updatedOrders = updateOrderShipmentHelper(get().orders, orderId, packageId, (shp) =>
      createScheduledPickupShipment(shp, slot, courier, date, false)
    );
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Pickup scheduled for ${orderId} on ${date} (${slot}) with ${courier}!`, 'success');
  },

  confirmPackedAndReady: (orderId, packageId) => {
    const manifestId = `MNF-KATH-${Date.now().toString().slice(-6)}`;
    const updatedOrders = updateOrderShipmentHelper(get().orders, orderId, packageId, (shp) => ({
      ...shp,
      status: 'AWB_GENERATED' as OrderStatus,
      shippingDetail: {
        ...shp.shippingDetail,
        manifestId: shp.shippingDetail?.manifestId || manifestId
      },
      pickupDetail: shp.pickupDetail ? {
        ...shp.pickupDetail,
        manifestId
      } : undefined,
      milestones: [
        ...shp.milestones,
        {
          status: 'PACKED_READY_FOR_PICKUP',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: 'Kathwada GIDC Dispatch Bay',
          description: `Item packed, label verified, added to Handover Manifest ${manifestId}`,
          isCompleted: true
        }
      ]
    }));
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Order #${orderId} marked Packed & Ready for Handover!`, 'success');
  },

  confirmHandoverToCourier: (orderId, packageId) => {
    const updatedOrders = updateOrderShipmentHelper(get().orders, orderId, packageId, (shp) => ({
      ...shp,
      status: 'IN_TRANSIT' as OrderStatus,
      milestones: [
        ...shp.milestones,
        {
          status: 'DISPATCHED',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: 'Kathwada GIDC Hub',
          description: 'Package handed over to courier executive. In transit.',
          isCompleted: true
        }
      ]
    }));
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Order #${orderId} handed over to courier! Status: In-Transit.`, 'success');
  },

  confirmDelivered: (orderId, packageId) => {
    const target = get().orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    const destinationCity = target?.deliveryAddress?.city || 'Destination';
    const updatedOrders = updateOrderShipmentHelper(get().orders, orderId, packageId, (shp) => ({
      ...shp,
      status: 'DELIVERED' as OrderStatus,
      milestones: [
        ...shp.milestones,
        {
          status: 'DELIVERED',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: destinationCity,
          description: 'Package delivered to recipient. Proof of Delivery verified.',
          isCompleted: true
        }
      ]
    }));
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Order #${target?.orderNumber || orderId} delivered! Proof of delivery verified.`, 'success');
  },

  verifyDirectUpiPayment: (orderId, utrNumber, notes) => {
    const updatedOrders = get().orders.map((ord) => {
      if (ord.id === orderId || ord.orderNumber === orderId) {
        return {
          ...ord,
          paymentDetail: {
            ...ord.paymentDetail,
            paymentStatus: 'PAID' as const,
            transactionId: utrNumber,
            paidAt: new Date().toISOString(),
          },
          shipments: ord.shipments.map(shp => ({
            ...shp,
            status: (shp.status === 'PAYMENT_PENDING' ? 'CONFIRMED' : shp.status) as OrderStatus,
          })),
          directUpiVerification: {
            utrNumber,
            notes: notes || 'Verified via Admin Payment Desk',
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'Super Admin',
          },
        } as any;
      }
      return ord;
    });
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`UPI payment for Order #${orderId} verified with UTR ${utrNumber}!`, 'success');
  },

  batchSchedulePickup: (orderIds, slot, courier, date) => {
    const idSet = new Set(orderIds);
    const updatedOrders = get().orders.map((ord) => {
      if (idSet.has(ord.id) || idSet.has(ord.orderNumber)) {
        return {
          ...ord,
          shipments: ord.shipments.map((shp) =>
            createScheduledPickupShipment(shp, slot, courier, date, true)
          )
        };
      }
      return ord;
    });
    saveStored('apollo_orders', updatedOrders);
    set({ orders: updatedOrders });
    get().showToast(`Batch pickup scheduled for ${orderIds.length} orders on ${date} (${slot}) with ${courier}!`, 'success');
  },

  selectedOrderForDetail: null,
  setSelectedOrderForDetail: (o) => set({ selectedOrderForDetail: o }),
  orderFilterStatus: 'ALL',
  setOrderFilterStatus: (filter) => set({ orderFilterStatus: filter }),

  isAuthModalOpen: false,
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  isAddressModalOpen: false,
  setIsAddressModalOpen: (open) => set({ isAddressModalOpen: open }),
  isCheckoutOpen: false,
  setIsCheckoutOpen: (open) => set({ isCheckoutOpen: open }),

  // ── Wishlist ──────────────────────────────────────────────────
  wishlist: initialWishlist,
  addToWishlist: (item) => {
    const existing = get().wishlist.find(w => w.asin === item.asin && w.sku === item.sku);
    if (existing) {
      get().showToast('Item already in your Wishlist', 'info');
      return;
    }
    const newItem: WishlistItem = {
      ...item,
      id: `wish_${Date.now()}`,
      addedAt: new Date().toISOString()
    };
    const updated = [newItem, ...get().wishlist];
    saveStored('apollo_wishlist', updated);
    set({ wishlist: updated });
    get().showToast(`"${item.productTitle}" added to Wishlist ♥`, 'success');
  },
  removeFromWishlist: (id) => {
    const updated = get().wishlist.filter(w => w.id !== id);
    saveStored('apollo_wishlist', updated);
    set({ wishlist: updated });
    get().showToast('Removed from Wishlist', 'info');
  },
  moveWishlistToCart: (id) => {
    const item = get().wishlist.find(w => w.id === id);
    if (!item) return;
    const product = get().products.find(p => p.asin === item.asin);
    const variant = product?.variants.find(v => v.sku === item.sku);
    if (product && variant) {
      const seller = product.sellerListings[variant.sku]?.[0];
      get().addToCart({
        sku: variant.sku,
        asin: product.asin,
        title: variant.title,
        parentAsin: product.asin,
        productTitle: product.title,
        variantTitle: variant.title,
        attributes: variant.attributes as Record<string, string>,
        imageUrl: variant.images[0] || '/solar_sprinkler.webp',
        unitPrice: variant.b2cPrice,
        mrp: variant.mrp,
        gstRate: variant.gstRatePercent,
        hsnCode: variant.hsnCode,
        sellerId: seller?.sellerId || 'seller_apollo_mfg',
        sellerName: seller?.sellerName || 'Apollo Engineering (Direct Factory)',
        fulfillmentType: seller?.fulfillmentType || 'FBF',
        weightGrams: variant.weightGrams,
        isB2BPricingApplied: false
      }, 1);
      get().removeFromWishlist(id);
      get().showToast(`"${item.productTitle}" moved to cart!`, 'success');
    }
  },
  isInWishlist: (asin, sku) => {
    return get().wishlist.some(w => w.asin === asin && w.sku === sku);
  },

  // ── Product Reviews ──────────────────────────────────────────
  reviews: initialReviews,
  addReview: (review) => {
    const newReview: ProductReview = {
      ...review,
      id: `rev_${Date.now()}`,
      helpfulCount: 0,
      createdAt: new Date().toISOString()
    };
    const updated = [newReview, ...get().reviews];
    saveStored('apollo_reviews', updated);
    set({ reviews: updated });
    get().showToast('Review submitted successfully! Thank you for your feedback.', 'success');
  },
  deleteReview: (reviewId) => {
    const updated = get().reviews.filter(r => r.id !== reviewId);
    saveStored('apollo_reviews', updated);
    set({ reviews: updated });
    get().showToast('Review deleted', 'info');
  },
  markReviewHelpful: (reviewId) => {
    const updated = get().reviews.map(r => 
      r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
    );
    saveStored('apollo_reviews', updated);
    set({ reviews: updated });
  },
  getProductReviews: (asin) => {
    return get().reviews.filter(r => r.asin === asin).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  getAverageRating: (asin) => {
    const productReviews = get().reviews.filter(r => r.asin === asin);
    if (productReviews.length === 0) return { avg: 0, count: 0 };
    const sum = productReviews.reduce((s, r) => s + r.rating, 0);
    return { avg: Math.round((sum / productReviews.length) * 10) / 10, count: productReviews.length };
  },

  // ── Coupons & Discounts ──────────────────────────────────────
  coupons: initialCoupons,
  appliedCoupon: null,
  couponDiscount: 0,
  addCoupon: (coupon) => {
    const newCoupon: Coupon = {
      ...coupon,
      id: `coup_${Date.now()}`,
      usedCount: 0
    };
    const updated = [newCoupon, ...get().coupons];
    saveStored('apollo_coupons', updated);
    set({ coupons: updated });
    get().showToast(`Coupon "${coupon.code}" created successfully!`, 'success');
  },
  updateCoupon: (couponId, updates) => {
    const updated = get().coupons.map(c => c.id === couponId ? { ...c, ...updates } : c);
    saveStored('apollo_coupons', updated);
    set({ coupons: updated });
    get().showToast('Coupon updated', 'success');
  },
  deleteCoupon: (couponId) => {
    const updated = get().coupons.filter(c => c.id !== couponId);
    saveStored('apollo_coupons', updated);
    set({ coupons: updated });
    get().showToast('Coupon deleted', 'info');
  },
  applyCoupon: (code) => {
    const coupon = get().coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
    if (!coupon) {
      get().showToast('Invalid coupon code. Please check and try again.', 'error');
      return false;
    }
    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
      get().showToast('This coupon has expired or is not yet active.', 'error');
      return false;
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      get().showToast('This coupon has reached its usage limit.', 'error');
      return false;
    }
    const cartTotal = get().cart.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    if (cartTotal < coupon.minOrderAmount) {
      get().showToast(`Minimum order of ₹${coupon.minOrderAmount} required for this coupon.`, 'warning');
      return false;
    }
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round(cartTotal * coupon.value / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === 'FLAT_AMOUNT') {
      discount = coupon.value;
    } else if (coupon.type === 'FREE_SHIPPING') {
      discount = 0; // Shipping fee waived separately
    }
    set({ appliedCoupon: coupon, couponDiscount: discount });
    // Increment usage
    const updatedCoupons = get().coupons.map(c => c.id === coupon.id ? { ...c, usedCount: c.usedCount + 1 } : c);
    saveStored('apollo_coupons', updatedCoupons);
    set({ coupons: updatedCoupons });
    get().showToast(`Coupon "${coupon.code}" applied! You save ₹${discount}${coupon.type === 'FREE_SHIPPING' ? ' + Free Shipping' : ''}`, 'success');
    return true;
  },
  removeCoupon: () => {
    const coupon = get().appliedCoupon;
    if (coupon) {
      // Decrement usage back
      const updatedCoupons = get().coupons.map(c => c.id === coupon.id ? { ...c, usedCount: Math.max(0, c.usedCount - 1) } : c);
      saveStored('apollo_coupons', updatedCoupons);
      set({ coupons: updatedCoupons });
    }
    set({ appliedCoupon: null, couponDiscount: 0 });
    get().showToast('Coupon removed', 'info');
  },

  // ── Return / Refund Management ──────────────────────────────
  returnRequests: initialReturns,
  createReturnRequest: (orderId, items, reason, reasonDetails) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) {
      get().showToast('Order not found for return request', 'error');
      return null;
    }
    const refundAmount = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const returnReq: ReturnRequest = {
      id: `ret_${Date.now()}`,
      orderId,
      orderNumber: order.orderNumber,
      userId: get().currentUser.id,
      items,
      reason,
      reasonDetails,
      status: 'REQUESTED',
      refundAmount,
      refundMethod: 'ORIGINAL_PAYMENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [returnReq, ...get().returnRequests];
    saveStored('apollo_returns', updated);
    set({ returnRequests: updated });
    get().showToast(`Return request #${returnReq.id.slice(-6)} submitted for Order ${order.orderNumber}`, 'success');
    return returnReq;
  },
  updateReturnStatus: (returnId, status, adminNotes) => {
    const updated = get().returnRequests.map(r => 
      r.id === returnId 
        ? { ...r, status, adminNotes: adminNotes || r.adminNotes, updatedAt: new Date().toISOString() } 
        : r
    );
    saveStored('apollo_returns', updated);
    set({ returnRequests: updated });
    get().showToast(`Return #${returnId.slice(-6)} status updated to ${status.replace(/_/g, ' ')}`, 'info');
  },
  getOrderReturns: (orderId) => {
    return get().returnRequests.filter(r => r.orderId === orderId);
  },

  // ── Enterprise RBAC & Audit Trails ──────────────────────────
  activeAdminRole: 'SUPER_ADMIN',
  setActiveAdminRole: (role) => {
    set({ activeAdminRole: role });
    get().showToast(`Switched active admin desk role to ${role.replace(/_/g, ' ')}`, 'info');
  },
  adminAuditLogs: initialAuditLogs,
  addAuditLog: (logData) => {
    const newLog: AdminAuditLog = {
      ...logData,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...get().adminAuditLogs];
    saveStored('apollo_admin_audit_logs', updated);
    set({ adminAuditLogs: updated });
  },

  // ── Solar Contractor Inquiries & Call Desk ───────────────────
  contractorInquiries: initialContractorInquiries,
  addContractorInquiry: (inquiryData) => {
    const newInquiry: SolarContractorInquiry = {
      ...inquiryData,
      id: `inq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString()
    };
    const updated = [newInquiry, ...get().contractorInquiries];
    saveStored('apollo_contractor_inquiries', updated);
    set({ contractorInquiries: updated });
    get().showToast(`Contractor inquiry for ${newInquiry.contractorName} (${newInquiry.firmName}) logged successfully!`, 'success');
  },
  updateContractorInquiry: (id, updates) => {
    const updated = get().contractorInquiries.map((inq) => 
      inq.id === id ? { ...inq, ...updates, lastContactedAt: new Date().toISOString() } : inq
    );
    saveStored('apollo_contractor_inquiries', updated);
    set({ contractorInquiries: updated });
    get().showToast('Contractor inquiry updated successfully', 'success');
  },
  deleteContractorInquiry: (id) => {
    const updated = get().contractorInquiries.filter(inq => inq.id !== id);
    saveStored('apollo_contractor_inquiries', updated);
    set({ contractorInquiries: updated });
    get().showToast('Contractor inquiry removed', 'info');
  },

  toastMessage: null,
  showToast: (text, type = 'info') => {
    set({ toastMessage: { text, type } });
    setTimeout(() => {
      set({ toastMessage: null });
    }, 4000);
  }
}));

/**
 * Safe post-hydration client storage rehydration.
 * Guarantees that SSR and initial client hydration match 100% identically,
 * and only loads persisted localStorage/sessionStorage state after the component mounts.
 */
export function rehydrateStoreFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const rawStoredProducts = loadStored<Product[] | null>('apollo_products', null);
    const storedAppMode = loadStored<AppMode | null>('apollo_app_mode', null);
    const storedUser = loadStored<UserProfile | null>('apollo_current_user', null);
    const storedAddresses = loadStored<DeliveryAddress[] | null>('apollo_addresses', null);
    const storedOrders = loadStored<Order[] | null>('apollo_orders', null);
    const storedWishlist = loadStored<WishlistItem[] | null>('apollo_wishlist', null);
    const storedCart = loadSessionCart();
    const storedDeleted = loadStored<string[] | null>('apollo_deleted_products', null);
    const storedLang = loadStored<SupportedLanguage | null>('apollo_lang', null);

    const updates: Partial<AppStore> = { isHydrated: true };

    if (storedDeleted && Array.isArray(storedDeleted)) {
      storedDeleted.forEach(asin => deletedProductAsinsSet.add(asin));
    }

    if (rawStoredProducts && Array.isArray(rawStoredProducts) && rawStoredProducts.length > 0) {
      const seen = new Set<string>();
      const deduped: Product[] = [];
      for (const p of rawStoredProducts) {
        if (p && p.asin && !deletedProductAsinsSet.has(p.asin) && !seen.has(p.asin)) {
          seen.add(p.asin);
          deduped.push(p);
        }
      }
      if (deduped.length > 0) {
        // Use stored products directly — no mock merging
        updates.products = deduped;
        updates.apiCatalogProducts = syncCatalogProducts(deduped, useStore.getState().apiCatalogProducts);
      }
    }

    if (storedAppMode) updates.appMode = storedAppMode;
    if (storedUser && storedUser.id) {
      updates.currentUser = storedUser;
      updates.authStatus = storedUser.id !== 'usr_guest' ? 'AUTHENTICATED' : 'GUEST';
    }
    if (storedAddresses && Array.isArray(storedAddresses) && storedAddresses.length > 0) {
      updates.addresses = storedAddresses;
      updates.shippingAddress = storedAddresses[0] || null;
      updates.billingAddress = storedAddresses[0] || null;
      updates.activeAddress = storedAddresses[0] || null;
    }
    if (storedOrders && Array.isArray(storedOrders) && storedOrders.length > 0) {
      updates.orders = storedOrders;
    }
    if (storedWishlist && Array.isArray(storedWishlist)) {
      updates.wishlist = storedWishlist;
    }
    if (storedCart && Array.isArray(storedCart) && storedCart.length > 0) {
      updates.cart = storedCart;
    }
    if (storedLang) {
      updates.selectedLanguage = storedLang;
    }

    useStore.setState(updates);
  } catch (e) {
    console.warn('Store rehydration skipped', e);
  }
}


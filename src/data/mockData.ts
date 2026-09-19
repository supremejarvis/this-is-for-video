import { B2BOrganization, UserProfile, Order, DeliveryAddress } from '../types';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../services/logisticsService';

// MOCK_SELLERS removed — seller info now comes from backend/cart item data

export const MOCK_B2B_ORGANIZATIONS: B2BOrganization[] = [
  {
    id: 'org_solar_epc',
    companyName: 'Apollo Engineering & Solar EPC Partners',
    tradeName: 'Apollo Engineering',
    gstin: '24AAACP9999P1Z2',
    pan: 'AAACP9999P',
    cin: 'U29100GJ2018PTC104523',
    stateCode: '24',
    isGstVerified: true,
    creditLimit: 1500000,
    creditUsed: 145000,
    creditTerms: 'NET_30',
    kycStatus: 'VERIFIED',
    spendingThresholdForApproval: 50000,
    members: [
      { userId: 'u_apollo_admin', name: 'Apollo Engineering Admin', email: 'admin@apolloengineering.co.in', role: 'B2B_ADMIN', department: 'Executive HQ', spendingLimit: 1500000 },
      { userId: 'u_epc_procure', name: 'Nilesh Patel', email: 'nilesh@apolloengineering.co.in', role: 'B2B_APPROVER', department: 'Plant Procurement', spendingLimit: 500000 },
      { userId: 'u_site_engineer', name: 'Site Operations Lead', email: 'site@apolloengineering.co.in', role: 'B2B_BUYER', department: 'Kathwada Plant', spendingLimit: 100000 }
    ]
  }
];

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'u_customer_b2c',
    name: 'Solar Plant Owner',
    email: 'client@solarenergy.in',
    phone: '+91 85116 26267',
    role: 'B2C_CUSTOMER',
    isPrime: true,
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'u_apollo_admin',
    name: 'Apollo Engineering (Enterprise Admin)',
    email: 'admin@apolloengineering.co.in',
    phone: '+91 85116 26267',
    role: 'B2B_ADMIN',
    isPrime: true,
    b2bOrgId: 'org_solar_epc',
    createdAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'u_super_admin',
    name: 'Apollo Master Admin',
    email: 'admin@apolloengineering.co.in',
    phone: '+91 85116 26267',
    role: 'SUPER_ADMIN',
    isPrime: true,
    createdAt: '2024-12-01T10:00:00Z'
  }
];

export const INITIAL_ADDRESSES: DeliveryAddress[] = [
  {
    id: 'addr_billing_default',
    userId: 'u_customer_b2c',
    fullName: 'Pravin Patel',
    phone: '+91 85116 26267',
    addressType: 'OFFICE',
    flatBuilding: 'Plot 100, Gopinath Industrial Landmark',
    streetArea: 'Kathwada GIDC Phase 2, Near Ring Road',
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
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    isDefault: true,
    gstin: '24AAACP9999P1Z2'
  },
  {
    id: 'addr_shipping_default',
    userId: 'u_customer_b2c',
    fullName: 'Pravin Patel',
    phone: '+91 85116 26267',
    addressType: 'HOME',
    flatBuilding: 'Plot 100, Gopinath Industrial Landmark',
    streetArea: 'Kathwada GIDC Phase 2, Near Ring Road',
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
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    isDefault: true
  }
];

// MOCK_PRODUCTS removed — products are now loaded exclusively from PostgreSQL backend via /api/v1/products/
// See: src/services/api/catalogApi.ts and src/services/catalogService.ts

// Legacy ASIN constants for backwards compatibility with reviews and order references
export const LEGACY_ASIN_SPRINKLER = 'AP-SPRINKLER-01';
export const LEGACY_ASIN_DRAINCLIPS = 'AP-DRAINCLIPS-02';
export const LEGACY_ASIN_GICLAMP = 'AP-GICLAMP-03';
export const LEGACY_ASIN_FITTINGS = 'AP-FITTINGTEE-04';
export const LEGACY_ASIN_FULLKIT = 'AP-FULLKIT-05';
export const LEGACY_ASIN_PUMP = 'AP-PUMP-06';
export const LEGACY_ASIN_TIMER = 'AP-TIMER-07';

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_apollo_101',
    orderNumber: 'ORD-AE-2026-98124',
    invoiceNumber: 'INV-AE-2026-08-98124',
    userId: 'u_customer_b2c',
    customerName: 'Solar EPC Operations',
    customerEmail: 'admin@apolloengineering.co.in',
    customerPhone: '+91 85116 26267',
    orderType: 'B2B',
    isInputTaxCreditClaimed: true,
    gstin: '24AAACP9999P1Z2',
    deliveryAddress: INITIAL_ADDRESSES[0],
    shipments: [
      {
        packageId: 'pkg_ae_1',
        sellerId: 'seller_apollo_mfg',
        sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
        items: [
          {
            sku: 'AE-SPRINKLER-SS304',
            parentAsin: 'AP-SPRINKLER-01',
            productTitle: 'SS304 Solar Panel Sprinkler',
            variantTitle: 'SS304 Solar Panel Sprinkler (180° Uniform Curtain)',
            attributes: { material: 'Stainless Steel 304' },
            imageUrl: '/solar_sprinkler.webp',
            quantity: 50,
            unitPrice: 185,
            mrp: 350,
            gstRate: 18,
            hsnCode: '84248990',
            sellerId: 'seller_apollo_mfg',
            sellerName: 'Apollo Engineering',
            fulfillmentType: 'FBF',
            weightGrams: 180,
            isB2BPricingApplied: true
          }
        ],
        shippingDetail: {
          articleNumber: 'EM849201948IN',
          originPincode: ORIGIN_HUB_PINCODE,
          originHubName: ORIGIN_HUB_NAME,
          destinationPincode: '382430',
          destinationPostOffice: 'KATHWADA GIDC S.O.',
          bookingTimestamp: '2026-08-22T08:30:00Z',
          weightGrams: 9000,
          chargeableWeightGrams: 9000,
          tariffAmount: 185,
          gstAmount: 33.3,
          totalPostage: 218.3,
          barcode128: 'EM849201948IN',
          manifestId: 'MNF-20260822-382430-01',
          carrier: 'INDIA_POST_SPEED_POST'
        },
        status: 'IN_TRANSIT',
        milestones: [
          { status: 'Order Confirmed', timestamp: '2026-08-22 08:30 AM', location: 'Apollo Gateway', description: 'B2B Purchase Order authorized & APE Priority booked', isCompleted: true },
          { status: 'Picked & Packed', timestamp: '2026-08-22 09:45 AM', location: 'Kathwada GIDC Hub (382430)', description: 'Package scanned & 4x6 thermal barcode label affixed', isCompleted: true },
          { status: 'APE Dispatch Booked', timestamp: '2026-08-22 11:15 AM', location: 'Kathwada Logistics Hub', description: 'Article EM849201948IN accepted for dispatch', isCompleted: true },
          { status: 'In Transit', timestamp: '2026-08-22 02:40 PM', location: 'Ahmedabad Nodal Sorting Center', description: 'Bag dispatched to destination delivery hub', isCompleted: true },
          { status: 'Out for Delivery', timestamp: 'Pending', location: 'Kathwada Delivery Hub (382430)', description: 'Delivery agent assigned for factory doorstep delivery', isCompleted: false },
          { status: 'Delivered', timestamp: 'Pending', location: 'Destination Factory', description: 'Delivery OTP verification', isCompleted: false }
        ]
      }
    ],
    pricingSummary: {
      itemsTotal: 9250,
      discountTotal: 0,
      taxableValue: 7838.98,
      cgstAmount: 705.51,
      sgstAmount: 705.51,
      igstAmount: 0,
      totalTax: 1411.02,
      shippingTotal: 218,
      grandTotal: 9468
    },
    paymentDetail: {
      method: 'NET_30_PO',
      transactionId: 'PO-APOLLO-98124',
      paymentStatus: 'PAID',
      paidAt: '2026-08-22T08:30:00Z',
      idempotencyKey: 'IDEMP-APOLLO-98124'
    },
    createdAt: '2026-08-22T08:30:00Z',
    updatedAt: '2026-08-22T14:40:00Z'
  }
];

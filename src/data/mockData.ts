import { Product, B2BOrganization, UserProfile, Order, DeliveryAddress, SellerListing } from '../types';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../services/logisticsService';

export const MOCK_SELLERS: Record<string, { id: string; name: string; rating: number; fulfillment: 'FBF' | 'FBM'; city: string }> = {
  'seller_apollo_mfg': { 
    id: 'seller_apollo_mfg', 
    name: 'Apollo Engineering (Direct Factory Hub 382430)', 
    rating: 4.9, 
    fulfillment: 'FBF', 
    city: 'Kathwada GIDC, Ahmedabad (382430)' 
  },
  'seller_gujarat_solar': { 
    id: 'seller_gujarat_solar', 
    name: 'Gujarat Solar EPC Hardware Distro', 
    rating: 4.7, 
    fulfillment: 'FBM', 
    city: 'Ahmedabad (380001)' 
  }
};

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

export const MOCK_PRODUCTS: Product[] = [
  {
    asin: 'AP-SPRINKLER-01',
    title: 'SS304 Solar Panel Sprinkler (AetherWash Tech · SS304 Grade)',
    brand: 'Apollo Engineering',
    category: 'SS304 GRADE',
    subCategory: 'Solar Sprinklers',
    description: 'The Apollo SS304 Solar Sprinkler is our flagship product, engineered for maximum cleaning efficiency with zero shading impact. AetherWash technology provides a uniform 180° water curtain that removes dust and bird droppings, ensuring panels operate at peak performance year-round.',
    highlights: [
      'Shadow-Less Design — Minimizes shading on solar cells',
      '180° Cleaning — 2800 mm range, uniform water spread',
      'Low Water Consumption (4–7 LPM)',
      '+15–20% Output — Proven solar performance boost',
      '10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.'
    ],
    rating: 4.9,
    reviewCount: 340,
    isLive: true,
    b2bMoq: 50,
    badges: ['BEST_SELLER', 'PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'AE-SPRINKLER-SS304',
    variants: [
      {
        sku: 'AE-SPRINKLER-SS304',
        title: 'SS304 Solar Panel Sprinkler (180° Uniform Curtain / ½" BSP Male)',
        attributes: { material: 'Stainless Steel 304', packSize: 'Single Unit', specs: { range: '2800 mm', thread: '½" BSP Male', pressure: '2–4 Bar', flowRate: '4–7 LPM' } },
        mrp: 350,
        b2cPrice: 220,
        b2bMoq: 50,
        b2bTierPricing: [
          { minQty: 50, maxQty: 199, pricePerUnit: 185, discountPercent: 15.9 },
          { minQty: 200, maxQty: 499, pricePerUnit: 160, discountPercent: 27.2 },
          { minQty: 500, pricePerUnit: 140, discountPercent: 36.3 }
        ],
        inventory: 1500,
        barcode: '8908511626011',
        images: ['/solar_sprinkler.webp'],
        weightGrams: 180,
        dimensionsCm: { length: 12, width: 8, height: 6 },
        hsnCode: '84248990',
        gstRatePercent: 18
      }
    ],
    sellerListings: {
      'AE-SPRINKLER-SS304': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 340,
          fulfillmentType: 'FBF',
          price: 220,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 1500,
          isWinningBuyBox: true,
          buyBoxScore: 99.5
        }
      ]
    },
    aPlusContent: [
      {
        id: 'aplus_hero_01',
        type: 'HERO_BANNER',
        title: 'Pioneering India\'s First Shadowless Solar Sprinklers',
        subtitle: 'Engineered with 100% premium SS304 stainless steel for zero degradation and maximum energy yield.',
        imageUrl: '/solar_sprinkler.webp'
      },
      {
        id: 'aplus_specs_01',
        type: 'TECHNICAL_SPECS',
        title: 'Technical & Engineering Specification Matrix',
        data: {
          'Material Grade': 'AISI SS304 Medical Grade Stainless Steel',
          'Coverage Radius': '2800 mm Uniform Spread',
          'Operating Pressure': '2 to 4 Bar',
          'Inlet Thread': '½ Inch BSP Male Precision Thread',
          'Shading Impact': 'Zero (Patented Low-Profile Shadowless Nozzle)',
          'Origin Dispatch': '100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad (382430)'
        }
      }
    ]
  },
  {
    asin: 'AP-DRAINCLIPS-02',
    title: 'Apollo SS304 Solar Panel Drain Clip (Anti-Mud Belt · Auto Water Siphon · Fits 28mm-40mm Frames)',
    brand: 'Apollo Engineering',
    category: 'SS304 GRADE',
    subCategory: 'Auto Drain Clips',
    description: 'Eliminate the mud belt and water stagnation with Apollo SS304 Auto Water Drain Clips. Precision-engineered from high-grade AISI SS304 stainless steel, these clips use natural capillary siphon action to continuously evacuate trapped rainwater, dust, and sludge from solar panel lower frame edges. Completely prevents PID degradation, cell hotspots, and solar fire hazards with zero electricity and zero maintenance. Measure frame thickness (28mm / 30mm / 33mm / 35mm / 40mm) before ordering.',
    highlights: [
      '⚠️ Measure Frame Thickness Before Order — Precision fit for 28mm, 30mm, 33mm, 35mm & 40mm frames',
      'Auto Capillary Siphon Drainage — Continuously discharges pooled rainwater & mud sludge',
      'Eliminates Mud Belt & Hotspots — Protects bypass diodes and stops fire hazards / PID loss',
      '100% AISI SS304 Stainless Steel — UV, rust & weather impervious with 25+ years outdoor life',
      'Tool-Free Snap-On Attachment — Secures firmly in under 10 seconds per panel',
      'Direct Factory Dispatch — From Apollo Engineering, Kathwada GIDC, Ahmedabad (382430)'
    ],
    rating: 4.9,
    reviewCount: 485,
    isLive: true,
    badges: ['BEST_SELLER', 'PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'J9-IJCH-26WX',
    variants: [
      {
        sku: 'EV-YMG0-GM29',
        title: 'Apollo SS304 Solar Drain Clip - 28mm Frame Size (Pack of 50 pcs)',
        attributes: { material: 'AISI SS304', size: '28mm', packSize: 'Pack of 50' },
        mrp: 1250,
        b2cPrice: 750,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 750, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 650, discountPercent: 13.3 },
          { minQty: 20, pricePerUnit: 520, discountPercent: 30.6 }
        ],
        inventory: 2500,
        barcode: 'B0GSSF4SBB',
        flipkartFsn: 'FSN-APE-DC28',
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
        dimensionsCm: { length: 5, width: 5, height: 5 },
        hsnCode: '73269099',
        gstRatePercent: 18,
        unitOfMeasure: 'PCS'
      },
      {
        sku: 'DZ-K6JS-CCOO',
        title: 'Apollo SS304 Solar Drain Clip - 30mm Frame Size (Pack of 50 pcs)',
        attributes: { material: 'AISI SS304', size: '30mm', packSize: 'Pack of 50' },
        mrp: 1250,
        b2cPrice: 750,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 750, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 650, discountPercent: 13.3 },
          { minQty: 20, pricePerUnit: 520, discountPercent: 30.6 }
        ],
        inventory: 3500,
        barcode: 'B0GSRXJFD9',
        flipkartFsn: 'FSN-APE-DC30',
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
        dimensionsCm: { length: 5, width: 5, height: 5 },
        hsnCode: '73269099',
        gstRatePercent: 18,
        unitOfMeasure: 'PCS'
      },
      {
        sku: 'GV-XPZG-63NS',
        title: 'Apollo SS304 Solar Drain Clip - 33mm Frame Size (Pack of 50 pcs)',
        attributes: { material: 'AISI SS304', size: '33mm', packSize: 'Pack of 50' },
        mrp: 1250,
        b2cPrice: 750,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 750, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 650, discountPercent: 13.3 },
          { minQty: 20, pricePerUnit: 520, discountPercent: 30.6 }
        ],
        inventory: 2000,
        barcode: 'B0GSS295GM',
        flipkartFsn: 'FSN-APE-DC33',
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
        dimensionsCm: { length: 5, width: 5, height: 5 },
        hsnCode: '73269099',
        gstRatePercent: 18,
        unitOfMeasure: 'PCS'
      },
      {
        sku: 'J9-IJCH-26WX',
        title: 'Apollo SS304 Solar Drain Clip - 35mm Frame Size (Pack of 50 pcs)',
        attributes: { material: 'AISI SS304', size: '35mm', packSize: 'Pack of 50' },
        mrp: 1250,
        b2cPrice: 750,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 750, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 650, discountPercent: 13.3 },
          { minQty: 20, pricePerUnit: 520, discountPercent: 30.6 }
        ],
        inventory: 4500,
        barcode: 'B0H3ZJ1J5L',
        flipkartFsn: 'FSN-APE-DC35',
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
        dimensionsCm: { length: 5, width: 5, height: 5 },
        hsnCode: '73269099',
        gstRatePercent: 18,
        unitOfMeasure: 'PCS'
      },
      {
        sku: '3F-J2NT-6MGG',
        title: 'Apollo SS304 Solar Drain Clip - 40mm Frame Size (Pack of 50 pcs)',
        attributes: { material: 'AISI SS304', size: '40mm', packSize: 'Pack of 50' },
        mrp: 1350,
        b2cPrice: 800,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 800, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 690, discountPercent: 13.7 },
          { minQty: 20, pricePerUnit: 560, discountPercent: 30.0 }
        ],
        inventory: 2800,
        barcode: 'B0GSRSG56R',
        flipkartFsn: 'FSN-APE-DC40',
        images: ['/Drain_clips.webp'],
        weightGrams: 25,
        dimensionsCm: { length: 5, width: 5, height: 5 },
        hsnCode: '73269099',
        gstRatePercent: 18,
        unitOfMeasure: 'PCS'
      }
    ],
    sellerListings: {
      'EV-YMG0-GM29': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 485,
          fulfillmentType: 'FBF',
          price: 750,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 2500,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ],
      'DZ-K6JS-CCOO': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 485,
          fulfillmentType: 'FBF',
          price: 750,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 3500,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ],
      'GV-XPZG-63NS': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 485,
          fulfillmentType: 'FBF',
          price: 750,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 2000,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ],
      'J9-IJCH-26WX': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 485,
          fulfillmentType: 'FBF',
          price: 750,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 4500,
          isWinningBuyBox: true,
          buyBoxScore: 99.5
        }
      ],
      '3F-J2NT-6MGG': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 485,
          fulfillmentType: 'FBF',
          price: 800,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 2800,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ]
    },
    aPlusContent: []
  },
  {
    asin: 'AP-GICLAMP-03',
    title: 'GI Solar Pipe Clamp (Galvanized Iron · L-Shape Adjustable)',
    brand: 'Apollo Engineering',
    category: 'GI SERIES',
    subCategory: 'Pipe Clamps',
    description: 'Secure your solar maintenance infrastructure with heavy-duty GI Pipe Clamps. Designed for tool-free installation on standard solar frames, these clamps provide a vibration-resistant mount for ½-inch UPVC or CPVC pipelines. Trusted by EPC contractors across India.',
    highlights: [
      'Corrosion-Resistant GI — Rust-free outdoors for years',
      'Universal Fit — Standard UPVC/CPVC pipe compatible',
      'Adjustable L-Shape — Bolt/U-hook, no drilling needed',
      'Vibration Control — Locks pipe against wind & movement',
      'Frame-Universal — Fits various frame thicknesses'
    ],
    rating: 4.8,
    reviewCount: 195,
    isLive: true,
    badges: ['PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'AE-CLAMP-GI-HALF',
    variants: [
      {
        sku: 'AE-CLAMP-GI-HALF',
        title: 'GI Solar Pipe Clamp - ½" Pipe Mount (Pack of 25 pcs)',
        attributes: { material: 'Galvanized Iron', size: '½" (12.7 mm)', packSize: 'Pack of 25' },
        mrp: 850,
        b2cPrice: 480,
        b2bTierPricing: [
          { minQty: 1, maxQty: 9, pricePerUnit: 480, discountPercent: 0 },
          { minQty: 10, maxQty: 39, pricePerUnit: 410, discountPercent: 14.5 },
          { minQty: 40, pricePerUnit: 340, discountPercent: 29.1 }
        ],
        inventory: 1800,
        barcode: '8908511626042',
        images: ['/gi_pipe_clamp.webp'],
        weightGrams: 850,
        dimensionsCm: { length: 18, width: 12, height: 10 },
        hsnCode: '73269099',
        gstRatePercent: 18
      }
    ],
    sellerListings: {
      'AE-CLAMP-GI-HALF': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 195,
          fulfillmentType: 'FBF',
          price: 480,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 1800,
          isWinningBuyBox: true,
          buyBoxScore: 98.8
        }
      ]
    },
    aPlusContent: []
  },
  {
    asin: 'AP-FITTINGTEE-04',
    title: 'UPVC / CPVC Threaded Tee (High-Grade Polymer · Brass Threads)',
    brand: 'Apollo Engineering',
    category: 'FITTING SERIES',
    subCategory: 'Pipe Fittings',
    description: 'Ensure leak-proof connections for your solar sprinkler system with precision-molded Threaded Tees. Available in UPVC and CPVC variants, these tees feature reinforced brass threads for maximum durability and resistance to cross-threading under high pressure.',
    highlights: [
      'Brass Reinforced Threads — Prevents stripping and leaks',
      'UV Stabilized Material — Will not become brittle in sun',
      'High Pressure Rating — Tested up to 15 Bar',
      'Universal Compatibility — Fits all standard ½" pipes',
      'Chemical Resistant — Safe for use with cleaning agents'
    ],
    rating: 4.9,
    reviewCount: 280,
    isLive: true,
    badges: ['PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'AE-TEE-UPVC-HALF',
    variants: [
      {
        sku: 'AE-TEE-UPVC-HALF',
        title: 'UPVC Threaded Equal Tee with Brass Female Thread (Pack of 20 pcs)',
        attributes: { material: 'UPVC / Brass Thread', size: '½" Equal Tee', packSize: 'Pack of 20' },
        mrp: 600,
        b2cPrice: 380,
        b2bTierPricing: [
          { minQty: 1, maxQty: 9, pricePerUnit: 380, discountPercent: 0 },
          { minQty: 10, maxQty: 39, pricePerUnit: 320, discountPercent: 15.7 },
          { minQty: 40, pricePerUnit: 260, discountPercent: 31.5 }
        ],
        inventory: 2000,
        barcode: '8908511626059',
        images: ['/cpvc_upvc.webp'],
        weightGrams: 500,
        dimensionsCm: { length: 16, width: 12, height: 8 },
        hsnCode: '39174000',
        gstRatePercent: 18
      }
    ],
    sellerListings: {
      'AE-TEE-UPVC-HALF': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 280,
          fulfillmentType: 'FBF',
          price: 380,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 2000,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ]
    },
    aPlusContent: []
  },
  {
    asin: 'AP-FULLKIT-05',
    title: 'Solar Cleaning Sprinkler Set (Complete Installation Kit)',
    brand: 'Apollo Engineering',
    category: 'COMPLETE KIT',
    subCategory: 'Full Kits',
    description: 'Our all-in-one Solar Cleaning Sprinkler Set is designed for quick and easy deployment. This comprehensive kit includes everything needed to set up an automated cleaning system for a 5–10 kW solar plant. Scales effortlessly for larger MW installations.',
    highlights: [
      'Complete Hardware — Sprinklers, Tees & Clamps included',
      'Pre-Matched Components — Guaranteed fit and performance',
      'Scalable Design — Easily add more sets for larger plants',
      'Step-by-Step Guide — DIY-friendly installation',
      'Industrial Quality — Same components used in MW plants'
    ],
    rating: 5.0,
    reviewCount: 160,
    isLive: true,
    badges: ['BEST_SELLER', 'PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    isComboBundle: true,
    comboFormulaEnabled: true,
    selectedVariantSku: 'AE-KIT-3KW',
    variants: [
      {
        sku: 'AE-KIT-3KW',
        title: '3 kW Complete Solar Cleaning Combo Kit (6 Panels · 42 LPM Motor · Sized Hardware)',
        attributes: { material: 'Complete Kit', packSize: '3 kW Kit (6 Panels)' },
        mrp: 4999,
        b2cPrice: 3499,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 3499, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 2950, discountPercent: 15.7 },
          { minQty: 20, pricePerUnit: 2550, discountPercent: 27.1 }
        ],
        inventory: 180,
        barcode: '8908511626033',
        images: ['/solar_cleaning_fullset.webp'],
        weightGrams: 4200,
        dimensionsCm: { length: 40, width: 28, height: 20 },
        hsnCode: '84248990',
        gstRatePercent: 18,
        unitOfMeasure: 'SET',
        isComboVariant: true,
        solarKitConfig: {
          plantCapacityKw: 3,
          panelCount: 6,
          panelThicknessMm: 35,
          sprinklerPcs: 6,
          drainClipsPcs: 12,
          giClampsPcs: 6,
          timerPcs: 1,
          motorLpm: 42,
          motorHp: '0.5 HP',
          electricalPhase: 'Single Phase 220V/230V AC (50Hz)',
          upvcTeePcs: 6,
          localPipeNotice: 'Suggestion: Pipes and other common plumbing fittings are recommended to be purchased from your local hardware market for on-site cut-to-fit savings.'
        },
        comboComponents: [
          {
            asin: 'AP-SPRINKLER-180',
            sku: 'AE-SPRINKLER-180',
            productTitle: 'Apollo SS304 Shadowless Sprinkler (180° Curtain)',
            imageUrl: '/solar_sprinkler.webp',
            quantity: 6,
            unitPrice: 60,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'AISI SS304 Stainless Steel',
              flowRateLpm: 7,
              size: '½" BSP Male Thread',
              hsnCode: '84248990',
              specs: { 'Ratio': '1 Sprinkler per Panel (6 Pcs)', 'Coverage': '180° Full Curtain' }
            }
          },
          {
            asin: 'AP-CLIP-35MM',
            sku: 'AE-CLIP-35MM-SS',
            productTitle: 'Apollo SS304 Auto Drain Clips (Frame Thickness: 35mm)',
            imageUrl: '/Drain_clips.webp',
            quantity: 12,
            unitPrice: 20,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'AISI SS304 Corrosion-Proof',
              size: '35mm Frame Thickness',
              hsnCode: '73269099',
              specs: { 'Ratio': '2 Clips per Panel (12 Pcs)' }
            }
          },
          {
            asin: 'AP-CLAMP-GI',
            sku: 'AE-CLAMP-GI-20MM',
            productTitle: 'Heavy Galvanized GI Piping Support Clamps',
            imageUrl: '/gi_pipe_clamp.webp',
            quantity: 6,
            unitPrice: 25,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'Hot-Dip Galvanized Iron (GI)',
              size: '20mm / 25mm Universal Fit',
              hsnCode: '73269099',
              specs: { 'Ratio': '1 Clamp per Panel (6 Pcs)' }
            }
          },
          {
            asin: 'AP-TIMER-07',
            sku: 'AE-TIMER-PROG',
            productTitle: 'Apollo Digital Programmable Solar Cleaning Automation Controller',
            imageUrl: '/auto_timer.webp',
            quantity: 1,
            unitPrice: 850,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'IP65 Weatherproof Enclosure',
              electricalPhase: 'Single Phase 220V AC',
              specs: { 'Operation': '1 Timer Unit per Plant Kit', 'Program': 'Daily Auto Cycle' }
            }
          },
          {
            asin: 'AP-PUMP-06',
            sku: 'AE-PUMP-42LPM',
            productTitle: 'High-Pressure Booster Motor (42 LPM · 0.5 HP · Single Phase)',
            imageUrl: '/pump.webp',
            quantity: 1,
            unitPrice: 1700,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: '100% Copper Winding · SS Impeller',
              flowRateLpm: 42,
              motorHp: '0.5 HP',
              electricalPhase: 'Single Phase 220V/230V AC (50Hz)',
              specs: { 'Rating': '42 LPM Output · 0.5 HP · Single Phase 220V', 'Formula': '6 Panels × 7 LPM = 42 LPM' }
            }
          },
          {
            asin: 'AP-TEE-UPVC',
            sku: 'AE-TEE-UPVC-15MM',
            productTitle: 'UPVC Threaded Brass Insert Tees (Matches Sprinkler Count)',
            imageUrl: '/cpvc_upvc.webp',
            quantity: 6,
            unitPrice: 33,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'Schedule 80 UPVC with Brass Thread',
              size: '½" FPT × 20mm Socket',
              specs: { 'Ratio': 'Equal to Number of Sprinklers (6 Pcs)' }
            }
          }
        ]
      },
      {
        sku: 'AE-KIT-5KW',
        title: '5 kW Complete Solar Cleaning Combo Kit (10 Panels · 70 LPM Motor · Sized Hardware)',
        attributes: { material: 'Complete Kit', packSize: '5 kW Kit (10 Panels)' },
        mrp: 6999,
        b2cPrice: 4899,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 4899, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 4150, discountPercent: 15.3 },
          { minQty: 20, pricePerUnit: 3600, discountPercent: 26.5 }
        ],
        inventory: 150,
        barcode: '8908511626066',
        images: ['/solar_cleaning_fullset.webp'],
        weightGrams: 6400,
        dimensionsCm: { length: 45, width: 32, height: 22 },
        hsnCode: '84248990',
        gstRatePercent: 18,
        unitOfMeasure: 'SET',
        isComboVariant: true,
        solarKitConfig: {
          plantCapacityKw: 5,
          panelCount: 10,
          panelThicknessMm: 35,
          sprinklerPcs: 10,
          drainClipsPcs: 20,
          giClampsPcs: 10,
          timerPcs: 1,
          motorLpm: 70,
          motorHp: '1.0 HP',
          electricalPhase: 'Single Phase 220V/230V AC (50Hz)',
          upvcTeePcs: 10,
          localPipeNotice: 'Suggestion: Pipes and other common plumbing fittings are recommended to be purchased from your local hardware market for on-site cut-to-fit savings.'
        },
        comboComponents: [
          {
            asin: 'AP-SPRINKLER-180',
            sku: 'AE-SPRINKLER-180',
            productTitle: 'Apollo SS304 Shadowless Sprinkler (180° Curtain)',
            imageUrl: '/solar_sprinkler.webp',
            quantity: 10,
            unitPrice: 60,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'AISI SS304 Stainless Steel',
              flowRateLpm: 7,
              size: '½" BSP Thread',
              specs: { 'Ratio': '1 Sprinkler per Panel (10 Pcs)' }
            }
          },
          {
            asin: 'AP-CLIP-35MM',
            sku: 'AE-CLIP-35MM-SS',
            productTitle: 'Apollo SS304 Auto Drain Clips (Frame Thickness: 35mm)',
            imageUrl: '/Drain_clips.webp',
            quantity: 20,
            unitPrice: 20,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'AISI SS304 Corrosion-Proof',
              size: '35mm Frame Thickness',
              specs: { 'Ratio': '2 Clips per Panel (20 Pcs)' }
            }
          },
          {
            asin: 'AP-CLAMP-GI',
            sku: 'AE-CLAMP-GI-20MM',
            productTitle: 'Heavy Galvanized GI Piping Support Clamps',
            imageUrl: '/gi_pipe_clamp.webp',
            quantity: 10,
            unitPrice: 25,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'Hot-Dip Galvanized Iron (GI)',
              specs: { 'Ratio': '1 Clamp per Panel (10 Pcs)' }
            }
          },
          {
            asin: 'AP-TIMER-07',
            sku: 'AE-TIMER-PROG',
            productTitle: 'Apollo Digital Programmable Solar Cleaning Automation Controller',
            imageUrl: '/auto_timer.webp',
            quantity: 1,
            unitPrice: 850,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'IP65 Weatherproof Enclosure',
              electricalPhase: 'Single Phase 220V AC',
              specs: { 'Operation': '1 Timer Unit per Plant Kit' }
            }
          },
          {
            asin: 'AP-PUMP-06',
            sku: 'AE-PUMP-70LPM',
            productTitle: 'High-Pressure Booster Motor (70 LPM · 1.0 HP · Single Phase)',
            imageUrl: '/pump.webp',
            quantity: 1,
            unitPrice: 2400,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              flowRateLpm: 70,
              motorHp: '1.0 HP',
              electricalPhase: 'Single Phase 220V/230V AC (50Hz)',
              specs: { 'Rating': '70 LPM Output · 1.0 HP · Single Phase 220V', 'Formula': '10 Panels × 7 LPM = 70 LPM' }
            }
          },
          {
            asin: 'AP-TEE-UPVC',
            sku: 'AE-TEE-UPVC-15MM',
            productTitle: 'UPVC Threaded Brass Insert Tees (Matches Sprinkler Count)',
            imageUrl: '/cpvc_upvc.webp',
            quantity: 10,
            unitPrice: 33,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              specs: { 'Ratio': 'Equal to Number of Sprinklers (10 Pcs)' }
            }
          }
        ]
      },
      {
        sku: 'AE-KIT-10KW',
        title: '10 kW Industrial Solar Cleaning Combo Kit (20 Panels · 140 LPM Motor · Sized Hardware)',
        attributes: { material: 'Complete Kit', packSize: '10 kW Kit (20 Panels)' },
        mrp: 12999,
        b2cPrice: 8999,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 8999, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 7600, discountPercent: 15.5 },
          { minQty: 20, pricePerUnit: 6700, discountPercent: 25.5 }
        ],
        inventory: 90,
        barcode: '8908511626099',
        images: ['/solar_cleaning_fullset.webp'],
        weightGrams: 11200,
        dimensionsCm: { length: 55, width: 38, height: 28 },
        hsnCode: '84248990',
        gstRatePercent: 18,
        unitOfMeasure: 'SET',
        isComboVariant: true,
        solarKitConfig: {
          plantCapacityKw: 10,
          panelCount: 20,
          panelThicknessMm: 35,
          sprinklerPcs: 20,
          drainClipsPcs: 40,
          giClampsPcs: 20,
          timerPcs: 1,
          motorLpm: 140,
          motorHp: '2.0 HP',
          electricalPhase: 'Single Phase / 3-Phase 220V/415V',
          upvcTeePcs: 20,
          localPipeNotice: 'Suggestion: Pipes and other common plumbing fittings are recommended to be purchased from your local hardware market for on-site cut-to-fit savings.'
        },
        comboComponents: [
          {
            asin: 'AP-SPRINKLER-180',
            sku: 'AE-SPRINKLER-180',
            productTitle: 'Apollo SS304 Shadowless Sprinkler (180° Curtain)',
            imageUrl: '/solar_sprinkler.webp',
            quantity: 20,
            unitPrice: 60,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'AISI SS304 Stainless Steel',
              flowRateLpm: 7,
              specs: { 'Ratio': '1 Sprinkler per Panel (20 Pcs)' }
            }
          },
          {
            asin: 'AP-CLIP-35MM',
            sku: 'AE-CLIP-35MM-SS',
            productTitle: 'Apollo SS304 Auto Drain Clips (Frame Thickness: 35mm)',
            imageUrl: '/Drain_clips.webp',
            quantity: 40,
            unitPrice: 20,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              size: '35mm Frame Thickness',
              specs: { 'Ratio': '2 Clips per Panel (40 Pcs)' }
            }
          },
          {
            asin: 'AP-CLAMP-GI',
            sku: 'AE-CLAMP-GI-20MM',
            productTitle: 'Heavy Galvanized GI Piping Support Clamps',
            imageUrl: '/gi_pipe_clamp.webp',
            quantity: 20,
            unitPrice: 25,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              specs: { 'Ratio': '1 Clamp per Panel (20 Pcs)' }
            }
          },
          {
            asin: 'AP-TIMER-07',
            sku: 'AE-TIMER-PROG',
            productTitle: 'Apollo Digital Programmable Solar Cleaning Automation Controller',
            imageUrl: '/auto_timer.webp',
            quantity: 1,
            unitPrice: 850,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              material: 'IP65 Weatherproof Enclosure',
              electricalPhase: 'Single Phase 220V AC',
              specs: { 'Operation': '1 Timer Unit per Plant Kit' }
            }
          },
          {
            asin: 'AP-PUMP-06',
            sku: 'AE-PUMP-140LPM',
            productTitle: 'High-Pressure Booster Motor (140 LPM · 2.0 HP · Single/3-Phase)',
            imageUrl: '/pump.webp',
            quantity: 1,
            unitPrice: 4200,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              flowRateLpm: 140,
              motorHp: '2.0 HP',
              electricalPhase: 'Single Phase / 3-Phase 220V/415V',
              specs: { 'Rating': '140 LPM Output · 2.0 HP', 'Formula': '20 Panels × 7 LPM = 140 LPM' }
            }
          },
          {
            asin: 'AP-TEE-UPVC',
            sku: 'AE-TEE-UPVC-15MM',
            productTitle: 'UPVC Threaded Brass Insert Tees (Matches Sprinkler Count)',
            imageUrl: '/cpvc_upvc.webp',
            quantity: 20,
            unitPrice: 33,
            unitOfMeasure: 'PCS',
            technicalDetails: {
              specs: { 'Ratio': 'Equal to Number of Sprinklers (20 Pcs)' }
            }
          }
        ]
      }
    ],
    sellerListings: {
      'AE-KIT-3KW': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 160,
          fulfillmentType: 'FBF',
          price: 3499,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 180,
          isWinningBuyBox: true,
          buyBoxScore: 99.4
        }
      ],
      'AE-KIT-5KW': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 160,
          fulfillmentType: 'FBF',
          price: 4899,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 150,
          isWinningBuyBox: true,
          buyBoxScore: 99.2
        }
      ],
      'AE-KIT-10KW': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 160,
          fulfillmentType: 'FBF',
          price: 8999,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 90,
          isWinningBuyBox: true,
          buyBoxScore: 99.0
        }
      ]
    },
    aPlusContent: []
  },
  {
    asin: 'AP-PUMP-06',
    title: 'Submersible Pump (0.5 HP) (Stainless Steel Body · Copper Winding)',
    brand: 'Apollo Engineering',
    category: 'POWER SERIES',
    subCategory: 'Solar Pumps',
    description: 'Power your automated cleaning system with our high-efficiency 0.5 HP Submersible Pump. Specifically selected for solar sprinkler applications, this pump provides the ideal balance of pressure and flow rate to operate up to 50 sprinklers simultaneously with reliability.',
    highlights: [
      '100% Copper Winding — Superior efficiency and service life',
      'SS304 Shell — Maximum protection against water',
      'Thermal Overload Protector — Prevents motor burnout',
      'Low Power Consumption — Ideal for solar-powered sites',
      'High Head Range — Pumps water up to 30 metres height'
    ],
    rating: 4.9,
    reviewCount: 110,
    isLive: true,
    badges: ['PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'AE-PUMP-05HP',
    variants: [
      {
        sku: 'AE-PUMP-05HP',
        title: '0.5 HP Single Phase Submersible Solar Wash Pump (SS304 Body)',
        attributes: { material: 'Stainless Steel / Copper Winding', packSize: 'Single Unit', specs: { power: '0.5 HP / 0.37 kW', voltage: '220V AC', maxHead: '32 Metres', maxFlow: '45 LPM' } },
        mrp: 6800,
        b2cPrice: 4200,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 4200, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 3650, discountPercent: 13.0 },
          { minQty: 20, pricePerUnit: 3150, discountPercent: 25.0 }
        ],
        inventory: 150,
        barcode: '8908511626073',
        images: ['/pump.webp'],
        weightGrams: 6500,
        dimensionsCm: { length: 42, width: 14, height: 14 },
        hsnCode: '84137010',
        gstRatePercent: 18
      }
    ],
    sellerListings: {
      'AE-PUMP-05HP': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 110,
          fulfillmentType: 'FBF',
          price: 4200,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 150,
          isWinningBuyBox: true,
          buyBoxScore: 98.5
        }
      ]
    },
    aPlusContent: []
  },
  {
    asin: 'AP-TIMER-07',
    title: 'Digital Auto Timer (Digital Control System)',
    brand: 'Apollo Engineering',
    category: 'CONTROL SERIES',
    subCategory: 'Automation Controls',
    description: 'Automate your solar cleaning schedule with our precision Digital Auto Timer. Designed for industrial reliability, this programmable switch allows you to set exact cleaning intervals, ensuring panels are washed at the optimal time of day — completely hands-free.',
    highlights: [
      'Programmable Intervals — Set daily or weekly cycles',
      'Digital Display — Easy-to-read LCD for precise scheduling',
      'Battery Backup — Retains settings during power outages',
      'Manual Override — Switch to manual mode instantly',
      'High Load Capacity — Supports pumps up to 2 HP directly'
    ],
    rating: 4.8,
    reviewCount: 95,
    isLive: true,
    badges: ['PRIME', 'B2B_BULK'],
    createdAt: '2025-01-01T00:00:00Z',
    selectedVariantSku: 'AE-TIMER-DIGITAL',
    variants: [
      {
        sku: 'AE-TIMER-DIGITAL',
        title: 'Industrial DIN-Rail Digital Time Switch (220-240V AC / 100+ Hr Backup)',
        attributes: { material: 'Digital Control System', packSize: 'Single Unit', specs: { type: 'Digital Time Switch', voltage: '220–240V AC', display: 'LCD Digital', mounting: 'DIN Rail' } },
        mrp: 2200,
        b2cPrice: 1350,
        b2bTierPricing: [
          { minQty: 1, maxQty: 4, pricePerUnit: 1350, discountPercent: 0 },
          { minQty: 5, maxQty: 19, pricePerUnit: 1150, discountPercent: 14.8 },
          { minQty: 20, pricePerUnit: 980, discountPercent: 27.4 }
        ],
        inventory: 350,
        barcode: '8908511626080',
        images: ['/auto_timer.webp'],
        weightGrams: 300,
        dimensionsCm: { length: 12, width: 8, height: 8 },
        hsnCode: '91070000',
        gstRatePercent: 18
      }
    ],
    sellerListings: {
      'AE-TIMER-DIGITAL': [
        {
          sellerId: 'seller_apollo_mfg',
          sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
          rating: 4.9,
          ratingCount: 95,
          fulfillmentType: 'FBF',
          price: 1350,
          shippingFee: 0,
          deliveryDays: 1,
          stock: 350,
          isWinningBuyBox: true,
          buyBoxScore: 98.9
        }
      ]
    },
    aPlusContent: []
  }
];

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

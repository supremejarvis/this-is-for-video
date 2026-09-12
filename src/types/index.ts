export type AppMode = 'B2C' | 'B2B' | 'ADMIN';

export type UserRole =
  | 'B2C_CUSTOMER'
  | 'B2B_ADMIN'
  | 'B2B_APPROVER'
  | 'B2B_BUYER'
  | 'SUPER_ADMIN'
  | 'GUEST'
  | 'OWNER'
  | 'SUPPORT'
  | 'AUDITOR';

export type AuthStatus = 'AUTH_CHECKING' | 'AUTHENTICATED' | 'GUEST';

export type QuoteStatus =
  | 'EMPTY_CART'
  | 'QUOTE_REQUIRED'
  | 'QUOTE_LOADING'
  | 'QUOTE_VALID'
  | 'QUOTE_ERROR'
  | 'QUOTE_EXPIRED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isPrime: boolean;
  b2bOrgId?: string;
  createdAt: string;
}

export interface B2BOrganization {
  id: string;
  companyName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  cin?: string;
  stateCode: string;
  isGstVerified: boolean;
  creditLimit: number;
  creditUsed: number;
  creditTerms: 'PREPAID' | 'NET_30' | 'NET_60' | 'NET_90';
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  spendingThresholdForApproval: number;
  members: B2BMember[];
}

export interface B2BMember {
  userId: string;
  name: string;
  email: string;
  role: 'B2B_ADMIN' | 'B2B_APPROVER' | 'B2B_BUYER';
  department: string;
  spendingLimit: number;
}

export interface PostOfficeInfo {
  name: string;
  branchType: string;
  deliveryStatus: string;
  circle: string;
  district: string;
  state: string;
  facilityId: string;
}

export interface DeliveryAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE';
  flatBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  postOffice: PostOfficeInfo;
  city: string;
  state: string;
  stateCode: string;
  isDefault: boolean;
  gstin?: string;
  dockInstructions?: string;
}

export interface ProductVariant {
  sku: string;
  title: string;
  attributes: {
    color?: string;
    size?: string;
    packSize?: string;
    material?: string;
    style?: string;
    specs?: Record<string, string>;
  };
  mrp: number;
  b2cPrice: number;
  b2bMoq?: number;
  b2bTierPricing: {
    minQty: number;
    maxQty?: number;
    pricePerUnit: number;
    discountPercent: number;
  }[];
  inventory: number;
  barcode: string;
  images: string[];
  videoUrl?: string;
  weightGrams: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  hsnCode: string;
  gstRatePercent: number;
  unitOfMeasure?: 'PCS' | 'NOS' | 'SET' | 'KG' | 'LTR' | 'MTR' | 'PAC' | 'BOX' | 'ROLL';
  flipkartFsn?: string;
  lowStockThreshold?: number;
  packageDimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  isComboVariant?: boolean;
  comboComponents?: ComboComponentItem[];
  solarKitConfig?: {
    plantCapacityKw?: number;
    panelCount?: number;
    panelThicknessMm?: number;
    sprinklerPcs?: number;
    drainClipsPcs?: number;
    giClampsPcs?: number;
    timerPcs?: number;
    motorLpm?: number;
    motorHp?: string;
    electricalPhase?: string;
    upvcTeePcs?: number;
    localPipeNotice?: string;
  };
}

export interface ComboComponentItem {
  asin: string;
  sku: string;
  productTitle: string;
  variantTitle?: string;
  imageUrl?: string;
  quantity: number; // Fixed for customer; cannot be altered individually
  unitPrice?: number; // e.g. 60 (for 6 pcs × ₹60 = ₹360)
  unitOfMeasure?: string;
  technicalDetails?: {
    material?: string;
    flowRateLpm?: number;
    motorHp?: string;
    electricalPhase?: string;
    size?: string;
    hsnCode?: string;
    specs?: Record<string, string>;
  };
}

export interface SellerListing {
  sellerId: string;
  sellerName: string;
  rating: number;
  ratingCount: number;
  fulfillmentType: 'FBF' | 'FBM';
  price: number;
  shippingFee: number;
  deliveryDays: number;
  stock: number;
  isWinningBuyBox: boolean;
  buyBoxScore: number;
  gstin?: string;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

export interface APlusModule {
  id: string;
  type: 'HERO_BANNER' | 'TECHNICAL_SPECS' | 'COMPARISON_TABLE' | 'FEATURE_HIGHLIGHTS' | 'APPLICATION_SHOWCASE';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  content?: string;
  data?: Record<string, unknown>;
}

export interface Product {
  asin: string;
  title: string;
  brand: string;
  category: string;
  subCategory: string;
  description: string;
  highlights: string[];
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  selectedVariantSku: string;
  videoUrl?: string;
  sellerListings: Record<string, SellerListing[]>;
  aPlusContent: APlusModule[];
  badges: ('BEST_SELLER' | 'APE_CHOICE' | 'PRIME' | 'B2B_BULK' | 'DEAL_OF_DAY' | 'ENTERPRISE_ASSURED' | 'FLIPKART_ASSURE')[];
  isLive: boolean;
  createdAt?: string;
  lastUpdated?: string;
  modelNumber?: string;
  partNumber?: string;
  countryOfOrigin?: string;
  targetAudience?: string[];
  includedComponents?: string;
  isComboBundle?: boolean;
  comboFormulaEnabled?: boolean;
  handlingTimeDays?: number;
  isCodAllowed?: boolean;
  maxOrderQuantity?: number;
  b2bMoq?: number;
  returnPolicy?: string;
  keywords?: string[];
  unitOfMeasure?: string;
}

export interface CartItem {
  sku: string;
  productId?: string;
  variantId?: string;
  asin?: string;
  title?: string;
  parentAsin: string;
  productTitle: string;
  variantTitle: string;
  attributes: Record<string, string>;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  gstRate: number;
  hsnCode: string;
  unitOfMeasure?: string;
  sellerId: string;
  sellerName: string;
  fulfillmentType: 'FBF' | 'FBM';
  weightGrams: number;
  isB2BPricingApplied: boolean;
  isUnavailable?: boolean;
  unavailableReason?: string;
}

export interface SplitShipmentPackage {
  packageId: string;
  sellerId: string;
  sellerName: string;
  fulfillmentType: 'FBF' | 'FBM';
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  estimatedDeliveryDate: string;
  speedPostService: 'SPEED_POST_NATIONAL' | 'SPEED_POST_LOCAL' | 'SPEED_POST_METRO';
}

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROCESSING_PICK_PACK'
  | 'AWB_GENERATED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_ATTEMPT_FAILED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED_REFUNDED';

export interface TrackingMilestone {
  status: string;
  timestamp: string;
  location: string;
  description: string;
  isCompleted: boolean;
}

export interface IndiaPostBookingDetail {
  articleNumber: string;
  originPincode: string;
  originHubName: string;
  destinationPincode: string;
  destinationPostOffice: string;
  bookingTimestamp: string;
  weightGrams: number;
  chargeableWeightGrams: number;
  tariffAmount: number;
  gstAmount: number;
  totalPostage: number;
  barcode128: string;
  manifestId: string;
  carrier: 'INDIA_POST_SPEED_POST';
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: 'B2C' | 'B2B';
  b2bOrgId?: string;
  gstin?: string;
  isInputTaxCreditClaimed: boolean;
  deliveryAddress: DeliveryAddress;
  shipments: {
    packageId: string;
    sellerId: string;
    sellerName: string;
    items: CartItem[];
    shippingDetail: IndiaPostBookingDetail;
    status: OrderStatus;
    milestones: TrackingMilestone[];
    pickupDetail?: {
      slot: string;
      date: string;
      courier: string;
      manifestId?: string;
      scheduledAt?: string;
    };
  }[];
  pricingSummary: {
    itemsTotal: number;
    discountTotal: number;
    taxableValue: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    shippingTotal: number;
    codFee?: number;
    grandTotal: number;
  };
  paymentDetail: {
    method: 'RAZORPAY' | 'UPI' | 'CREDIT_DEBIT_CARD' | 'NET_BANKING' | 'NET_30_PO' | 'COD';
    transactionId: string;
    paymentStatus: 'PAID' | 'PENDING_PO_APPROVAL' | 'COD_VERIFIED';
    paidAt?: string;
    idempotencyKey: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  };
  poDocumentUrl?: string;
  poApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface GstReportRow {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  gstin: string;
  orderType: 'B2B' | 'B2C_LARGE' | 'B2C_SMALL';
  placeOfSupply: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
  hsnCode: string;
  tcsDeducted: number;
}

// ─────────────────────────────────────────────────────────────
// OFFICIAL INDIA POST CEPT REST API INTERFACES
// ─────────────────────────────────────────────────────────────

export interface CeptAuthTokenData {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  session_state: string;
  scope: string;
}

export interface CeptAuthResponse {
  success: boolean;
  data: CeptAuthTokenData;
}

export interface CeptPincodeOffice {
  pincode: number;
  office_name: string;
  office_id: string;
  office_type_code: string;
  state_name: string;
  delivery_office_flag: boolean;
  city_name: string;
  taluk_name: string;
  village_name?: string;
  is_rolled_out: boolean;
  spds_id?: string;
  idc_id?: number;
}

export interface CeptPincodeSearchResponse {
  status_code: number;
  success: boolean;
  message: string;
  skip: number;
  limit: number;
  returned_records_count: number;
  data: CeptPincodeOffice[];
}

export interface CeptSpeedPostTariffRequest {
  productCode?: 'SP' | string;
  weight: number;
  sourcePincode: string;
  destinationPincode: string;
  length?: number;
  width?: number;
  height?: number;
  ins?: number;
  pod?: 'YES' | 'NO';
  reg?: 'YES' | 'NO';
  otp?: 'YES' | 'NO';
}

export interface CeptSpeedPostTariffResponse {
  success: boolean;
  product_code: string;
  article_type: string;
  weight: number;
  chargeable_weight: number;
  source_pincode: string;
  destination_pincode: string;
  is_local: boolean;
  distance_km: number;
  base_tariff: number;
  vas_charges: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  final_amount: number;
  currency: string;
  is_document?: boolean;
  delivery_type: string;
  timestamp: string;
}

export interface CeptProcessArticleItem {
  bulk_customer_id: number;
  contract_id: number;
  barcode_no: string;
  pickup_or_dropoff: 'DROPOFF' | 'PICKUP';
  pickup_dropoff_office_id: number;
  article_type: 'SP' | string;
  physical_weight: number;
  shape_of_article: 'NROL' | 'ROL' | string;
  length: number;
  breadth_diameter: number;
  height: number;
  priority_flag: boolean;
  delivery_instruction: 'ND' | string;
  delivery_slot?: string;
  instruction_rts: 'RTS' | string;
  sender_name: string;
  sender_company: string;
  sender_add_line_1: string;
  sender_add_line_2: string;
  sender_city: string;
  sender_state: string;
  sender_pincode: string;
  sender_emailid: string;
  sender_alt_contact?: string;
  sender_kyc?: string;
  sender_tax_reference?: string;
  sender_mobile_no: string;
  receiver_name: string;
  receiver_company?: string;
  receiver_add_line_1: string;
  receiver_add_line_2: string;
  receiver_city: string;
  receiver_state: string;
  receiver_pincode: string;
  receiver_emailid?: string;
  receiver_alt_contact?: string;
  receiver_mobile_no: string;
  drop_off_pincode: string;
  alt_address_flag?: boolean;
  pickup_address_flag?: boolean;
  codr_cod?: 'COD' | 'PREPAID' | string;
  value_for_codr_cod?: number;
  ack?: boolean;
  reg?: boolean;
  otp?: boolean;
  bulk_reference?: string;
}

export interface CeptProcessArticlesResponse {
  success: boolean;
  batch_id: string;
  custom_id: string;
  mail_booking_dom_id: number;
  correlation_id: string;
  timestamp: string;
  input_method: string;
  total: number;
  processed: number;
  valid_articles: {
    barcode_no: string;
    index: number;
    timestamp: string;
    calculated_tariff: number;
    currency: string;
  }[];
  error_articles?: {
    barcode_no: string;
    index: number;
    errors: string[];
  }[];
  summary: {
    success_count: number;
    error_count: number;
    total_tariff_amount: number;
  };
}

export interface CeptTrackingHistoryEvent {
  timestamp: string;
  location: string;
  status: string;
}

export interface CeptTrackingResponse {
  success: boolean;
  data: {
    trackingNumber: string;
    currentStatus: string;
    origin: string;
    destination: string;
    history: CeptTrackingHistoryEvent[];
    estimatedDelivery?: string;
  };
}

export interface CeptBulkTrackingResponse {
  status_code: number;
  success: boolean;
  message: string;
  data: {
    booking_details: {
      article_number: string | null;
      booked_at: string | null;
      booked_on: string | null;
      origin_pincode: string | null;
      destination_pincode: string | null;
      tariff: number;
      article_type: string | null;
      delivery_location: string | null;
      delivery_confirmed_on: string | null;
    };
    tracking_details: {
      events: CeptTrackingHistoryEvent[];
    };
    del_status: {
      del_status: string;
    };
  }[];
}

export interface CeptDomesticLabelRequest {
  identifier: string;
  delivery_office_name: string;
  booking_datetime: string;
  channel_type: string;
  user_type: string;
  user_id: number;
  barcode_no: string;
  service_type: string;
  booking_type: string;
  customer_id: number;
  article_length: string;
  article_breadth: string;
  article_height: string;
  prepaid_flag: boolean;
  prepaid_type?: string;
  prepaid_value?: number | null;
  vpcod_type?: string;
  vpcod_value?: number;
  insurance_flag: boolean;
  insurance_value: number;
  physical_weight: number;
  volumetric_weight: number;
  recipient_name: string;
  recipient_mobile: string;
  recipient_addressl1: string;
  recipient_addressl2: string;
  recipient_addressl3?: string;
  recipient_city: string;
  recipient_pin: string;
  recipient_state: string;
  sender_name: string;
  sender_mobile: string;
  sender_addressl1: string;
  sender_addressl2: string;
  sender_addressl3?: string;
  sender_city: string;
  sender_pin: string;
  sender_state: string;
  transmission_mode?: string;
  payment_mode?: string;
  routing_data: string;
  booking_office_name?: string;
  booking_office_pin: string;
  size: 'A7' | 'A6' | 'A4' | string;
  total_amount: number;
  value_added_services?: string;
}

// ─────────────────────────────────────────────────────────────
// WISHLIST / SAVE FOR LATER
// ─────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  asin: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  imageUrl: string;
  price: number;
  mrp: number;
  addedAt: string;
}

// ─────────────────────────────────────────────────────────────
// PRODUCT REVIEWS & RATINGS
// ─────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string;
  asin: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// COUPONS & DISCOUNTS
// ─────────────────────────────────────────────────────────────

export type CouponType = 'PERCENTAGE' | 'FLAT_AMOUNT' | 'FREE_SHIPPING';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableCategories?: string[];
}

// ─────────────────────────────────────────────────────────────
// RETURN / REFUND MANAGEMENT
// ─────────────────────────────────────────────────────────────

export type ReturnReason =
  | 'DEFECTIVE_PRODUCT'
  | 'WRONG_ITEM_DELIVERED'
  | 'ITEM_DAMAGED_IN_TRANSIT'
  | 'NOT_AS_DESCRIBED'
  | 'SIZE_FIT_ISSUE'
  | 'CHANGED_MIND'
  | 'QUALITY_NOT_SATISFACTORY'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'RECEIVED_AT_WAREHOUSE'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'REJECTED';

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  items: {
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }[];
  reason: ReturnReason;
  reasonDetails?: string;
  images?: string[];
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: 'ORIGINAL_PAYMENT' | 'STORE_CREDIT' | 'BANK_TRANSFER';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

// ─────────────────────────────────────────────────────────────
// ADMIN ROLES & AUDIT LOGGING (ENTERPRISE RBAC)
// ─────────────────────────────────────────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'WAREHOUSE_DISPATCH' | 'ACCOUNTANT';

export type AuditActionType = 
  | 'STOCK_UPDATE' 
  | 'PRICE_UPDATE' 
  | 'MOQ_UPDATE' 
  | 'ORDER_DISPATCH' 
  | 'COUPON_CREATED' 
  | 'GSTIN_VERIFIED'
  | 'STATUS_CHANGE';

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  actionType: AuditActionType;
  entityId: string;
  entityTitle: string;
  oldValue: string | number;
  newValue: string | number;
  notes?: string;
}

export interface PaymentReconciliationRecord {
  id: string;
  date: string;
  orderNumber: string;
  customerName: string;
  method: 'RAZORPAY_PREPAID' | 'COD' | 'DIRECT_UPI_NEFT';
  grossAmount: number;
  gatewayFee: number;
  gatewayGst: number;
  netSettlement: number;
  status: 'SETTLED' | 'PENDING_SETTLEMENT' | 'IN_TRANSIT' | 'RECONCILED';
  settlementDate?: string;
  referenceId: string;
}

// ─────────────────────────────────────────────────────────────
// SOLAR CONTRACTOR INQUIRIES & CALL LOG
// ─────────────────────────────────────────────────────────────

export type InquiryStatus = 'NEW' | 'FOLLOW_UP' | 'QUOTATION_SENT' | 'CONVERTED' | 'CLOSED';

export interface SolarContractorInquiry {
  id: string;
  contractorName: string;
  firmName: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  panelBrand: string; // e.g. 'Adani Solar 550W Bifacial', 'Waaree 540W Mono PERC'
  recommendedFrameThickness: '30mm' | '35mm' | '40mm';
  productOfInterest: string; // e.g. 'SS304 Water Drain Clips', 'Solar Mid Clamps'
  estimatedQty: number;
  status: InquiryStatus;
  notes: string;
  nextFollowUpDate: string;
  createdAt: string;
  lastContactedAt: string;
}


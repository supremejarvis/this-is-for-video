/**
 * Apollo Engineering Micro API Services Registry
 * 
 * Central export of all micro API clients:
 * - apiClient: Core resilient HTTP client with CSRF and backoff
 * - authApi: Authentication, session management, and MSG91 OTP
 * - catalogApi: PostgreSQL-backed product and variant catalog
 * - quoteApi: Authoritative statutory GST and Speed Post quotes
 * - orderApi: Order placement, tracking, and state machine updates
 * - paymentApi: Razorpay orders and server-side signature verification
 * - inventoryApi: Live stock ledger and reservation inspection
 * - pricingApi: Temporal price versions and authoritative calculation
 */

export { apiClient, ApiClient, ApiError } from './client';
export type { ApiResponse, RequestOptions } from './client';

export { authApi, AuthApi } from './authApi';
export type { AuthUser, LoginResponse, AdminLoginRequest, SendOtpRequest, SendOtpResponse, VerifyOtpResponse } from './authApi';

export { catalogApi, CatalogApi } from './catalogApi';

export { quoteApi, QuoteApi } from './quoteApi';

export { orderApi, OrderApi } from './orderApi';
export type { CreateOrderPayload, BackendOrderResponse, UpdateOrderStatusPayload } from './orderApi';

export { paymentApi, PaymentApi } from './paymentApi';
export type { RazorpayOrderResponse, RazorpayVerifyPayload, RazorpayVerifyResponse, PaymentStatusResponse } from './paymentApi';

export { inventoryApi, InventoryApi } from './inventoryApi';
export type { InventoryItemDto, InventoryReceiptPayload, InventoryAdjustmentPayload } from './inventoryApi';

export { pricingApi, PricingApi } from './pricingApi';
export type { ActivePriceQuery, PriceVersionDto, OrderCalculationRequest, OrderCalculationResult } from './pricingApi';

export { systemApi, SystemApi } from './systemApi';
export type { SystemStatusResponse, CircuitBreakerStatus, BackgroundWorkersStatus, CacheStatus } from './systemApi';

export { adminCatalogApi, AdminCatalogApiClient } from './adminCatalogApi';
export type { AdminCategory, AdminAttribute, AdminAttributeValue, AdminProductListItem, AdminVariantListItem, CombinationPreviewResponse, BatchGenerateItem, ImportReport } from './adminCatalogApi';

export { adminPricingApi, AdminPricingApiClient } from './adminPricingApi';
export type { CustomerGroup, PriceList, PriceRule, TaxProfile, TaxRule, PricingPreviewRequest, PricingPreviewResult } from './adminPricingApi';

export { adminInventoryApi } from './adminInventoryApi';
export type { Warehouse, StockBalanceItem, StockBalanceListResponse, StockAdjustmentRequest, StockAdjustmentResponse, StockTransfer, StockCount } from './adminInventoryApi';

export { adminOrderApi } from './adminOrderApi';
export type { AdminOrderListItem, AdminOrderListResponse, AdminOrderDetailResponse, SagaInstanceDetail, SagaStepItem } from './adminOrderApi';

export { adminShippingApi } from './adminShippingApi';
export type { ShippingRateCard, ShippingRateSlab, ShippingQuoteRequest, ShippingQuoteResponse, ShipmentBookingRequest, ShipmentBookingResponse, ShipmentDetail, TrackingEvent, DispatchManifestResponse } from './adminShippingApi';

export { adminPaymentApi } from './adminPaymentApi';
export type { PaymentItem, PaymentReconciliationItem, PaymentReconciliationSummary, RefundResponse } from './adminPaymentApi';

export { adminReturnsApi } from './adminReturnsApi';
export type { ReturnCase, ReturnItem, ReturnReceiveItemSpec } from './adminReturnsApi';

export { adminAccountingApi } from './adminAccountingApi';
export type {
  AccountItem,
  FiscalPeriodItem,
  InvoiceRecord,
  InvoiceLineItem,
  JournalRecord,
  JournalLineItem,
  TrialBalanceReport,
  TrialBalanceItem,
  ProfitAndLossReport,
  GstSubledgerReport,
  GstSubledgerItem,
} from './adminAccountingApi';

// High-Level Domain Services
export { ProductService, productService, slugify } from '../product.service';
export { OrderService, orderService } from '../order.service';
export { CartService } from '../cart.service';
export type { CartCalculationResult } from '../cart.service';
export { CatalogService } from '../catalogService';
export type { ApiProduct, ApiProductVariant, FitMode } from '../catalogService';

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

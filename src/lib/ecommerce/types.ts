/**
 * Apollo Engineering — Enterprise E-Commerce Provider & Safety Interfaces
 */

export type OrderLifecycleState =
  | 'DRAFT'
  | 'PAYMENT_PENDING'
  | 'RECONCILIATION_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REPLACEMENT_REQUESTED'
  | 'REPLACEMENT_APPROVED'
  | 'REPLACED';

export interface PaymentVerificationResult {
  isVerified: boolean;
  transactionId?: string;
  paymentId?: string;
  orderId?: string;
  signatureMatch: boolean;
  errorMessage?: string;
}

export interface PaymentProvider {
  name: string;
  isSandbox: boolean;
  createPaymentOrder: (amountPaise: number, orderNumber: string) => Promise<{ gatewayOrderId: string }>;
  verifyCheckoutSignature: (orderId: string, paymentId: string, signature: string) => boolean;
  verifyWebhookSignature: (rawBody: string, receivedSignature: string) => boolean;
}

export interface ShippingRateRequest {
  originPincode: string;
  destinationPincode: string;
  weightGrams: number;
  isPrepaid: boolean;
}

export interface ShippingRateResponse {
  provider: string;
  baseShipping: number;
  shippingGstRate: number; // Strictly 0.18
  shippingGstAmount: number;
  shippingTotal: number;
  estimatedDays: number;
  serviceable: boolean;
}

export interface ShippingProvider {
  name: string;
  isSandbox: boolean;
  calculateRate: (request: ShippingRateRequest) => Promise<ShippingRateResponse>;
  createBooking: (orderId: string, destinationPincode: string, weightGrams: number) => Promise<{ trackingNumber: string; labelUrl?: string }>;
}

export interface NotificationProvider {
  name: string;
  isSandbox: boolean;
  sendOrderConfirmation: (phone: string, orderNumber: string, amount: number) => Promise<boolean>;
  sendDispatchAlert: (phone: string, orderNumber: string, trackingNumber: string) => Promise<boolean>;
}

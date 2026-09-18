/**
 * Apollo Engineering Payments Micro API Service
 * 
 * Endpoints:
 * - POST /api/v1/payments/razorpay/create-order -> Create Razorpay payment order
 * - POST /api/v1/payments/razorpay/verify       -> Server-side signature verification
 * - GET  /api/v1/payments/status/{order_id}     -> Fetch payment capture status
 */

import { apiClient } from './client';

export interface RazorpayOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface RazorpayVerifyPayload {
  order_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
}

export interface RazorpayVerifyResponse {
  verified: boolean;
  message?: string;
  payment_id?: string;
}

export interface PaymentStatusResponse {
  order_id: string;
  payment_status: string;
  amount_paid: number;
  transaction_id?: string;
}

export class PaymentApi {
  /**
   * Create an authoritative Razorpay payment order tied to a PostgreSQL order
   */
  public async createRazorpayOrder(orderId: string): Promise<RazorpayOrderResponse> {
    return apiClient.post<RazorpayOrderResponse>('/payments/razorpay/create-order', {
      order_id: orderId,
    });
  }

  /**
   * Verify Razorpay cryptographic signature on backend
   */
  public async verifyRazorpayPayment(payload: RazorpayVerifyPayload): Promise<RazorpayVerifyResponse> {
    return apiClient.post<RazorpayVerifyResponse>('/payments/razorpay/verify', payload);
  }

  /**
   * Get payment status of an order
   */
  public async getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    return apiClient.get<PaymentStatusResponse>(`/payments/status/${encodeURIComponent(orderId)}`);
  }
}

export const paymentApi = new PaymentApi();

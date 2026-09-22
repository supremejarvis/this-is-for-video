/**
 * Admin Payments, Webhook Tracking & Reconciliation API Client
 */
import { apiClient } from './client';

export interface PaymentItem {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id?: string;
  amount: string;
  status: string;
  created_at: string;
}

export interface PaymentReconciliationItem {
  payment_id: string;
  order_id: string;
  order_number: string;
  provider: string;
  provider_payment_id?: string;
  amount: string;
  status: string;
  invoice_number?: string;
  allocated_amount: string;
  unallocated_balance: string;
  created_at: string;
}

export interface PaymentReconciliationSummary {
  total_payments_count: number;
  total_captured_amount: string;
  total_allocated_amount: string;
  total_unallocated_amount: string;
  total_refunded_amount: string;
  items: PaymentReconciliationItem[];
}

export interface RefundResponse {
  refund_id: string;
  payment_id: string;
  order_id: string;
  amount: string;
  currency: string;
  status: string;
  provider_reference: string;
  created_at: string;
}

export const adminPaymentApi = {
  getPayments: async (statusFilter?: string): Promise<PaymentItem[]> => {
    const url = statusFilter
      ? `/admin/payments?status=${encodeURIComponent(statusFilter)}`
      : '/admin/payments';
    return apiClient.get<PaymentItem[]>(url);
  },

  verifyUpi: async (paymentId: string, utrNumber: string, notes?: string): Promise<PaymentItem> => {
    return apiClient.post<PaymentItem>(`/admin/payments/${paymentId}/verify-upi`, {
      utr_number: utrNumber,
      notes,
    });
  },

  issueRefund: async (req: {
    order_id: string;
    payment_id: string;
    amount: string;
    reason: string;
    idempotency_key: string;
  }): Promise<RefundResponse> => {
    return apiClient.post<RefundResponse>('/admin/payments/refund', req);
  },

  getReconciliation: async (): Promise<PaymentReconciliationSummary> => {
    return apiClient.get<PaymentReconciliationSummary>('/admin/payments/reconciliation');
  },
};

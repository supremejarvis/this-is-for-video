/**
 * Admin Enterprise Order Management & Saga API Client
 */
import { apiClient } from './client';

export interface AdminOrderItemSnapshot {
  id: string;
  sku: string;
  quantity: number;
  unit_price: string;
  line_gross: string;
  taxable_base: string;
  product_gst: string;
  gst_rate: string;
}

export interface AdminOrderAddressSnapshot {
  id: string;
  address_type: string;
  full_name: string;
  phone: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  company_name?: string;
  gstin?: string;
}

export interface SagaStepItem {
  id: string;
  step_name: string;
  command_id: string;
  status: 'PENDING' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'COMPENSATED';
  attempts: number;
  result_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface SagaInstanceDetail {
  id: string;
  order_id: string;
  state: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'COMPENSATING' | 'FAILED';
  current_step: string;
  version: number;
  deadline: string;
  last_error?: string;
  steps: SagaStepItem[];
}

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  fulfilment_status: string;
  subtotal_taxable: string;
  product_gst: string;
  shipping_base: string;
  shipping_gst: string;
  cod_surcharge: string;
  total_payable: string;
  currency: string;
  customer_name?: string;
  customer_phone?: string;
  company_name?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderListResponse {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminOrderDetailResponse {
  id: string;
  order_number: string;
  quote_id?: string;
  version: number;
  order_status: string;
  payment_status: string;
  fulfilment_status: string;
  replacement_status: string;
  subtotal_taxable: string;
  product_gst: string;
  shipping_base: string;
  shipping_gst: string;
  cod_surcharge: string;
  total_payable: string;
  currency: string;
  user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  company_name?: string;
  gstin?: string;
  created_at: string;
  updated_at: string;
  items: AdminOrderItemSnapshot[];
  address?: AdminOrderAddressSnapshot;
  saga?: SagaInstanceDetail;
}

export const adminOrderApi = {
  async listOrders(params?: {
    order_status?: string;
    payment_status?: string;
    fulfilment_status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AdminOrderListResponse> {
    const query = new URLSearchParams();
    if (params?.order_status) query.append('order_status', params.order_status);
    if (params?.payment_status) query.append('payment_status', params.payment_status);
    if (params?.fulfilment_status) query.append('fulfilment_status', params.fulfilment_status);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    return apiClient.get<AdminOrderListResponse>(`/admin/orders?${query.toString()}`);
  },

  async getOrderDetail(idOrNumber: string): Promise<AdminOrderDetailResponse> {
    return apiClient.get<AdminOrderDetailResponse>(`/admin/orders/${idOrNumber}`);
  },

  async confirmOrder(
    orderId: string,
    data?: { payment_reference?: string; notes?: string }
  ): Promise<AdminOrderDetailResponse> {
    return apiClient.post<AdminOrderDetailResponse>(`/admin/orders/${orderId}/confirm`, data || {});
  },

  async cancelOrder(orderId: string, data: { reason: string }): Promise<AdminOrderDetailResponse> {
    return apiClient.post<AdminOrderDetailResponse>(`/admin/orders/${orderId}/cancel`, data);
  },
};

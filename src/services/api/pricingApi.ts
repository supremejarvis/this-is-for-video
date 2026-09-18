/**
 * Apollo Engineering Temporal Pricing Micro API Service
 * 
 * Endpoints:
 * - GET  /api/v1/pricing/active    -> Get active price version for variant/channel/tier
 * - POST /api/v1/pricing/calculate -> Authoritative statutory Decimal order calculation
 * - POST /api/v1/pricing/versions  -> Create temporal price version
 */

import { apiClient } from './client';

export interface ActivePriceQuery {
  variantId: string;
  channel?: string;
  quantity?: number;
  taxMode?: 'GST_INCLUSIVE' | 'GST_EXCLUSIVE';
}

export interface PriceVersionDto {
  id: string;
  variant_id: string;
  product_id?: string;
  currency: string;
  channel: string;
  min_quantity: number;
  unit_price: number | string;
  gst_rate: number | string;
  hsn_code: string;
  tax_mode: string;
  valid_from: string;
  valid_to?: string;
  reason?: string;
  is_active_now?: boolean;
}

export interface OrderCalculationItemRequest {
  sku: string;
  unit_price: number;
  quantity: number;
  gst_rate: number;
  hsn_code?: string;
  tax_mode?: 'GST_INCLUSIVE' | 'GST_EXCLUSIVE';
}

export interface OrderCalculationRequest {
  items: OrderCalculationItemRequest[];
  base_shipping: number;
  shipping_gst_rate?: number;
  is_cod?: boolean;
  rounding_multiple?: number;
}

export interface OrderCalculationResult {
  items: any[];
  subtotal_taxable: number;
  product_gst: number;
  product_gross: number;
  shipping_base: number;
  shipping_gst: number;
  shipping_total: number;
  prepaid_total: number;
  cod_surcharge: number;
  cod_total: number;
  rounding_multiple: number;
}

export class PricingApi {
  /**
   * Query active price version for a given variant and tier
   */
  public async getActivePrice(query: ActivePriceQuery): Promise<PriceVersionDto> {
    const params = new URLSearchParams({
      variant_id: query.variantId,
      channel: query.channel || 'B2C',
      quantity: String(query.quantity || 1),
      tax_mode: query.taxMode || 'GST_INCLUSIVE',
    });
    return apiClient.get<PriceVersionDto>(`/pricing/active?${params.toString()}`);
  }

  /**
   * Run stateless authoritative statutory order calculation
   */
  public async calculateOrder(payload: OrderCalculationRequest): Promise<OrderCalculationResult> {
    return apiClient.post<OrderCalculationResult>('/pricing/calculate', payload);
  }

  /**
   * Create price version (RBAC guarded)
   */
  public async createPriceVersion(payload: Partial<PriceVersionDto>): Promise<PriceVersionDto> {
    return apiClient.post<PriceVersionDto>('/pricing/versions', payload);
  }
}

export const pricingApi = new PricingApi();

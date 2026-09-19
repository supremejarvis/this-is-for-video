/**
 * Apollo Engineering Authoritative Quote API Service
 * 
 * STRICT ARCHITECTURAL INVARIANT:
 * Authoritative monetary calculations (Taxable Base, Product GST, Base Shipping,
 * Shipping GST 18%, UPI Prepaid Total, and COD Surcharge) are NEVER computed in JavaScript.
 * This service communicates with the FastAPI backend engine to obtain immutable server quotes.
 */

export interface QuoteLineItem {
  sku: string;
  quantity: number;
  unit_price: string;
  line_gross: string;
  taxable_base: string;
  product_gst: string;
  tax_mode: 'GST_INCLUSIVE' | 'GST_EXCLUSIVE';
  gst_rate: string;
  hsn_code?: string;
}

export interface AuthoritativeQuote {
  quote_id: string;
  quote_number: string;
  idempotency_key: string | null;
  calculation_version: string;
  catalog_version: string;
  destination_pincode: string;
  items: QuoteLineItem[];
  subtotal_taxable: string;
  total_product_gst: string;
  total_product_gross: string;
  base_shipping: string;
  shipping_gst: string;
  shipping_total: string;
  shipping_gst_rate?: string;
  prepaid_total: string;
  cod_surcharge: string;
  cod_raw_total: string;
  cod_total: string;
  rounding_multiple: number;
  cod_charge_rate?: string;
  cod_charge_raw?: string;
  cod_rounding_adjustment?: string;
  cod_payable_total?: string;
  shipping_provider?: string;
  service_code?: string;
  rate_source?: string;
  rate_version?: string;
  is_live_rate?: boolean;
  calculated_at?: string;
  server_time?: string;
  expires_at: string;
  created_at: string;
}

export interface QuoteRequestPayloadItem {
  variant_id?: string;
  sku?: string;
  quantity: number;
}

export interface CreateQuotePayload {
  items: QuoteRequestPayloadItem[];
  destination_pincode: string;
  channel?: 'B2C' | 'B2B';
  payment_method?: 'PREPAID' | 'COD';
  base_shipping?: string;
  idempotency_key?: string;
  rounding_multiple?: number;
}

import { quoteApi } from './api/quoteApi';

export class QuoteService {
  /**
   * Generates an authoritative server-calculated quote for the current cart and destination pincode.
   */
  static async requestQuote(payload: CreateQuotePayload): Promise<AuthoritativeQuote> {
    return quoteApi.requestQuote(payload);
  }
}

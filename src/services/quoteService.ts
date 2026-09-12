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
  payment_method?: 'PREPAID' | 'COD';
  base_shipping?: string;
  idempotency_key?: string;
}

const API_BASE = '/api/v1';

export class QuoteService {
  /**
   * Generates an authoritative server-calculated quote for the current cart and destination pincode.
   */
  static async requestQuote(payload: CreateQuotePayload): Promise<AuthoritativeQuote> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cart must contain at least one item to generate a quote.');
    }

    if (!payload.destination_pincode || !/^[1-9][0-9]{5}$/.test(payload.destination_pincode.trim())) {
      throw new Error('Valid 6-digit Indian PIN code required.');
    }

    const cleanPayload = {
      items: payload.items.map((i) => ({
        ...(i.variant_id ? { variant_id: i.variant_id } : {}),
        ...(i.sku ? { sku: i.sku } : {}),
        quantity: i.quantity,
      })),
      destination_pincode: payload.destination_pincode.trim(),
      payment_method: payload.payment_method || 'PREPAID',
      ...(payload.base_shipping ? { base_shipping: payload.base_shipping } : {}),
      ...(payload.idempotency_key ? { idempotency_key: payload.idempotency_key } : {}),
    };

    const response = await fetch(`${API_BASE}/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(cleanPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail || `Server error (HTTP ${response.status})`;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }

    const quote: AuthoritativeQuote = await response.json();
    return quote;
  }
}

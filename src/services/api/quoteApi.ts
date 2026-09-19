/**
 * Apollo Engineering Authoritative Quotes Micro API Service
 * 
 * Endpoints:
 * - POST /api/v1/quotes     -> Generate immutable statutory quote
 * - GET  /api/v1/quotes/{id} -> Fetch quote by ID
 */

import { apiClient } from './client';
import { AuthoritativeQuote, CreateQuotePayload } from '../quoteService';

export class QuoteApi {
  /**
   * Request an authoritative quote with strict statutory GST and Speed Post tariffs
   */
  public async requestQuote(payload: CreateQuotePayload): Promise<AuthoritativeQuote> {
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
      channel: payload.channel || 'B2C',
      payment_method: payload.payment_method || 'PREPAID',
      rounding_multiple: payload.rounding_multiple ?? 5,
      ...(payload.base_shipping ? { base_shipping: payload.base_shipping } : {}),
      ...(payload.idempotency_key ? { idempotency_key: payload.idempotency_key } : {}),
    };

    return apiClient.post<AuthoritativeQuote>('/quotes', cleanPayload);
  }

  /**
   * Fetch quote by ID
   */
  public async getQuote(quoteId: string): Promise<AuthoritativeQuote> {
    return apiClient.get<AuthoritativeQuote>(`/quotes/${quoteId}`);
  }
}

export const quoteApi = new QuoteApi();

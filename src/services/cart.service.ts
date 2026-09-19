/**
 * Apollo Engineering Cart Service
 * 
 * Strict Monetary Arithmetic according to AGENTS.md:
 * - Authoritative totals recalculated in backend via Decimal.
 * - Frontend calculation provides faithful preview:
 *   - B2C (GST-Inclusive): Taxable Base = Gross / (1 + r), GST = Gross - Base
 *   - B2B (GST-Exclusive): Taxable Base = Qty * Unit Price, GST = Base * r, Gross = Base + GST
 *   - Shipping GST: Base Shipping * 0.18
 *   - COD Surcharge: 2.5% on complete prepaid total
 */

import { CartItem } from '../types';

export interface CartCalculationResult {
  subtotalTaxable: number;
  productGst: number;
  subtotalGross: number;
  shippingBase: number;
  shippingGst: number;
  shippingTotal: number;
  prepaidTotal: number;
  codSurcharge: number;
  codTotal: number;
}

export class CartService {
  /**
   * Calculate cart line totals and tax breakdowns
   */
  public static calculateTotals(
    items: CartItem[],
    options: {
      isB2B?: boolean;
      shippingBase?: number;
      shippingGstRate?: number;
      applyCod?: boolean;
    } = {}
  ): CartCalculationResult {
    const isB2B = options.isB2B ?? false;
    const shippingBase = options.shippingBase ?? 0;
    const shippingGstRate = options.shippingGstRate ?? 0.18;
    const applyCod = options.applyCod ?? false;

    let totalTaxable = 0;
    let totalProductGst = 0;
    let totalGross = 0;

    for (const item of items) {
      const qty = item.quantity;
      const unitPrice = item.unitPrice ?? item.b2cPrice ?? 0;
      const gstRate = (item.gstRate || 18) / 100;

      if (isB2B) {
        // GST-Exclusive Mode (B2B)
        const lineTaxable = qty * unitPrice;
        const lineGst = lineTaxable * gstRate;
        const lineGross = lineTaxable + lineGst;

        totalTaxable += lineTaxable;
        totalProductGst += lineGst;
        totalGross += lineGross;
      } else {
        // GST-Inclusive Mode (B2C)
        const lineGross = qty * unitPrice;
        const lineTaxable = lineGross / (1 + gstRate);
        const lineGst = lineGross - lineTaxable;

        totalGross += lineGross;
        totalTaxable += lineTaxable;
        totalProductGst += lineGst;
      }
    }

    const shippingGst = Math.round(shippingBase * shippingGstRate * 100) / 100;
    const shippingTotal = shippingBase + shippingGst;
    const prepaidTotal = Math.round((totalGross + shippingTotal) * 100) / 100;

    const codSurcharge = applyCod ? Math.round(prepaidTotal * 0.025 * 100) / 100 : 0;
    const codTotal = applyCod ? Math.round(prepaidTotal * 1.025) : prepaidTotal;

    return {
      subtotalTaxable: Math.round(totalTaxable * 100) / 100,
      productGst: Math.round(totalProductGst * 100) / 100,
      subtotalGross: Math.round(totalGross * 100) / 100,
      shippingBase: Math.round(shippingBase * 100) / 100,
      shippingGst,
      shippingTotal: Math.round(shippingTotal * 100) / 100,
      prepaidTotal,
      codSurcharge,
      codTotal,
    };
  }
}

export const cartService = CartService;

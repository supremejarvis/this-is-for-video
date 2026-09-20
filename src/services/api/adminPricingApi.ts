/**
 * Admin Enterprise Pricing API Client
 * Connects to /api/v1/admin/price-lists, /price-rules, /tax-profiles, and /pricing/preview.
 */
import { ApiClient } from './client';

export interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface PriceRule {
  id: string;
  price_list_id: string;
  variant_id: string;
  min_qty: number;
  max_qty_exclusive: number | null;
  unit_price: string;
  price_basis: string;
  valid_from: string;
  valid_to: string | null;
  version: number;
}

export interface PriceList {
  id: string;
  name: string;
  currency: string;
  customer_group_id: string | null;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  is_default: boolean;
  created_at: string;
  rules: PriceRule[];
}

export interface TaxRule {
  id: string;
  tax_profile_id: string;
  jurisdiction: string;
  component: string;
  rate: string;
  effective_from: string;
  effective_to: string | null;
}

export interface TaxProfile {
  id: string;
  name: string;
  hsn_code: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  rules: TaxRule[];
}

export interface PricingPreviewRequest {
  variant_id: string;
  quantity: number;
  customer_group_code?: string;
  customer_state_code?: string;
  is_tax_inclusive?: boolean;
}

export interface PricingPreviewResult {
  variant_id: string;
  quantity: number;
  applied_unit_price: string;
  gross_amount: string;
  taxable_base: string;
  cgst_rate: string;
  cgst_amount: string;
  sgst_rate: string;
  sgst_amount: string;
  igst_rate: string;
  igst_amount: string;
  total_tax: string;
  total_amount: string;
  is_interstate: boolean;
  price_list_name: string;
  rule_slab: string;
}

export class AdminPricingApiClient extends ApiClient {
  // ── CUSTOMER GROUPS ──
  async listCustomerGroups(): Promise<CustomerGroup[]> {
    return this.request<CustomerGroup[]>('/admin/customer-groups');
  }

  async createCustomerGroup(payload: { code: string; name: string; description?: string }): Promise<CustomerGroup> {
    return this.request<CustomerGroup>('/admin/customer-groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── PRICE LISTS & RULES ──
  async listPriceLists(): Promise<PriceList[]> {
    return this.request<PriceList[]>('/admin/price-lists');
  }

  async createPriceList(payload: {
    name: string;
    currency?: string;
    customer_group_id?: string | null;
    priority?: number;
    status?: string;
    is_default?: boolean;
  }): Promise<PriceList> {
    return this.request<PriceList>('/admin/price-lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addPriceRule(priceListId: string, payload: {
    variant_id: string;
    min_qty: number;
    max_qty_exclusive?: number | null;
    unit_price: number;
    price_basis?: string;
  }): Promise<PriceRule> {
    return this.request<PriceRule>(`/admin/price-rules?price_list_id=${priceListId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── TAX PROFILES ──
  async listTaxProfiles(): Promise<TaxProfile[]> {
    return this.request<TaxProfile[]>('/admin/tax-profiles');
  }

  async createTaxProfile(payload: {
    name: string;
    hsn_code: string;
    status?: string;
    rules?: { jurisdiction?: string; component: string; rate: number }[];
  }): Promise<TaxProfile> {
    return this.request<TaxProfile>('/admin/tax-profiles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── PRICING PREVIEW ──
  async previewPricing(payload: PricingPreviewRequest): Promise<PricingPreviewResult> {
    return this.request<PricingPreviewResult>('/admin/pricing/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const adminPricingApi = new AdminPricingApiClient();

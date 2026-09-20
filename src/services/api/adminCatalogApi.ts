/**
 * Admin Enterprise Catalog API Client
 * Connects to /api/v1/admin/* endpoints with resilient credentials and CSRF.
 */
import { ApiClient } from './client';

export interface AdminCategory {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'ARCHIVED';
  children?: AdminCategory[];
}

export interface AdminAttributeValue {
  id: string;
  attribute_id: string;
  normalized_value: string;
  label: string;
  sort_order: number;
}

export interface AdminAttribute {
  id: string;
  company_id: string;
  code: string;
  label: string;
  data_type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  unit: string | null;
  is_variant_axis: boolean;
  values: AdminAttributeValue[];
}

export interface AdminProductListItem {
  id: string;
  sku_prefix: string;
  name: string;
  description: string | null;
  hsn_code: string;
  is_active: boolean;
  is_archived: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  variant_count: number;
  total_stock: number;
  price_min: string;
  price_max: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface AdminVariantListItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  display_label: string;
  frame_thickness: string;
  pack_size: number;
  is_active: boolean;
  is_archived: boolean;
  version: number;
  stock_on_hand: number;
  stock_reserved: number;
  unit_price: string;
}

export interface CombinationPreviewOption {
  attribute_id: string;
  value_id: string;
  attribute_code: string;
  attribute_label: string;
  value_label: string;
}

export interface CombinationPreviewItem {
  combination_key: string;
  options: CombinationPreviewOption[];
  suggested_sku: string;
  suggested_label: string;
  already_exists: boolean;
}

export interface CombinationPreviewResponse {
  total_combinations: number;
  new_combinations_count: number;
  existing_combinations_count: number;
  items: CombinationPreviewItem[];
}

export interface BatchGenerateItem {
  combination_key: string;
  sku: string;
  display_label: string;
  option_value_ids: string[];
  pack_size: number;
  initial_stock: number;
  initial_b2c_price: number;
  weight_g?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
}

export interface ImportReport {
  dry_run: boolean;
  total_rows: number;
  valid_rows: number;
  error_count: number;
  errors: string[];
  applied_count: number;
}

export class AdminCatalogApiClient extends ApiClient {
  // ── CATEGORIES ──
  async listCategories(): Promise<AdminCategory[]> {
    return this.request<AdminCategory[]>('/admin/categories');
  }

  async getCategoryTree(): Promise<AdminCategory[]> {
    return this.request<AdminCategory[]>('/admin/categories/tree');
  }

  async createCategory(payload: { name: string; slug: string; parent_id?: string | null }): Promise<AdminCategory> {
    return this.request<AdminCategory>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCategory(id: string, payload: { name?: string; slug?: string; parent_id?: string | null; status?: string }): Promise<AdminCategory> {
    return this.request<AdminCategory>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // ── ATTRIBUTES ──
  async listAttributes(): Promise<AdminAttribute[]> {
    return this.request<AdminAttribute[]>('/admin/attributes');
  }

  async createAttribute(payload: {
    code: string;
    label: string;
    data_type?: string;
    unit?: string | null;
    is_variant_axis: boolean;
    initial_values?: { normalized_value: string; label: string; sort_order?: number }[];
  }): Promise<AdminAttribute> {
    return this.request<AdminAttribute>('/admin/attributes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async addAttributeValue(attributeId: string, payload: { normalized_value: string; label: string; sort_order?: number }): Promise<AdminAttributeValue> {
    return this.request<AdminAttributeValue>(`/admin/attributes/${attributeId}/values`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ── PRODUCTS ──
  async listAdminProducts(params?: { search?: string; is_active?: boolean; limit?: number; offset?: number }): Promise<{ total: number; items: AdminProductListItem[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.request<{ total: number; items: AdminProductListItem[] }>(`/admin/products${qs ? `?${qs}` : ''}`);
  }

  async publishProduct(productId: string): Promise<{ status: string; product_id: string }> {
    return this.request<{ status: string; product_id: string }>(`/admin/products/${productId}/publish`, {
      method: 'POST',
    });
  }

  async unpublishProduct(productId: string): Promise<{ status: string; product_id: string }> {
    return this.request<{ status: string; product_id: string }>(`/admin/products/${productId}/unpublish`, {
      method: 'POST',
    });
  }

  async archiveProduct(productId: string): Promise<{ status: string; product_id: string }> {
    return this.request<{ status: string; product_id: string }>(`/admin/products/${productId}/archive`, {
      method: 'POST',
    });
  }

  // ── VARIANTS & COMBINATIONS ──
  async listVariants(params?: { search?: string; productId?: string; limit?: number; offset?: number }): Promise<{ items: AdminVariantListItem[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.productId) query.set('product_id', params.productId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.request<{ items: AdminVariantListItem[] }>(`/admin/variants${qs ? `?${qs}` : ''}`);
  }

  async updateVariantInline(variantId: string, payload: { display_label?: string; pack_size?: number; is_active?: boolean; version?: number }): Promise<{ status: string; version: number }> {
    return this.request<{ status: string; version: number }>(`/admin/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deactivateVariant(variantId: string): Promise<{ status: string; variant_id: string }> {
    return this.request<{ status: string; variant_id: string }>(`/admin/variants/${variantId}/deactivate`, {
      method: 'POST',
    });
  }

  async previewCombinations(productId: string, axes: { attribute_id: string; value_ids: string[] }[]): Promise<CombinationPreviewResponse> {
    return this.request<CombinationPreviewResponse>(`/admin/products/${productId}/variants/preview`, {
      method: 'POST',
      body: JSON.stringify({ axes, excluded_combinations: [] }),
    });
  }

  async batchGenerateVariants(productId: string, variants: BatchGenerateItem[]): Promise<{ created_count: number; skipped_count: number }> {
    return this.request<{ created_count: number; skipped_count: number }>(`/admin/products/${productId}/variants/generate`, {
      method: 'POST',
      body: JSON.stringify({ variants }),
    });
  }

  getExportVariantsUrl(): string {
    return `${this.getBaseUrl()}/admin/variants/export`;
  }

  async importVariantsCsv(fileContent: string, dryRun: boolean = true): Promise<ImportReport> {
    return this.request<ImportReport>(`/admin/variants/import?dry_run=${dryRun}`, {
      method: 'POST',
      body: fileContent,
      headers: { 'Content-Type': 'text/csv' },
    });
  }
}

export const adminCatalogApi = new AdminCatalogApiClient();

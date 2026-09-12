/**
 * Apollo Engineering Buyer Catalog API Service
 * Fetches database-driven products and structured variants (28/30/33/35/40 mm) from FastAPI backend.
 */

export type FitMode = 'EXACT' | 'RANGE' | 'UNIVERSAL' | 'NOT_APPLICABLE';

export interface ApiProductVariant {
  id: string;
  product_id: string;
  sku: string;
  fit_mode: FitMode;
  frame_thickness_mm: number | null;
  min_thickness_mm: number | null;
  max_thickness_mm: number | null;
  display_label: string;
  frame_thickness: string;
  pack_size: number;
  is_active: boolean;
  is_archived: boolean;
  version: number;
  available_stock: number;
  unit_price?: number | null;
  tax_mode?: string | null;
  created_at: string;
}

export interface ApiProduct {
  id: string;
  sku_prefix: string;
  name: string;
  description: string | null;
  hsn_code: string;
  is_active: boolean;
  is_archived: boolean;
  version: number;
  variants: ApiProductVariant[];
  created_at: string;
  updated_at: string;
}

const API_BASE = '/api/v1';

export class CatalogService {
  /**
   * Fetches active buyer catalog products and their variants from PostgreSQL.
   */
  static async getCatalog(includeArchived = false): Promise<ApiProduct[]> {
    const response = await fetch(`${API_BASE}/products/?include_archived=${includeArchived}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load catalog products (HTTP ${response.status})`);
    }

    const data: ApiProduct[] = await response.json();
    return data;
  }

  /**
   * Fetches a single product by ID with all active variants and current stock status.
   */
  static async getProduct(productId: string): Promise<ApiProduct> {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product '${productId}' (HTTP ${response.status})`);
    }

    const data: ApiProduct = await response.json();
    return data;
  }
}

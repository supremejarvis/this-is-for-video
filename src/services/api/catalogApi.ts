/**
 * Apollo Engineering Catalog & Product Micro API Service
 * 
 * Endpoints:
 * - GET   /api/v1/products/     -> List buyer catalog products and variants
 * - GET   /api/v1/products/{id} -> Get product details by ID
 * - POST  /api/v1/products/     -> Create product (RBAC guarded)
 * - PATCH /api/v1/products/{id} -> Update product (RBAC guarded)
 */

import { apiClient } from './client';
import { ApiProduct } from '../catalogService';

export class CatalogApi {
  /**
   * Fetches active buyer catalog products and variants from PostgreSQL
   */
  public async getProducts(includeArchived: boolean = false): Promise<ApiProduct[]> {
    return apiClient.get<ApiProduct[]>(`/products/?include_archived=${includeArchived}`);
  }

  /**
   * Alias for active catalog
   */
  public async getCatalog(): Promise<ApiProduct[]> {
    return this.getProducts(false);
  }

  /**
   * Fetch single product by ID
   */
  public async getProduct(id: string): Promise<ApiProduct> {
    return apiClient.get<ApiProduct>(`/products/${id}`);
  }

  /**
   * Create a new product (Staff only)
   */
  public async createProduct(payload: Partial<ApiProduct>): Promise<ApiProduct> {
    return apiClient.post<ApiProduct>('/products/', payload);
  }

  /**
   * Update an existing product (Staff only)
   */
  public async updateProduct(id: string, payload: Partial<ApiProduct>): Promise<ApiProduct> {
    return apiClient.patch<ApiProduct>(`/products/${id}`, payload);
  }

  /**
   * Archive / Delete a product (Staff only)
   */
  public async archiveProduct(id: string): Promise<ApiProduct> {
    return apiClient.delete<ApiProduct>(`/products/${id}`);
  }

  /**
   * Delete product alias
   */
  public async deleteProduct(id: string): Promise<ApiProduct> {
    return this.archiveProduct(id);
  }
}

export const catalogApi = new CatalogApi();

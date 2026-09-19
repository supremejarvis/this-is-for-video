/**
 * Apollo Engineering Inventory & Stock Ledger Micro API Service
 * 
 * Endpoints:
 * - GET  /api/v1/inventory/items      -> List inventory levels across all variants
 * - POST /api/v1/inventory/receipt    -> Record stock arrival to immutable ledger
 * - POST /api/v1/inventory/adjustment -> Record authorized inventory adjustment
 */

import { apiClient } from './client';

export interface InventoryItemDto {
  id: string;
  variant_id: string;
  sku: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_stock: number;
  updated_at: string;
}

export interface InventoryReceiptPayload {
  variant_id: string;
  quantity: number;
  unit_cost?: number;
  reference_number?: string;
  notes?: string;
}

export interface InventoryAdjustmentPayload {
  variant_id?: string;
  sku?: string;
  quantity_delta: number;
  reason: string;
  reference_number?: string;
  idempotency_key?: string;
}

export class InventoryApi {
  /**
   * List live stock levels across all variants
   */
  public async listItems(limit: number = 100, offset: number = 0): Promise<InventoryItemDto[]> {
    return apiClient.get<InventoryItemDto[]>(`/inventory/items?limit=${limit}&offset=${offset}`);
  }

  /**
   * Record stock receipt in ledger
   */
  public async receiveStock(payload: InventoryReceiptPayload): Promise<any> {
    return apiClient.post('/inventory/receipt', payload);
  }

  /**
   * Adjust inventory with audit trail
   */
  public async adjustStock(payload: InventoryAdjustmentPayload): Promise<any> {
    return apiClient.post('/inventory/adjustment', payload);
  }
}

export const inventoryApi = new InventoryApi();

/**
 * Admin Multi-Warehouse Inventory API Client
 */
import { apiClient } from './client';

export interface Warehouse {
  id: string;
  company_id: string;
  code: string;
  name: string;
  pincode: string;
  city: string;
  state: string;
  address_line: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  is_default: boolean;
  created_at: string;
}

export interface StockBalanceItem {
  id: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  variant_id: string;
  sku: string;
  product_name?: string;
  location_code?: string;
  on_hand: number;
  reserved: number;
  quarantined: number;
  available: number;
  version: number;
  updated_at: string;
}

export interface StockBalanceListResponse {
  items: StockBalanceItem[];
  total: number;
}

export interface StockAdjustmentRequest {
  warehouse_id: string;
  variant_id: string;
  sku: string;
  quantity_delta: number;
  reason: string;
  idempotency_key?: string;
}

export interface StockAdjustmentResponse {
  stock_item_id: string;
  warehouse_id: string;
  variant_id: string;
  sku: string;
  quantity_delta: number;
  resulting_on_hand: number;
  resulting_reserved: number;
  resulting_available: number;
  reason: string;
  idempotency_key: string;
  adjusted_at: string;
}

export interface TransferItem {
  id?: string;
  variant_id: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  company_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  created_at: string;
  received_at?: string;
  items: TransferItem[];
}

export interface StockCountItem {
  id: string;
  stock_item_id: string;
  sku?: string;
  expected_qty: number;
  counted_qty?: number;
  variance?: number;
}

export interface StockCount {
  id: string;
  company_id: string;
  warehouse_id: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'RECONCILED' | 'CANCELLED';
  count_date: string;
  items: StockCountItem[];
}

export const adminInventoryApi = {
  async getWarehouses(): Promise<Warehouse[]> {
    return apiClient.get<Warehouse[]>('/admin/inventory/warehouses');
  },

  async createWarehouse(data: {
    code: string;
    name: string;
    pincode?: string;
    city?: string;
    state?: string;
    address_line?: string;
    is_default?: boolean;
  }): Promise<Warehouse> {
    return apiClient.post<Warehouse>('/admin/inventory/warehouses', data);
  },

  async getBalances(params?: {
    warehouse_id?: string;
    variant_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<StockBalanceListResponse> {
    const query = new URLSearchParams();
    if (params?.warehouse_id) query.append('warehouse_id', params.warehouse_id);
    if (params?.variant_id) query.append('variant_id', params.variant_id);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return apiClient.get<StockBalanceListResponse>(`/admin/inventory/balances?${query.toString()}`);
  },

  async adjustStock(data: StockAdjustmentRequest): Promise<StockAdjustmentResponse> {
    return apiClient.post<StockAdjustmentResponse>('/admin/inventory/adjustments', data);
  },

  async getTransfers(): Promise<StockTransfer[]> {
    return apiClient.get<StockTransfer[]>('/admin/inventory/transfers');
  },

  async createTransfer(data: {
    from_warehouse_id: string;
    to_warehouse_id: string;
    items: { variant_id: string; quantity: number }[];
    notes?: string;
  }): Promise<StockTransfer> {
    return apiClient.post<StockTransfer>('/admin/inventory/transfers', data);
  },

  async dispatchTransfer(transferId: string): Promise<StockTransfer> {
    return apiClient.put<StockTransfer>(`/admin/inventory/transfers/${transferId}/dispatch`, {});
  },

  async receiveTransfer(transferId: string): Promise<StockTransfer> {
    return apiClient.put<StockTransfer>(`/admin/inventory/transfers/${transferId}/receive`, {});
  },

  async getStockCounts(): Promise<StockCount[]> {
    return apiClient.get<StockCount[]>('/admin/inventory/counts');
  },

  async createStockCount(warehouseId: string): Promise<StockCount> {
    return apiClient.post<StockCount>('/admin/inventory/counts', { warehouse_id: warehouseId });
  },

  async reconcileStockCount(
    countId: string,
    items: { stock_item_id: string; counted_qty: number }[]
  ): Promise<StockCount> {
    return apiClient.post<StockCount>(`/admin/inventory/counts/${countId}/reconcile`, { items });
  },
};

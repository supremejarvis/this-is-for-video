/**
 * Admin Returns Management, Caliper Verification & Item Inspection API Client
 */
import { apiClient } from './client';

export interface ReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  requested_qty: number;
  received_qty: number;
  accepted_qty: number;
  disposition: string;
  inspected_at?: string;
  inspector_id?: string;
}

export interface ReturnCase {
  id: string;
  company_id: string;
  order_id: string;
  reason: string;
  status: string;
  caliper_photo_url?: string;
  verified_frame_thickness_mm?: string;
  created_at: string;
  updated_at: string;
  items: ReturnItem[];
}

export interface ReturnReceiveItemSpec {
  return_item_id: string;
  received_qty: number;
  accepted_qty: number;
  disposition: string; // RESTOCK_INVENTORY, SCRAP_DEFECTIVE, REFURBISH
}

export const adminReturnsApi = {
  getReturns: async (statusFilter?: string): Promise<ReturnCase[]> => {
    const url = statusFilter
      ? `/api/v1/admin/returns?status=${encodeURIComponent(statusFilter)}`
      : '/api/v1/admin/returns';
    return apiClient.get<ReturnCase[]>(url);
  },

  getReturnDetail: async (returnId: string): Promise<ReturnCase> => {
    return apiClient.get<ReturnCase>(`/api/v1/admin/returns/${returnId}`);
  },

  inspectCaliper: async (
    returnId: string,
    req: { verified_frame_thickness_mm: string; approval: boolean; notes?: string }
  ): Promise<ReturnCase> => {
    return apiClient.post<ReturnCase>(`/api/v1/admin/returns/${returnId}/inspect-caliper`, req);
  },

  receiveAndRestock: async (
    returnId: string,
    req: {
      warehouse_id: string;
      inspection_items: ReturnReceiveItemSpec[];
      inspector_notes?: string;
    }
  ): Promise<ReturnCase> => {
    return apiClient.post<ReturnCase>(`/api/v1/admin/returns/${returnId}/receive`, req);
  },
};

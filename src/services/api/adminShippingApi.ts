/**
 * Admin Shipping and Logistics API Client
 */
import { apiClient } from './client';

export interface ShippingRateSlab {
  id: string;
  rate_card_id: string;
  zone: string;
  min_weight_g: number;
  max_weight_g: number;
  base_charge: string;
  currency: string;
  valid_from: string;
  valid_to?: string;
}

export interface ShippingRateCard {
  id: string;
  company_id: string;
  carrier_id: string;
  name: string;
  status: string;
  is_default: boolean;
  slabs: ShippingRateSlab[];
}

export interface ShippingQuoteRequest {
  origin_pincode?: string;
  destination_pincode: string;
  items: Array<{
    sku: string;
    quantity: number;
    weight_g: number;
  }>;
  is_cod?: boolean;
  declared_value?: string;
  carrier_code?: string;
}

export interface ShippingQuoteResponse {
  origin_pincode: string;
  destination_pincode: string;
  zone: string;
  carrier_code: string;
  service_code: string;
  total_physical_weight_g: number;
  packaging_tare_g: number;
  chargeable_weight_g: number;
  base_shipping: string;
  shipping_gst: string;
  gst_rate: string;
  cod_surcharge: string;
  total_shipping: string;
  is_serviceable: boolean;
  estimated_delivery_days: number;
  currency: string;
}

export interface PackageSpec {
  package_number: number;
  actual_weight_g: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  items: Array<{
    order_item_id: string;
    quantity: number;
  }>;
}

export interface ShipmentBookingRequest {
  order_id: string;
  carrier?: string;
  service_code?: string;
  origin_pincode?: string;
  destination_pincode: string;
  idempotency_key: string;
  packages: PackageSpec[];
}

export interface ShipmentBookingResponse {
  shipment_id: string;
  order_id: string;
  carrier: string;
  awb_number: string;
  status: string;
  origin_pincode: string;
  destination_pincode: string;
  total_packages: number;
  total_chargeable_weight_g: number;
  created_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  provider_event_id: string;
  status: string;
  location?: string;
  description?: string;
  provider_occurred_at: string;
  received_at: string;
}

export interface ShipmentDetail {
  id: string;
  order_id: string;
  carrier: string;
  awb_number?: string;
  origin_pincode: string;
  destination_pincode: string;
  status: string;
  created_at: string;
  packages: Array<{
    id: string;
    package_number: number;
    actual_weight_g: number;
    length_mm: number;
    width_mm: number;
    height_mm: number;
    chargeable_weight_g: number;
    items: Array<{
      id: string;
      order_item_id: string;
      quantity: number;
    }>;
  }>;
  tracking_events: TrackingEvent[];
}

export interface DispatchManifestResponse {
  manifest_id: string;
  carrier: string;
  origin_hub_pincode: string;
  generated_at: string;
  total_shipments: number;
  total_weight_kg: string;
  shipments: Array<{
    shipment_id: string;
    order_id: string;
    order_number: string;
    awb_number: string;
    destination_pincode: string;
    customer_name?: string;
    weight_g: number;
  }>;
}

export const adminShippingApi = {
  getRates: async (): Promise<ShippingRateCard[]> => {
    return apiClient.get<ShippingRateCard[]>('/api/v1/admin/shipping/rates');
  },

  calculateQuote: async (req: ShippingQuoteRequest): Promise<ShippingQuoteResponse> => {
    return apiClient.post<ShippingQuoteResponse>('/api/v1/admin/shipping/quotes', req);
  },

  getShipments: async (statusFilter?: string): Promise<ShipmentDetail[]> => {
    const url = statusFilter
      ? `/api/v1/admin/shipping/shipments?status=${encodeURIComponent(statusFilter)}`
      : '/api/v1/admin/shipping/shipments';
    return apiClient.get<ShipmentDetail[]>(url);
  },

  bookShipment: async (req: ShipmentBookingRequest): Promise<ShipmentBookingResponse> => {
    return apiClient.post<ShipmentBookingResponse>('/api/v1/admin/shipping/shipments/book', req);
  },

  dispatchShipment: async (shipmentId: string, warehouseId: string): Promise<any> => {
    return apiClient.post(`/api/v1/admin/shipping/shipments/${shipmentId}/dispatch?warehouse_id=${warehouseId}`, {});
  },

  recordTrackingEvent: async (
    shipmentId: string,
    event: { provider_event_id: string; status: string; location?: string; description?: string; provider_occurred_at: string }
  ): Promise<TrackingEvent> => {
    return apiClient.post<TrackingEvent>(`/api/v1/admin/shipping/shipments/${shipmentId}/events`, event);
  },

  getManifest: async (carrier: string = 'INDIA_POST'): Promise<DispatchManifestResponse> => {
    return apiClient.get<DispatchManifestResponse>(`/api/v1/admin/shipping/manifest?carrier=${encodeURIComponent(carrier)}`);
  },
};

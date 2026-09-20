"""Pydantic schemas for Shipping, Carrier Rate Cards, Quotes, Bookings, and Tracking."""
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ShippingRateSlabOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rate_card_id: UUID
    zone: str
    min_weight_g: int
    max_weight_g: int
    base_charge: Decimal
    currency: str = "INR"
    valid_from: datetime
    valid_to: datetime | None = None


class ShippingRateCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    carrier_id: UUID
    name: str
    status: str
    is_default: bool
    slabs: list[ShippingRateSlabOut] = []


class ShippingQuoteItem(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    weight_g: int = Field(gt=0, description="Unit weight in grams")


class ShippingQuoteRequest(BaseModel):
    origin_pincode: str = Field(default="382430", min_length=6, max_length=6)
    destination_pincode: str = Field(min_length=6, max_length=6)
    items: list[ShippingQuoteItem] = Field(min_length=1)
    is_cod: bool = False
    declared_value: Decimal = Field(default=Decimal("0.00"), ge=0)
    carrier_code: str = Field(default="INDIA_POST")


class ShippingQuoteResponse(BaseModel):
    origin_pincode: str
    destination_pincode: str
    zone: str
    carrier_code: str
    service_code: str
    total_physical_weight_g: int
    packaging_tare_g: int
    chargeable_weight_g: int
    base_shipping: Decimal
    shipping_gst: Decimal
    gst_rate: Decimal = Decimal("0.18")
    cod_surcharge: Decimal = Decimal("0.00")
    total_shipping: Decimal
    is_serviceable: bool = True
    estimated_delivery_days: int = 3
    currency: str = "INR"


class PackageItemSpec(BaseModel):
    order_item_id: UUID
    quantity: int = Field(gt=0)


class PackageSpec(BaseModel):
    package_number: int = 1
    actual_weight_g: int = Field(gt=0)
    length_mm: int = Field(default=150, gt=0)
    width_mm: int = Field(default=100, gt=0)
    height_mm: int = Field(default=50, gt=0)
    items: list[PackageItemSpec] = Field(min_length=1)


class ShipmentBookingRequest(BaseModel):
    order_id: UUID
    carrier: str = "INDIA_POST"
    service_code: str = "SPEED_POST"
    origin_pincode: str = Field(default="382430", min_length=6, max_length=6)
    destination_pincode: str = Field(min_length=6, max_length=6)
    idempotency_key: str = Field(min_length=8, max_length=128)
    packages: list[PackageSpec] = Field(min_length=1)


class ShipmentBookingResponse(BaseModel):
    shipment_id: UUID
    order_id: UUID
    carrier: str
    awb_number: str
    status: str
    origin_pincode: str
    destination_pincode: str
    total_packages: int
    total_chargeable_weight_g: int
    created_at: datetime


class ShipmentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    package_id: UUID
    order_item_id: UUID
    quantity: int


class PackageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    package_number: int
    actual_weight_g: int
    length_mm: int
    width_mm: int
    height_mm: int
    chargeable_weight_g: int
    items: list[ShipmentItemOut] = []


class TrackingEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shipment_id: UUID
    provider_event_id: str
    status: str
    location: str | None
    description: str | None
    provider_occurred_at: datetime
    received_at: datetime


class ShipmentDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    carrier: str
    awb_number: str | None
    origin_pincode: str
    destination_pincode: str
    status: str
    created_at: datetime
    packages: list[PackageOut] = []
    tracking_events: list[TrackingEventOut] = []


class TrackingEventCreate(BaseModel):
    provider_event_id: str
    status: str
    location: str | None = None
    description: str | None = None
    provider_occurred_at: datetime


class DispatchManifestItem(BaseModel):
    shipment_id: UUID
    order_id: UUID
    order_number: str
    awb_number: str
    destination_pincode: str
    customer_name: str | None
    weight_g: int


class DispatchManifestResponse(BaseModel):
    manifest_id: str
    carrier: str
    origin_hub_pincode: str
    generated_at: datetime
    total_shipments: int
    total_weight_kg: Decimal
    shipments: list[DispatchManifestItem]

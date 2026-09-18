"""Authoritative Shipping Engine for India Post Speed Post Tariffs.

Origin Hub is locked to Kathwada GIDC, Ahmedabad (382430).
Authoritative Rates:
- Local: PIN 382430, 380xxx, 3824xx, 3823xx (Ahmedabad Local Hub)
- Intrastate: Gujarat (36xxxx, 37xxxx, 38xxxx, 39xxxx)
- Rest of India: All other valid 6-digit Indian PIN codes

Weight Slabs:
- Up to 50g: Local ₹15, Intrastate ₹35, ROI ₹35
- 51g - 200g: Local ₹25, Intrastate ₹40, ROI ₹50
- 201g - 500g: Local ₹28, Intrastate ₹50, ROI ₹70
- Additional 500g (or part thereof): Local +₹10, Intrastate +₹15, ROI +₹30
"""
import math
from decimal import ROUND_HALF_UP, Decimal
from typing import NamedTuple

ORIGIN_HUB_PINCODE = "382430"
ORIGIN_HUB_NAME = "Kathwada GIDC Sub Post Office"
SHIPPING_GST_RATE = Decimal("0.1800")
TWO_PLACES = Decimal("0.01")

# Standard item weights in grams
KNOWN_WEIGHTS = {
    "AE-SPRINKLER-SS304": 180,
    "APE-SC-28MM": 25,
    "APE-SC-30MM": 25,
    "APE-SC-33MM": 25,
    "APE-SC-35MM": 25,
    "APE-SC-40MM": 25,
    "APE-SC-UNIVERSAL": 30,
}
FALLBACK_ITEM_WEIGHT_GRAMS = 180


class ShippingQuote(NamedTuple):
    base_shipping: Decimal
    shipping_gst: Decimal
    shipping_total: Decimal
    zone: str
    total_weight_grams: int
    provider: str
    service_code: str
    rate_source: str
    rate_version: str
    delivery_days_estimate: str


class ShippingService:
    """Official Speed Post rate calculator."""

    @staticmethod
    def resolve_item_weight(sku: str) -> int:
        clean_sku = sku.strip().upper()
        for known_sku, weight in KNOWN_WEIGHTS.items():
            if known_sku in clean_sku:
                return weight
        return FALLBACK_ITEM_WEIGHT_GRAMS

    @staticmethod
    def determine_zone(destination_pincode: str) -> str:
        clean_pin = destination_pincode.strip()
        if not clean_pin or len(clean_pin) != 6 or not clean_pin.isdigit():
            raise ValueError(f"Invalid Indian PIN code: {destination_pincode}")

        # Local Hub: Same PIN or Ahmedabad local area
        if clean_pin == ORIGIN_HUB_PINCODE:
            return "LOCAL"
        if clean_pin.startswith(("380", "3824", "3823")):
            return "LOCAL"

        # Intrastate: Gujarat (36-39)
        if clean_pin.startswith(("36", "37", "38", "39")):
            return "INTRASTATE"

        return "REST_OF_INDIA"

    @classmethod
    def calculate_shipping(
        cls,
        destination_pincode: str,
        total_weight_grams: int,
    ) -> ShippingQuote:
        if total_weight_grams <= 0:
            total_weight_grams = 50

        zone = cls.determine_zone(destination_pincode)

        if zone == "LOCAL":
            if total_weight_grams <= 50:
                base = Decimal("15.00")
            elif total_weight_grams <= 200:
                base = Decimal("25.00")
            elif total_weight_grams <= 500:
                base = Decimal("28.00")
            else:
                additional_units = math.ceil((total_weight_grams - 500) / 500)
                base = Decimal("28.00") + (Decimal("10.00") * additional_units)
            delivery_days = "1-2 Days (Local Dispatch)"

        elif zone == "INTRASTATE":
            if total_weight_grams <= 50:
                base = Decimal("35.00")
            elif total_weight_grams <= 200:
                base = Decimal("40.00")
            elif total_weight_grams <= 500:
                base = Decimal("50.00")
            else:
                additional_units = math.ceil((total_weight_grams - 500) / 500)
                base = Decimal("50.00") + (Decimal("15.00") * additional_units)
            delivery_days = "2-3 Days (Intrastate Gujarat)"

        else:  # REST_OF_INDIA
            if total_weight_grams <= 50:
                base = Decimal("35.00")
            elif total_weight_grams <= 200:
                base = Decimal("50.00")
            elif total_weight_grams <= 500:
                base = Decimal("70.00")
            else:
                additional_units = math.ceil((total_weight_grams - 500) / 500)
                base = Decimal("70.00") + (Decimal("30.00") * additional_units)
            delivery_days = "3-5 Days (Rest of India)"

        base = base.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        gst = (base * SHIPPING_GST_RATE).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        total = base + gst

        return ShippingQuote(
            base_shipping=base,
            shipping_gst=gst,
            shipping_total=total,
            zone=zone,
            total_weight_grams=total_weight_grams,
            provider="India Post",
            service_code="Speed Post",
            rate_source="Official Speed Post Tariff",
            rate_version="v2025.1",
            delivery_days_estimate=delivery_days,
        )

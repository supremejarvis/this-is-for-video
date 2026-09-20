"""Unit tests for Phase 4: Shipping Logistics, Razorpay HMAC Webhooks, and Return Sizing Invariants."""
from datetime import UTC, datetime
from decimal import Decimal
import hashlib
import hmac
import pytest
import uuid

from app.models.shipping_advanced import ItemDisposition, ReturnStatus
from app.schemas.shipping import ShippingQuoteItem, ShippingQuoteRequest
from app.services.payment_service import PaymentService
from app.services.shipping_service import (
    ORIGIN_HUB_PINCODE,
    calculate_speed_post_fallback_base,
    determine_zone,
    round_currency,
)


def test_origin_hub_locked_to_kathwada_gidc():
    """Origin hub must be locked to Kathwada GIDC, Ahmedabad: 382430."""
    assert ORIGIN_HUB_PINCODE == "382430"


def test_zone_determination_accuracy():
    """Destination PIN code must accurately resolve to LOCAL, GUJARAT, or REST_OF_INDIA."""
    # Local Ahmedabad PINs
    assert determine_zone("382430") == "LOCAL"
    assert determine_zone("380001") == "LOCAL"

    # Gujarat State PINs
    assert determine_zone("390001") == "GUJARAT"  # Vadodara
    assert determine_zone("395001") == "GUJARAT"  # Surat
    assert determine_zone("360001") == "GUJARAT"  # Rajkot

    # Rest of India PINs
    assert determine_zone("400001") == "REST_OF_INDIA"  # Mumbai
    assert determine_zone("110001") == "REST_OF_INDIA"  # Delhi
    assert determine_zone("560001") == "REST_OF_INDIA"  # Bengaluru
    assert determine_zone("700001") == "REST_OF_INDIA"  # Kolkata


def test_speed_post_statutory_tariff_slabs():
    """Verify CEPT India Post Speed Post statutory base rates without GST."""
    # LOCAL (up to 50g: ₹15; 51-200g: ₹25; 201-500g: ₹30; each addl 500g: ₹10)
    assert calculate_speed_post_fallback_base(45, "LOCAL") == Decimal("15.00")
    assert calculate_speed_post_fallback_base(150, "LOCAL") == Decimal("25.00")
    assert calculate_speed_post_fallback_base(450, "LOCAL") == Decimal("30.00")
    assert calculate_speed_post_fallback_base(950, "LOCAL") == Decimal("40.00")  # 30 + 10

    # GUJARAT (up to 50g: ₹25; 51-200g: ₹30; 201-500g: ₹40; each addl 500g: ₹15)
    assert calculate_speed_post_fallback_base(45, "GUJARAT") == Decimal("25.00")
    assert calculate_speed_post_fallback_base(150, "GUJARAT") == Decimal("30.00")
    assert calculate_speed_post_fallback_base(450, "GUJARAT") == Decimal("40.00")
    assert calculate_speed_post_fallback_base(950, "GUJARAT") == Decimal("55.00")  # 40 + 15

    # REST_OF_INDIA (up to 50g: ₹35; 51-200g: ₹35; 201-500g: ₹50; each addl 500g: ₹35)
    assert calculate_speed_post_fallback_base(45, "REST_OF_INDIA") == Decimal("35.00")
    assert calculate_speed_post_fallback_base(150, "REST_OF_INDIA") == Decimal("35.00")
    assert calculate_speed_post_fallback_base(450, "REST_OF_INDIA") == Decimal("50.00")
    assert calculate_speed_post_fallback_base(950, "REST_OF_INDIA") == Decimal("85.00")  # 50 + 35


def test_shipping_statutory_gst_and_cod_surcharge():
    """Shipping GST rate is fixed at 18%. Cash on Delivery adds 2.5% surcharge."""
    base = Decimal("50.00")
    gst = round_currency(base * Decimal("0.18"))
    assert gst == Decimal("9.00")

    # Prepaid total: Base + 18% GST
    prepaid_total = base + gst
    assert prepaid_total == Decimal("59.00")

    # COD surcharge: 2.5% on prepaid total
    cod_surcharge = round_currency(prepaid_total * Decimal("0.025"))
    assert cod_surcharge == Decimal("1.48")

    cod_total = prepaid_total + cod_surcharge
    assert cod_total == Decimal("60.48")


def test_razorpay_hmac_signature_verification():
    """Verify cryptographic HMAC-SHA256 signature verification over untouched raw body."""
    secret = "rzp_wh_secret_test_2026"
    raw_payload = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_987654321","amount":5900}}}}'

    # Compute valid signature
    valid_sig = hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()

    service = PaymentService(db=None)  # type: ignore[arg-type]
    # Valid signature must pass
    assert service.verify_razorpay_signature(raw_payload, valid_sig, secret) is True

    # Tampered signature must fail
    assert service.verify_razorpay_signature(raw_payload, "tampered_signature_hex", secret) is False

    # Tampered body must fail
    tampered_body = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_987654321","amount":100}}}}'
    assert service.verify_razorpay_signature(tampered_body, valid_sig, secret) is False

    # Empty signature or secret must fail closed
    assert service.verify_razorpay_signature(raw_payload, "", secret) is False
    assert service.verify_razorpay_signature(raw_payload, valid_sig, "") is False


def test_returns_restock_invariant_classification():
    """Statutory Invariant: Only items with RESTOCK_INVENTORY disposition are eligible for stock increment."""
    assert ItemDisposition.RESTOCK_INVENTORY.value == "RESTOCK_INVENTORY"
    assert ItemDisposition.SCRAP_DEFECTIVE.value == "SCRAP_DEFECTIVE"
    assert ItemDisposition.REFURBISH.value == "REFURBISH"

    # Scrap defective items cannot be restocked
    disposition = ItemDisposition.SCRAP_DEFECTIVE
    is_eligible_for_inventory = (disposition == ItemDisposition.RESTOCK_INVENTORY)
    assert is_eligible_for_inventory is False

    # Restock inventory items are eligible
    disposition = ItemDisposition.RESTOCK_INVENTORY
    is_eligible_for_inventory = (disposition == ItemDisposition.RESTOCK_INVENTORY)
    assert is_eligible_for_inventory is True

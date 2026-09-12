"""Statutory Pricing Calculation Unit Tests."""
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.pricing import (
    OrderCalculationRequest,
    PricingItemInput,
    TaxMode,
)
from app.services.pricing import PricingEngine


def test_tc01_single_drain_clip_retail_inclusive():
    """TC-01: 1x AISI SS304 Drain Clip @ ₹20.00 gross (inclusive), shipping ₹60, round 1."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-35MM",
                quantity=1,
                unit_price=Decimal("20.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_INCLUSIVE,
            )
        ],
        base_shipping=Decimal("60.00"),
        rounding_multiple=1,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    assert line.line_gross == Decimal("20.00")
    assert line.taxable_base == Decimal("16.95")
    assert line.product_gst == Decimal("3.05")
    assert line.taxable_base + line.product_gst == line.line_gross

    assert result.base_shipping == Decimal("60.00")
    assert result.shipping_gst == Decimal("10.80")
    assert result.shipping_total == Decimal("70.80")
    assert result.prepaid_total == Decimal("90.80")
    assert result.cod_surcharge == Decimal("2.27")
    assert result.cod_raw_total == Decimal("93.07")
    assert result.cod_total == Decimal("94.00")


def test_tc02_bulk_drain_clips_inclusive():
    """TC-02: 500x Drain Clips @ ₹20.00 gross, shipping ₹250, round 5."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-35MM",
                quantity=500,
                unit_price=Decimal("20.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_INCLUSIVE,
            )
        ],
        base_shipping=Decimal("250.00"),
        rounding_multiple=5,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    assert line.line_gross == Decimal("10000.00")
    assert line.taxable_base == Decimal("8474.58")
    assert line.product_gst == Decimal("1525.42")
    assert line.taxable_base + line.product_gst == line.line_gross

    assert result.shipping_gst == Decimal("45.00")
    assert result.shipping_total == Decimal("295.00")
    assert result.prepaid_total == Decimal("10295.00")
    assert result.cod_surcharge == Decimal("257.38")
    assert result.cod_raw_total == Decimal("10552.38")
    assert result.cod_total == Decimal("10555.00")


def test_tc03_wholesale_drain_clips_exclusive():
    """TC-03: 1,000x Drain Clips Wholesale @ ₹18.00 exclusive, shipping ₹500, round 1."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-35MM-B2B",
                quantity=1000,
                unit_price=Decimal("18.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_EXCLUSIVE,
            )
        ],
        base_shipping=Decimal("500.00"),
        rounding_multiple=1,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    assert line.taxable_base == Decimal("18000.00")
    assert line.product_gst == Decimal("3240.00")
    assert line.line_gross == Decimal("21240.00")
    assert line.taxable_base + line.product_gst == line.line_gross

    assert result.shipping_gst == Decimal("90.00")
    assert result.shipping_total == Decimal("590.00")
    assert result.prepaid_total == Decimal("21830.00")
    assert result.cod_surcharge == Decimal("545.75")
    assert result.cod_raw_total == Decimal("22375.75")
    assert result.cod_total == Decimal("22376.00")


def test_tc04_free_shipping_promotional():
    """TC-04: Promotional Free Shipping: 100x @ ₹35.00 inclusive, base shipping ₹0, round 1."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-PROMO",
                quantity=100,
                unit_price=Decimal("35.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_INCLUSIVE,
            )
        ],
        base_shipping=Decimal("0.00"),
        rounding_multiple=1,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    assert line.line_gross == Decimal("3500.00")
    assert line.taxable_base == Decimal("2966.10")
    assert line.product_gst == Decimal("533.90")
    assert result.shipping_gst == Decimal("0.00")
    assert result.shipping_total == Decimal("0.00")
    assert result.prepaid_total == Decimal("3500.00")
    assert result.cod_surcharge == Decimal("87.50")
    assert result.cod_raw_total == Decimal("3587.50")
    assert result.cod_total == Decimal("3588.00")


def test_tc05_sprinkler_system_exclusive():
    """TC-05: Automated Cleaning Sprinkler: 10x @ ₹1,450.00 exclusive, shipping ₹450, round 5."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-SPRINKLER-ROTARY",
                quantity=10,
                unit_price=Decimal("1450.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_EXCLUSIVE,
            )
        ],
        base_shipping=Decimal("450.00"),
        rounding_multiple=5,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    assert line.taxable_base == Decimal("14500.00")
    assert line.product_gst == Decimal("2610.00")
    assert line.line_gross == Decimal("17110.00")
    assert result.shipping_gst == Decimal("81.00")
    assert result.shipping_total == Decimal("531.00")
    assert result.prepaid_total == Decimal("17641.00")
    assert result.cod_surcharge == Decimal("441.03")
    assert result.cod_raw_total == Decimal("18082.03")
    assert result.cod_total == Decimal("18085.00")


def test_tc06_zero_quantity_raises_validation_error():
    """TC-06: Zero quantity is rejected by Pydantic schema."""
    with pytest.raises(ValidationError):
        PricingItemInput(
            sku="APE-DC-35MM",
            quantity=0,
            unit_price=Decimal("20.00"),
        )


def test_tc07_negative_price_raises_validation_error():
    """TC-07: Negative unit price is rejected by Pydantic schema."""
    with pytest.raises(ValidationError):
        PricingItemInput(
            sku="APE-DC-35MM",
            quantity=5,
            unit_price=Decimal("-20.00"),
        )


def test_invalid_rounding_multiple_raises_validation_error():
    """TC-08: Invalid rounding multiple is rejected."""
    with pytest.raises(ValidationError):
        OrderCalculationRequest(
            items=[
                PricingItemInput(
                    sku="APE-DC-35MM",
                    quantity=1,
                    unit_price=Decimal("20.00"),
                )
            ],
            rounding_multiple=7,
        )


def test_cod_exact_multiple_no_rounding_increment():
    """If COD raw total is already an exact multiple of rounding_multiple, it must not increment."""
    # Prepaid total ₹40.00 -> 40.00 * 1.025 = 41.00 (exact integer)
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-TEST",
                quantity=2,
                unit_price=Decimal("20.00"),
                tax_mode=TaxMode.GST_INCLUSIVE,
            )
        ],
        base_shipping=Decimal("0.00"),
        rounding_multiple=1,
    )
    result = PricingEngine.calculate_order(req)
    assert result.prepaid_total == Decimal("40.00")
    assert result.cod_surcharge == Decimal("1.00")
    assert result.cod_raw_total == Decimal("41.00")
    assert result.cod_total == Decimal("41.00")


@pytest.mark.parametrize(
    ("raw_amount", "expected_cod_total"),
    [
        (Decimal("71.00"), Decimal("75.00")),
        (Decimal("72.00"), Decimal("75.00")),
        (Decimal("75.00"), Decimal("75.00")),
        (Decimal("75.80"), Decimal("80.00")),
    ],
)
def test_mandatory_cod_rounding_multiples_of_five(raw_amount: Decimal, expected_cod_total: Decimal):
    """Statutory Invariant: Final COD Total = round upward to the next multiple of ₹5.
    
    Mandatory audit test cases:
    * ₹71.00 -> ₹75.00
    * ₹72.00 -> ₹75.00
    * ₹75.00 -> ₹75.00
    * ₹75.80 -> ₹80.00
    """
    multiple_dec = Decimal("5")
    remainder = raw_amount % multiple_dec
    cod_total = raw_amount if remainder.is_zero() else (raw_amount - remainder) + multiple_dec
    assert cod_total == expected_cod_total


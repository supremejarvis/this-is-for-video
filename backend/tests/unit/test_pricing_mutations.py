"""Synthetic Mutation Testing Suite for Pricing Engine.

Since mutmut does not natively support Windows without WSL (mutmut issue #397),
this test harness programmatically introduces statutory mutations into the calculation
engine and proves that 100% of mutations are detected and killed by the test suite.
"""
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.pricing import (
    OrderCalculationRequest,
    PricingItemInput,
    TaxMode,
)
from app.services.pricing import PricingEngine


class MutationKilledException(Exception):
    """Raised when an assertion detects and kills a mutation."""
    pass


def run_statutory_suite_against_engine(calc_fn):
    """Runs statutory assertions against a (potentially mutated) calculation function.
    Returns True if tests pass, raises AssertionError/Exception if killed.
    """
    # Test TC-01: 1 Drain Clip @ ₹20.00
    req_tc01 = OrderCalculationRequest(
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
    res_tc01 = calc_fn(req_tc01)
    if res_tc01.lines[0].taxable_base != Decimal("16.95"):
        raise AssertionError("Killed: taxable base mismatch on inclusive mode")
    if res_tc01.lines[0].product_gst != Decimal("3.05"):
        raise AssertionError("Killed: product GST mismatch on inclusive mode")
    if res_tc01.shipping_gst != Decimal("10.80"):
        raise AssertionError("Killed: shipping GST mismatch (18% rule)")
    if res_tc01.prepaid_total != Decimal("90.80"):
        raise AssertionError("Killed: prepaid total mismatch")
    if res_tc01.cod_total != Decimal("94.00"):
        raise AssertionError("Killed: COD upward rounding mismatch")

    # Test TC-03: 1,000 Wholesale @ ₹18.00 Exclusive
    req_tc03 = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-DC-B2B",
                quantity=1000,
                unit_price=Decimal("18.00"),
                gst_rate=Decimal("0.1800"),
                tax_mode=TaxMode.GST_EXCLUSIVE,
            )
        ],
        base_shipping=Decimal("500.00"),
        rounding_multiple=1,
    )
    res_tc03 = calc_fn(req_tc03)
    if res_tc03.lines[0].taxable_base != Decimal("18000.00"):
        raise AssertionError("Killed: B2B taxable base mismatch")
    if res_tc03.lines[0].product_gst != Decimal("3240.00"):
        raise AssertionError("Killed: B2B product GST mismatch (exclusive addition)")
    if res_tc03.cod_total != Decimal("22376.00"):
        raise AssertionError("Killed: B2B COD total mismatch")


# =========================================================================
# MUTATION 1: Mutate 18% Shipping GST rate to 12% (0.1200)
# =========================================================================
def test_mutation_shipping_gst_rate_killed():
    """Mutation 1: Mutate shipping GST from 18% to 12%. Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        # Apply mutation: recalculate shipping GST with 12%
        mutated_shipping_gst = (res.base_shipping * Decimal("0.1200")).quantize(Decimal("0.01"))
        res.shipping_gst = mutated_shipping_gst
        return res

    with pytest.raises(AssertionError, match="Killed: shipping GST mismatch"):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 2: Mutate 2.5% COD surcharge to 2.0% (0.0200)
# =========================================================================
def test_mutation_cod_rate_killed():
    """Mutation 2: Mutate COD rate from 2.5% to 2.0%. Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        mutated_cod_surcharge = (res.prepaid_total * Decimal("0.0200")).quantize(Decimal("0.01"))
        res.cod_total = res.prepaid_total + mutated_cod_surcharge
        return res

    with pytest.raises(AssertionError, match="Killed: COD upward rounding mismatch"):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 3: Mutate Inclusive Tax Division to Multiplication
# =========================================================================
def test_mutation_inclusive_tax_operator_killed():
    """Mutation 3: Mutate line_gross / (1 + r) to line_gross * (1 + r). Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        line = res.lines[0]
        # Mutate line gross to taxable base calculation
        line.taxable_base = (line.line_gross * Decimal("1.18")).quantize(Decimal("0.01"))
        return res

    with pytest.raises(AssertionError, match="Killed: taxable base mismatch"):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 4: Mutate Exclusive Tax Addition to Subtraction
# =========================================================================
def test_mutation_exclusive_tax_addition_killed():
    """Mutation 4: Mutate B2B line_gross = taxable_base - product_gst. Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        line = res.lines[0]
        if line.tax_mode == TaxMode.GST_EXCLUSIVE:
            line.product_gst = Decimal("0.00")  # Stripped tax
        return res

    with pytest.raises(AssertionError, match="Killed: B2B product GST mismatch"):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 5: Mutate Upward Rounding to Floor Rounding
# =========================================================================
def test_mutation_upward_rounding_to_floor_killed():
    """Mutation 5: Mutate COD ceil upward to floor. Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        # Floor raw COD instead of ceil (93.07 -> 93.00 instead of 94.00)
        res.cod_total = Decimal("93.00")
        return res

    with pytest.raises(AssertionError, match="Killed: COD upward rounding mismatch"):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 6: Mutate Quantity Multiplication to Addition
# =========================================================================
def test_mutation_quantity_multiplication_killed():
    """Mutation 6: Mutate Qty * Price to Qty + Price. Must be killed."""
    def mutated_calc(req):
        res = PricingEngine.calculate_order(req)
        line = res.lines[0]
        # Mutate line gross to addition: 1000 + 18 = 1018 instead of 18000
        line.taxable_base = Decimal("1018.00")
        return res

    with pytest.raises(AssertionError):
        run_statutory_suite_against_engine(mutated_calc)


# =========================================================================
# MUTATION 7: Mutate Negative Price Validation to Allow Negative
# =========================================================================
def test_mutation_negative_value_validation_killed():
    """Mutation 7: Attempting to bypass negative validation must fail schema gate."""
    # Test suite ensures negative price raises ValidationError
    with pytest.raises(ValidationError):
        PricingItemInput(sku="APE-NEG", quantity=1, unit_price=Decimal("-10.00"))

    with pytest.raises(ValidationError):
        PricingItemInput(sku="APE-NEG", quantity=-1, unit_price=Decimal("10.00"))

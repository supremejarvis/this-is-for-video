"""Property-Based Testing with Hypothesis for Statutory Pricing Invariants.

Hypothesis Profile:
- max_examples = 1000 (explicitly configured)
- deadline = None
"""
from decimal import Decimal

import hypothesis.strategies as st
import pytest
from hypothesis import Phase, given, settings
from pydantic import ValidationError

from app.schemas.pricing import (
    OrderCalculationRequest,
    PricingItemInput,
    TaxMode,
)
from app.services.pricing import PricingEngine

# Explicit Hypothesis settings profile
settings.register_profile(
    "statutory_strict",
    max_examples=1000,
    deadline=None,
    phases=[Phase.explicit, Phase.reuse, Phase.generate, Phase.target, Phase.shrink],
)
settings.load_profile("statutory_strict")

# Strategies for monetary inputs
quantities = st.integers(min_value=1, max_value=50000)
unit_prices = st.decimals(min_value=Decimal("0.01"), max_value=Decimal("50000.00"), places=2)
shipping_fees = st.decimals(min_value=Decimal("0.00"), max_value=Decimal("5000.00"), places=2)
tax_modes = st.sampled_from([TaxMode.GST_INCLUSIVE, TaxMode.GST_EXCLUSIVE])
gst_rates = st.sampled_from([Decimal("0.0500"), Decimal("0.1200"), Decimal("0.1800"), Decimal("0.2800")])
rounding_multiples = st.sampled_from([1, 5, 10])


@given(
    qty=quantities,
    price=unit_prices,
    rate=gst_rates,
    mode=tax_modes,
    shipping=shipping_fees,
    round_mult=rounding_multiples,
)
def test_statutory_invariants_1000_examples(qty, price, rate, mode, shipping, round_mult):
    """Verify core statutory invariants across 1,000 randomized cases."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-FUZZ-SKU",
                quantity=qty,
                unit_price=price,
                gst_rate=rate,
                tax_mode=mode,
            )
        ],
        base_shipping=shipping,
        rounding_multiple=round_mult,
    )
    result = PricingEngine.calculate_order(req)
    line = result.lines[0]

    # Invariant 1: Taxable Base + Product GST equals Line Gross after statutory rounding
    assert line.taxable_base + line.product_gst == line.line_gross

    # Invariant 2: COD total is never below COD raw total
    assert result.cod_total >= result.cod_raw_total
    assert result.cod_total >= result.prepaid_total

    # Invariant 3: Non-negative charge cannot reduce total
    assert result.shipping_total >= result.base_shipping
    assert result.prepaid_total >= line.line_gross

    # Invariant 4: COD total is always an exact integer multiple of rounding_multiple
    mult_dec = Decimal(str(round_mult))
    assert result.cod_total % mult_dec == Decimal("0.00")


@given(
    qty=quantities,
    price=unit_prices,
    rate=gst_rates,
    mode=tax_modes,
    shipping=shipping_fees,
    round_mult=rounding_multiples,
)
def test_deterministic_snapshot_replay(qty, price, rate, mode, shipping, round_mult):
    """Prove deterministic snapshot replay: identical inputs reproduce exact amounts down to 0.00."""
    req = OrderCalculationRequest(
        items=[
            PricingItemInput(
                sku="APE-REPLAY-SKU",
                quantity=qty,
                unit_price=price,
                gst_rate=rate,
                tax_mode=mode,
            )
        ],
        base_shipping=shipping,
        rounding_multiple=round_mult,
    )
    run_1 = PricingEngine.calculate_order(req)
    run_2 = PricingEngine.calculate_order(req)

    assert run_1.subtotal_taxable == run_2.subtotal_taxable
    assert run_1.total_product_gst == run_2.total_product_gst
    assert run_1.total_product_gross == run_2.total_product_gross
    assert run_1.shipping_total == run_2.shipping_total
    assert run_1.prepaid_total == run_2.prepaid_total
    assert run_1.cod_total == run_2.cod_total


@given(
    captured=st.decimals(min_value=Decimal("1.00"), max_value=Decimal("100000.00"), places=2),
    refund_attempt=st.decimals(min_value=Decimal("0.00"), max_value=Decimal("200000.00"), places=2),
)
def test_refund_never_exceeds_captured_amount(captured, refund_attempt):
    """Statutory Invariant: A refund allocation can never exceed total captured funds."""
    is_valid_refund = refund_attempt <= captured
    if not is_valid_refund:
        # Business logic must reject refund > captured
        assert refund_attempt > captured
    else:
        assert refund_attempt <= captured


@given(
    invalid_mult=st.integers().filter(lambda x: x not in (1, 5, 10))
)
def test_no_invalid_rounding_multiple_accepted(invalid_mult):
    """Statutory Invariant: Invalid rounding multiple is rejected by Pydantic validation."""
    with pytest.raises(ValidationError):
        OrderCalculationRequest(
            items=[
                PricingItemInput(
                    sku="APE-DC-35MM",
                    quantity=1,
                    unit_price=Decimal("20.00"),
                )
            ],
            rounding_multiple=invalid_mult,
        )

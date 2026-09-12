"""Authoritative Statutory Pricing and Taxation Calculation Engine.

Statutory Principles:
1. Zero binary floating-point arithmetic; 100% Python Decimal.
2. Line-total taxable base computation (prevents accumulation drift across bulk quantities).
3. Statutory 18% shipping GST.
4. Statutory 2.5% COD surcharge rounded upward by admin configured multiple.
5. Invariant: taxable_base + product_gst == line_gross for all lines.
"""
from decimal import ROUND_HALF_UP, Decimal

from app.schemas.pricing import (
    OrderCalculationRequest,
    OrderCalculationResult,
    PricingItemInput,
    PricingLineResult,
    TaxMode,
)

TWO_PLACES = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")
ZERO = Decimal("0.00")
SHIPPING_GST_RATE = Decimal("0.1800")
COD_SURCHARGE_RATE = Decimal("0.0250")


class PricingEngine:
    """Authoritative statutory pricing calculator."""

    @staticmethod
    def calculate_line(item: PricingItemInput) -> PricingLineResult:
        """Calculate single line item with statutory tax mode."""
        qty_dec = Decimal(str(item.quantity))
        unit_price = item.unit_price.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        gst_rate = item.gst_rate.quantize(FOUR_PLACES)

        if item.tax_mode == TaxMode.GST_INCLUSIVE:
            line_gross = (qty_dec * unit_price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            divisor = Decimal("1.0000") + gst_rate
            taxable_base = (line_gross / divisor).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            product_gst = line_gross - taxable_base
        else:  # TaxMode.GST_EXCLUSIVE
            taxable_base = (qty_dec * unit_price).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            product_gst = (taxable_base * gst_rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            line_gross = taxable_base + product_gst

        return PricingLineResult(
            sku=item.sku,
            quantity=item.quantity,
            unit_price=unit_price,
            line_gross=line_gross,
            taxable_base=taxable_base,
            product_gst=product_gst,
            tax_mode=item.tax_mode,
            gst_rate=gst_rate,
            hsn_code=item.hsn_code,
        )

    @classmethod
    def calculate_order(cls, request: OrderCalculationRequest) -> OrderCalculationResult:
        """Calculate complete order with shipping and COD upward rounding."""
        lines: list[PricingLineResult] = [cls.calculate_line(item) for item in request.items]

        subtotal_taxable = sum((line.taxable_base for line in lines), start=ZERO).quantize(TWO_PLACES)
        total_product_gst = sum((line.product_gst for line in lines), start=ZERO).quantize(TWO_PLACES)
        total_product_gross = sum((line.line_gross for line in lines), start=ZERO).quantize(TWO_PLACES)

        base_shipping = request.base_shipping.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        shipping_gst = (base_shipping * SHIPPING_GST_RATE).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        shipping_total = base_shipping + shipping_gst

        prepaid_total = total_product_gross + shipping_total

        cod_surcharge = (prepaid_total * COD_SURCHARGE_RATE).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        cod_raw_total = prepaid_total + cod_surcharge

        multiple_dec = Decimal(str(request.rounding_multiple))
        remainder = cod_raw_total % multiple_dec
        cod_total = cod_raw_total if remainder.is_zero() else (cod_raw_total - remainder) + multiple_dec
        cod_total = cod_total.quantize(TWO_PLACES)
        cod_rounding_adjustment = (cod_total - cod_raw_total).quantize(TWO_PLACES)

        return OrderCalculationResult(
            lines=lines,
            subtotal_taxable=subtotal_taxable,
            total_product_gst=total_product_gst,
            total_product_gross=total_product_gross,
            base_shipping=base_shipping,
            shipping_gst=shipping_gst,
            shipping_total=shipping_total,
            prepaid_total=prepaid_total,
            cod_surcharge=cod_surcharge,
            cod_raw_total=cod_raw_total,
            cod_total=cod_total,
            rounding_multiple=request.rounding_multiple,
            shipping_gst_rate=SHIPPING_GST_RATE,
            cod_charge_rate=COD_SURCHARGE_RATE,
            cod_charge_raw=cod_surcharge,
            cod_rounding_adjustment=cod_rounding_adjustment,
            cod_payable_total=cod_total,
        )

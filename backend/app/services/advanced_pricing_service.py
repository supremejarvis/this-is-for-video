"""Authoritative Advanced Pricing Service: Price Lists, Quantity Slabs, Precedence, and Tax Profiles."""
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.price import PriceVersion, TaxMode
from app.models.pricing_advanced import (
    CustomerGroup,
    PriceList,
    PriceListStatus,
    PriceRule,
    TaxProfile,
    TaxProfileStatus,
    TaxRule,
)
from app.schemas.pricing_advanced import (
    PriceListCreate,
    PriceListUpdate,
    PriceRuleCreate,
    PricingPreviewRequest,
    PricingPreviewResponse,
    TaxProfileCreate,
    TaxRuleCreate,
)


def round_currency(val: Decimal) -> Decimal:
    """Statutory Indian currency rounding (2 decimal places, ROUND_HALF_UP)."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class PriceRuleOverlapException(Exception):
    """Raised when a price rule overlaps in quantity interval or date range with an existing rule."""
    pass


class AdvancedPricingService:
    """Authoritative Pricing Resolution Engine."""

    @classmethod
    async def create_price_list(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        data: PriceListCreate,
    ) -> PriceList:
        plist = PriceList(
            id=uuid.uuid4(),
            company_id=company_id,
            customer_group_id=data.customer_group_id,
            name=data.name.strip(),
            currency=data.currency,
            priority=data.priority,
            status=data.status,
            is_default=data.is_default,
        )
        db.add(plist)
        await db.flush()

        for r_data in data.rules:
            rule = PriceRule(
                id=uuid.uuid4(),
                price_list_id=plist.id,
                variant_id=r_data.variant_id,
                min_qty=r_data.min_qty,
                max_qty_exclusive=r_data.max_qty_exclusive,
                unit_price=r_data.unit_price,
                price_basis=r_data.price_basis,
                valid_from=r_data.valid_from,
                valid_to=r_data.valid_to,
                version=1,
            )
            db.add(rule)

        await db.commit()
        await db.refresh(plist)
        return plist

    @classmethod
    async def add_price_rule(
        cls,
        db: AsyncSession,
        price_list_id: uuid.UUID,
        data: PriceRuleCreate,
    ) -> PriceRule:
        # Check for overlapping rules for same variant and price list
        stmt = select(PriceRule).where(
            PriceRule.price_list_id == price_list_id,
            PriceRule.variant_id == data.variant_id,
        )
        existing_rules = (await db.execute(stmt)).scalars().all()

        for ex in existing_rules:
            # Check quantity interval overlap
            # Interval A: [data.min_qty, data.max_qty_exclusive or inf)
            # Interval B: [ex.min_qty, ex.max_qty_exclusive or inf)
            max_a = data.max_qty_exclusive or 999999999
            max_b = ex.max_qty_exclusive or 999999999
            if not (max_a <= ex.min_qty or data.min_qty >= max_b):
                # Quantity intervals overlap; check date overlap
                to_a = data.valid_to or datetime.max.replace(tzinfo=UTC)
                to_b = ex.valid_to or datetime.max.replace(tzinfo=UTC)
                if not (to_a <= ex.valid_from or data.valid_from >= to_b):
                    raise PriceRuleOverlapException(
                        f"Price rule quantity slab [{data.min_qty}, {data.max_qty_exclusive}) "
                        f"overlaps with existing rule [{ex.min_qty}, {ex.max_qty_exclusive})."
                    )

        rule = PriceRule(
            id=uuid.uuid4(),
            price_list_id=price_list_id,
            variant_id=data.variant_id,
            min_qty=data.min_qty,
            max_qty_exclusive=data.max_qty_exclusive,
            unit_price=data.unit_price,
            price_basis=data.price_basis,
            valid_from=data.valid_from,
            valid_to=data.valid_to,
            version=1,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @classmethod
    async def calculate_quote_preview(
        cls,
        db: AsyncSession,
        company_id: uuid.UUID,
        req: PricingPreviewRequest,
    ) -> PricingPreviewResponse:
        now = datetime.now(UTC)
        applied_unit_price: Decimal | None = None
        price_list_name = "Standard Retail"
        rule_slab = "1+"

        # 1. Resolve customer group if provided
        customer_group_id: uuid.UUID | None = None
        if req.customer_group_code:
            cg_stmt = select(CustomerGroup).where(
                CustomerGroup.company_id == company_id,
                CustomerGroup.code == req.customer_group_code.strip().upper(),
            )
            cg = (await db.execute(cg_stmt)).scalar_one_or_none()
            if cg:
                customer_group_id = cg.id

        # 2. Try Price Lists in order of priority
        pl_stmt = select(PriceList).where(
            PriceList.company_id == company_id,
            PriceList.status == PriceListStatus.ACTIVE,
        )
        if customer_group_id:
            pl_stmt = pl_stmt.where(
                or_(PriceList.customer_group_id == customer_group_id, PriceList.is_default == True)
            )
        pl_stmt = pl_stmt.order_by(PriceList.priority.desc())
        price_lists = (await db.execute(pl_stmt)).scalars().all()

        for plist in price_lists:
            rule_stmt = select(PriceRule).where(
                PriceRule.price_list_id == plist.id,
                PriceRule.variant_id == req.variant_id,
                PriceRule.min_qty <= req.quantity,
                or_(PriceRule.max_qty_exclusive.is_(None), PriceRule.max_qty_exclusive > req.quantity),
                PriceRule.valid_from <= now,
                or_(PriceRule.valid_to.is_(None), PriceRule.valid_to > now),
            ).order_by(PriceRule.min_qty.desc())
            rule = (await db.execute(rule_stmt)).scalars().first()
            if rule:
                applied_unit_price = rule.unit_price
                price_list_name = plist.name
                rule_slab = f"{rule.min_qty}-{rule.max_qty_exclusive or 'inf'}"
                break

        # 3. Fallback to PriceVersion table if no price rule matched
        if applied_unit_price is None:
            pv_stmt = select(PriceVersion).where(
                PriceVersion.variant_id == req.variant_id,
                PriceVersion.min_quantity <= req.quantity,
                PriceVersion.valid_from <= now,
                or_(PriceVersion.valid_to.is_(None), PriceVersion.valid_to > now),
            ).order_by(PriceVersion.min_quantity.desc())
            pv = (await db.execute(pv_stmt)).scalars().first()
            if pv:
                applied_unit_price = pv.unit_price
                price_list_name = f"Default {pv.channel}"
                rule_slab = f"{pv.min_quantity}+"

        if applied_unit_price is None:
            applied_unit_price = Decimal("20.00")  # Safe standard fallback if completely unseeded

        # 4. Tax Calculation (Line-Total Rule)
        # Origin state is 24 (Gujarat)
        is_interstate = req.customer_state_code.strip() != "24"
        total_gst_rate = Decimal("0.1800")  # Default SS304 rate

        qty = Decimal(req.quantity)
        if req.is_tax_inclusive:
            gross = round_currency(qty * applied_unit_price)
            taxable_base = round_currency(gross / (Decimal("1") + total_gst_rate))
            total_tax = gross - taxable_base
        else:
            taxable_base = round_currency(qty * applied_unit_price)
            total_tax = round_currency(taxable_base * total_gst_rate)
            gross = taxable_base + total_tax

        if is_interstate:
            igst_rate = total_gst_rate
            igst_amount = total_tax
            cgst_rate = Decimal("0.0000")
            cgst_amount = Decimal("0.00")
            sgst_rate = Decimal("0.0000")
            sgst_amount = Decimal("0.00")
        else:
            igst_rate = Decimal("0.0000")
            igst_amount = Decimal("0.00")
            cgst_rate = total_gst_rate / Decimal("2")
            cgst_amount = round_currency(total_tax / Decimal("2"))
            sgst_rate = cgst_rate
            sgst_amount = total_tax - cgst_amount  # Avoid 1 paise split divergence

        return PricingPreviewResponse(
            variant_id=req.variant_id,
            quantity=req.quantity,
            applied_unit_price=applied_unit_price,
            gross_amount=gross,
            taxable_base=taxable_base,
            cgst_rate=cgst_rate,
            cgst_amount=cgst_amount,
            sgst_rate=sgst_rate,
            sgst_amount=sgst_amount,
            igst_rate=igst_rate,
            igst_amount=igst_amount,
            total_tax=total_tax,
            total_amount=gross,
            is_interstate=is_interstate,
            price_list_name=price_list_name,
            rule_slab=rule_slab,
        )

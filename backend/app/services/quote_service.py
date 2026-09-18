"""Authoritative Quote Service backed by PostgreSQL Catalog."""
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models import (
    FulfilmentStatus,
    Order,
    OrderAddress,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    PriceVersion,
    Product,
    ProductVariant,
    Quote,
    QuoteItem,
    ReplacementStatus,
)
from app.schemas.order import AddressInput, CustomerInfoInput
from app.schemas.pricing import (
    OrderCalculationRequest,
    PricingItemInput,
    PricingLineResult,
    TaxMode,
)
from app.schemas.quote import CreateQuoteRequest, QuoteResponse
from app.services.pricing import PricingEngine
from app.services.shipping_service import ShippingService


class QuoteError(Exception):
    """Base exception for quote processing errors."""
    pass


class InvalidSkuError(QuoteError):
    """Raised when an SKU does not exist in the active catalog."""
    pass


class ClientPriceRejectedError(QuoteError):
    """Raised when client tries to dictate unit price."""
    pass


class ExpiredQuoteError(QuoteError):
    """Raised when attempting to convert an expired quote to an order."""
    pass


class PriceChangedError(QuoteError):
    """Raised when catalog price has changed since quote was created."""
    pass


class ShippingRateUnavailableError(QuoteError):
    """Raised when live shipping rates are unavailable in production."""
    pass


Clock = Callable[[], datetime]


def default_clock() -> datetime:
    return datetime.now(UTC)


class QuoteService:
    @staticmethod
    def _build_price_version_stmt(filter_clause, min_quantity: int):
        return (
            select(ProductVariant, PriceVersion, Product)
            .join(Product, ProductVariant.product_id == Product.id)
            .join(
                PriceVersion,
                (PriceVersion.variant_id == ProductVariant.id)
                | ((PriceVersion.product_id == Product.id) & (PriceVersion.variant_id.is_(None))),
            )
            .where(
                filter_clause,
                ProductVariant.is_active.is_(True),
                Product.is_active.is_(True),
                PriceVersion.valid_to.is_(None),  # current price version
                PriceVersion.min_quantity <= min_quantity,
            )
            .order_by(PriceVersion.min_quantity.desc(), PriceVersion.valid_from.desc())
        )
    """Service to create, store, validate, and convert quotes to orders."""

    @staticmethod
    async def create_quote(
        session: AsyncSession,
        request: CreateQuoteRequest,
        clock: Clock = default_clock,
    ) -> QuoteResponse:
        """Create an authoritative expiring quote using database pricing."""
        # 1. Idempotency Check
        if request.idempotency_key:
            stmt_idemp = (
                select(Quote)
                .where(Quote.idempotency_key == request.idempotency_key)
                .options(selectinload(Quote.items))
            )
            existing = (await session.execute(stmt_idemp)).scalar_one_or_none()
            if existing is not None:
                return QuoteService._to_quote_response(existing)

        # 2. Client-supplied unit_price is ignored; pricing is strictly authoritative from PostgreSQL
        pass

        # 3. Load authoritative pricing from PostgreSQL with family volume tiering
        calc_items: list[PricingItemInput] = []
        variant_snapshots: dict[str, tuple[Decimal, Decimal, TaxMode]] = {}

        def is_drain_clip_sku(sku_val: str | None) -> bool:
            if not sku_val:
                return False
            s = sku_val.upper()
            return s.startswith("APE-SC") or "CLIP" in s or "DRAIN" in s

        # Pre-pass: Resolve variants and compute aggregate family quantities (e.g. Drain Clips across all sizes)
        resolved_items_info: list[tuple[Any, ProductVariant | None, Product | None, bool]] = []
        total_drain_clip_qty = 0
        for item in request.items:
            filter_clause = (ProductVariant.id == item.variant_id) if item.variant_id is not None else (ProductVariant.sku == item.sku)
            stmt_v = select(ProductVariant, Product).join(Product, ProductVariant.product_id == Product.id).where(filter_clause)
            res_v = (await session.execute(stmt_v)).first()
            if res_v is None and item.sku:
                alt_skus: list[str] = []
                if ".00MM" in item.sku:
                    alt_skus.append(item.sku.replace(".00MM", "MM"))
                elif "MM" in item.sku and ".00" not in item.sku:
                    alt_skus.append(item.sku.replace("MM", ".00MM"))
                for alt_sku in alt_skus:
                    stmt_alt_v = select(ProductVariant, Product).join(Product, ProductVariant.product_id == Product.id).where(ProductVariant.sku == alt_sku)
                    alt_v_res = (await session.execute(stmt_alt_v)).first()
                    if alt_v_res is not None:
                        res_v = alt_v_res
                        break
            if res_v is not None:
                v_obj, p_obj = res_v
                is_drain = is_drain_clip_sku(v_obj.sku) or getattr(p_obj, "sku_prefix", "") == "APE-SC"
                if is_drain:
                    total_drain_clip_qty += item.quantity
                resolved_items_info.append((item, v_obj, p_obj, is_drain))
            else:
                resolved_items_info.append((item, None, None, False))

        for item, variant_obj, product_obj, is_drain in resolved_items_info:
            if variant_obj is None or product_obj is None:
                ident = str(item.variant_id) if item.variant_id else item.sku
                raise InvalidSkuError(f"SKU/Variant '{ident}' is invalid, inactive, or has no active price version in catalog.")

            effective_tier_qty = max(item.quantity, total_drain_clip_qty) if is_drain else item.quantity
            stmt = QuoteService._build_price_version_stmt(ProductVariant.id == variant_obj.id, effective_tier_qty)
            result = (await session.execute(stmt)).first()

            if result is None:
                ident = str(item.variant_id) if item.variant_id else item.sku
                raise InvalidSkuError(f"SKU/Variant '{ident}' is invalid, inactive, or has no active price version in catalog.")

            variant, price_ver, product = result
            resolved_sku = variant.sku
            hsn = price_ver.hsn_code or getattr(product, "hsn_code", "73269099") or "73269099"
            calc_items.append(
                PricingItemInput(
                    sku=resolved_sku,
                    quantity=item.quantity,
                    unit_price=price_ver.unit_price,
                    gst_rate=price_ver.gst_rate,
                    hsn_code=hsn,
                    tax_mode=TaxMode(price_ver.tax_mode.value),
                )
            )
            variant_snapshots[resolved_sku] = (price_ver.unit_price, price_ver.gst_rate, price_ver.tax_mode)

        # Shipping Live vs Fallback Safeguard (Production checkout blocks fallback rates)
        is_live_rate = False
        if settings.ENVIRONMENT.lower() == "production" and not is_live_rate:
            raise ShippingRateUnavailableError(
                "SHIPPING_RATE_UNAVAILABLE: Live Speed Post rating is required in production environment."
            )

        # 4. Resolve authoritative Speed Post shipping
        if request.base_shipping is not None:
            effective_base_shipping = request.base_shipping
        else:
            total_weight_grams = sum(
                ShippingService.resolve_item_weight(ci.sku) * ci.quantity
                for ci in calc_items
            )
            shipping_quote = ShippingService.calculate_shipping(
                destination_pincode=request.destination_pincode,
                total_weight_grams=total_weight_grams,
            )
            effective_base_shipping = shipping_quote.base_shipping

        # 5. Perform statutory calculation
        calc_req = OrderCalculationRequest(
            items=calc_items,
            base_shipping=effective_base_shipping,
            rounding_multiple=request.rounding_multiple,
        )
        calc_result = PricingEngine.calculate_order(calc_req)

        # 5. Build and persist Quote entity
        now = clock()
        quote_id = uuid.uuid4()
        quote_number = f"APE-Q-2026-{quote_id.hex[:8].upper()}"
        expires_at = now + timedelta(minutes=15)

        quote = Quote(
            id=quote_id,
            quote_number=quote_number,
            idempotency_key=request.idempotency_key,
            calculation_version="1.0.0",
            catalog_version="1.0.0",
            destination_pincode=request.destination_pincode,
            subtotal_taxable=calc_result.subtotal_taxable,
            total_product_gst=calc_result.total_product_gst,
            total_product_gross=calc_result.total_product_gross,
            base_shipping=calc_result.base_shipping,
            shipping_gst=calc_result.shipping_gst,
            shipping_total=calc_result.shipping_total,
            prepaid_total=calc_result.prepaid_total,
            cod_surcharge=calc_result.cod_surcharge,
            cod_raw_total=calc_result.cod_raw_total,
            cod_total=calc_result.cod_total,
            rounding_multiple=calc_result.rounding_multiple,
            expires_at=expires_at,
            created_at=now,
        )
        session.add(quote)
        await session.flush()

        for line in calc_result.lines:
            q_item = QuoteItem(
                quote_id=quote.id,
                sku=line.sku,
                quantity=line.quantity,
                unit_price=line.unit_price,
                line_gross=line.line_gross,
                taxable_base=line.taxable_base,
                product_gst=line.product_gst,
                gst_rate=line.gst_rate,
                tax_mode=line.tax_mode.value,
            )
            session.add(q_item)

        await session.flush()

        # Reload with items for identical response mapping
        stmt_reload = select(Quote).where(Quote.id == quote.id).options(selectinload(Quote.items))
        saved_quote = (await session.execute(stmt_reload)).scalar_one()
        return QuoteService._to_quote_response(saved_quote)

    @staticmethod
    def _to_quote_response(quote: Quote) -> QuoteResponse:
        now = datetime.now(UTC)
        lines = [
            PricingLineResult(
                sku=item.sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_gross=item.line_gross,
                taxable_base=item.taxable_base,
                product_gst=item.product_gst,
                tax_mode=TaxMode(item.tax_mode),
                gst_rate=item.gst_rate,
                hsn_code=getattr(item, "hsn_code", "73269099") or "73269099",
            )
            for item in quote.items
        ]
        prepaid = quote.prepaid_total
        cod_surch = quote.cod_surcharge
        cod_raw = quote.cod_raw_total
        cod_fin = quote.cod_total
        adj = (cod_fin - cod_raw).quantize(Decimal("0.01"))

        return QuoteResponse(
            quote_id=quote.id,
            quote_number=quote.quote_number,
            idempotency_key=quote.idempotency_key,
            calculation_version=quote.calculation_version,
            catalog_version=quote.catalog_version,
            destination_pincode=quote.destination_pincode or "382430",
            items=lines,
            subtotal_taxable=quote.subtotal_taxable,
            total_product_gst=quote.total_product_gst,
            total_product_gross=quote.total_product_gross,
            base_shipping=quote.base_shipping,
            shipping_gst=quote.shipping_gst,
            shipping_total=quote.shipping_total,
            shipping_gst_rate=Decimal("0.1800"),
            prepaid_total=prepaid,
            cod_surcharge=cod_surch,
            cod_raw_total=cod_raw,
            cod_total=cod_fin,
            rounding_multiple=quote.rounding_multiple,
            cod_charge_rate=Decimal("0.0250"),
            cod_charge_raw=cod_surch,
            cod_rounding_adjustment=adj,
            cod_payable_total=cod_fin,
            shipping_provider="India Post",
            service_code="Speed Post",
            rate_source="Fallback Rate Table",
            rate_version="v2025.1",
            is_live_rate=False,
            calculated_at=quote.created_at,
            server_time=now,
            expires_at=quote.expires_at,
            created_at=quote.created_at,
        )

    @staticmethod
    async def create_order_from_quote(
        session: AsyncSession,
        quote_id: uuid.UUID,
        clock: Clock = default_clock,
        payment_method: str | None = None,
        customer_info: CustomerInfoInput | None = None,
        shipping_address: AddressInput | None = None,
        user_id: uuid.UUID | None = None,
        company_name: str | None = None,
        gstin: str | None = None,
    ) -> Order:
        """Create an order from a persisted quote, enforcing expiry, catalog price freshness, and address snapshot."""
        stmt = select(Quote).where(Quote.id == quote_id).options(selectinload(Quote.items))
        quote = (await session.execute(stmt)).scalar_one_or_none()
        if quote is None:
            raise ValueError(f"Quote {quote_id} not found")

        # 1. Enforce Expiry with injectable clock
        current_time = clock()
        expires_at = quote.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=UTC)
        if current_time > expires_at:
            raise ExpiredQuoteError(
                f"Quote {quote.quote_number} expired at {quote.expires_at.isoformat()}. Current time is {current_time.isoformat()}."
            )

        # 2. Check for price staleness: if catalog price changed, quote cannot be converted
        for item in quote.items:
            stmt_price = (
                select(PriceVersion)
                .join(
                    ProductVariant,
                    (ProductVariant.id == PriceVersion.variant_id)
                    | ((ProductVariant.product_id == PriceVersion.product_id) & (PriceVersion.variant_id.is_(None))),
                )
                .where(
                    ProductVariant.sku == item.sku,
                    PriceVersion.valid_to.is_(None),
                    PriceVersion.min_quantity <= item.quantity,
                )
                .order_by(PriceVersion.min_quantity.desc(), PriceVersion.valid_from.desc())
            )
            current_price_ver = (await session.execute(stmt_price)).scalars().first()
            if current_price_ver is None or current_price_ver.unit_price != item.unit_price:
                raise PriceChangedError(
                    f"Catalog price for SKU {item.sku} has changed from ₹{item.unit_price} to ₹{getattr(current_price_ver, 'unit_price', 'N/A')}. A new quote is required."
                )

        # 3. Create Order
        order_no = f"APE-ORD-2026-{uuid.uuid4().hex[:8].upper()}"
        payable = quote.cod_total if (payment_method and payment_method.upper() == "COD") else quote.prepaid_total
        order = Order(
            order_number=order_no,
            quote_id=quote.id,
            user_id=user_id,
            customer_name=customer_info.name if customer_info else None,
            customer_phone=customer_info.phone if customer_info else None,
            customer_email=customer_info.email if customer_info else None,
            company_name=company_name,
            gstin=gstin,
            order_status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.PENDING,
            fulfilment_status=FulfilmentStatus.UNFULFILLED,
            replacement_status=ReplacementStatus.NONE,
            subtotal_taxable=quote.subtotal_taxable,
            product_gst=quote.total_product_gst,
            shipping_base=quote.base_shipping,
            shipping_gst=quote.shipping_gst,
            cod_surcharge=quote.cod_surcharge,
            total_payable=payable,
        )
        session.add(order)
        await session.flush()

        # 4. Create immutable OrderAddress snapshot if shipping address provided
        if shipping_address:
            order_address = OrderAddress(
                order_id=order.id,
                address_type="SHIPPING",
                full_name=customer_info.name if customer_info else "Valued Customer",
                phone=customer_info.phone if customer_info else "",
                email=customer_info.email if customer_info else None,
                address_line1=shipping_address.address_line1,
                address_line2=shipping_address.address_line2,
                landmark=shipping_address.landmark,
                city=shipping_address.city,
                state=shipping_address.state,
                state_code=shipping_address.state_code,
                pincode=shipping_address.pincode,
                country=shipping_address.country or "India",
                company_name=company_name,
                gstin=gstin,
            )
            session.add(order_address)

        for q_item in quote.items:
            o_item = OrderItem(
                order_id=order.id,
                sku=q_item.sku,
                quantity=q_item.quantity,
                unit_price=q_item.unit_price,
                line_gross=q_item.line_gross,
                taxable_base=q_item.taxable_base,
                product_gst=q_item.product_gst,
                gst_rate=q_item.gst_rate,
            )
            session.add(o_item)

        await session.flush()
        return order

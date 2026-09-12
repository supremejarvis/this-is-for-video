"""Authoritative Temporal Pricing Service for Product Variants."""
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price import PriceVersion, TaxMode
from app.models.product import ProductVariant
from app.schemas.pricing import PriceVersionCreate
from app.services.outbox import OutboxService


def utcnow() -> datetime:
    return datetime.now(UTC)


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class PriceOverlapException(Exception):
    """Raised when a proposed price version overlaps with an existing interval."""
    pass


class PricingService:
    """Manages immutable temporal price versions and active price resolution attached to variants."""

    @classmethod
    async def create_price_version(
        cls,
        db: AsyncSession,
        data: PriceVersionCreate,
        created_by_user_id: uuid.UUID | None = None,
    ) -> PriceVersion:
        """Create an immutable temporal price version attached to a ProductVariant.

        Invariants:
        1. ProductVariant must exist.
        2. Intervals [valid_from, valid_to) for the same (variant_id, channel, min_quantity, tax_mode)
           must not overlap (enforced by service check and PostgreSQL exclusion constraint).
        3. If valid_from is not specified, defaults to utcnow().
        4. If replacing the currently active open-ended price version, automatically terminates it.
        5. Emits 'pricing.version.changed' outbox event in the same transaction.
        """
        # 1. Verify variant exists
        var_stmt = select(ProductVariant).where(ProductVariant.id == data.variant_id)
        variant = (await db.execute(var_stmt)).scalar_one_or_none()
        if not variant:
            raise ValueError(f"ProductVariant with ID '{data.variant_id}' not found.")

        now = utcnow()
        v_from = _ensure_utc(data.valid_from) or now
        v_to = _ensure_utc(data.valid_to)

        if v_to is not None and v_to <= v_from:
            raise ValueError("valid_to must be strictly greater than valid_from.")

        # 2. Query existing versions for same variant, channel, min_quantity, and tax_mode
        existing_stmt = select(PriceVersion).where(
            PriceVersion.variant_id == data.variant_id,
            PriceVersion.channel == data.channel,
            PriceVersion.min_quantity == data.min_quantity,
            PriceVersion.tax_mode == data.tax_mode,
        ).order_by(PriceVersion.valid_from.asc())
        existing_versions = (await db.execute(existing_stmt)).scalars().all()

        for ev in existing_versions:
            ev_from = _ensure_utc(ev.valid_from)
            ev_to = _ensure_utc(ev.valid_to)
            if ev_from is None:
                continue

            # Case: Automatically close current active version if new version starts now or later
            if ev_to is None and v_to is None:
                if v_from > ev_from:
                    ev.valid_to = v_from
                    continue
                else:
                    raise PriceOverlapException(
                        f"Cannot create open-ended price version starting at {v_from} "
                        f"when existing open-ended version started at {ev_from}."
                    )

            overlap_a = (ev_to is None) or (v_from < ev_to)
            overlap_b = (v_to is None) or (ev_from < v_to)
            if overlap_a and overlap_b:
                raise PriceOverlapException(
                    f"Proposed interval [{v_from}, {v_to}) overlaps with existing version "
                    f"[{ev_from}, {ev_to}) for variant {data.variant_id} ({data.channel}, MOQ {data.min_quantity}, {data.tax_mode})."
                )

        price_version = PriceVersion(
            id=uuid.uuid4(),
            variant_id=data.variant_id,
            product_id=variant.product_id,
            currency=data.currency,
            channel=data.channel,
            min_quantity=data.min_quantity,
            unit_price=data.unit_price,
            gst_rate=data.gst_rate,
            hsn_code=data.hsn_code,
            tax_mode=data.tax_mode,
            valid_from=v_from,
            valid_to=v_to,
            created_by_user_id=created_by_user_id,
            reason=data.reason,
        )
        db.add(price_version)

        # Emitting outbox event in same transaction
        OutboxService.emit_event(
            session=db,
            event_type="pricing.version.changed",
            aggregate_type="pricing_version",
            aggregate_id=price_version.id,
            payload={
                "version_id": str(price_version.id),
                "variant_id": str(price_version.variant_id),
                "product_id": str(price_version.product_id) if price_version.product_id else None,
                "channel": price_version.channel,
                "min_quantity": price_version.min_quantity,
                "tax_mode": price_version.tax_mode.value if hasattr(price_version.tax_mode, "value") else str(price_version.tax_mode),
            },
        )

        try:
            await db.commit()
        except IntegrityError as err:
            await db.rollback()
            err_str = str(err).lower()
            if "uq_price_version_no_overlap" in err_str or "exclusion" in err_str or "conflicting key" in err_str:
                raise PriceOverlapException(
                    "Simultaneous overlapping price creation prevented by database exclusion constraint."
                ) from err
            raise

        await db.refresh(price_version)
        return price_version

    @classmethod
    async def get_active_price(
        cls,
        db: AsyncSession,
        variant_id: uuid.UUID,
        channel: str = "B2C",
        quantity: int = 1,
        tax_mode: TaxMode = TaxMode.GST_INCLUSIVE,
        at_time: datetime | None = None,
    ) -> PriceVersion | None:
        """Resolve authoritative active price for variant, channel, and quantity tier."""
        check_time = _ensure_utc(at_time) or utcnow()

        stmt = (
            select(PriceVersion)
            .where(
                PriceVersion.variant_id == variant_id,
                PriceVersion.channel == channel,
                PriceVersion.min_quantity <= quantity,
                PriceVersion.tax_mode == tax_mode,
                PriceVersion.valid_from <= check_time,
                (PriceVersion.valid_to.is_(None) | (PriceVersion.valid_to > check_time)),
            )
            .order_by(PriceVersion.min_quantity.desc(), PriceVersion.valid_from.desc())
        )
        return (await db.execute(stmt)).scalars().first()

    @classmethod
    async def list_price_versions(
        cls,
        db: AsyncSession,
        variant_id: uuid.UUID | None = None,
        product_id: uuid.UUID | None = None,
        channel: str | None = None,
        tax_mode: TaxMode | None = None,
    ) -> Sequence[PriceVersion]:
        """List audit history of price versions for a variant or product."""
        stmt = select(PriceVersion).order_by(PriceVersion.valid_from.desc())
        if variant_id is not None:
            stmt = stmt.where(PriceVersion.variant_id == variant_id)
        elif product_id is not None:
            stmt = stmt.where(PriceVersion.product_id == product_id)
        if channel is not None:
            stmt = stmt.where(PriceVersion.channel == channel)
        if tax_mode is not None:
            stmt = stmt.where(PriceVersion.tax_mode == tax_mode)

        return (await db.execute(stmt)).scalars().all()

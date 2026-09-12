"""Authoritative Quote Models with Strict Expiry and Immutable Snapshots."""
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True, index=True, nullable=True)
    calculation_version: Mapped[str] = mapped_column(String(20), default="1.0.0", nullable=False)
    catalog_version: Mapped[str] = mapped_column(String(20), default="1.0.0", nullable=False)
    destination_pincode: Mapped[str | None] = mapped_column(String(6), nullable=True)
    subtotal_taxable: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_product_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    total_product_gross: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    base_shipping: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    shipping_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    shipping_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    prepaid_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cod_surcharge: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cod_raw_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cod_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rounding_multiple: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    items: Mapped[list["QuoteItem"]] = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    line_gross: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    taxable_base: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    product_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    tax_mode: Mapped[str] = mapped_column(String(20), nullable=False)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="items")

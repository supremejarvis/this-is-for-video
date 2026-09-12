"""Price Version Models."""
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.schemas.pricing import TaxMode

__all__ = ["PriceVersion", "TaxMode"]

if TYPE_CHECKING:
    from app.models.product import Product, ProductVariant


def utcnow() -> datetime:
    return datetime.now(UTC)


class PriceVersion(Base):
    __tablename__ = "price_versions"
    __table_args__ = (
        CheckConstraint("unit_price >= 0.00", name="chk_price_version_unit_price_positive"),
        CheckConstraint("gst_rate >= 0.0000 AND gst_rate <= 0.2800", name="chk_price_version_gst_rate_statutory"),
        CheckConstraint("min_quantity >= 1", name="chk_price_version_min_quantity_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True
    )
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    channel: Mapped[str] = mapped_column(String(10), default="B2C", nullable=False, index=True)
    min_quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=Decimal("0.1800"), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(20), default="73269099", nullable=False)
    tax_mode: Mapped[TaxMode] = mapped_column(
        Enum(TaxMode, name="tax_mode_enum"), default=TaxMode.GST_INCLUSIVE, nullable=False
    )
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str] = mapped_column(String(255), default="Standard price", nullable=False)

    variant: Mapped["ProductVariant | None"] = relationship("ProductVariant", back_populates="price_versions")
    product: Mapped["Product | None"] = relationship("Product", back_populates="price_versions")


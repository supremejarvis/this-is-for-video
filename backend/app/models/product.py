"""Product and Variant Models."""
import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.inventory import InventoryItem
    from app.models.price import PriceVersion


def utcnow() -> datetime:
    return datetime.now(UTC)


class FitMode(enum.StrEnum):
    EXACT = "EXACT"
    RANGE = "RANGE"
    UNIVERSAL = "UNIVERSAL"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class ProductStatus(enum.StrEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sku_prefix: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    hsn_code: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. 73269099
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    variants: Mapped[list["ProductVariant"]] = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    price_versions: Mapped[list["PriceVersion"]] = relationship("PriceVersion", back_populates="product", cascade="all, delete-orphan")

    @property
    def status(self) -> ProductStatus:
        if self.is_archived:
            return ProductStatus.ARCHIVED
        if self.is_active:
            return ProductStatus.PUBLISHED
        return ProductStatus.DRAFT


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    fit_mode: Mapped[FitMode] = mapped_column(
        Enum(FitMode, name="fit_mode_enum"), default=FitMode.EXACT, nullable=False
    )
    frame_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    min_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    max_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    display_label: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    frame_thickness: Mapped[str] = mapped_column(String(20), nullable=False)  # Normalized text e.g. 28mm, 30mm, universal
    pack_size: Mapped[int] = mapped_column(nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="variant", uselist=False)
    price_versions: Mapped[list["PriceVersion"]] = relationship("PriceVersion", back_populates="variant", cascade="all, delete-orphan")

    @property
    def status(self) -> ProductStatus:
        if self.is_archived:
            return ProductStatus.ARCHIVED
        if self.is_active:
            return ProductStatus.PUBLISHED
        return ProductStatus.DRAFT

    def __init__(self, **kwargs: Any) -> None:
        if "frame_thickness" in kwargs and ("frame_thickness_mm" not in kwargs or kwargs.get("frame_thickness_mm") is None):
            raw = str(kwargs["frame_thickness"]).strip().lower()
            if raw in ("univ", "universal"):
                kwargs["fit_mode"] = FitMode.UNIVERSAL
                kwargs["frame_thickness_mm"] = None
                kwargs["min_thickness_mm"] = None
                kwargs["max_thickness_mm"] = None
                if "display_label" not in kwargs or not kwargs["display_label"]:
                    kwargs["display_label"] = "Universal Fit"
            elif raw in ("not_applicable", "not applicable", "n/a", "na", "none"):
                kwargs["fit_mode"] = FitMode.NOT_APPLICABLE
                kwargs["frame_thickness_mm"] = None
                kwargs["min_thickness_mm"] = None
                kwargs["max_thickness_mm"] = None
                if "display_label" not in kwargs or not kwargs["display_label"]:
                    kwargs["display_label"] = "N/A"
            else:
                import re
                m = re.match(r"([0-9.]+)", raw)
                if m:
                    kwargs["frame_thickness_mm"] = Decimal(m.group(1))
                    kwargs["fit_mode"] = FitMode.EXACT
                    kwargs["min_thickness_mm"] = None
                    kwargs["max_thickness_mm"] = None
                    if "display_label" not in kwargs or not kwargs["display_label"]:
                        kwargs["display_label"] = f"{kwargs['frame_thickness_mm']:g} mm"

        # Strictly sanitize according to fit_mode
        fm = kwargs.get("fit_mode", FitMode.EXACT)
        if fm in (FitMode.UNIVERSAL, FitMode.NOT_APPLICABLE):
            kwargs["frame_thickness_mm"] = None
            kwargs["min_thickness_mm"] = None
            kwargs["max_thickness_mm"] = None
        elif fm == FitMode.EXACT:
            kwargs["min_thickness_mm"] = None
            kwargs["max_thickness_mm"] = None
        elif fm == FitMode.RANGE:
            kwargs["frame_thickness_mm"] = None

        super().__init__(**kwargs)


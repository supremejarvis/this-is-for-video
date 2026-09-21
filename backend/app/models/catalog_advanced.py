"""Advanced Catalog Taxonomy, Dynamic Attribute Axes, Media, and Bundles."""
import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class CategoryStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class AttributeDataType(enum.StrEnum):
    STRING = "STRING"
    NUMBER = "NUMBER"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"


class MediaStatus(enum.StrEnum):
    UPLOADED = "UPLOADED"
    READY = "READY"
    ARCHIVED = "ARCHIVED"


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("uq_category_company_slug", "company_id", "slug", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[CategoryStatus] = mapped_column(
        SQLEnum(CategoryStatus, name="category_status_enum", native_enum=False), default=CategoryStatus.ACTIVE, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    children: Mapped[list["Category"]] = relationship("Category", backref="parent", remote_side=[id])


class Attribute(Base):
    __tablename__ = "attributes"
    __table_args__ = (
        Index("uq_attribute_company_code", "company_id", "code", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "frame_thickness", "pack_size", "material"
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Frame Thickness (mm)"
    data_type: Mapped[AttributeDataType] = mapped_column(
        SQLEnum(AttributeDataType, name="attribute_data_type_enum", native_enum=False), default=AttributeDataType.SELECT, nullable=False
    )
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)  # e.g. "mm", "g"
    is_variant_axis: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    values: Mapped[list["AttributeValue"]] = relationship("AttributeValue", back_populates="attribute", cascade="all, delete-orphan")


class AttributeValue(Base):
    __tablename__ = "attribute_values"
    __table_args__ = (
        Index("uq_attribute_normalized_value", "attribute_id", "normalized_value", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    normalized_value: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "28mm", "30mm", "SS304"
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # Display text
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    attribute: Mapped["Attribute"] = relationship("Attribute", back_populates="values")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"
    __table_args__ = (
        Index("uq_product_attribute", "product_id", "attribute_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_variant_axis: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ProductOptionValue(Base):
    __tablename__ = "product_option_values"
    __table_args__ = (
        Index("uq_product_option_val", "product_id", "attribute_id", "value_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False
    )
    value_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_values.id", ondelete="CASCADE"), nullable=False
    )


class VariantOption(Base):
    __tablename__ = "variant_options"
    __table_args__ = (
        Index("uq_variant_option_axis", "variant_id", "attribute_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="RESTRICT"), nullable=False
    )
    value_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attribute_values.id", ondelete="RESTRICT"), nullable=False
    )


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    status: Mapped[MediaStatus] = mapped_column(
        SQLEnum(MediaStatus, name="media_status_enum", native_enum=False), default=MediaStatus.READY, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class ProductMedia(Base):
    __tablename__ = "product_media"
    __table_args__ = (
        Index("uq_product_media_asset", "product_id", "asset_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)


class VariantMedia(Base):
    __tablename__ = "variant_media"
    __table_args__ = (
        Index("uq_variant_media_asset", "variant_id", "asset_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class BundleComponent(Base):
    __tablename__ = "bundle_components"
    __table_args__ = (
        Index("uq_bundle_component", "bundle_variant_id", "component_variant_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    bundle_variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    component_variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

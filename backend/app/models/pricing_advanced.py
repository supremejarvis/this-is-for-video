"""Advanced Pricing Lists, Quantity Slabs, Customer Groups, and Tax Configuration Models."""
import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class PriceListStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class TaxProfileStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class CustomerGroup(Base):
    __tablename__ = "customer_groups"
    __table_args__ = (
        Index("uq_customer_group_code", "company_id", "code", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "RETAIL_B2C", "CONTRACTOR_B2B", "DISTRIBUTOR"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class PriceList(Base):
    __tablename__ = "price_lists"
    __table_args__ = (
        Index("uq_price_list_company_name", "company_id", "name", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    customer_group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Higher priority evaluated first
    status: Mapped[PriceListStatus] = mapped_column(
        SQLEnum(PriceListStatus, name="price_list_status_enum", native_enum=False), default=PriceListStatus.ACTIVE, nullable=False
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    rules: Mapped[list["PriceRule"]] = relationship("PriceRule", back_populates="price_list", cascade="all, delete-orphan")


class PriceRule(Base):
    __tablename__ = "price_rules"
    __table_args__ = (
        CheckConstraint("unit_price >= 0.00", name="chk_price_rule_unit_price_positive"),
        CheckConstraint("min_qty >= 1", name="chk_price_rule_min_qty_positive"),
        CheckConstraint("max_qty_exclusive IS NULL OR max_qty_exclusive > min_qty", name="chk_price_rule_max_qty_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    price_list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("price_lists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    min_qty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_qty_exclusive: Mapped[int | None] = mapped_column(Integer, nullable=True)  # NULL means infinity
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    price_basis: Mapped[str] = mapped_column(String(20), default="PER_UNIT", nullable=False)  # PER_UNIT, PER_PACK
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    price_list: Mapped["PriceList"] = relationship("PriceList", back_populates="rules")


class TaxProfile(Base):
    __tablename__ = "tax_profiles"
    __table_args__ = (
        Index("uq_tax_profile_company_name", "company_id", "name", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "SS304 Solar Fasteners 18%"
    hsn_code: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "73269099"
    status: Mapped[TaxProfileStatus] = mapped_column(
        SQLEnum(TaxProfileStatus, name="tax_profile_status_enum", native_enum=False), default=TaxProfileStatus.ACTIVE, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    rules: Mapped[list["TaxRule"]] = relationship("TaxRule", back_populates="tax_profile", cascade="all, delete-orphan")


class TaxRule(Base):
    __tablename__ = "tax_rules"
    __table_args__ = (
        CheckConstraint("rate >= 0.0000 AND rate <= 0.4000", name="chk_tax_rule_rate_statutory"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tax_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    jurisdiction: Mapped[str] = mapped_column(String(50), default="IN", nullable=False)  # ISO country code e.g. "IN"
    component: Mapped[str] = mapped_column(String(20), nullable=False)  # CGST, SGST, IGST
    rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)  # e.g. 0.0900 (9%) or 0.1800 (18%)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    tax_profile: Mapped["TaxProfile"] = relationship("TaxProfile", back_populates="rules")


class PricingPolicyVersion(Base):
    __tablename__ = "pricing_policy_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    cod_surcharge_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=Decimal("0.0250"), nullable=False)  # 2.5%
    cod_rounding_multiple: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("1.00"), nullable=False)  # ₹1.00
    shipping_gst_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=Decimal("0.1800"), nullable=False)  # 18%
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class PriceOverride(Base):
    __tablename__ = "price_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    quote_or_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    order_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    approval_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("approval_requests.id", ondelete="SET NULL"), nullable=True
    )
    original_unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    override_unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

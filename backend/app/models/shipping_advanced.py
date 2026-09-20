"""Advanced Shipping Logistics, Rate Cards, Packages, Tracking Events, and Returns."""
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


class CarrierStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class ReturnStatus(enum.StrEnum):
    REQUESTED = "REQUESTED"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    INSPECTION_PENDING = "INSPECTION_PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETURN_IN_TRANSIT = "RETURN_IN_TRANSIT"
    RECEIVED = "RECEIVED"
    COMPLETED = "COMPLETED"


class ItemDisposition(enum.StrEnum):
    RESTOCK_INVENTORY = "RESTOCK_INVENTORY"
    SCRAP_DEFECTIVE = "SCRAP_DEFECTIVE"
    REFURBISH = "REFURBISH"


class Carrier(Base):
    __tablename__ = "carriers"
    __table_args__ = (
        Index("uq_carrier_company_code", "company_id", "code", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # "INDIA_POST", "SHIPROCKET", "BLUEDART"
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[CarrierStatus] = mapped_column(
        SQLEnum(CarrierStatus, name="carrier_status_enum"), default=CarrierStatus.ACTIVE, nullable=False
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    rate_cards: Mapped[list["ShippingRateCard"]] = relationship("ShippingRateCard", back_populates="carrier", cascade="all, delete-orphan")


class ShippingRateCard(Base):
    __tablename__ = "shipping_rate_cards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    carrier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("carriers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "CEPT Speed Post National Standard 2026"
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    carrier: Mapped["Carrier"] = relationship("Carrier", back_populates="rate_cards")
    slabs: Mapped[list["ShippingRateSlab"]] = relationship("ShippingRateSlab", back_populates="rate_card", cascade="all, delete-orphan")


class ShippingRateSlab(Base):
    __tablename__ = "shipping_rate_slabs"
    __table_args__ = (
        CheckConstraint("min_weight_g >= 0", name="chk_slab_min_weight_positive"),
        CheckConstraint("max_weight_g > min_weight_g", name="chk_slab_max_weight_valid"),
        CheckConstraint("base_charge >= 0.00", name="chk_slab_base_charge_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rate_card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipping_rate_cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    zone: Mapped[str] = mapped_column(String(50), default="LOCAL", nullable=False)  # LOCAL (Gujarat), METRO, REST_OF_INDIA
    min_weight_g: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_weight_g: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 500, 1000, 5000
    base_charge: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    rate_card: Mapped["ShippingRateCard"] = relationship("ShippingRateCard", back_populates="slabs")


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    actual_weight_g: Mapped[int] = mapped_column(Integer, nullable=False)
    length_mm: Mapped[int] = mapped_column(Integer, nullable=False)
    width_mm: Mapped[int] = mapped_column(Integer, nullable=False)
    height_mm: Mapped[int] = mapped_column(Integer, nullable=False)
    chargeable_weight_g: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    items: Mapped[list["ShipmentItem"]] = relationship("ShipmentItem", back_populates="package", cascade="all, delete-orphan")


class ShipmentItem(Base):
    __tablename__ = "shipment_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    package_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    package: Mapped["Package"] = relationship("Package", back_populates="items")


class TrackingEvent(Base):
    __tablename__ = "tracking_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_event_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, NDR, RTO
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)


class Return(Base):
    __tablename__ = "returns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ReturnStatus] = mapped_column(
        SQLEnum(ReturnStatus, name="return_status_enum"), default=ReturnStatus.REQUESTED, nullable=False, index=True
    )
    caliper_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    verified_frame_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    items: Mapped[list["ReturnItem"]] = relationship("ReturnItem", back_populates="return_case", cascade="all, delete-orphan")


class ReturnItem(Base):
    __tablename__ = "return_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    return_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("returns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    requested_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    received_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accepted_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    disposition: Mapped[ItemDisposition] = mapped_column(
        SQLEnum(ItemDisposition, name="item_disposition_enum"), default=ItemDisposition.RESTOCK_INVENTORY, nullable=False
    )
    inspected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    inspector_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    return_case: Mapped["Return"] = relationship("Return", back_populates="items")

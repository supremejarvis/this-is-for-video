"""Inventory and Reservation Models with Strict Database Invariants."""
import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.product import ProductVariant


def utcnow() -> datetime:
    return datetime.now(UTC)


class ReservationStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    COMMITTED = "COMMITTED"
    RELEASED = "RELEASED"


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity_on_hand >= 0", name="chk_inventory_on_hand_positive"),
        CheckConstraint("quantity_reserved >= 0", name="chk_inventory_reserved_positive"),
        CheckConstraint("quantity_on_hand >= quantity_reserved", name="chk_inventory_available_stock_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), unique=True, nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="inventory_item")
    reservations: Mapped[list["InventoryReservation"]] = relationship("InventoryReservation", back_populates="inventory_item")
    movements: Mapped[list["InventoryMovement"]] = relationship("InventoryMovement", back_populates="inventory_item")


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_reservation_quantity_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True, nullable=True)
    sku: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        SQLEnum(ReservationStatus, name="reservation_status_enum"), default=ReservationStatus.ACTIVE, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="reservations")


class MovementType(enum.StrEnum):
    RECEIPT = "RECEIPT"
    RESERVATION_HOLD = "RESERVATION_HOLD"
    RESERVATION_RELEASE = "RESERVATION_RELEASE"
    DISPATCH = "DISPATCH"
    ADJUSTMENT = "ADJUSTMENT"
    RETURN = "RETURN"


class InventoryMovement(Base):
    """Append-only immutable stock ledger."""
    __tablename__ = "inventory_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    movement_type: Mapped[MovementType] = mapped_column(
        SQLEnum(MovementType, name="inventory_movement_type_enum"), nullable=False
    )
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    quantity_delta_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_delta_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resulting_quantity_on_hand: Mapped[int] = mapped_column(Integer, nullable=False)
    resulting_quantity_reserved: Mapped[int] = mapped_column(Integer, nullable=False)
    source_reference_type: Mapped[str] = mapped_column(String(50), default="MANUAL", nullable=False, index=True)
    source_reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Backward compatibility aliases
    quantity_delta: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_on_hand_after: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved_after: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    inventory_item: Mapped["InventoryItem"] = relationship("InventoryItem", back_populates="movements")


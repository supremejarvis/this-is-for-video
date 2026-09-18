"""Order, Payment, Fulfilment, and Replacement Models with Orthogonal State Machines."""
import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class OrderStatus(enum.StrEnum):
    DRAFT = "DRAFT"
    QUOTED = "QUOTED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class PaymentStatus(enum.StrEnum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUND_PENDING = "REFUND_PENDING"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    REFUNDED = "REFUNDED"


class FulfilmentStatus(enum.StrEnum):
    UNFULFILLED = "UNFULFILLED"
    PROCESSING = "PROCESSING"
    READY_TO_SHIP = "READY_TO_SHIP"
    SHIPPED = "SHIPPED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    RTO = "RTO"


class ReplacementStatus(enum.StrEnum):
    NONE = "NONE"
    REQUESTED = "REQUESTED"
    EVIDENCE_PENDING = "EVIDENCE_PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETURN_IN_TRANSIT = "RETURN_IN_TRANSIT"
    REPLACEMENT_READY = "REPLACEMENT_READY"
    REPLACEMENT_SHIPPED = "REPLACEMENT_SHIPPED"
    REPLACEMENT_DELIVERED = "REPLACEMENT_DELIVERED"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    quote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    order_status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum"), default=OrderStatus.DRAFT, nullable=False
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING, nullable=False
    )
    fulfilment_status: Mapped[FulfilmentStatus] = mapped_column(
        SQLEnum(FulfilmentStatus, name="fulfilment_status_enum"), default=FulfilmentStatus.UNFULFILLED, nullable=False
    )
    replacement_status: Mapped[ReplacementStatus] = mapped_column(
        SQLEnum(ReplacementStatus, name="replacement_status_enum"), default=ReplacementStatus.NONE, nullable=False
    )

    subtotal_taxable: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    product_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    shipping_base: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    shipping_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    cod_surcharge: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    total_payable: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    address: Mapped["OrderAddress | None"] = relationship(
        "OrderAddress", back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="order")
    shipments: Mapped[list["Shipment"]] = relationship("Shipment", back_populates="order")
    replacement_cases: Mapped[list["ReplacementCase"]] = relationship("ReplacementCase", back_populates="original_order")


class OrderAddress(Base):
    __tablename__ = "order_addresses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    address_type: Mapped[str] = mapped_column(String(20), default="SHIPPING", nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    state_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    pincode: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(50), default="India", nullable=False)
    company_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="address")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    line_gross: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    taxable_base: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    product_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # razorpay, direct_upi, cod
    provider_payment_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="payments")


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    carrier: Mapped[str] = mapped_column(String(50), default="INDIA_POST", nullable=False)
    awb_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    origin_pincode: Mapped[str] = mapped_column(String(6), default="382430", nullable=False)
    destination_pincode: Mapped[str] = mapped_column(String(6), nullable=False)
    status: Mapped[FulfilmentStatus] = mapped_column(
        SQLEnum(FulfilmentStatus, name="fulfilment_status_enum"), default=FulfilmentStatus.UNFULFILLED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="shipments")


class ReplacementCase(Base):
    __tablename__ = "replacement_cases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    original_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    caliper_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    verified_frame_thickness: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[ReplacementStatus] = mapped_column(
        SQLEnum(ReplacementStatus, name="replacement_status_enum"), default=ReplacementStatus.REQUESTED, nullable=False
    )
    return_shipping_charge: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    replacement_shipping_charge: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    shipping_gst: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    original_order: Mapped["Order"] = relationship("Order", back_populates="replacement_cases")
    replacement_shipments: Mapped[list["ReplacementShipment"]] = relationship("ReplacementShipment", back_populates="replacement_case")


class ReplacementShipment(Base):
    __tablename__ = "replacement_shipments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("replacement_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    awb_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    status: Mapped[FulfilmentStatus] = mapped_column(
        SQLEnum(FulfilmentStatus, name="fulfilment_status_enum"), default=FulfilmentStatus.READY_TO_SHIP, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    replacement_case: Mapped["ReplacementCase"] = relationship("ReplacementCase", back_populates="replacement_shipments")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), default="razorpay", nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

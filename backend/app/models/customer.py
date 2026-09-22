"""Customer Data Models, Verified Identifiers, Addresses, OTP Challenges, and Consents."""
import enum
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.auth import User


def utcnow() -> datetime:
    return datetime.now(UTC)


class OtpStatus(enum.StrEnum):
    PENDING = "PENDING"
    CONSUMED = "CONSUMED"
    EXPIRED = "EXPIRED"
    EXHAUSTED = "EXHAUSTED"


class CustomerAccountType(enum.StrEnum):
    B2C = "B2C"
    B2B = "B2B"


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"
    __table_args__ = (
        Index("ix_otp_challenges_ident_status", "identifier", "status"),
        Index("ix_otp_challenges_expiry", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    identifier: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(50), default="CUSTOMER_LOGIN", nullable=False)
    verifier_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # Keyed HMAC-SHA256
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    attempts_remaining: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    cooldown_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[OtpStatus] = mapped_column(
        SQLEnum(OtpStatus, name="otp_status_enum"), default=OtpStatus.PENDING, nullable=False, index=True
    )
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class VerifiedIdentifier(Base):
    __tablename__ = "verified_identifiers"
    __table_args__ = (
        UniqueConstraint("identifier_type", "normalized_identifier", name="uq_verified_identifier"),
        Index("ix_verified_identifiers_lookup", "identifier_type", "normalized_identifier"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identifier_type: Mapped[str] = mapped_column(String(20), nullable=False)  # PHONE or EMAIL
    normalized_identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    account_type: Mapped[CustomerAccountType] = mapped_column(
        SQLEnum(CustomerAccountType, name="customer_account_type_enum"),
        default=CustomerAccountType.B2C,
        nullable=False,
    )
    kyc_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    default_shipping_address_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    default_billing_address_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"
    __table_args__ = (
        Index("ix_customer_addresses_user_default", "user_id", "is_default"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    address_type: Mapped[str] = mapped_column(String(20), default="HOME", nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    flat_building: Mapped[str] = mapped_column(String(255), nullable=False)
    street_area: Mapped[str] = mapped_column(String(255), nullable=False)
    landmark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    state_code: Mapped[str] = mapped_column(String(10), nullable=False)
    post_office_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    terms_version: Mapped[str] = mapped_column(String(50), nullable=False)
    privacy_version: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

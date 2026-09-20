"""Distributed Order Saga State, Inbox Deduplication, Idempotency, and Background Jobs."""
import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class SagaStatus(enum.StrEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCEEDED = "SUCCEEDED"
    COMPENSATING = "COMPENSATING"
    FAILED = "FAILED"


class SagaStepStatus(enum.StrEnum):
    PENDING = "PENDING"
    EXECUTING = "EXECUTING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    COMPENSATED = "COMPENSATED"


class BackgroundJobStatus(enum.StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SagaInstance(Base):
    """Distributed Order Orchestration Saga State Machine."""
    __tablename__ = "saga_instances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    state: Mapped[SagaStatus] = mapped_column(
        SQLEnum(SagaStatus, name="saga_status_enum", native_enum=False), default=SagaStatus.PENDING, nullable=False, index=True
    )
    current_step: Mapped[str] = mapped_column(String(50), default="CALCULATING_QUOTE", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    steps: Mapped[list["SagaStep"]] = relationship("SagaStep", back_populates="saga", cascade="all, delete-orphan")


class SagaStep(Base):
    __tablename__ = "saga_steps"
    __table_args__ = (
        Index("uq_saga_step_order", "saga_id", "step_name", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    saga_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("saga_instances.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "RESERVE_STOCK", "PAYMENT_CAPTURE", "DISPATCH"
    command_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[SagaStepStatus] = mapped_column(
        SQLEnum(SagaStepStatus, name="saga_step_status_enum", native_enum=False), default=SagaStepStatus.PENDING, nullable=False
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    result_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payload_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    saga: Mapped["SagaInstance"] = relationship("SagaInstance", back_populates="steps")


class InboxEvent(Base):
    """Consumer inbox for strict at-least-once message deduplication."""
    __tablename__ = "inbox_events"
    __table_args__ = (
        Index("uq_inbox_consumer_event", "consumer_name", "event_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    consumer_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class IdempotencyRecord(Base):
    """API gateway and command idempotency tracker."""
    __tablename__ = "idempotency_records"
    __table_args__ = (
        Index("uq_idempotency_company_key", "company_id", "actor_scope", "operation", "key", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    actor_scope: Mapped[str] = mapped_column(String(50), nullable=False)  # "ADMIN", "BUYER", "PROVIDER"
    operation: Mapped[str] = mapped_column(String(100), nullable=False)   # "CREATE_ORDER", "BOOK_SHIPMENT"
    key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256 of canonical request body
    status: Mapped[str] = mapped_column(String(20), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, COMPLETED, FAILED
    response_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # e.g. "GSTR1_EXPORT", "INVENTORY_RECONCILE"
    status: Mapped[BackgroundJobStatus] = mapped_column(
        SQLEnum(BackgroundJobStatus, name="background_job_status_enum", native_enum=False), default=BackgroundJobStatus.QUEUED, nullable=False
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 to 100
    result_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

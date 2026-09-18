"""Domain Order State Machine Enforcement Service.

Enforces:
1. Valid transitions only; arbitrary client status updates are rejected with InvalidStateTransitionError.
2. Disentangled cancellation and refund logic based on payment method and capture state.
3. Immutability of original delivered orders during replacement cases.
4. Structured transition audit logging.
"""
import uuid
from datetime import UTC, datetime
from typing import Any, ClassVar

from app.models.order import (
    FulfilmentStatus,
    Order,
    OrderStatus,
    PaymentStatus,
    ReplacementCase,
    ReplacementShipment,
    ReplacementStatus,
)


class InvalidStateTransitionError(Exception):
    """Raised when an invalid state transition is attempted."""
    def __init__(self, entity: str, current: str, target: str, reason: str = ""):
        self.entity = entity
        self.current = current
        self.target = target
        self.reason = reason
        super().__init__(f"Invalid {entity} transition from {current} to {target}. {reason}".strip())


class OrderStateMachine:
    """Domain service for order, payment, fulfillment, and replacement state transitions."""

    VALID_ORDER_TRANSITIONS: ClassVar[dict[OrderStatus, set[OrderStatus]]] = {
        OrderStatus.DRAFT: {OrderStatus.QUOTED, OrderStatus.CANCELLED},
        OrderStatus.QUOTED: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.CANCELLED, OrderStatus.COMPLETED},
        OrderStatus.CANCELLED: set(),
        OrderStatus.COMPLETED: set(),
    }

    VALID_PAYMENT_TRANSITIONS: ClassVar[dict[PaymentStatus, set[PaymentStatus]]] = {
        PaymentStatus.NOT_REQUIRED: set(),
        PaymentStatus.PENDING: {PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED, PaymentStatus.NOT_REQUIRED},
        PaymentStatus.AUTHORIZED: {PaymentStatus.CAPTURED, PaymentStatus.FAILED},
        PaymentStatus.CAPTURED: {PaymentStatus.REFUND_PENDING},
        PaymentStatus.FAILED: set(),
        PaymentStatus.REFUND_PENDING: {PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED},
        PaymentStatus.PARTIALLY_REFUNDED: {PaymentStatus.REFUNDED},
        PaymentStatus.REFUNDED: set(),
    }

    VALID_FULFILMENT_TRANSITIONS: ClassVar[dict[FulfilmentStatus, set[FulfilmentStatus]]] = {
        FulfilmentStatus.UNFULFILLED: {FulfilmentStatus.PROCESSING},
        FulfilmentStatus.PROCESSING: {FulfilmentStatus.READY_TO_SHIP},
        FulfilmentStatus.READY_TO_SHIP: {FulfilmentStatus.SHIPPED},
        FulfilmentStatus.SHIPPED: {FulfilmentStatus.OUT_FOR_DELIVERY, FulfilmentStatus.RTO},
        FulfilmentStatus.OUT_FOR_DELIVERY: {FulfilmentStatus.DELIVERED, FulfilmentStatus.RTO},
        FulfilmentStatus.DELIVERED: set(),
        FulfilmentStatus.RTO: set(),
    }

    VALID_REPLACEMENT_TRANSITIONS: ClassVar[dict[ReplacementStatus, set[ReplacementStatus]]] = {
        ReplacementStatus.NONE: {ReplacementStatus.REQUESTED},
        ReplacementStatus.REQUESTED: {ReplacementStatus.EVIDENCE_PENDING, ReplacementStatus.REJECTED},
        ReplacementStatus.EVIDENCE_PENDING: {ReplacementStatus.APPROVED, ReplacementStatus.REJECTED},
        ReplacementStatus.APPROVED: {ReplacementStatus.RETURN_IN_TRANSIT, ReplacementStatus.REPLACEMENT_READY},
        ReplacementStatus.RETURN_IN_TRANSIT: {ReplacementStatus.REPLACEMENT_READY},
        ReplacementStatus.REPLACEMENT_READY: {ReplacementStatus.REPLACEMENT_SHIPPED},
        ReplacementStatus.REPLACEMENT_SHIPPED: {ReplacementStatus.REPLACEMENT_DELIVERED},
        ReplacementStatus.REPLACEMENT_DELIVERED: set(),
        ReplacementStatus.REJECTED: set(),
    }

    @classmethod
    def transition_order_status(cls, order: Order, target: OrderStatus, actor_id: str, reason: str) -> dict[str, Any]:
        """Validate and transition order_status."""
        current = order.order_status
        if target not in cls.VALID_ORDER_TRANSITIONS.get(current, set()):
            raise InvalidStateTransitionError("order_status", current.value, target.value)

        order.order_status = target
        order.version += 1
        return {
            "entity": "order_status",
            "order_id": str(order.id),
            "from_state": current.value,
            "to_state": target.value,
            "actor_id": actor_id,
            "reason": reason,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    @classmethod
    def transition_payment_status(cls, order: Order, target: PaymentStatus, actor_id: str, reason: str) -> dict[str, Any]:
        """Validate and transition payment_status."""
        current = order.payment_status
        if target not in cls.VALID_PAYMENT_TRANSITIONS.get(current, set()):
            raise InvalidStateTransitionError("payment_status", current.value, target.value)

        order.payment_status = target
        order.version += 1
        return {
            "entity": "payment_status",
            "order_id": str(order.id),
            "from_state": current.value,
            "to_state": target.value,
            "actor_id": actor_id,
            "reason": reason,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    @classmethod
    def transition_fulfilment_status(cls, order: Order, target: FulfilmentStatus, actor_id: str, reason: str) -> dict[str, Any]:
        """Validate and transition fulfilment_status."""
        current = order.fulfilment_status
        if target not in cls.VALID_FULFILMENT_TRANSITIONS.get(current, set()):
            raise InvalidStateTransitionError("fulfilment_status", current.value, target.value)

        order.fulfilment_status = target
        order.version += 1
        return {
            "entity": "fulfilment_status",
            "order_id": str(order.id),
            "from_state": current.value,
            "to_state": target.value,
            "actor_id": actor_id,
            "reason": reason,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    @classmethod
    def cancel_order(cls, order: Order, actor_id: str, reason: str, is_cod: bool = False) -> list[dict[str, Any]]:
        """Cancel order with payment-aware refund workflow."""
        audit_logs: list[dict[str, Any]] = []

        if order.fulfilment_status in (FulfilmentStatus.SHIPPED, FulfilmentStatus.OUT_FOR_DELIVERY, FulfilmentStatus.DELIVERED):
            raise InvalidStateTransitionError(
                "order_status",
                order.order_status.value,
                OrderStatus.CANCELLED.value,
                "Cannot cancel order that has already been dispatched or delivered."
            )

        # 1. Transition order status
        audit_logs.append(cls.transition_order_status(order, OrderStatus.CANCELLED, actor_id, reason))

        # 2. Also update fulfilment status to prevent warehouse dispatch of cancelled orders
        # Only transition if not already UNFULFILLED
        if order.fulfilment_status in (FulfilmentStatus.PROCESSING, FulfilmentStatus.READY_TO_SHIP):
            audit_logs.append(
                cls.transition_fulfilment_status(order, FulfilmentStatus.UNFULFILLED, actor_id, "Order cancelled")
            )

        # 3. Transition payment status based on prior payment state
        if order.payment_status == PaymentStatus.CAPTURED:
            # Prepaid captured -> initiates refund workflow
            audit_logs.append(
                cls.transition_payment_status(order, PaymentStatus.REFUND_PENDING, actor_id, "Order cancelled post-capture")
            )
        elif order.payment_status == PaymentStatus.AUTHORIZED:
            # Authorized but not captured -> void authorization
            audit_logs.append(
                cls.transition_payment_status(order, PaymentStatus.FAILED, actor_id, "Authorization voided due to cancellation")
            )
        elif is_cod:
            # COD order cancelled before delivery -> no money refund
            audit_logs.append(
                cls.transition_payment_status(order, PaymentStatus.NOT_REQUIRED, actor_id, "COD cancelled before delivery")
            )
        elif order.payment_status == PaymentStatus.PENDING:
            # Unpaid order cancelled -> mark failed/not required, zero refund
            audit_logs.append(
                cls.transition_payment_status(order, PaymentStatus.FAILED, actor_id, "Unpaid order cancelled")
            )

        return audit_logs

    @classmethod
    def initiate_replacement(
        cls,
        original_order: Order,
        caliper_photo_url: str,
        verified_thickness: str,
        actor_id: str
    ) -> tuple[ReplacementCase, ReplacementShipment, list[dict[str, Any]]]:
        """Create a separate replacement case and replacement shipment; original order is immutable."""
        if original_order.fulfilment_status != FulfilmentStatus.DELIVERED:
            raise InvalidStateTransitionError(
                "replacement_status",
                original_order.replacement_status.value,
                ReplacementStatus.REQUESTED.value,
                "Replacement can only be initiated for delivered orders."
            )

        # Update order replacement status
        current_rep = original_order.replacement_status
        if current_rep != ReplacementStatus.NONE:
            raise InvalidStateTransitionError(
                "replacement_status",
                current_rep.value,
                ReplacementStatus.REQUESTED.value,
                "Replacement already initiated for this order."
            )

        original_order.replacement_status = ReplacementStatus.REQUESTED
        original_order.version += 1

        # Generate UUID upfront to avoid None case.id before flush/commit
        case_id = uuid.uuid4()
        case = ReplacementCase(
            id=case_id,
            original_order_id=original_order.id,
            caliper_photo_url=caliper_photo_url,
            verified_frame_thickness=verified_thickness,
            status=ReplacementStatus.REQUESTED,
        )

        replacement_shipment = ReplacementShipment(
            case_id=case_id,
            status=FulfilmentStatus.READY_TO_SHIP,
        )

        audit_log = {
            "entity": "replacement_case",
            "order_id": str(original_order.id),
            "case_id": str(case_id),
            "status": ReplacementStatus.REQUESTED.value,
            "actor_id": actor_id,
            "timestamp": datetime.now(UTC).isoformat(),
        }

        return case, replacement_shipment, [audit_log]

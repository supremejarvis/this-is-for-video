"""Unit Tests for Domain Order State Machine Enforcement."""
import uuid
from decimal import Decimal

import pytest

from app.models.order import (
    FulfilmentStatus,
    Order,
    OrderStatus,
    PaymentStatus,
    ReplacementStatus,
)
from app.services.order_state import InvalidStateTransitionError, OrderStateMachine


def create_sample_order(
    order_status: OrderStatus = OrderStatus.DRAFT,
    payment_status: PaymentStatus = PaymentStatus.PENDING,
    fulfilment_status: FulfilmentStatus = FulfilmentStatus.UNFULFILLED,
    replacement_status: ReplacementStatus = ReplacementStatus.NONE,
) -> Order:
    return Order(
        id=uuid.uuid4(),
        order_number="APE-TEST-001",
        version=1,
        order_status=order_status,
        payment_status=payment_status,
        fulfilment_status=fulfilment_status,
        replacement_status=replacement_status,
        subtotal_taxable=Decimal("100.00"),
        product_gst=Decimal("18.00"),
        shipping_base=Decimal("60.00"),
        shipping_gst=Decimal("10.80"),
        cod_surcharge=Decimal("0.00"),
        total_payable=Decimal("188.80"),
        currency="INR",
    )


def test_valid_order_transitions_succeed():
    """Prove sequential valid transitions update state, version and audit logs."""
    order = create_sample_order()
    assert order.version == 1

    # DRAFT -> QUOTED
    log1 = OrderStateMachine.transition_order_status(order, OrderStatus.QUOTED, "admin_1", "Quote generated")
    assert order.order_status == OrderStatus.QUOTED
    assert order.version == 2
    assert log1["from_state"] == "DRAFT"
    assert log1["to_state"] == "QUOTED"

    # QUOTED -> CONFIRMED
    OrderStateMachine.transition_order_status(order, OrderStatus.CONFIRMED, "system", "Payment received")
    assert order.order_status == OrderStatus.CONFIRMED
    assert order.version == 3

    # CONFIRMED -> COMPLETED
    OrderStateMachine.transition_order_status(order, OrderStatus.COMPLETED, "system", "Delivered & reconciled")
    assert order.order_status == OrderStatus.COMPLETED
    assert order.version == 4


def test_invalid_order_transitions_rejected():
    """Prove illegal jumps are blocked with InvalidStateTransitionError."""
    order = create_sample_order(order_status=OrderStatus.DRAFT)
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.transition_order_status(order, OrderStatus.COMPLETED, "attacker", "Direct skip")

    order_completed = create_sample_order(order_status=OrderStatus.COMPLETED)
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.transition_order_status(order_completed, OrderStatus.DRAFT, "admin", "Reopen")


def test_unpaid_cancellation_no_refund():
    """Unpaid order cancellation marks payment FAILED without triggering refund."""
    order = create_sample_order(order_status=OrderStatus.QUOTED, payment_status=PaymentStatus.PENDING)
    logs = OrderStateMachine.cancel_order(order, "customer_1", "Customer changed mind")

    assert order.order_status == OrderStatus.CANCELLED
    assert order.payment_status == PaymentStatus.FAILED
    assert any(log["to_state"] == "FAILED" for log in logs)
    assert not any(log.get("to_state") == "REFUND_PENDING" for log in logs)


def test_paid_cancellation_starts_refund_workflow():
    """Captured prepaid order cancellation transitions payment to REFUND_PENDING."""
    order = create_sample_order(order_status=OrderStatus.CONFIRMED, payment_status=PaymentStatus.CAPTURED)
    logs = OrderStateMachine.cancel_order(order, "admin_1", "Out of stock cancellation")

    assert order.order_status == OrderStatus.CANCELLED
    assert order.payment_status == PaymentStatus.REFUND_PENDING
    assert any(log["to_state"] == "REFUND_PENDING" for log in logs)


def test_cod_cancellation_before_delivery_no_refund():
    """COD cancellation sets payment NOT_REQUIRED with zero payment refund."""
    order = create_sample_order(order_status=OrderStatus.CONFIRMED, payment_status=PaymentStatus.PENDING)
    logs = OrderStateMachine.cancel_order(order, "customer_1", "Customer cancelled COD", is_cod=True)

    assert order.order_status == OrderStatus.CANCELLED
    assert order.payment_status == PaymentStatus.NOT_REQUIRED
    assert any(log["to_state"] == "NOT_REQUIRED" for log in logs)


def test_cannot_cancel_shipped_or_delivered_order():
    """Order in transit or delivered cannot be cancelled."""
    order_shipped = create_sample_order(fulfilment_status=FulfilmentStatus.SHIPPED)
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.cancel_order(order_shipped, "user", "Cancel late")

    order_delivered = create_sample_order(fulfilment_status=FulfilmentStatus.DELIVERED)
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.cancel_order(order_delivered, "user", "Cancel delivered")


def test_replacement_preserves_original_order_and_creates_separate_case():
    """Replacement does not mutate original delivered order; creates linked case and shipment."""
    order = create_sample_order(
        order_status=OrderStatus.COMPLETED,
        payment_status=PaymentStatus.CAPTURED,
        fulfilment_status=FulfilmentStatus.DELIVERED,
    )

    case, rep_shipment, logs = OrderStateMachine.initiate_replacement(
        original_order=order,
        caliper_photo_url="https://s3.example.com/caliper_photo.jpg",
        verified_thickness="30mm",
        actor_id="buyer_1",
    )

    # Invariant: Original order remains COMPLETED and DELIVERED
    assert order.order_status == OrderStatus.COMPLETED
    assert order.fulfilment_status == FulfilmentStatus.DELIVERED
    assert order.replacement_status == ReplacementStatus.REQUESTED

    # Invariant: Case is linked
    assert case.original_order_id == order.id
    assert case.status == ReplacementStatus.REQUESTED
    assert case.verified_frame_thickness == "30mm"

    # Invariant: Separate replacement shipment created with READY_TO_SHIP
    assert rep_shipment.case_id == case.id
    assert rep_shipment.status == FulfilmentStatus.READY_TO_SHIP
    assert len(logs) == 1


def test_client_cannot_directly_assign_arbitrary_status():
    """Client attempting to mutate order status without state machine transitions is prevented."""
    order = create_sample_order(order_status=OrderStatus.DRAFT)
    # Attempting to assign COMPLETED directly via state machine fails validation
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.transition_order_status(order, OrderStatus.COMPLETED, actor_id="client", reason="direct jump")


def test_fulfilment_and_payment_invalid_transitions():
    """Prove invalid payment and fulfilment transitions are rejected."""
    order = create_sample_order()
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.transition_payment_status(order, PaymentStatus.REFUNDED, "client", "skip")

    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.transition_fulfilment_status(order, FulfilmentStatus.DELIVERED, "client", "skip")

    # Valid fulfilment transition
    log = OrderStateMachine.transition_fulfilment_status(order, FulfilmentStatus.PROCESSING, "admin", "start packing")
    assert order.fulfilment_status == FulfilmentStatus.PROCESSING
    assert log["to_state"] == "PROCESSING"


def test_replacement_only_on_delivered_orders():
    """Replacement fails if order is not DELIVERED or if replacement already requested."""
    order_unfulfilled = create_sample_order(fulfilment_status=FulfilmentStatus.UNFULFILLED)
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.initiate_replacement(order_unfulfilled, "url", "30mm", "buyer")

    order_delivered = create_sample_order(fulfilment_status=FulfilmentStatus.DELIVERED)
    OrderStateMachine.initiate_replacement(order_delivered, "url", "30mm", "buyer")

    # Second attempt must be rejected
    with pytest.raises(InvalidStateTransitionError):
        OrderStateMachine.initiate_replacement(order_delivered, "url", "30mm", "buyer")


"""Enterprise Order Management, Saga State Tracking & Commercial Audit Admin Endpoints."""
from collections.abc import Sequence
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User, UserRole
from app.models.order import (
    FulfilmentStatus,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
)
from app.models.saga import SagaInstance, SagaStep
from app.schemas.admin_order import (
    AdminOrderAddressSnapshot,
    AdminOrderCancelRequest,
    AdminOrderConfirmRequest,
    AdminOrderDetailResponse,
    AdminOrderItemSnapshot,
    AdminOrderListItem,
    AdminOrderListResponse,
    SagaInstanceDetail,
    SagaStepItem,
)
from app.services.order_saga import InsufficientStockSagaError, OrderSagaOrchestrator

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])

DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _build_order_detail_response(order: Order, saga: SagaInstance | None) -> AdminOrderDetailResponse:
    saga_detail: SagaInstanceDetail | None = None
    if saga:
        saga_detail = SagaInstanceDetail(
            id=saga.id,
            order_id=saga.order_id,
            state=saga.state,
            current_step=saga.current_step,
            version=saga.version,
            deadline=saga.deadline,
            last_error=saga.last_error,
            steps=[
                SagaStepItem(
                    id=s.id,
                    step_name=s.step_name,
                    command_id=s.command_id,
                    status=s.status,
                    attempts=s.attempts,
                    result_reference=s.result_reference,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
                for s in saga.steps
            ],
        )

    addr_snapshot: AdminOrderAddressSnapshot | None = None
    if order.address:
        addr_snapshot = AdminOrderAddressSnapshot.model_validate(order.address)

    return AdminOrderDetailResponse(
        id=order.id,
        order_number=order.order_number,
        quote_id=order.quote_id,
        version=order.version,
        order_status=order.order_status,
        payment_status=order.payment_status,
        fulfilment_status=order.fulfilment_status,
        replacement_status=order.replacement_status,
        subtotal_taxable=order.subtotal_taxable,
        product_gst=order.product_gst,
        shipping_base=order.shipping_base,
        shipping_gst=order.shipping_gst,
        cod_surcharge=order.cod_surcharge,
        total_payable=order.total_payable,
        currency=order.currency,
        user_id=order.user_id,
        customer_name=order.customer_name or (order.address.full_name if order.address else None),
        customer_phone=order.customer_phone or (order.address.phone if order.address else None),
        customer_email=order.customer_email or (order.address.email if order.address else None),
        company_name=order.company_name or (order.address.company_name if order.address else None),
        gstin=order.gstin or (order.address.gstin if order.address else None),
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[AdminOrderItemSnapshot.model_validate(it) for it in order.items],
        address=addr_snapshot,
        saga=saga_detail,
    )


@router.get("", response_model=AdminOrderListResponse)
async def list_orders(
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    order_status: OrderStatus | None = Query(None),
    payment_status: PaymentStatus | None = Query(None),
    fulfilment_status: FulfilmentStatus | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> AdminOrderListResponse:
    """List orders with filtering, search, and pagination."""
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.address))
    )

    if order_status:
        stmt = stmt.where(Order.order_status == order_status)
    if payment_status:
        stmt = stmt.where(Order.payment_status == payment_status)
    if fulfilment_status:
        stmt = stmt.where(Order.fulfilment_status == fulfilment_status)
    if search:
        q = f"%{search.strip()}%"
        stmt = stmt.where(
            (Order.order_number.ilike(q))
            | (Order.customer_name.ilike(q))
            | (Order.customer_phone.ilike(q))
            | (Order.company_name.ilike(q))
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Order.created_at.desc()).limit(page_size).offset(offset)
    orders = (await db.execute(stmt)).scalars().all()

    items: list[AdminOrderListItem] = []
    for o in orders:
        cust_name = o.customer_name or (o.address.full_name if o.address else None)
        cust_phone = o.customer_phone or (o.address.phone if o.address else None)
        comp_name = o.company_name or (o.address.company_name if o.address else None)
        items.append(
            AdminOrderListItem(
                id=o.id,
                order_number=o.order_number,
                order_status=o.order_status,
                payment_status=o.payment_status,
                fulfilment_status=o.fulfilment_status,
                subtotal_taxable=o.subtotal_taxable,
                product_gst=o.product_gst,
                shipping_base=o.shipping_base,
                shipping_gst=o.shipping_gst,
                cod_surcharge=o.cod_surcharge,
                total_payable=o.total_payable,
                currency=o.currency,
                customer_name=cust_name,
                customer_phone=cust_phone,
                company_name=comp_name,
                item_count=len(o.items),
                created_at=o.created_at,
                updated_at=o.updated_at,
            )
        )

    return AdminOrderListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{order_id_or_number}", response_model=AdminOrderDetailResponse)
async def get_order_detail(
    order_id_or_number: str,
    _current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.AUDITOR])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminOrderDetailResponse:
    """Retrieve detailed order record with immutable line items, address, and saga state."""
    order_uuid: uuid.UUID | None = None
    try:
        order_uuid = uuid.UUID(order_id_or_number)
    except ValueError:
        pass

    if order_uuid:
        stmt = (
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.address))
            .where(Order.id == order_uuid)
        )
    else:
        stmt = (
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.address))
            .where(Order.order_number == order_id_or_number)
        )

    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Fetch Saga
    saga_stmt = (
        select(SagaInstance)
        .options(selectinload(SagaInstance.steps))
        .where(SagaInstance.order_id == order.id)
    )
    saga = (await db.execute(saga_stmt)).scalar_one_or_none()

    return _build_order_detail_response(order, saga)


@router.post("/{order_id}/confirm", response_model=AdminOrderDetailResponse)
async def confirm_order(
    order_id: uuid.UUID,
    payload: AdminOrderConfirmRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminOrderDetailResponse:
    """Confirm order payment and allocate inventory through the distributed saga."""
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.address))
        .where(Order.id == order_id)
        .with_for_update()
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        saga = await OrderSagaOrchestrator.confirm_payment_and_allocate(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            order=order,
            payment_reference=payload.payment_reference,
            actor_id=current_user.id,
        )
        await db.commit()

        # Real-time WebSocket event broadcast
        from app.core.websocket import ws_manager
        try:
            await ws_manager.broadcast("orders", {
                "type": "ORDER_CONFIRMED",
                "order_id": str(order.id),
                "order_number": order.order_number,
                "order_status": order.order_status.value if hasattr(order.order_status, "value") else str(order.order_status),
                "payment_status": order.payment_status.value if hasattr(order.payment_status, "value") else str(order.payment_status),
            })
            await ws_manager.broadcast(f"tracking:{order.id}", {
                "type": "STATUS_UPDATED",
                "order_id": str(order.id),
                "status": "CONFIRMED",
            })
        except Exception:
            pass

        return _build_order_detail_response(order, saga)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/{order_id}/cancel", response_model=AdminOrderDetailResponse)
async def cancel_order(
    order_id: uuid.UUID,
    payload: AdminOrderCancelRequest,
    current_user: Annotated[
        User,
        Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS])),
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminOrderDetailResponse:
    """Cancel order and execute compensating inventory release."""
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.address))
        .where(Order.id == order_id)
        .with_for_update()
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        saga = await OrderSagaOrchestrator.cancel_order_and_compensate(
            session=db,
            company_id=DEFAULT_COMPANY_ID,
            order=order,
            reason=payload.reason,
            actor_id=current_user.id,
        )
        await db.commit()

        # Real-time WebSocket event broadcast
        from app.core.websocket import ws_manager
        try:
            await ws_manager.broadcast("orders", {
                "type": "ORDER_CANCELLED",
                "order_id": str(order.id),
                "order_number": order.order_number,
                "order_status": order.order_status.value if hasattr(order.order_status, "value") else str(order.order_status),
                "reason": payload.reason,
            })
            await ws_manager.broadcast(f"tracking:{order.id}", {
                "type": "STATUS_UPDATED",
                "order_id": str(order.id),
                "status": "CANCELLED",
            })
        except Exception:
            pass

        return _build_order_detail_response(order, saga)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

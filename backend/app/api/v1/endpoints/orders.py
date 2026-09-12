"""Authoritative Order Management Endpoints with PostgreSQL Persistence."""
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_user,
    get_optional_current_user,
    require_roles,
    verify_csrf,
)
from app.core.database import get_db
from app.models import (
    FulfilmentStatus,
    InventoryItem,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentStatus,
    ProductVariant,
    Quote,
    ReplacementStatus,
    Shipment,
)
from app.models.auth import User, UserRole
from app.schemas.order import (
    CreateOrderRequest,
    OrderItemResponse,
    OrderResponse,
    UpdateOrderStatusRequest,
)
from app.schemas.quote import CreateQuoteRequest, QuoteItemRequest
from app.services.inventory import InsufficientStockError, InventoryService
from app.services.order_state import InvalidStateTransitionError, OrderStateMachine
from app.services.quote_service import (
    ExpiredQuoteError,
    InvalidSkuError,
    PriceChangedError,
    QuoteError,
    QuoteService,
)

router = APIRouter()


def _to_order_response(order: Order) -> OrderResponse:
    items = [
        OrderItemResponse(
            id=item.id,
            sku=item.sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_gross=item.line_gross,
            taxable_base=item.taxable_base,
            product_gst=item.product_gst,
            gst_rate=item.gst_rate,
        )
        for item in order.items
    ]
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        quote_id=order.quote_id,
        order_status=order.order_status.value if hasattr(order.order_status, "value") else str(order.order_status),
        payment_status=order.payment_status.value if hasattr(order.payment_status, "value") else str(order.payment_status),
        fulfilment_status=order.fulfilment_status.value if hasattr(order.fulfilment_status, "value") else str(order.fulfilment_status),
        replacement_status=order.replacement_status.value if hasattr(order.replacement_status, "value") else str(order.replacement_status),
        subtotal_taxable=order.subtotal_taxable,
        product_gst=order.product_gst,
        shipping_base=order.shipping_base,
        shipping_gst=order.shipping_gst,
        cod_surcharge=order.cod_surcharge,
        total_payable=order.total_payable,
        currency=order.currency,
        items=items,
        created_at=order.created_at,
    )


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: CreateOrderRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> OrderResponse:
    """Create and persist an authoritative order in PostgreSQL.
    
    Independently validates:
    - Product SKU / variant existence
    - Authorised active catalog price (never trusts client totals)
    - MOQ constraints
    - Available inventory stock with row-level locking
    - Statutory GST and shipping rates
    - Idempotency key to prevent duplicate submissions
    - Atomically creates inventory reservations
    """
    # 1. Idempotency Check
    if payload.idempotency_key:
        stmt_quote = (
            select(Quote)
            .where(Quote.idempotency_key == payload.idempotency_key)
        )
        existing_quote = (await db.execute(stmt_quote)).scalar_one_or_none()
        if existing_quote is not None:
            stmt_order = (
                select(Order)
                .where(Order.quote_id == existing_quote.id)
                .options(selectinload(Order.items))
            )
            existing_order = (await db.execute(stmt_order)).scalar_one_or_none()
            if existing_order is not None:
                return _to_order_response(existing_order)

    # 2. Validate items presence
    if not payload.quote_id and not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either quote_id or at least one item must be provided to create an order.",
        )

    try:
        quote_id = payload.quote_id

        # 3. If no quote_id provided, create an authoritative quote atomically from DB
        if not quote_id:
            quote_items: list[QuoteItemRequest] = []
            for item in payload.items:
                if item.quantity <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Quantity for SKU '{item.sku}' must be greater than zero.",
                    )

                # Acquire row-level lock on inventory to prevent overselling race conditions
                stmt_inv = (
                    select(InventoryItem)
                    .where(InventoryItem.sku == item.sku)
                    .with_for_update()
                )
                inv_item = (await db.execute(stmt_inv)).scalar_one_or_none()
                if inv_item is not None:
                    avail = inv_item.quantity_on_hand - inv_item.quantity_reserved
                    if avail < item.quantity:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Insufficient stock for SKU '{item.sku}'. Available: {avail}, Requested: {item.quantity}.",
                        )

                quote_items.append(
                    QuoteItemRequest(
                        sku=item.sku,
                        variant_id=item.variant_id,
                        quantity=item.quantity,
                    )
                )

            quote_req = CreateQuoteRequest(
                items=quote_items,
                destination_pincode=payload.destination_pincode,
                idempotency_key=payload.idempotency_key,
                rounding_multiple=5,
            )

            # Generate quote authoritatively using catalog prices in PostgreSQL
            quote_res = await QuoteService.create_quote(session=db, request=quote_req)
            quote_id = quote_res.quote_id

        # 4. Create authoritative order from the validated quote
        order = await QuoteService.create_order_from_quote(
            session=db,
            quote_id=quote_id,
            payment_method=payload.payment_method,
        )

        # 5. Create shipment entry with carrier India Post Speed Post
        shipment = Shipment(
            order_id=order.id,
            carrier="INDIA_POST",
            origin_pincode="382430",
            destination_pincode=payload.destination_pincode,
            status=FulfilmentStatus.UNFULFILLED,
        )
        db.add(shipment)

        # 6. Record payment intent
        payment = Payment(
            order_id=order.id,
            provider=payload.payment_method.lower(),
            amount=order.total_payable,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)

        # 7. Reserve inventory atomically in PostgreSQL ledger for each order item
        stmt_items = select(OrderItem).where(OrderItem.order_id == order.id)
        order_items = (await db.execute(stmt_items)).scalars().all()
        for o_item in order_items:
            try:
                await InventoryService.reserve_stock(
                    session=db,
                    sku=o_item.sku,
                    quantity=o_item.quantity,
                    order_id=order.id,
                    user_id=current_user.id if current_user else None,
                )
            except InsufficientStockError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(exc),
                ) from exc

        # Commit all changes atomically
        await db.commit()

        # Reload with items for full response
        stmt_reload = (
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items))
        )
        persisted_order = (await db.execute(stmt_reload)).scalar_one()
        return _to_order_response(persisted_order)

    except HTTPException:
        await db.rollback()
        raise
    except InvalidSkuError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except PriceChangedError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Catalog price has changed since quote was created. Please refresh your cart.",
        ) from e
    except ExpiredQuoteError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="The checkout quote has expired. Please refresh your cart to re-verify current price and stock.",
        ) from e
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ERROR: {type(e).__name__}: {e}",
        ) from e


@router.get("/{order_id_or_number}", response_model=OrderResponse)
async def get_order(
    order_id_or_number: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> OrderResponse:
    """Retrieve an order by UUID or order number with BOLA authorization check."""
    order_uuid: uuid.UUID | None = None
    try:
        order_uuid = uuid.UUID(order_id_or_number)
    except ValueError:
        pass

    if order_uuid:
        stmt = select(Order).where(Order.id == order_uuid).options(selectinload(Order.items), selectinload(Order.shipments))
    else:
        stmt = select(Order).where(Order.order_number == order_id_or_number).options(selectinload(Order.items), selectinload(Order.shipments))

    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # BOLA check: if order is tied to a user, caller must be owner or administrative staff
    if order.user_id is not None:
        if not current_user or (
            current_user.id != order.user_id
            and current_user.role not in (UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.CATALOG_MANAGER)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not have permission to access this order.",
            )

    return _to_order_response(order)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
    offset: int = 0,
) -> list[OrderResponse]:
    """List orders with items, restricted to user's orders or administrative staff."""
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.shipments))
        .order_by(Order.created_at.desc())
        .limit(min(limit, 100))
        .offset(max(0, offset))
    )
    if current_user.role not in (UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.CATALOG_MANAGER):
        stmt = stmt.where(Order.user_id == current_user.id)

    orders = (await db.execute(stmt)).scalars().all()
    return [_to_order_response(o) for o in orders]


@router.patch("/{order_id_or_number}/status", response_model=OrderResponse)
async def update_order_status(
    order_id_or_number: str,
    payload: UpdateOrderStatusRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS]))],
) -> OrderResponse:
    """Update order or shipment status authoritatively with state machine validation."""
    order_uuid: uuid.UUID | None = None
    try:
        order_uuid = uuid.UUID(order_id_or_number)
    except ValueError:
        pass

    if order_uuid:
        stmt = (
            select(Order)
            .where(Order.id == order_uuid)
            .options(selectinload(Order.items), selectinload(Order.shipments))
        )
    else:
        stmt = (
            select(Order)
            .where(Order.order_number == order_id_or_number)
            .options(selectinload(Order.items), selectinload(Order.shipments))
        )

    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if payload.order_status:
        try:
            target_order_status = OrderStatus(payload.order_status.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid order status value: '{payload.order_status}'.",
            )

        try:
            OrderStateMachine.transition_order_status(
                order=order,
                target=target_order_status,
                actor_id=str(current_user.id),
                reason=f"Status update by {current_user.role}",
            )
        except InvalidStateTransitionError as err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(err),
            ) from err

    if payload.fulfilment_status:
        try:
            target_f_status = FulfilmentStatus(payload.fulfilment_status.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid fulfilment status value: '{payload.fulfilment_status}'.",
            )

        try:
            OrderStateMachine.transition_fulfilment_status(
                order=order,
                target=target_f_status,
                actor_id=str(current_user.id),
                reason=f"Fulfilment update by {current_user.role}",
            )
            for shipment in order.shipments:
                shipment.status = target_f_status
                if payload.awb_number:
                    shipment.awb_number = payload.awb_number
                if payload.carrier:
                    shipment.carrier = payload.carrier
        except InvalidStateTransitionError as err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(err),
            ) from err

    await db.commit()
    await db.refresh(order)
    return _to_order_response(order)



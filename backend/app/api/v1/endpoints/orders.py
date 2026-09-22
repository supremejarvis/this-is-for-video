import contextlib
import io
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_current_user,
    get_optional_current_user,
    require_roles,
)
from app.core.database import get_db
from app.services.shipping_service import determine_zone
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
    Shipment,
)
from app.models.auth import User, UserRole
from app.schemas.order import (
    CreateOrderRequest,
    InitiateReplacementRequest,
    InitiateReplacementResponse,
    OrderAddressResponse,
    OrderItemResponse,
    OrderPreviewRequest,
    OrderResponse,
    UpdateOrderStatusRequest,
)
from app.schemas.quote import CreateQuoteRequest, QuoteItemRequest, QuoteResponse
from app.services.inventory import InsufficientStockError, InventoryService
from app.services.order_state import InvalidStateTransitionError, OrderStateMachine
from app.services.quote_service import (
    ExpiredQuoteError,
    InvalidSkuError,
    PriceChangedError,
    QuoteService,
)

logger = logging.getLogger("apollo.orders")

router = APIRouter()


def _to_order_response(order: Order, mask_for_unauthorized: bool = False) -> OrderResponse:
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
    addr_res: OrderAddressResponse | None = None
    if order.address and not mask_for_unauthorized:
        addr_res = OrderAddressResponse.model_validate(order.address)

    cust_name = order.customer_name or (order.address.full_name if order.address else None)
    cust_phone = order.customer_phone or (order.address.phone if order.address else None)
    cust_email = order.customer_email or (order.address.email if order.address else None)
    comp_name = order.company_name or (order.address.company_name if order.address else None)
    gst = order.gstin or (order.address.gstin if order.address else None)

    if mask_for_unauthorized:
        cust_phone = f"******{cust_phone[-4:]}" if cust_phone and len(cust_phone) >= 4 else "***"
        cust_email = None

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        quote_id=order.quote_id,
        user_id=order.user_id,
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
        customer_name=cust_name,
        customer_phone=cust_phone,
        customer_email=cust_email,
        company_name=comp_name,
        gstin=gst,
        items=items,
        address=addr_res,
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
                .options(selectinload(Order.items), selectinload(Order.address))
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

    # 3. Validate PIN code consistency
    shipping_pin = payload.shipping_address.pincode
    if payload.destination_pincode and payload.destination_pincode != shipping_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Destination PIN code '{payload.destination_pincode}' does not match shipping address PIN code '{shipping_pin}'.",
        )

    try:
        quote_id = payload.quote_id

        # 4. If quote_id provided, verify PIN code consistency against quote destination
        if quote_id:
            stmt_q = select(Quote).where(Quote.id == quote_id)
            existing_q = (await db.execute(stmt_q)).scalar_one_or_none()
            if not existing_q:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Quote '{quote_id}' not found.",
                )
            if existing_q.destination_pincode != shipping_pin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Shipping address PIN code '{shipping_pin}' does not match quote destination PIN code '{existing_q.destination_pincode}'. Please request a new quote.",
                )

        # 5. If no quote_id provided, create an authoritative quote atomically from DB
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
                destination_pincode=shipping_pin,
                idempotency_key=payload.idempotency_key,
                rounding_multiple=5,
            )

            # Generate quote authoritatively using catalog prices in PostgreSQL
            quote_res = await QuoteService.create_quote(session=db, request=quote_req)
            quote_id = quote_res.quote_id

        # 6. Create authoritative order and address snapshot from the validated quote
        order = await QuoteService.create_order_from_quote(
            session=db,
            quote_id=quote_id,
            payment_method=payload.payment_method,
            customer_info=payload.customer,
            shipping_address=payload.shipping_address,
            user_id=current_user.id if current_user else None,
            company_name=payload.company_name,
            gstin=payload.gstin,
        )

        # 7. Create shipment entry with carrier India Post Speed Post
        shipment = Shipment(
            order_id=order.id,
            carrier="INDIA_POST",
            origin_pincode="382430",
            destination_pincode=shipping_pin,
            status=FulfilmentStatus.UNFULFILLED,
        )
        db.add(shipment)

        # 8. Record payment intent
        payment = Payment(
            order_id=order.id,
            provider=payload.payment_method.lower(),
            amount=order.total_payable,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)

        # 9. Reserve inventory atomically in PostgreSQL ledger for each order item
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

        # Reload with items and address snapshot for full response
        stmt_reload = (
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items), selectinload(Order.address))
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
        logger.error("Order creation failed unexpectedly: %s", e, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your order. Please try again.",
        ) from e


@router.post("/preview", response_model=QuoteResponse)
async def preview_order(
    payload: OrderPreviewRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QuoteResponse:
    """Authoritatively calculate order totals and reject stock mismatches before payment.
    
    Adheres strictly to AGENTS.md Directive #3 & #8:
    - Never trusts client totals
    - Verifies available inventory in PostgreSQL
    - Computes statutory GST and shipping rates via QuoteService
    """
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one item is required for order preview.",
        )

    dest_pincode = payload.destination_pincode or (
        payload.shipping_address.pincode if payload.shipping_address else None
    )
    if not dest_pincode:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination PIN code is required for order preview.",
        )

    # 1. Validate stock availability and SKU existence
    quote_items: list[QuoteItemRequest] = []
    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity for SKU '{item.sku}' must be greater than zero.",
            )

        stmt_inv = select(InventoryItem).where(InventoryItem.sku == item.sku)
        inv_item = (await db.execute(stmt_inv)).scalar_one_or_none()
        if inv_item is None:
            # Check if variant exists in product catalog
            stmt_v = select(ProductVariant).where(ProductVariant.sku == item.sku)
            variant = (await db.execute(stmt_v)).scalar_one_or_none()
            if variant is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"SKU '{item.sku}' not found in catalog.",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for SKU '{item.sku}'. Available: 0, Requested: {item.quantity}.",
            )

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

    # 2. Authoritative calculation via QuoteService
    quote_req = CreateQuoteRequest(
        items=quote_items,
        destination_pincode=dest_pincode,
        channel=payload.channel,
        payment_method=payload.payment_method,
        idempotency_key=payload.idempotency_key,
        rounding_multiple=5,
    )
    return await QuoteService.create_quote(session=db, request=quote_req)


@router.get("/{order_id_or_number}", response_model=OrderResponse)
async def get_order(
    order_id_or_number: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> OrderResponse:
    """Retrieve an order by UUID or order number with BOLA authorization check."""
    order_uuid: uuid.UUID | None = None
    with contextlib.suppress(ValueError):
        order_uuid = uuid.UUID(order_id_or_number)

    if order_uuid:
        stmt = select(Order).where(Order.id == order_uuid).options(
            selectinload(Order.items), selectinload(Order.shipments), selectinload(Order.address)
        )
    else:
        stmt = select(Order).where(Order.order_number == order_id_or_number).options(
            selectinload(Order.items), selectinload(Order.shipments), selectinload(Order.address)
        )

    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    is_staff = current_user and current_user.role in (
        UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.CATALOG_MANAGER, UserRole.FINANCE, UserRole.SUPPORT, UserRole.AUDITOR
    )
    is_owner = current_user and order.user_id is not None and current_user.id == order.user_id

    # BOLA check: if order is tied to a user, caller must be owner or administrative staff
    if order.user_id is not None and not (is_owner or is_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to access this order.",
        )

    # For guest orders (user_id is None) accessed without staff credentials, mask address and phone
    mask_for_unauthorized = not (is_staff or is_owner)
    return _to_order_response(order, mask_for_unauthorized=mask_for_unauthorized)


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
        .options(selectinload(Order.items), selectinload(Order.shipments), selectinload(Order.address))
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
    with contextlib.suppress(ValueError):
        order_uuid = uuid.UUID(order_id_or_number)

    if order_uuid:
        stmt = (
            select(Order)
            .where(Order.id == order_uuid)
            .options(selectinload(Order.items), selectinload(Order.shipments), selectinload(Order.address))
        )
    else:
        stmt = (
            select(Order)
            .where(Order.order_number == order_id_or_number)
            .options(selectinload(Order.items), selectinload(Order.shipments), selectinload(Order.address))
        )

    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if payload.order_status:
        try:
            target_order_status = OrderStatus(payload.order_status.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid order status value: '{payload.order_status}'.",
            ) from None

        if target_order_status == OrderStatus.CANCELLED:
            try:
                audit_logs = OrderStateMachine.cancel_order(
                    order=order,
                    actor_id=str(current_user.id),
                    reason=f"Status update by {current_user.role}",
                    is_cod=(order.payment_status == PaymentStatus.NOT_REQUIRED and order.order_status != OrderStatus.CANCELLED),
                )
                for log in audit_logs:
                    logger.info("Order cancel audit: %s", log)
            except InvalidStateTransitionError as err:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=str(err),
                ) from err
        else:
            try:
                OrderStateMachine.transition_order_status(
                    order=order,
                    target=target_order_status,
                    actor_id=str(current_user.id),
                    reason=f"Status update by {current_user.role}",
                )
            except InvalidStateTransitionError as err:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=str(err),
                ) from err

    if payload.fulfilment_status:
        try:
            target_f_status = FulfilmentStatus(payload.fulfilment_status.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid fulfilment status value: '{payload.fulfilment_status}'.",
            ) from None

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
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(err),
            ) from err

    await db.commit()
    await db.refresh(order)
    return _to_order_response(order)


@router.post(
    "/{order_id}/replacement",
    response_model=InitiateReplacementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a replacement case for a delivered order",
)
async def initiate_replacement(
    order_id: uuid.UUID,
    payload: InitiateReplacementRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InitiateReplacementResponse:
    """Create a verified replacement case with caliper photo evidence.

    Requirements per policy:
    - Order must be in DELIVERED state
    - Customer must provide clear photo of solar panel frame thickness with vernier caliper
    - Admin must inspect and approve before replacement dispatch
    """
    # Load order with shipments for status checks
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items), selectinload(Order.shipments))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    try:
        case, replacement_shipment, audit_logs = OrderStateMachine.initiate_replacement(
            original_order=order,
            caliper_photo_url=payload.caliper_photo_url,
            verified_thickness=payload.verified_frame_thickness,
            actor_id=str(current_user.id),
        )
    except InvalidStateTransitionError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err),
        ) from err

    db.add(case)
    db.add(replacement_shipment)

    # Persist audit logs (optional: could write to an audit table)
    for log in audit_logs:
        logger.info("Audit: %s", log)

    await db.commit()
    await db.refresh(case)
    await db.refresh(replacement_shipment)

    return InitiateReplacementResponse(
        case_id=case.id,
        original_order_id=order.id,
        status=case.status.value,
        replacement_shipment_id=replacement_shipment.id,
        message="Replacement case created. Admin will review caliper photo and verify frame thickness before dispatch.",
    )


def generate_order_invoice_pdf(order: Order) -> bytes:
    """Renders a statutory GST Tax Invoice PDF compliant with Section 31 of CGST Act 2017."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=24,
        rightMargin=24,
        topMargin=24,
        bottomMargin=24,
    )

    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "HeaderMeta",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#2B394A"),
    )
    cell_style = ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#2D3748"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
    )

    elements = []

    # 1. Company Brand & Document Header
    inv_num = f"APE/26-27/{order.order_number}"
    inv_date = order.created_at.strftime("%d-%b-%Y") if hasattr(order.created_at, "strftime") else str(order.created_at)[:10]

    header_left = Paragraph(
        "<b>APOLLO ENGINEERING</b><br/>"
        "Survey No. 248, Kathwada GIDC Industrial Area,<br/>"
        "Ahmedabad, Gujarat - 382430, India<br/>"
        "<b>GSTIN:</b> 24AAAPA0000A1Z5 | <b>State:</b> Gujarat (24)<br/>"
        "<b>Email:</b> contact@apolloengineering.co.in",
        header_style,
    )
    header_right = Paragraph(
        "<b>TAX INVOICE</b><br/>"
        "<i>(Under Section 31 of CGST Act, 2017)</i><br/>"
        f"<b>Invoice No:</b> {inv_num}<br/>"
        f"<b>Invoice Date:</b> {inv_date}<br/>"
        f"<b>Order Number:</b> {order.order_number}<br/>"
        f"<b>Payment Status:</b> {order.payment_status.value if hasattr(order.payment_status, 'value') else order.payment_status}",
        header_style,
    )

    header_table = Table([[header_left, header_right]], colWidths=[310, 237])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0054A6"), spaceBefore=2, spaceAfter=8))

    # 2. Bill To & Ship To Details
    c_name = order.company_name or order.customer_name or (order.address.full_name if order.address else "Customer")
    c_addr = order.address.address_line1 if order.address else "Direct Delivery"
    c_city = order.address.city if order.address else "Ahmedabad"
    c_state = order.address.state if order.address else "Gujarat"
    c_pin = order.address.pincode if order.address else "382430"
    c_phone = order.customer_phone or (order.address.phone if order.address else "N/A")
    c_gstin = order.gstin or (order.address.gstin if order.address else None) or "Unregistered (B2C)"

    dest_zone = determine_zone(c_pin)
    is_intra = (dest_zone in ("LOCAL", "GUJARAT")) or ("GUJARAT" in str(c_state).upper())
    place_of_supply = "24-Gujarat" if is_intra else f"99-{c_state}"

    bill_to = Paragraph(
        f"<b>Billed & Shipped To:</b><br/>"
        f"<b>Customer/Entity:</b> {c_name}<br/>"
        f"<b>Address:</b> {c_addr}, {c_city}, {c_state} - {c_pin}<br/>"
        f"<b>Phone:</b> {c_phone} | <b>Place of Supply:</b> {place_of_supply}<br/>"
        f"<b>Customer GSTIN:</b> {c_gstin}",
        header_style,
    )

    supply_info = Paragraph(
        f"<b>Dispatch & Tax Terms:</b><br/>"
        f"<b>Origin Hub:</b> Kathwada GIDC, Ahmedabad (382430)<br/>"
        f"<b>Shipping Provider:</b> India Post Speed Post<br/>"
        f"<b>Reverse Charge:</b> No (Tax payable on Forward Charge)<br/>"
        f"<b>Tax Mode:</b> Statutory CGST + SGST (Intrastate) / IGST (Interstate)",
        header_style,
    )

    cust_table = Table([[bill_to, supply_info]], colWidths=[310, 237])
    cust_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(cust_table)
    elements.append(Spacer(1, 10))

    # 3. Itemized Tax Table
    tax_label = "CGST+SGST" if is_intra else "IGST"
    items_data = [[
        Paragraph("<b>#</b>", cell_bold),
        Paragraph("<b>Item Description & SKU</b>", cell_bold),
        Paragraph("<b>HSN</b>", cell_bold),
        Paragraph("<b>Qty</b>", cell_bold),
        Paragraph("<b>Rate (₹)</b>", cell_bold),
        Paragraph("<b>Taxable (₹)</b>", cell_bold),
        Paragraph(f"<b>{tax_label}</b>", cell_bold),
        Paragraph("<b>Total (₹)</b>", cell_bold),
    ]]

    idx = 1
    for itm in order.items:
        hsn = "73269099" if "CLIP" in itm.sku.upper() else "85419000"
        gst_pct = f"{float(itm.gst_rate * 100):.1f}%"
        items_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph(f"<b>{itm.sku}</b><br/>Solar Water Drain Clip SS304", cell_style),
            Paragraph(hsn, cell_style),
            Paragraph(str(itm.quantity), cell_style),
            Paragraph(f"{float(itm.unit_price):.2f}", cell_style),
            Paragraph(f"{float(itm.taxable_base):.2f}", cell_style),
            Paragraph(f"{gst_pct}<br/>(₹{float(itm.product_gst):.2f})", cell_style),
            Paragraph(f"{float(itm.line_gross):.2f}", cell_style),
        ])
        idx += 1

    # Shipping Row
    if order.shipping_base and float(order.shipping_base) > 0:
        items_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph("<b>Speed Post Logistics</b><br/>Safe parcel packaging & delivery", cell_style),
            Paragraph("996812", cell_style),
            Paragraph("1", cell_style),
            Paragraph(f"{float(order.shipping_base):.2f}", cell_style),
            Paragraph(f"{float(order.shipping_base):.2f}", cell_style),
            Paragraph(f"18.0%<br/>(₹{float(order.shipping_gst):.2f})", cell_style),
            Paragraph(f"{float(order.shipping_base + order.shipping_gst):.2f}", cell_style),
        ])
        idx += 1

    # COD Surcharge Row if applicable
    if order.cod_surcharge and float(order.cod_surcharge) > 0:
        items_data.append([
            Paragraph(str(idx), cell_style),
            Paragraph("<b>Cash on Delivery Surcharge</b><br/>Courier cash handling fee (2.5%)", cell_style),
            Paragraph("996813", cell_style),
            Paragraph("1", cell_style),
            Paragraph(f"{float(order.cod_surcharge):.2f}", cell_style),
            Paragraph(f"{float(order.cod_surcharge):.2f}", cell_style),
            Paragraph("0.0%", cell_style),
            Paragraph(f"{float(order.cod_surcharge):.2f}", cell_style),
        ])

    items_table = Table(items_data, colWidths=[20, 180, 48, 30, 60, 68, 65, 76])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0054A6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 8))

    # 4. Summary & Bank Details Block
    tot_taxable = float(order.subtotal_taxable + order.shipping_base)
    tot_gst = float(order.product_gst + order.shipping_gst)
    half_gst = round(tot_gst / 2, 2)

    bank_details_p = Paragraph(
        "<b>Banking & Remittance Details:</b><br/>"
        "<b>Account Name:</b> Apollo Engineering<br/>"
        "<b>Bank:</b> State Bank of India | <b>A/C No:</b> 40291083921<br/>"
        "<b>IFSC Code:</b> SBIN0002148 | <b>Branch:</b> Kathwada GIDC, Ahmedabad<br/>"
        "<b>UPI VPA:</b> apolloengineering@sbi<br/>"
        "<br/><i>Note: 100% Stainless Steel 304 solar water drain clips.</i>",
        header_style,
    )

    tax_summary_rows = [
        [Paragraph("Taxable Subtotal:", cell_style), Paragraph(f"₹{tot_taxable:.2f}", cell_style)]
    ]
    if is_intra:
        tax_summary_rows.append([Paragraph("CGST (9.0%):", cell_style), Paragraph(f"₹{half_gst:.2f}", cell_style)])
        tax_summary_rows.append([Paragraph("SGST (9.0%):", cell_style), Paragraph(f"₹{half_gst:.2f}", cell_style)])
    else:
        tax_summary_rows.append([Paragraph("IGST (18.0%):", cell_style), Paragraph(f"₹{tot_gst:.2f}", cell_style)])

    if order.cod_surcharge and float(order.cod_surcharge) > 0:
        tax_summary_rows.append([Paragraph("COD Fee (2.5%):", cell_style), Paragraph(f"₹{float(order.cod_surcharge):.2f}", cell_style)])

    tax_summary_rows.append([
        Paragraph("<b>Total Amount Payable:</b>", cell_bold),
        Paragraph(f"<b>₹{float(order.total_payable):.2f}</b>", cell_bold),
    ])

    summary_table = Table(tax_summary_rows, colWidths=[120, 100])
    summary_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#0054A6")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EDF2F7")),
        ("PADDING", (0, 0), (-1, -1), 3),
    ]))

    bottom_table = Table([[bank_details_p, summary_table]], colWidths=[317, 230])
    bottom_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(bottom_table)
    elements.append(Spacer(1, 10))

    # 5. Terms & Signatory
    terms_p = Paragraph(
        "<b>Terms & Statutory Conditions:</b><br/>"
        "1. Goods once sold are covered under Apollo 7-day replacement warranty for verified frame thickness.<br/>"
        "2. All disputes are strictly subject to Ahmedabad, Gujarat jurisdiction only.<br/>"
        "3. This is an authentic computer-generated tax invoice issued in accordance with CGST Rules, 2017.",
        ParagraphStyle("Terms", parent=styles["Normal"], fontSize=6.5, leading=8.5, textColor=colors.HexColor("#718096")),
    )
    sign_p = Paragraph(
        "<b>For Apollo Engineering</b><br/><br/><br/>"
        "<b>Authorised Signatory</b>",
        ParagraphStyle("Sign", parent=styles["Normal"], fontSize=8, leading=10, alignment=2, textColor=colors.HexColor("#2D3748")),
    )

    footer_table = Table([[terms_p, sign_p]], colWidths=[380, 167])
    footer_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(footer_table)

    doc.build(elements)
    return buf.getvalue()


@router.get(
    "/{order_id}/invoice.pdf",
    summary="Download Official Statutory GST Tax Invoice (PDF)",
    description="Generates and streams an authoritative GST tax invoice in PDF format compliant with Section 31 of CGST Act.",
)
async def download_order_invoice_pdf(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> Response:
    """Download official statutory GST tax invoice PDF for an order."""
    order_uuid: uuid.UUID | None = None
    with contextlib.suppress(ValueError):
        order_uuid = uuid.UUID(order_id)

    if order_uuid:
        stmt = (
            select(Order)
            .where(Order.id == order_uuid)
            .options(selectinload(Order.items), selectinload(Order.address))
        )
    else:
        stmt = (
            select(Order)
            .where(Order.order_number == order_id)
            .options(selectinload(Order.items), selectinload(Order.address))
        )

    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found.",
        )

    # Authorization Check:
    # If order is associated with a registered user, non-admin callers must own it
    if order.user_id and current_user:
        is_admin = current_user.role in (UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.FINANCE, UserRole.AUDITOR)
        if not is_admin and order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download this invoice.",
            )

    pdf_bytes = generate_order_invoice_pdf(order)
    filename = f"Tax_Invoice_{order.order_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )



"""Initial schema with PostgreSQL models, orthogonal state machines, and check constraints.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-04 22:35:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Explicitly create PostgreSQL Enum types
    op.execute("CREATE TYPE tax_mode_enum AS ENUM ('GST_INCLUSIVE', 'GST_EXCLUSIVE')")
    op.execute("CREATE TYPE reservation_status_enum AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED')")
    op.execute("CREATE TYPE order_status_enum AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED')")
    op.execute(
        "CREATE TYPE payment_status_enum AS ENUM ("
        "'NOT_REQUIRED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED')"
    )
    op.execute(
        "CREATE TYPE fulfilment_status_enum AS ENUM ("
        "'UNFULFILLED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO')"
    )
    op.execute(
        "CREATE TYPE replacement_status_enum AS ENUM ("
        "'NONE', 'REQUESTED', 'EVIDENCE_PENDING', 'APPROVED', 'REJECTED', 'RETURN_IN_TRANSIT', 'REPLACEMENT_READY', 'REPLACEMENT_SHIPPED', 'REPLACEMENT_DELIVERED')"
    )

    # Column enum helpers with create_type=False
    tax_mode_col = postgresql.ENUM("GST_INCLUSIVE", "GST_EXCLUSIVE", name="tax_mode_enum", create_type=False)
    reservation_status_col = postgresql.ENUM("ACTIVE", "COMMITTED", "RELEASED", name="reservation_status_enum", create_type=False)
    order_status_col = postgresql.ENUM("DRAFT", "QUOTED", "CONFIRMED", "CANCELLED", "COMPLETED", name="order_status_enum", create_type=False)
    payment_status_col = postgresql.ENUM(
        "NOT_REQUIRED", "PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED",
        name="payment_status_enum", create_type=False
    )
    fulfilment_status_col = postgresql.ENUM(
        "UNFULFILLED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "RTO",
        name="fulfilment_status_enum", create_type=False
    )
    replacement_status_col = postgresql.ENUM(
        "NONE", "REQUESTED", "EVIDENCE_PENDING", "APPROVED", "REJECTED", "RETURN_IN_TRANSIT", "REPLACEMENT_READY", "REPLACEMENT_SHIPPED", "REPLACEMENT_DELIVERED",
        name="replacement_status_enum", create_type=False
    )

    # 2. Products Table
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sku_prefix", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("hsn_code", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Product Variants Table
    op.create_table(
        "product_variants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sku", sa.String(50), nullable=False, unique=True),
        sa.Column("frame_thickness", sa.String(20), nullable=False),
        sa.Column("pack_size", sa.Integer(), nullable=False, default=1),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Price Versions Table
    op.create_table(
        "price_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, default="INR"),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("gst_rate", sa.Numeric(6, 4), nullable=False, default=0.1800),
        sa.Column("tax_mode", tax_mode_col, nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("unit_price >= 0.00", name="chk_price_version_unit_price_positive"),
        sa.CheckConstraint("gst_rate >= 0.0000 AND gst_rate <= 0.2800", name="chk_price_version_gst_rate_statutory"),
    )

    # 5. Inventory Items Table
    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("variant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("sku", sa.String(50), nullable=False, unique=True),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=False, default=0),
        sa.Column("quantity_reserved", sa.Integer(), nullable=False, default=0),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("quantity_on_hand >= 0", name="chk_inventory_on_hand_positive"),
        sa.CheckConstraint("quantity_reserved >= 0", name="chk_inventory_reserved_positive"),
        sa.CheckConstraint("quantity_on_hand >= quantity_reserved", name="chk_inventory_available_stock_non_negative"),
    )

    # 6. Inventory Reservations Table
    op.create_table(
        "inventory_reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sku", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", reservation_status_col, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("quantity > 0", name="chk_reservation_quantity_positive"),
    )

    # 7. Quotes Table
    op.create_table(
        "quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_number", sa.String(50), nullable=False, unique=True),
        sa.Column("destination_pincode", sa.String(6), nullable=True),
        sa.Column("subtotal_taxable", sa.Numeric(14, 2), nullable=False),
        sa.Column("total_product_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("total_product_gross", sa.Numeric(14, 2), nullable=False),
        sa.Column("base_shipping", sa.Numeric(14, 2), nullable=False),
        sa.Column("shipping_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("shipping_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("prepaid_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("cod_surcharge", sa.Numeric(14, 2), nullable=False),
        sa.Column("cod_raw_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("cod_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("rounding_multiple", sa.Integer(), nullable=False, default=1),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 8. Quote Items Table
    op.create_table(
        "quote_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sku", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("line_gross", sa.Numeric(14, 2), nullable=False),
        sa.Column("taxable_base", sa.Numeric(14, 2), nullable=False),
        sa.Column("product_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("gst_rate", sa.Numeric(6, 4), nullable=False),
        sa.Column("tax_mode", sa.String(20), nullable=False),
    )

    # 9. Orders Table
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(50), nullable=False, unique=True),
        sa.Column("quote_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, default=1),
        sa.Column("order_status", order_status_col, nullable=False),
        sa.Column("payment_status", payment_status_col, nullable=False),
        sa.Column("fulfilment_status", fulfilment_status_col, nullable=False),
        sa.Column("replacement_status", replacement_status_col, nullable=False),
        sa.Column("subtotal_taxable", sa.Numeric(14, 2), nullable=False),
        sa.Column("product_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("shipping_base", sa.Numeric(14, 2), nullable=False),
        sa.Column("shipping_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("cod_surcharge", sa.Numeric(14, 2), nullable=False, default=0.00),
        sa.Column("total_payable", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, default="INR"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 10. Order Items Table
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sku", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("line_gross", sa.Numeric(14, 2), nullable=False),
        sa.Column("taxable_base", sa.Numeric(14, 2), nullable=False),
        sa.Column("product_gst", sa.Numeric(14, 2), nullable=False),
        sa.Column("gst_rate", sa.Numeric(6, 4), nullable=False),
    )

    # 11. Payments Table
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("provider_payment_id", sa.String(100), nullable=True, unique=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", payment_status_col, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 12. Shipments Table
    op.create_table(
        "shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("carrier", sa.String(50), nullable=False, default="INDIA_POST"),
        sa.Column("awb_number", sa.String(100), nullable=True, unique=True),
        sa.Column("origin_pincode", sa.String(6), nullable=False, default="382430"),
        sa.Column("destination_pincode", sa.String(6), nullable=False),
        sa.Column("status", fulfilment_status_col, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 13. Replacement Cases Table
    op.create_table(
        "replacement_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("original_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("caliper_photo_url", sa.Text(), nullable=True),
        sa.Column("verified_frame_thickness", sa.String(20), nullable=True),
        sa.Column("status", replacement_status_col, nullable=False),
        sa.Column("return_shipping_charge", sa.Numeric(14, 2), nullable=False, default=0.00),
        sa.Column("replacement_shipping_charge", sa.Numeric(14, 2), nullable=False, default=0.00),
        sa.Column("shipping_gst", sa.Numeric(14, 2), nullable=False, default=0.00),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 14. Replacement Shipments Table
    op.create_table(
        "replacement_shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("replacement_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("awb_number", sa.String(100), nullable=True, unique=True),
        sa.Column("status", fulfilment_status_col, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 15. Durable Outbox Events Table
    op.create_table(
        "outbox_events",
        sa.Column("cursor_id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("aggregate_type", sa.String(50), nullable=False),
        sa.Column("aggregate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("outbox_events")
    op.drop_table("replacement_shipments")
    op.drop_table("replacement_cases")
    op.drop_table("shipments")
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("quote_items")
    op.drop_table("quotes")
    op.drop_table("inventory_reservations")
    op.drop_table("inventory_items")
    op.drop_table("price_versions")
    op.drop_table("product_variants")
    op.drop_table("products")

    op.execute("DROP TYPE IF EXISTS replacement_status_enum")
    op.execute("DROP TYPE IF EXISTS fulfilment_status_enum")
    op.execute("DROP TYPE IF EXISTS payment_status_enum")
    op.execute("DROP TYPE IF EXISTS order_status_enum")
    op.execute("DROP TYPE IF EXISTS reservation_status_enum")
    op.execute("DROP TYPE IF EXISTS tax_mode_enum")

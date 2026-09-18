"""Add order address snapshot table and customer fields to orders.

Revision ID: 008_order_address_and_customer_persistence
Revises: 007_webhook_events
Create Date: 2026-09-13 01:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008_order_customer"
down_revision: str | None = "007_webhook_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Add user_id and customer/business snapshot fields to orders table
    with op.batch_alter_table("orders") as batch_op:
        batch_op.add_column(
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.add_column(sa.Column("customer_name", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("customer_phone", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("customer_email", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("company_name", sa.String(150), nullable=True))
        batch_op.add_column(sa.Column("gstin", sa.String(20), nullable=True))
        batch_op.create_index("ix_orders_user_id", ["user_id"])

    # 2. Create order_addresses table for immutable delivery address snapshots
    op.create_table(
        "order_addresses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
            sa.ForeignKey("orders.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("address_type", sa.String(20), nullable=False, server_default="SHIPPING"),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(100), nullable=True),
        sa.Column("address_line1", sa.String(255), nullable=False),
        sa.Column("address_line2", sa.String(255), nullable=True),
        sa.Column("landmark", sa.String(255), nullable=True),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("state_code", sa.String(10), nullable=True),
        sa.Column("pincode", sa.String(6), nullable=False),
        sa.Column("country", sa.String(50), nullable=False, server_default="India"),
        sa.Column("company_name", sa.String(150), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_order_addresses_order_id", "order_addresses", ["order_id"], unique=True)
    op.create_index("ix_order_addresses_pincode", "order_addresses", ["pincode"])
    op.create_index("ix_order_addresses_phone", "order_addresses", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_order_addresses_phone", table_name="order_addresses")
    op.drop_index("ix_order_addresses_pincode", table_name="order_addresses")
    op.drop_index("ix_order_addresses_order_id", table_name="order_addresses")
    op.drop_table("order_addresses")

    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_index("ix_orders_user_id")
        batch_op.drop_column("gstin")
        batch_op.drop_column("company_name")
        batch_op.drop_column("customer_email")
        batch_op.drop_column("customer_phone")
        batch_op.drop_column("customer_name")
        batch_op.drop_column("user_id")

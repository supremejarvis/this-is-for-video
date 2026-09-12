"""Add webhook_events table for persistent webhook idempotency.

Revision ID: 007_webhook_events
Revises: 006_gate_2b_final_patch
Create Date: 2026-09-12 18:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_webhook_events"
down_revision: str | None = "006_gate_2b_final_patch"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.create_table(
        "webhook_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("event_id", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False, server_default="razorpay"),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_webhook_events_event_id", "webhook_events", ["event_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_webhook_events_event_id", table_name="webhook_events")
    op.drop_table("webhook_events")

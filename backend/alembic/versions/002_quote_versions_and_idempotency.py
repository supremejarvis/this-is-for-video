"""Add calculation_version, catalog_version, and idempotency_key to quotes.

Revision ID: 002_quote_enhancements
Revises: 001_initial_schema
Create Date: 2026-09-04 23:05:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '002_quote_enhancements'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("calculation_version", sa.String(length=20), server_default="1.0.0", nullable=False))
    op.add_column("quotes", sa.Column("catalog_version", sa.String(length=20), server_default="1.0.0", nullable=False))
    op.add_column("quotes", sa.Column("idempotency_key", sa.String(length=100), nullable=True))
    op.create_unique_constraint("uq_quotes_idempotency_key", "quotes", ["idempotency_key"])


def downgrade() -> None:
    op.drop_constraint("uq_quotes_idempotency_key", "quotes", type_="unique")
    op.drop_column("quotes", "idempotency_key")
    op.drop_column("quotes", "catalog_version")
    op.drop_column("quotes", "calculation_version")

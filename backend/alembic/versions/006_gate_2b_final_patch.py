"""Gate 2B Final Patch: Strengthened Thickness Check, Currency Exclusion Invariant, and Optimistic Concurrency Control.

Revision ID: 006_gate_2b_final_patch
Revises: 005_gate_2b_correction
Create Date: 2026-09-05 20:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '006_gate_2b_final_patch'
down_revision: str | None = '005_gate_2b_correction'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Drop previous loose check constraints on product_variants
    op.drop_constraint('chk_variant_range_thickness', 'product_variants', type_='check')
    op.drop_constraint('chk_variant_exact_thickness', 'product_variants', type_='check')

    # Ensure existing rows strictly adhere before constraint addition
    op.execute("""
        UPDATE product_variants
        SET frame_thickness_mm = NULL, min_thickness_mm = NULL, max_thickness_mm = NULL
        WHERE fit_mode IN ('UNIVERSAL', 'NOT_APPLICABLE');
    """)
    op.execute("""
        UPDATE product_variants
        SET frame_thickness_mm = NULL
        WHERE fit_mode = 'RANGE';
    """)
    op.execute("""
        UPDATE product_variants
        SET min_thickness_mm = NULL, max_thickness_mm = NULL
        WHERE fit_mode = 'EXACT';
    """)

    # Add strict ck_variant_thickness_fit constraint
    op.create_check_constraint(
        'ck_variant_thickness_fit',
        'product_variants',
        """
        (fit_mode = 'EXACT' AND frame_thickness_mm IS NOT NULL AND frame_thickness_mm > 0 AND min_thickness_mm IS NULL AND max_thickness_mm IS NULL) OR
        (fit_mode = 'RANGE' AND frame_thickness_mm IS NULL AND min_thickness_mm IS NOT NULL AND min_thickness_mm > 0 AND max_thickness_mm IS NOT NULL AND max_thickness_mm > 0 AND min_thickness_mm <= max_thickness_mm) OR
        (fit_mode IN ('UNIVERSAL', 'NOT_APPLICABLE') AND frame_thickness_mm IS NULL AND min_thickness_mm IS NULL AND max_thickness_mm IS NULL)
        """,
    )

    # 2. Currency check constraint on price_versions
    op.create_check_constraint(
        'ck_price_version_currency_inr',
        'price_versions',
        "currency = 'INR'",
    )

    # 3. Upgrade exclusion constraint to include currency
    if is_postgres:
        op.execute("ALTER TABLE price_versions DROP CONSTRAINT IF EXISTS uq_price_version_no_overlap;")
        op.execute("""
            ALTER TABLE price_versions ADD CONSTRAINT uq_price_version_no_overlap
            EXCLUDE USING gist (
                variant_id WITH =,
                currency WITH =,
                channel WITH =,
                min_quantity WITH =,
                tax_mode WITH =,
                tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz), '[)') WITH &&
            );
        """)

    # 4. Optimistic Concurrency Control: version column on products & product_variants
    op.add_column(
        'products',
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
    )
    op.add_column(
        'product_variants',
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Remove version columns
    op.drop_column('product_variants', 'version')
    op.drop_column('products', 'version')

    # 2. Revert exclusion constraint
    if is_postgres:
        op.execute("ALTER TABLE price_versions DROP CONSTRAINT IF EXISTS uq_price_version_no_overlap;")
        op.execute("""
            ALTER TABLE price_versions ADD CONSTRAINT uq_price_version_no_overlap
            EXCLUDE USING gist (
                variant_id WITH =,
                channel WITH =,
                min_quantity WITH =,
                tax_mode WITH =,
                tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz), '[)') WITH &&
            );
        """)

    # 3. Revert currency check constraint
    op.drop_constraint('ck_price_version_currency_inr', 'price_versions', type_='check')

    # 4. Revert thickness check constraint
    op.drop_constraint('ck_variant_thickness_fit', 'product_variants', type_='check')
    op.create_check_constraint(
        'chk_variant_exact_thickness',
        'product_variants',
        "(fit_mode != 'EXACT') OR (frame_thickness_mm IS NOT NULL)",
    )
    op.create_check_constraint(
        'chk_variant_range_thickness',
        'product_variants',
        "(fit_mode != 'RANGE') OR (min_thickness_mm IS NOT NULL AND max_thickness_mm IS NOT NULL AND min_thickness_mm < max_thickness_mm)",
    )

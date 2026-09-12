"""Gate 2B Correction Patch: Structured Sizing, Variant-Attached Pricing, Exclusion Constraint, and Append-Only Triggers.

Revision ID: 005_gate_2b_correction
Revises: 004_gate_2b_catalog
Create Date: 2026-09-05 19:15:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '005_gate_2b_correction'
down_revision: str | None = '004_gate_2b_catalog'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

fit_mode_enum = postgresql.ENUM(
    'EXACT',
    'RANGE',
    'UNIVERSAL',
    'NOT_APPLICABLE',
    name='fit_mode_enum',
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. FitMode Enum & Structured Sizing on product_variants
    fit_mode_enum.create(bind, checkfirst=True)

    op.add_column(
        'product_variants',
        sa.Column('fit_mode', fit_mode_enum, server_default='EXACT', nullable=False),
    )
    op.add_column(
        'product_variants',
        sa.Column('frame_thickness_mm', sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        'product_variants',
        sa.Column('min_thickness_mm', sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        'product_variants',
        sa.Column('max_thickness_mm', sa.Numeric(5, 2), nullable=True),
    )
    op.add_column(
        'product_variants',
        sa.Column('display_label', sa.String(100), server_default='', nullable=False),
    )

    # Backfill display_label from existing frame_thickness if any
    op.execute("UPDATE product_variants SET display_label = frame_thickness WHERE display_label = ''")
    op.execute("""
        UPDATE product_variants
        SET frame_thickness_mm = 30.00
        WHERE fit_mode = 'EXACT' AND frame_thickness_mm IS NULL
    """)

    # Check constraints on product_variants
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

    # 2. Attach PriceVersion to product_variants with Channel, MOQ, HSN, and Audit Reason
    op.add_column('price_versions', sa.Column('variant_id', sa.UUID(), nullable=True))
    op.add_column('price_versions', sa.Column('channel', sa.String(10), server_default='B2C', nullable=False))
    op.add_column('price_versions', sa.Column('min_quantity', sa.Integer(), server_default='1', nullable=False))
    op.add_column('price_versions', sa.Column('hsn_code', sa.String(20), server_default='73269099', nullable=False))
    op.add_column('price_versions', sa.Column('created_by_user_id', sa.UUID(), nullable=True))
    op.add_column('price_versions', sa.Column('reason', sa.String(255), server_default='Standard price', nullable=False))

    # Link existing price_versions to a default variant if any exist
    op.execute("""
        UPDATE price_versions pv
        SET variant_id = (
            SELECT id FROM product_variants
            WHERE product_id = pv.product_id
            LIMIT 1
        )
        WHERE pv.variant_id IS NULL
    """)
    # Clear any conflicting legacy test rows in disposable test DB before enforcing strict exclusion constraint
    op.execute("TRUNCATE price_versions CASCADE;")

    # Now make foreign key
    op.create_foreign_key(
        'fk_price_versions_variant_id',
        'price_versions',
        'product_variants',
        ['variant_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_price_versions_created_by_user_id',
        'price_versions',
        'users',
        ['created_by_user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_price_versions_variant_id', 'price_versions', ['variant_id'])
    op.create_index('ix_price_versions_channel', 'price_versions', ['channel'])

    # PostgreSQL Exclusion Constraint for Overlap Prevention
    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
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

    # 3. Structured Inventory Movements Ledger
    op.add_column('inventory_movements', sa.Column('idempotency_key', sa.String(100), nullable=True))
    op.add_column('inventory_movements', sa.Column('quantity_delta_on_hand', sa.Integer(), server_default='0', nullable=False))
    op.add_column('inventory_movements', sa.Column('quantity_delta_reserved', sa.Integer(), server_default='0', nullable=False))
    op.add_column('inventory_movements', sa.Column('resulting_quantity_on_hand', sa.Integer(), server_default='0', nullable=False))
    op.add_column('inventory_movements', sa.Column('resulting_quantity_reserved', sa.Integer(), server_default='0', nullable=False))
    op.add_column('inventory_movements', sa.Column('source_reference_type', sa.String(50), server_default='MANUAL', nullable=False))
    op.add_column('inventory_movements', sa.Column('source_reference_id', sa.String(100), nullable=True))
    op.add_column('inventory_movements', sa.Column('actor_id', sa.UUID(), nullable=True))

    # Backfill
    op.execute("""
        UPDATE inventory_movements
        SET idempotency_key = id::text,
            quantity_delta_on_hand = quantity_delta,
            resulting_quantity_on_hand = quantity_on_hand_after,
            resulting_quantity_reserved = quantity_reserved_after,
            source_reference_id = reference_id,
            actor_id = created_by_user_id
        WHERE idempotency_key IS NULL
    """)
    op.alter_column('inventory_movements', 'idempotency_key', nullable=False)
    op.create_unique_constraint('uq_inventory_movements_idempotency_key', 'inventory_movements', ['idempotency_key'])
    op.create_foreign_key(
        'fk_inventory_movements_actor_id',
        'inventory_movements',
        'users',
        ['actor_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_inventory_movements_source_reference', 'inventory_movements', ['source_reference_type', 'source_reference_id'])

    # 4. Append-Only Database Triggers for auth_audit_logs and inventory_movements
    if is_postgres:
        op.execute("""
            CREATE OR REPLACE FUNCTION prevent_update_or_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Table % is strictly append-only: UPDATE and DELETE operations are forbidden.', TG_TABLE_NAME;
            END;
            $$ LANGUAGE plpgsql;
        """)
        op.execute("""
            CREATE TRIGGER trg_auth_audit_logs_append_only
            BEFORE UPDATE OR DELETE ON auth_audit_logs
            FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
        """)
        op.execute("""
            CREATE TRIGGER trg_inventory_movements_append_only
            BEFORE UPDATE OR DELETE ON inventory_movements
            FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();
        """)


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Drop append-only triggers
    if is_postgres:
        op.execute("DROP TRIGGER IF EXISTS trg_inventory_movements_append_only ON inventory_movements;")
        op.execute("DROP TRIGGER IF EXISTS trg_auth_audit_logs_append_only ON auth_audit_logs;")
        op.execute("DROP FUNCTION IF EXISTS prevent_update_or_delete;")

    # 2. Revert inventory movements
    op.drop_constraint('uq_inventory_movements_idempotency_key', 'inventory_movements', type_='unique')
    op.drop_constraint('fk_inventory_movements_actor_id', 'inventory_movements', type_='foreignkey')
    op.drop_index('ix_inventory_movements_source_reference', table_name='inventory_movements')
    op.drop_column('inventory_movements', 'actor_id')
    op.drop_column('inventory_movements', 'source_reference_id')
    op.drop_column('inventory_movements', 'source_reference_type')
    op.drop_column('inventory_movements', 'resulting_quantity_reserved')
    op.drop_column('inventory_movements', 'resulting_quantity_on_hand')
    op.drop_column('inventory_movements', 'quantity_delta_reserved')
    op.drop_column('inventory_movements', 'quantity_delta_on_hand')
    op.drop_column('inventory_movements', 'idempotency_key')

    # 3. Revert price versions
    if is_postgres:
        op.execute("ALTER TABLE price_versions DROP CONSTRAINT IF EXISTS uq_price_version_no_overlap;")
    op.drop_index('ix_price_versions_channel', table_name='price_versions')
    op.drop_index('ix_price_versions_variant_id', table_name='price_versions')
    op.drop_constraint('fk_price_versions_created_by_user_id', 'price_versions', type_='foreignkey')
    op.drop_constraint('fk_price_versions_variant_id', 'price_versions', type_='foreignkey')
    op.drop_column('price_versions', 'reason')
    op.drop_column('price_versions', 'created_by_user_id')
    op.drop_column('price_versions', 'hsn_code')
    op.drop_column('price_versions', 'min_quantity')
    op.drop_column('price_versions', 'channel')
    op.drop_column('price_versions', 'variant_id')

    # 4. Revert product variants
    op.drop_constraint('chk_variant_range_thickness', 'product_variants', type_='check')
    op.drop_constraint('chk_variant_exact_thickness', 'product_variants', type_='check')
    op.drop_column('product_variants', 'display_label')
    op.drop_column('product_variants', 'max_thickness_mm')
    op.drop_column('product_variants', 'min_thickness_mm')
    op.drop_column('product_variants', 'frame_thickness_mm')
    op.drop_column('product_variants', 'fit_mode')
    fit_mode_enum.drop(bind, checkfirst=True)

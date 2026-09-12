"""Catalog soft-archiving and append-only inventory ledger.

Revision ID: 004_gate_2b_catalog
Revises: 003_auth_and_rbac
Create Date: 2026-09-05 18:15:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '004_gate_2b_catalog'
down_revision: str | None = '003_auth_and_rbac'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

inventory_movement_type_enum = postgresql.ENUM(
    'RECEIPT',
    'RESERVATION_HOLD',
    'RESERVATION_RELEASE',
    'DISPATCH',
    'ADJUSTMENT',
    'RETURN',
    name='inventory_movement_type_enum',
    create_type=False,
)


def upgrade() -> None:
    # 1. Create movement type enum
    inventory_movement_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add is_archived to products
    op.add_column(
        'products',
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
    )
    op.create_index('ix_products_is_archived', 'products', ['is_archived'])

    # 3. Add is_archived to product_variants
    op.add_column(
        'product_variants',
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
    )
    op.create_index('ix_product_variants_is_archived', 'product_variants', ['is_archived'])

    # 4. Create inventory_movements append-only ledger table
    op.create_table(
        'inventory_movements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('inventory_item_id', sa.UUID(), nullable=False),
        sa.Column('variant_id', sa.UUID(), nullable=False),
        sa.Column('movement_type', inventory_movement_type_enum, nullable=False),
        sa.Column('quantity_delta', sa.Integer(), nullable=False),
        sa.Column('quantity_on_hand_after', sa.Integer(), nullable=False),
        sa.Column('quantity_reserved_after', sa.Integer(), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('created_by_user_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['inventory_item_id'], ['inventory_items.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_inventory_movements_inventory_item_id', 'inventory_movements', ['inventory_item_id'])
    op.create_index('ix_inventory_movements_variant_id', 'inventory_movements', ['variant_id'])
    op.create_index('ix_inventory_movements_created_at', 'inventory_movements', ['created_at'])
    op.create_index('ix_inventory_movements_reference_id', 'inventory_movements', ['reference_id'])


def downgrade() -> None:
    # 1. Drop inventory_movements
    op.drop_index('ix_inventory_movements_reference_id', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_created_at', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_variant_id', table_name='inventory_movements')
    op.drop_index('ix_inventory_movements_inventory_item_id', table_name='inventory_movements')
    op.drop_table('inventory_movements')

    # 2. Drop columns from product_variants
    op.drop_index('ix_product_variants_is_archived', table_name='product_variants')
    op.drop_column('product_variants', 'is_archived')

    # 3. Drop columns from products
    op.drop_index('ix_products_is_archived', table_name='products')
    op.drop_column('products', 'is_archived')

    # 4. Drop movement type enum
    inventory_movement_type_enum.drop(op.get_bind(), checkfirst=True)

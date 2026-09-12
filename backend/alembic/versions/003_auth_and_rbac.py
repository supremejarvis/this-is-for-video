"""Create users, user_sessions, auth_audit_logs, and user_role_enum.

Revision ID: 003_auth_and_rbac
Revises: 002_quote_enhancements
Create Date: 2026-09-05 10:45:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '003_auth_and_rbac'
down_revision: str | None = '002_quote_enhancements'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role_enum = postgresql.ENUM(
    'OWNER',
    'CATALOG_MANAGER',
    'INVENTORY_MANAGER',
    'ORDER_OPERATIONS',
    'FINANCE',
    'SUPPORT',
    'AUDITOR',
    name='user_role_enum',
    create_type=False,
)


def upgrade() -> None:
    # 1. Create enum
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', user_role_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('mfa_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('mfa_secret', sa.String(length=255), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)

    # 3. Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('session_token_hash', sa.String(length=64), nullable=False),
        sa.Column('csrf_token_hash', sa.String(length=64), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('absolute_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('idle_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], unique=False)
    op.create_index('uq_user_sessions_token_hash', 'user_sessions', ['session_token_hash'], unique=True)
    op.create_index('ix_user_sessions_active', 'user_sessions', ['revoked_at', 'absolute_expires_at', 'idle_expires_at'], unique=False)

    # 4. Create auth_audit_logs table
    op.create_table(
        'auth_audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('email_attempted', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_auth_audit_logs_user_id', 'auth_audit_logs', ['user_id'], unique=False)
    op.create_index('ix_auth_audit_logs_email_attempted', 'auth_audit_logs', ['email_attempted'], unique=False)
    op.create_index('ix_auth_audit_logs_event_type', 'auth_audit_logs', ['event_type'], unique=False)
    op.create_index('ix_auth_audit_logs_ip_address', 'auth_audit_logs', ['ip_address'], unique=False)
    op.create_index('ix_auth_audit_logs_created_at', 'auth_audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('auth_audit_logs')
    op.drop_table('user_sessions')
    op.drop_table('users')
    user_role_enum.drop(op.get_bind(), checkfirst=True)

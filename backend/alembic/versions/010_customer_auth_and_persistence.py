"""Customer authentication, verified identifiers, customer profiles, addresses, and consent records.

Revision ID: 010_customer_auth_and_persistence
Revises: 009_admin_enterprise_system
Create Date: 2026-09-20 17:15:00.000000
"""
from collections.abc import Sequence
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010_customer_auth_and_persistence"
down_revision: str | None = "009_admin_enterprise_system"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON

    # 1. PostgreSQL Enums
    if is_postgres:
        op.execute(
            """
            DO $$ BEGIN
                CREATE TYPE otp_status_enum AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'EXHAUSTED');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
        op.execute(
            """
            DO $$ BEGIN
                CREATE TYPE customer_account_type_enum AS ENUM ('B2C', 'B2B');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
            """
        )

    otp_status_type = (
        sa.Enum("PENDING", "CONSUMED", "EXPIRED", "EXHAUSTED", name="otp_status_enum", create_type=False)
        if is_postgres
        else sa.String(20)
    )
    customer_account_type = (
        sa.Enum("B2C", "B2B", name="customer_account_type_enum", create_type=False)
        if is_postgres
        else sa.String(10)
    )

    # 2. otp_challenges
    op.create_table(
        "otp_challenges",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("identifier", sa.String(32), nullable=False),
        sa.Column("purpose", sa.String(50), nullable=False, server_default="CUSTOMER_LOGIN"),
        sa.Column("verifier_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts_remaining", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", otp_status_type, nullable=False, server_default="PENDING"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_otp_challenges_identifier", "otp_challenges", ["identifier"])
    op.create_index("ix_otp_challenges_ident_status", "otp_challenges", ["identifier", "status"])
    op.create_index("ix_otp_challenges_expiry", "otp_challenges", ["expires_at"])

    # 3. verified_identifiers
    op.create_table(
        "verified_identifiers",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("identifier_type", sa.String(20), nullable=False),
        sa.Column("normalized_identifier", sa.String(255), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("identifier_type", "normalized_identifier", name="uq_verified_identifier"),
    )
    op.create_index("ix_verified_identifiers_user_id", "verified_identifiers", ["user_id"])
    op.create_index("ix_verified_identifiers_lookup", "verified_identifiers", ["identifier_type", "normalized_identifier"])

    # 4. customer_profiles
    op.create_table(
        "customer_profiles",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("pan", sa.String(20), nullable=True),
        sa.Column("account_type", customer_account_type, nullable=False, server_default="B2C"),
        sa.Column("kyc_status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("default_shipping_address_id", uuid_type, nullable=True),
        sa.Column("default_billing_address_id", uuid_type, nullable=True),
        sa.Column("metadata_json", json_type, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_profiles_user_id", "customer_profiles", ["user_id"], unique=True)
    op.create_index("ix_customer_profiles_email", "customer_profiles", ["email"])
    op.create_index("ix_customer_profiles_phone", "customer_profiles", ["phone"])
    op.create_index("ix_customer_profiles_gstin", "customer_profiles", ["gstin"])

    # 5. customer_addresses
    op.create_table(
        "customer_addresses",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("address_type", sa.String(20), nullable=False, server_default="HOME"),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("flat_building", sa.String(255), nullable=False),
        sa.Column("street_area", sa.String(255), nullable=False),
        sa.Column("landmark", sa.String(255), nullable=True),
        sa.Column("pincode", sa.String(10), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("state_code", sa.String(10), nullable=False),
        sa.Column("post_office_name", sa.String(150), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0" if not is_postgres else "false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customer_addresses_user_id", "customer_addresses", ["user_id"])
    op.create_index("ix_customer_addresses_pincode", "customer_addresses", ["pincode"])
    op.create_index("ix_customer_addresses_user_default", "customer_addresses", ["user_id", "is_default"])

    # 6. consent_records
    op.create_table(
        "consent_records",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("terms_version", sa.String(50), nullable=False),
        sa.Column("privacy_version", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_consent_records_user_id", "consent_records", ["user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.drop_table("consent_records")
    op.drop_table("customer_addresses")
    op.drop_table("customer_profiles")
    op.drop_table("verified_identifiers")
    op.drop_table("otp_challenges")

    if is_postgres:
        op.execute("DROP TYPE IF EXISTS customer_account_type_enum CASCADE;")
        op.execute("DROP TYPE IF EXISTS otp_status_enum CASCADE;")

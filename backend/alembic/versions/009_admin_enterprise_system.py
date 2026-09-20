"""Enterprise Admin and Seller System Schema Evolution.

Revision ID: 009_admin_enterprise_system
Revises: 008_order_customer
Create Date: 2026-09-20 10:30:00.000000
"""
from collections.abc import Sequence
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009_admin_enterprise_system"
down_revision: str | None = "008_order_customer"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON

    # 1. Enums (PostgreSQL only)
    if is_postgres:
        op.execute("DO $$ BEGIN CREATE TYPE membership_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE category_status_enum AS ENUM ('ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE attribute_data_type_enum AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'SELECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE media_status_enum AS ENUM ('UPLOADED', 'READY', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE price_list_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE tax_profile_status_enum AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE warehouse_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE transfer_status_enum AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE stock_count_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'RECONCILED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE saga_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'COMPENSATING', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE saga_step_status_enum AS ENUM ('PENDING', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'COMPENSATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE background_job_status_enum AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE carrier_status_enum AS ENUM ('ACTIVE', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE return_status_enum AS ENUM ('REQUESTED', 'EVIDENCE_SUBMITTED', 'INSPECTION_PENDING', 'APPROVED', 'REJECTED', 'RETURN_IN_TRANSIT', 'RECEIVED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE item_disposition_enum AS ENUM ('RESTOCK_INVENTORY', 'SCRAP_DEFECTIVE', 'REFURBISH'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE fiscal_period_status_enum AS ENUM ('OPEN', 'LOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE account_type_enum AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE invoice_status_enum AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'VOID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
        op.execute("DO $$ BEGIN CREATE TYPE journal_entry_status_enum AS ENUM ('DRAFT', 'POSTED', 'REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")

    # 2. Companies & Tenancy
    op.create_table(
        "companies",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("legal_name", sa.String(255), nullable=False),
        sa.Column("trade_name", sa.String(255), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="Asia/Kolkata"),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("pan", sa.String(20), nullable=True),
        sa.Column("fiscal_config", json_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_companies_gstin", "companies", ["gstin"])

    # Seed Default Single Company
    op.execute(
        "INSERT INTO companies (id, legal_name, trade_name, currency, timezone, gstin, pan, fiscal_config, is_active, created_at, updated_at) "
        "VALUES ('00000000-0000-0000-0000-000000000001', 'Apollo Engineering Private Limited', 'APE Store', 'INR', 'Asia/Kolkata', '24AAACA0000A1Z5', 'AAACA0000A', '{\"fy_start_month\": 4, \"fy_start_day\": 1}', true, NOW(), NOW()) "
        "ON CONFLICT (id) DO NOTHING;"
    )

    op.create_table(
        "company_memberships",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_company_memberships_company", "company_memberships", ["company_id"])
    op.create_index("ix_company_memberships_user", "company_memberships", ["user_id"])
    op.create_index("uq_company_membership_user", "company_memberships", ["company_id", "user_id"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("code", sa.String(100), unique=True, nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("permission_id", uuid_type, sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("uq_role_permission", "role_permissions", ["role", "permission_id"], unique=True)

    op.create_table(
        "approval_requests",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(100), nullable=False),
        sa.Column("requested_by", uuid_type, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("approved_by", uuid_type, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("rejection_reason", sa.String(255), nullable=True),
        sa.Column("payload_snapshot", json_type, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_approval_requests_company", "approval_requests", ["company_id"])
    op.create_index("ix_approval_requests_status", "approval_requests", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("actor_id", uuid_type, nullable=True),
        sa.Column("actor_email", sa.String(255), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=False),
        sa.Column("redacted_before", json_type, nullable=True),
        sa.Column("redacted_after", json_type, nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_company", "audit_logs", ["company_id"])
    op.create_index("ix_audit_logs_occurred_at", "audit_logs", ["occurred_at"])

    # 3. Categories & Attribute Axes
    op.create_table(
        "categories",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("parent_id", uuid_type, sa.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_category_company_slug", "categories", ["company_id", "slug"], unique=True)

    op.create_table(
        "attributes",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("data_type", sa.String(20), nullable=False, server_default="SELECT"),
        sa.Column("unit", sa.String(20), nullable=True),
        sa.Column("is_variant_axis", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_attribute_company_code", "attributes", ["company_id", "code"], unique=True)

    op.create_table(
        "attribute_values",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("attribute_id", uuid_type, sa.ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("normalized_value", sa.String(100), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("uq_attribute_normalized_value", "attribute_values", ["attribute_id", "normalized_value"], unique=True)

    op.create_table(
        "product_attributes",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("product_id", uuid_type, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attribute_id", uuid_type, sa.ForeignKey("attributes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_variant_axis", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("uq_product_attribute", "product_attributes", ["product_id", "attribute_id"], unique=True)

    op.create_table(
        "product_option_values",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("product_id", uuid_type, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attribute_id", uuid_type, sa.ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value_id", uuid_type, sa.ForeignKey("attribute_values.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("uq_product_option_val", "product_option_values", ["product_id", "attribute_id", "value_id"], unique=True)

    op.create_table(
        "variant_options",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attribute_id", uuid_type, sa.ForeignKey("attributes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("value_id", uuid_type, sa.ForeignKey("attribute_values.id", ondelete="RESTRICT"), nullable=False),
    )
    op.create_index("uq_variant_option_axis", "variant_options", ["variant_id", "attribute_id"], unique=True)

    op.create_table(
        "media_assets",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("storage_key", sa.String(255), unique=True, nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="READY"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "product_media",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("product_id", uuid_type, sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", uuid_type, sa.ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("alt_text", sa.String(255), nullable=True),
    )
    op.create_index("uq_product_media_asset", "product_media", ["product_id", "asset_id"], unique=True)

    op.create_table(
        "variant_media",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", uuid_type, sa.ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("uq_variant_media_asset", "variant_media", ["variant_id", "asset_id"], unique=True)

    op.create_table(
        "bundle_components",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("bundle_variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("component_variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("uq_bundle_component", "bundle_components", ["bundle_variant_id", "component_variant_id"], unique=True)

    # 4. Pricing Lists, Rules, Customer Groups & Tax
    op.create_table(
        "customer_groups",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
    )
    op.create_index("uq_customer_group_code", "customer_groups", ["company_id", "code"], unique=True)

    op.create_table(
        "price_lists",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("customer_group_id", uuid_type, sa.ForeignKey("customer_groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_price_list_company_name", "price_lists", ["company_id", "name"], unique=True)

    op.create_table(
        "price_rules",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("price_list_id", uuid_type, sa.ForeignKey("price_lists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("min_qty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("max_qty_exclusive", sa.Integer(), nullable=True),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("price_basis", sa.String(20), nullable=False, server_default="PER_UNIT"),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_price_rules_variant", "price_rules", ["variant_id"])

    op.create_table(
        "tax_profiles",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("hsn_code", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_tax_profile_company_name", "tax_profiles", ["company_id", "name"], unique=True)

    op.create_table(
        "tax_rules",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("tax_profile_id", uuid_type, sa.ForeignKey("tax_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("jurisdiction", sa.String(50), nullable=False, server_default="IN"),
        sa.Column("component", sa.String(20), nullable=False),
        sa.Column("rate", sa.Numeric(6, 4), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    op.create_table(
        "pricing_policy_versions",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("cod_surcharge_rate", sa.Numeric(6, 4), nullable=False, server_default="0.0250"),
        sa.Column("cod_rounding_multiple", sa.Numeric(6, 2), nullable=False, server_default="1.00"),
        sa.Column("shipping_gst_rate", sa.Numeric(6, 4), nullable=False, server_default="0.1800"),
        sa.Column("approved_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "price_overrides",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("quote_or_order_id", uuid_type, nullable=False),
        sa.Column("order_item_id", uuid_type, nullable=True),
        sa.Column("actor_id", uuid_type, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("approval_id", uuid_type, sa.ForeignKey("approval_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("original_unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("override_unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 5. Warehouses & Physical Inventory Items
    op.create_table(
        "warehouses",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("pincode", sa.String(6), nullable=False, server_default="382430"),
        sa.Column("city", sa.String(100), nullable=False, server_default="Ahmedabad"),
        sa.Column("state", sa.String(100), nullable=False, server_default="Gujarat"),
        sa.Column("address_line", sa.String(255), nullable=False, server_default="Plot 108, Kathwada GIDC"),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_warehouse_company_code", "warehouses", ["company_id", "code"], unique=True)

    # Seed Default Warehouse
    op.execute(
        "INSERT INTO warehouses (id, company_id, code, name, pincode, city, state, address_line, status, is_default, created_at) "
        "VALUES ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'KATHWADA_GIDC_MAIN', 'Kathwada GIDC Central Hub', '382430', 'Ahmedabad', 'Gujarat', 'Plot 108, Kathwada GIDC, Odhav Industrial Zone', 'ACTIVE', true, NOW()) "
        "ON CONFLICT (id) DO NOTHING;"
    )

    op.create_table(
        "stock_items",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("warehouse_id", uuid_type, sa.ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("location_code", sa.String(50), nullable=True),
        sa.Column("on_hand", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reserved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quarantined", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_stock_item_variant_warehouse", "stock_items", ["variant_id", "warehouse_id"], unique=True)

    op.create_table(
        "stock_transfers",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("from_warehouse_id", uuid_type, sa.ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("to_warehouse_id", uuid_type, sa.ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "transfer_items",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("transfer_id", uuid_type, sa.ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("variant_id", uuid_type, sa.ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )

    op.create_table(
        "stock_counts",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("warehouse_id", uuid_type, sa.ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PLANNED"),
        sa.Column("count_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("approved_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    op.create_table(
        "stock_count_items",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("stock_count_id", uuid_type, sa.ForeignKey("stock_counts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stock_item_id", uuid_type, sa.ForeignKey("stock_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("expected_qty", sa.Integer(), nullable=False),
        sa.Column("counted_qty", sa.Integer(), nullable=True),
        sa.Column("variance", sa.Integer(), nullable=True),
    )

    # 6. Saga State Machine, Inbox & Jobs
    op.create_table(
        "saga_instances",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("order_id", uuid_type, sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("state", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("current_step", sa.String(50), nullable=False, server_default="CALCULATING_QUOTE"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "saga_steps",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("saga_id", uuid_type, sa.ForeignKey("saga_instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_name", sa.String(50), nullable=False),
        sa.Column("command_id", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result_reference", sa.String(255), nullable=True),
        sa.Column("payload_snapshot", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_saga_step_order", "saga_steps", ["saga_id", "step_name"], unique=True)

    op.create_table(
        "inbox_events",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("consumer_name", sa.String(100), nullable=False),
        sa.Column("event_id", uuid_type, nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_inbox_consumer_event", "inbox_events", ["consumer_name", "event_id"], unique=True)

    op.create_table(
        "idempotency_records",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("actor_scope", sa.String(50), nullable=False),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="IN_PROGRESS"),
        sa.Column("response_code", sa.Integer(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_idempotency_company_key", "idempotency_records", ["company_id", "actor_scope", "operation", "key"], unique=True)

    op.create_table(
        "background_jobs",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="QUEUED"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result_reference", sa.String(500), nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 7. Logistics Carriers, Packages, Tracking & Returns
    op.create_table(
        "carriers",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_carrier_company_code", "carriers", ["company_id", "code"], unique=True)

    op.create_table(
        "shipping_rate_cards",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("carrier_id", uuid_type, sa.ForeignKey("carriers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "shipping_rate_slabs",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("rate_card_id", uuid_type, sa.ForeignKey("shipping_rate_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zone", sa.String(50), nullable=False, server_default="LOCAL"),
        sa.Column("min_weight_g", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_weight_g", sa.Integer(), nullable=False),
        sa.Column("base_charge", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "packages",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("shipment_id", uuid_type, sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("package_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("actual_weight_g", sa.Integer(), nullable=False),
        sa.Column("length_mm", sa.Integer(), nullable=False),
        sa.Column("width_mm", sa.Integer(), nullable=False),
        sa.Column("height_mm", sa.Integer(), nullable=False),
        sa.Column("chargeable_weight_g", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "shipment_items",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("shipment_id", uuid_type, sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("package_id", uuid_type, sa.ForeignKey("packages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_item_id", uuid_type, sa.ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )

    op.create_table(
        "tracking_events",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("shipment_id", uuid_type, sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_event_id", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("provider_occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("payload_hash", sa.String(64), nullable=False),
    )

    op.create_table(
        "returns",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("order_id", uuid_type, sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="REQUESTED"),
        sa.Column("caliper_photo_url", sa.String(), nullable=True),
        sa.Column("verified_frame_thickness_mm", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "return_items",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("return_id", uuid_type, sa.ForeignKey("returns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_item_id", uuid_type, sa.ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("requested_qty", sa.Integer(), nullable=False),
        sa.Column("received_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("disposition", sa.String(30), nullable=False, server_default="RESTOCK_INVENTORY"),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inspector_id", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    # 8. Statutory Accounting, General Ledger & Invoices
    op.create_table(
        "fiscal_periods",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_fiscal_period_dates", "fiscal_periods", ["company_id", "start_date", "end_date"], unique=True)

    # Seed Default Current Fiscal Period
    op.execute(
        "INSERT INTO fiscal_periods (id, company_id, name, start_date, end_date, status, created_at) "
        "VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'FY 2026-2027 Annual', '2026-04-01', '2027-03-31', 'OPEN', NOW()) "
        "ON CONFLICT (id) DO NOTHING;"
    )

    op.create_table(
        "accounts",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("account_type", sa.String(20), nullable=False),
        sa.Column("parent_id", uuid_type, sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("normal_balance", sa.String(10), nullable=False, server_default="DEBIT"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_account_company_code", "accounts", ["company_id", "code"], unique=True)

    # Seed Standard COA Accounts
    accounts_seed = [
        ("1010", "HDFC Bank Operating Account", "ASSET", "DEBIT"),
        ("1020", "Razorpay Gateway Clearing", "ASSET", "DEBIT"),
        ("1030", "India Post COD Courier Clearing", "ASSET", "DEBIT"),
        ("1110", "Accounts Receivable", "ASSET", "DEBIT"),
        ("1210", "Finished Goods Inventory (SS304)", "ASSET", "DEBIT"),
        ("2010", "Accounts Payable (Suppliers)", "LIABILITY", "CREDIT"),
        ("2050", "Customer Advances", "LIABILITY", "CREDIT"),
        ("2110", "Output CGST Payable (9%)", "LIABILITY", "CREDIT"),
        ("2120", "Output SGST Payable (9%)", "LIABILITY", "CREDIT"),
        ("2130", "Output IGST Payable (18%)", "LIABILITY", "CREDIT"),
        ("4010", "Sales Revenue - Products", "REVENUE", "CREDIT"),
        ("4020", "Shipping & Handling Revenue", "REVENUE", "CREDIT"),
        ("4030", "COD Convenience Surcharge", "REVENUE", "CREDIT"),
        ("5010", "Cost of Goods Sold (COGS)", "EXPENSE", "DEBIT"),
        ("5020", "Freight & Courier Delivery Expense", "EXPENSE", "DEBIT"),
        ("5030", "Payment Gateway Transaction Fees", "EXPENSE", "DEBIT"),
    ]
    for code, name, ac_type, norm in accounts_seed:
        op.execute(
            f"INSERT INTO accounts (id, company_id, code, name, account_type, normal_balance, is_active, created_at) "
            f"VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{code}', '{name}', '{ac_type}', '{norm}', true, NOW()) "
            f"ON CONFLICT DO NOTHING;" if is_postgres else
            f"INSERT OR IGNORE INTO accounts (id, company_id, code, name, account_type, normal_balance, is_active, created_at) "
            f"VALUES ('{uuid_type}', '00000000-0000-0000-0000-000000000001', '{code}', '{name}', '{ac_type}', '{norm}', 1, CURRENT_TIMESTAMP);"
        )

    op.create_table(
        "invoices",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("order_id", uuid_type, sa.ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("series", sa.String(20), nullable=False, server_default="APE"),
        sa.Column("financial_year", sa.String(10), nullable=False, server_default="26-27"),
        sa.Column("invoice_number", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ISSUED"),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False),
        sa.Column("tax_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("shipping_total", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("grand_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("totals_snapshot", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_invoice_company_series_number", "invoices", ["company_id", "series", "financial_year", "invoice_number"], unique=True)
    op.create_index("ix_invoices_order_id", "invoices", ["order_id"])

    op.create_table(
        "invoice_lines",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("invoice_id", uuid_type, sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_item_id", uuid_type, sa.ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("taxable_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("cgst_rate", sa.Numeric(6, 4), nullable=False, server_default="0.0000"),
        sa.Column("cgst_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("sgst_rate", sa.Numeric(6, 4), nullable=False, server_default="0.0000"),
        sa.Column("sgst_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("igst_rate", sa.Numeric(6, 4), nullable=False, server_default="0.0000"),
        sa.Column("igst_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
    )

    op.create_table(
        "credit_notes",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("invoice_id", uuid_type, sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("credit_note_number", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ISSUED"),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_credit_note_number", "credit_notes", ["company_id", "credit_note_number"], unique=True)

    op.create_table(
        "credit_note_lines",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("credit_note_id", uuid_type, sa.ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_item_id", uuid_type, sa.ForeignKey("order_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
    )
    op.create_index("ix_credit_note_lines_note", "credit_note_lines", ["credit_note_id"])

    op.create_table(
        "journal_entries",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("posting_date", sa.Date(), nullable=False),
        sa.Column("period_id", uuid_type, sa.ForeignKey("fiscal_periods.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="POSTED"),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(100), nullable=False),
        sa.Column("posting_kind", sa.String(50), nullable=False, server_default="ORIGINAL"),
        sa.Column("reversal_of", uuid_type, sa.ForeignKey("journal_entries.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("posted_by", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("uq_journal_source_posting", "journal_entries", ["company_id", "source_type", "source_id", "posting_kind"], unique=True)

    op.create_table(
        "journal_lines",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("journal_entry_id", uuid_type, sa.ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", uuid_type, sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("debit", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("credit", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("customer_id", uuid_type, nullable=True),
        sa.Column("supplier_id", uuid_type, nullable=True),
        sa.Column("cost_center_id", sa.String(50), nullable=True),
    )
    op.create_index("ix_journal_lines_entry", "journal_lines", ["journal_entry_id"])
    op.create_index("ix_journal_lines_account", "journal_lines", ["account_id"])

    op.create_table(
        "payment_allocations",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("payment_id", uuid_type, sa.ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_id", uuid_type, sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("allocated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payment_allocations_payment", "payment_allocations", ["payment_id"])
    op.create_index("ix_payment_allocations_invoice", "payment_allocations", ["invoice_id"])

    op.create_table(
        "settlements",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("company_id", uuid_type, nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("settlement_id", sa.String(100), nullable=False),
        sa.Column("settlement_date", sa.Date(), nullable=False),
        sa.Column("gross_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("fee_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("tax_amount", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("net_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="RECONCILED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_settlement_provider_id", "settlements", ["provider", "settlement_id"], unique=True)


def downgrade() -> None:
    # Downgrade drops created tables in reverse dependency order
    op.drop_table("settlements")
    op.drop_table("payment_allocations")
    op.drop_table("journal_lines")
    op.drop_table("journal_entries")
    op.drop_table("credit_note_lines")
    op.drop_table("credit_notes")
    op.drop_table("invoice_lines")
    op.drop_table("invoices")
    op.drop_table("accounts")
    op.drop_table("fiscal_periods")
    op.drop_table("return_items")
    op.drop_table("returns")
    op.drop_table("tracking_events")
    op.drop_table("shipment_items")
    op.drop_table("packages")
    op.drop_table("shipping_rate_slabs")
    op.drop_table("shipping_rate_cards")
    op.drop_table("carriers")
    op.drop_table("background_jobs")
    op.drop_table("idempotency_records")
    op.drop_table("inbox_events")
    op.drop_table("saga_steps")
    op.drop_table("saga_instances")
    op.drop_table("stock_count_items")
    op.drop_table("stock_counts")
    op.drop_table("transfer_items")
    op.drop_table("stock_transfers")
    op.drop_table("stock_items")
    op.drop_table("warehouses")
    op.drop_table("price_overrides")
    op.drop_table("pricing_policy_versions")
    op.drop_table("tax_rules")
    op.drop_table("tax_profiles")
    op.drop_table("price_rules")
    op.drop_table("price_lists")
    op.drop_table("customer_groups")
    op.drop_table("bundle_components")
    op.drop_table("variant_media")
    op.drop_table("product_media")
    op.drop_table("media_assets")
    op.drop_table("variant_options")
    op.drop_table("product_option_values")
    op.drop_table("product_attributes")
    op.drop_table("attribute_values")
    op.drop_table("attributes")
    op.drop_table("categories")
    op.drop_table("audit_logs")
    op.drop_table("approval_requests")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("company_memberships")
    op.drop_table("companies")

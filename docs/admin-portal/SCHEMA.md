# 🗄️ Apollo Engineering Database Schema Contract

**Database Engine:** PostgreSQL 16  
**Dialect:** `postgresql+asyncpg` / `postgresql+psycopg`  
**Schema:** `public`  
**Tenant Scoping:** Scoped by `company_id` (Composite isolation)  

---

## 1. Conventions & Invariant Principles

1. **Identifiers**: UUID primary keys generated server-side using `gen_random_uuid()` or `uuid.uuid4()`.
2. **Timestamps**: All timestamps stored as `timestamptz` in UTC. Business dates stored as `DATE` interpreted in `Asia/Kolkata`.
3. **Monetary Precision**: Stored as `NUMERIC(14, 2)`. Decimal strings passed in API contracts to prevent IEEE-754 float drift.
4. **GST Tax Rates**: Stored as `NUMERIC(6, 4)` (e.g., `0.1800` for 18%, `0.0900` for 9%).
5. **Quantities**: Discrete units stored as `INTEGER`. Fractional units (if configured) use `NUMERIC(10, 3)`.
6. **Immutability & Retention**:
   * Financial transactions (`invoices`, `journal_entries`, `journal_lines`) and stock ledgers (`inventory_movements`) cannot be deleted.
   * Corrections require linked reversals (`posting_kind = 'REVERSAL'`).

---

## 2. Table Specifications by Domain

### 2.1 Identity & Governance

#### `companies`

| Column | Type | Nullable | Default / Constraint | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | UUID | NO | PK | Company identifier |
| `legal_name` | VARCHAR(255) | NO | | Legal registered corporate entity name |
| `trade_name` | VARCHAR(255) | YES | | Doing-business-as brand name |
| `currency` | VARCHAR(3) | NO | `'INR'` | Operating base currency |
| `timezone` | VARCHAR(50) | NO | `'Asia/Kolkata'` | Operating timezone |
| `gstin` | VARCHAR(20) | YES | | 15-character statutory GSTIN |
| `pan` | VARCHAR(20) | YES | | 10-character Income Tax PAN |
| `fiscal_config`| JSONB | NO | | Fiscal year boundary configuration |
| `is_active` | BOOLEAN | NO | `TRUE` | Entity activation status |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Last modification timestamp |

#### `company_memberships`

| Column | Type | Nullable | Default / Constraint | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | UUID | NO | PK | Membership identifier |
| `company_id` | UUID | NO | FK -> `companies.id` | Scoped company |
| `user_id` | UUID | NO | FK -> `users.id` | User account |
| `status` | VARCHAR(20) | NO | `'ACTIVE'` | Membership state |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Joined timestamp |

* **Constraint**: `UNIQUE (company_id, user_id)`

#### `approval_requests`

| Column | Type | Nullable | Default / Constraint | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | UUID | NO | PK | Approval request identifier |
| `company_id` | UUID | NO | FK -> `companies.id` | Scoped company |
| `action` | VARCHAR(100) | NO | | Requested action code |
| `resource_id`| VARCHAR(100) | NO | | Target entity ID |
| `requested_by`| UUID | NO | FK -> `users.id` | Requester user |
| `approved_by`| UUID | YES | FK -> `users.id` | Approving user (`!= requested_by`) |
| `status` | VARCHAR(20) | NO | `'PENDING'` | PENDING, APPROVED, REJECTED |
| `reason` | VARCHAR(255) | NO | | Justification for action |
| `version` | INTEGER | NO | `1` | Optimistic locking version |

#### `audit_logs`

| Column | Type | Nullable | Default / Constraint | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | UUID | NO | PK | Audit record identifier |
| `company_id` | UUID | NO | | Scoped company |
| `actor_id` | UUID | YES | | Executing user identifier |
| `action` | VARCHAR(100) | NO | | Action executed |
| `entity_type`| VARCHAR(100) | NO | | Entity modified |
| `entity_id` | VARCHAR(100) | NO | | Primary key of modified entity |
| `redacted_before` | JSONB | YES | | Sanitized pre-change snapshot |
| `redacted_after` | JSONB | YES | | Sanitized post-change snapshot |
| `occurred_at`| TIMESTAMPTZ | NO | `NOW()` | Timestamp |

---

### 2.2 Catalog & Advanced Variants

#### `categories`

| Column | Type | Nullable | Default / Constraint | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | UUID | NO | PK | Category identifier |
| `company_id` | UUID | NO | | Scoped company |
| `parent_id` | UUID | YES | FK -> `categories.id` | Hierarchical parent category |
| `name` | VARCHAR(100) | NO | | Category name |
| `slug` | VARCHAR(100) | NO | | URL slug |

* **Constraint**: `UNIQUE (company_id, slug)`

#### `attributes` & `attribute_values`

* `attributes`: `(id, company_id, code, label, data_type, unit, is_variant_axis)`
* `attribute_values`: `(id, attribute_id, normalized_value, label, sort_order)`
* `variant_options`: `(id, variant_id, attribute_id, value_id)`
  * **Constraint**: `UNIQUE (variant_id, attribute_id)` ensures exactly one value per variant axis.

---

### 2.3 Pricing & Tax Configuration

#### `price_lists` & `price_rules`

* `price_lists`: `(id, company_id, customer_group_id, name, currency, priority, status, is_default)`
* `price_rules`: `(id, price_list_id, variant_id, min_qty, max_qty_exclusive, unit_price, price_basis, valid_from, valid_to, version)`
  * **Constraints**:
    * `unit_price >= 0.00`
    * `min_qty >= 1`
    * `max_qty_exclusive IS NULL OR max_qty_exclusive > min_qty`

#### `tax_profiles` & `tax_rules`

* `tax_profiles`: `(id, company_id, name, hsn_code, status)`
* `tax_rules`: `(id, tax_profile_id, jurisdiction, component, rate, effective_from, effective_to)`
  * **Constraint**: `rate >= 0.0000 AND rate <= 0.4000`

---

### 2.4 Warehouses & Physical Inventory

#### `warehouses`

* `(id, company_id, code, name, pincode, city, state, address_line, status, is_default)`
  * Default seeded: `KATHWADA_GIDC_MAIN` (Pincode `382430`, Ahmedabad, Gujarat).

#### `stock_items`

* `(id, company_id, variant_id, warehouse_id, location_code, on_hand, reserved, quarantined, version)`
  * **Constraints**:
    * `on_hand >= 0`
    * `reserved >= 0`
    * `quarantined >= 0`
    * `on_hand >= (reserved + quarantined)`
    * `UNIQUE (variant_id, warehouse_id)`

---

### 2.5 Double-Entry Accounting

#### `journal_entries` & `journal_lines`

* `journal_entries`: `(id, company_id, posting_date, period_id, status, source_type, source_id, posting_kind, reversal_of, description, posted_at, posted_by)`
  * **Constraint Trigger**: `trg_check_journal_balance` enforces $\sum \text{debit} = \sum \text{credit}$ when `status = 'POSTED'`.
* `journal_lines`: `(id, journal_entry_id, account_id, debit, credit, currency, customer_id, supplier_id, cost_center_id)`
  * **Constraint**: `(debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)` (One-sided line rule).
  * **Trigger**: `trg_prevent_posted_line_edit` forbids edits or deletions once parent journal is `POSTED`.

#### `invoices` & `invoice_lines`

* `invoices`: `(id, company_id, order_id, series, financial_year, invoice_number, status, issue_date, due_date, currency, subtotal, tax_total, shipping_total, grand_total, totals_snapshot)`
  * **Constraint**: `UNIQUE (company_id, series, financial_year, invoice_number)` prevents gapless duplicate numbering.
* `invoice_lines`: `(id, invoice_id, order_item_id, quantity, unit_price, taxable_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, line_total)`

---
wave: 1
depends_on: []
files_modified:
  - backend/app/main.py
  - backend/app/core/config.py
  - backend/app/core/database.py
  - backend/app/core/security.py
  - backend/app/models/__init__.py
  - backend/app/models/product.py
  - backend/app/models/price.py
  - backend/app/models/inventory.py
  - backend/app/models/order.py
  - backend/app/models/auth.py
  - backend/app/models/quote.py
  - backend/app/models/outbox.py
  - backend/app/schemas/__init__.py
  - backend/app/schemas/product.py
  - backend/app/schemas/pricing.py
  - backend/app/schemas/order.py
  - backend/app/schemas/auth.py
  - backend/app/schemas/inventory.py
  - backend/app/schemas/otp.py
  - backend/app/schemas/quote.py
  - backend/app/api/v1/api.py
  - backend/app/api/v1/endpoints/auth.py
  - backend/app/api/v1/endpoints/otp.py
  - backend/app/api/v1/endpoints/users.py
  - backend/app/api/v1/endpoints/products.py
  - backend/app/api/v1/endpoints/pricing.py
  - backend/app/api/v1/endpoints/inventory.py
  - backend/app/api/v1/endpoints/orders.py
  - backend/app/api/v1/endpoints/payments.py
  - backend/app/api/v1/endpoints/quotes.py
  - backend/app/api/v1/endpoints/health.py
  - backend/app/services/pricing.py
  - backend/app/services/auth_service.py
  - backend/app/services/otp_service.py
  - backend/app/services/catalog_service.py
  - backend/app/services/inventory.py
  - backend/app/services/order_state.py
  - backend/app/services/shipping_service.py
  - backend/app/services/quote_service.py
  - backend/app/services/outbox.py
  - backend/app/cli/seed_owner.py
  - backend/app/cli/seed_catalog.py
  - backend/alembic/env.py
  - backend/alembic/versions/001_initial_schema.py
  - backend/alembic/versions/002_quote_versions_and_idempotency.py
  - backend/alembic/versions/003_auth_and_rbac.py
  - backend/app/tests/test_pricing.py
  - backend/app/tests/test_auth.py
  - backend/app/tests/test_inventory.py
  - backend/app/tests/test_orders.py
  - backend/app/tests/test_shipping.py
  - backend/requirements.txt
  - backend/pyproject.toml
autonomous: true
---

# Phase 1 Plan: Authoritative FastAPI Backend Core, Decimal Money Engine & PostgreSQL Single Source of Truth

## Phase Overview
**Goal**: Build the authoritative Python FastAPI service and PostgreSQL single source of truth with mathematically exact Decimal money calculation, payment webhook safety, and India Post adapter.

**Status**: Substantially implemented — requires verification, test completion, and gap closure.

## Plan 01-01: Backend Scaffold & PostgreSQL Models ✅ IMPLEMENTED

### Tasks
- [x] **T01** FastAPI app with Pydantic v2, SQLAlchemy 2.0, asyncpg
  - **Files**: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/database.py`
  - **Verify**: `cd backend && python -c "from app.main import app; print('OK')"`

- [x] **T02** PostgreSQL models with UUID PKs, Decimal monetary columns
  - **Models**: Product, ProductVariant, PriceVersion, InventoryItem, Order, OrderItem, Payment, Shipment, ReplacementCase, User, WebhookEvent
  - **Files**: `backend/app/models/*.py`
  - **Verify**: `cd backend && python -c "from app.models import Product, Order; print('Models OK')"`

- [x] **T03** Alembic migrations (8 migrations applied)
  - **Files**: `backend/alembic/versions/001_initial_schema.py` through `008_order_address_and_customer_persistence.py`
  - **Verify**: `cd backend && alembic current`

- [x] **T04** Pydantic v2 schemas for all API contracts
  - **Files**: `backend/app/schemas/*.py`
  - **Verify**: `cd backend && python -c "from app.schemas import ProductCreate, OrderCalculationRequest; print('Schemas OK')"`

- [x] **T05** API router aggregation with versioned endpoints
  - **Files**: `backend/app/api/v1/api.py`, `backend/app/api/v1/endpoints/*.py`
  - **Verify**: `cd backend && python -c "from app.api.v1.api import api_router; print('Router OK')"`

### Acceptance Criteria
- FastAPI starts without errors
- All models import correctly
- Alembic shows head revision applied
- All schemas validate

---

## Plan 01-02: Decimal Money Engine & Boundary Tests ✅ IMPLEMENTED (Verification Needed)

### Tasks
- [x] **T06** Authoritative `PricingEngine` with `Decimal` arithmetic
  - **File**: `backend/app/services/pricing.py`
  - **Features**: B2C GST-inclusive, B2B GST-exclusive, Shipping GST 18%, COD 2.5% surcharge, admin rounding multiple
  - **Verify**: `cd backend && python -m pytest tests/test_pricing.py -v`

- [x] **T07** Pricing API endpoints (`/pricing/calculate`, `/checkout/summary`)
  - **File**: `backend/app/api/v1/endpoints/pricing.py`
  - **Verify**: `cd backend && python -m pytest tests/test_pricing_api.py -v` (if exists)

- [x] **T08** Boundary tests for every tax/fee formula
  - **Tests**: Zero amounts, max values, rounding edges, interstate vs intrastate
  - **Files**: `backend/app/tests/test_pricing.py` (verify coverage)
  - **Verify**: `cd backend && python -m pytest tests/test_pricing.py --cov=app.services.pricing --cov-report=term-missing`

### Remaining Verification
- [ ] **V01** Run full pricing test suite and confirm 100% precision
- [ ] **V02** Verify `NUMERIC(14,2)` columns used for all monetary fields in migrations
- [ ] **V03** Confirm frontend never computes authoritative totals (frontend uses estimates only)

---

## Plan 01-03: Payment Webhook Safety & Idempotency ✅ IMPLEMENTED (Verification Needed)

### Tasks
- [x] **T09** Razorpay webhook endpoint with HMAC SHA256 validation
  - **File**: `backend/app/api/v1/endpoints/payments.py` (webhook handler)
  - **Verify**: Raw body signature verification, idempotency key storage

- [x] **T10** Idempotent webhook processing via `WebhookEvent` table
  - **Model**: `backend/app/models/order.py` (WebhookEvent)
  - **Service**: `backend/app/services/outbox.py` (if used for webhook deduplication)

- [x] **T11** Payment state machine: `PENDING` → `AUTHORIZED` → `CAPTURED` / `FAILED`
  - **Model**: `PaymentStatus` enum in `backend/app/models/order.py`
  - **Verify**: Orders only transition to `PAID` after webhook verification

- [x] **T12** Direct UPI QR orders remain `PAYMENT_PENDING` until manual admin approval
  - **Verify**: No auto-confirmation logic for `provider="direct_upi"`

### Remaining Verification
- [ ] **V04** Test webhook signature validation with valid/invalid signatures
- [ ] **V05** Test duplicate webhook delivery (same event_id) — must not double-process
- [ ] **V06** Test payment failure flow — inventory release, order status rollback
- [ ] **V07** Verify `PAYMENT_PENDING` state for direct UPI orders in database

---

## Plan 01-04: India Post CEPT Adapter & Fallback Rates ⚠️ PARTIAL

### Tasks
- [x] **T13** Shipping provider interface (`ShippingProvider` protocol)
  - **File**: `backend/app/services/shipping_service.py`
  - **Verify**: Interface defines `calculate_rate`, `create_booking`, `track_shipment`

- [x] **T14** India Post CEPT adapter with Kathwada GIDC origin (382430)
  - **File**: `backend/app/services/shipping_service.py` (CEPTIndiaPostAdapter)
  - **Verify**: Uses official CEPT API endpoints, origin pincode 382430

- [ ] **T15** Domestic fallback rate table (distance zones × weight slabs)
  - **Status**: Need to verify implementation in `shipping_service.py`
  - **Verify**: Fallback activates when CEPT API unavailable

- [x] **T16** Shipping API endpoints (`/shipping/rates`, `/shipping/serviceability`, `/shipping/shipments`)
  - **File**: `backend/app/api/v1/endpoints/shipping.py` (if exists) or in orders/pricing
  - **Verify**: Endpoints return `ShippingRateResponse` with 18% shipping GST

### Remaining Implementation
- [ ] **V08** Verify CEPT adapter uses official API (not invented endpoints)
- [ ] **V09** Implement/test fallback rate table with zone/weight matrix
- [ ] **V10** Test shipping webhook handler for status updates
- [ ] **V11** Verify thermal label generation (LOG-04) — Phase 3 but foundation here

---

## Cross-Cutting Verification Tasks

### Security & Compliance
- [ ] **SEC-01** Verify no secrets in code (API keys, webhook secrets in env only)
- [ ] **SEC-02** Verify HTTPS enforcement, security headers middleware
- [ ] **SEC-03** Verify OTP rate limiting, JWT short expiry, refresh rotation
- [ ] **SEC-04** Verify SQL injection protection (SQLAlchemy ORM only)

### Database & Migrations
- [ ] **DB-01** Verify all monetary columns use `NUMERIC(14,2)` or integer paise
- [ ] **DB-02** Verify foreign key constraints, indexes on lookup columns
- [ ] **DB-03** Test migration up/down on clean database

### Test Coverage
- [ ] **TEST-01** Run full backend test suite: `cd backend && python -m pytest --cov=app --cov-report=term-missing`
- [ ] **TEST-02** Verify mutation testing: `cd backend && python -m mutmut run` (target >80%)
- [ ] **TEST-03** Verify type checking: `cd backend && python -m mypy app`

### Integration Verification
- [ ] **INT-01** Test full order flow: cart → pricing → payment → webhook → inventory deduct → shipment
- [ ] **INT-02** Test COD flow with rounding multiple (e.g., ₹5)
- [ ] **INT-03** Test B2B vs B2C GST mode switching
- [ ] **INT-04** Test concurrent order placement (stock reservation race conditions)

---

## Definition of Done for Phase 1

All success criteria from ROADMAP.md must be TRUE:

1. ✅ FastAPI backend runs with Pydantic v2 schemas and SQLAlchemy 2.0 ORM connected to PostgreSQL 16
2. ✅ Alembic migrations manage database schema; all monetary columns use exact integer `paise` or `NUMERIC(12, 2)`
3. ✅ Authoritative Decimal pricing engine calculates B2C inclusive GST, B2B exclusive GST, Shipping GST at 18%, Prepaid Total, and COD 2.5% surcharge rounded upward by admin rounding multiple
4. ⚠️ Pytest boundary and unit tests verify every financial calculation formula with 100% precision **(NEEDS VERIFICATION)**
5. ⚠️ Razorpay webhook handler validates `X-Razorpay-Signature` HMAC SHA256 and idempotently transitions orders to `PAID` **(NEEDS VERIFICATION)**
6. ✅ Direct UPI QR orders persist as `PAYMENT_PENDING` with no automated confirmation
7. ⚠️ India Post Speed Post adapter calculates rates using Kathwada GIDC origin (`382430`) with official CEPT contracts and domestic fallback rate tables **(FALLBACK RATES NEED VERIFICATION)**

---

## Next Steps

1. Run verification tasks V01-V11
2. Complete fallback rate table implementation if missing
3. Run full test suite and achieve coverage targets
4. Document any gaps found
5. Mark Phase 1 complete and proceed to Phase 2 (Next.js App Router migration)
# PRODUCTION API + WEBHOOK ACTIVATION REPORT

## Production Architecture

- **Frontend**: `https://apollo-web-three.vercel.app` (Vite + React 19 + TypeScript)
- **Backend**: `https://backend-ten-pi-57.vercel.app` (FastAPI + Python 3.13)
- **API Prefix**: `/api/v1` (proxied via Vercel rewrites)
- **Database**: PostgreSQL (local development) — **PRODUCTION DATABASE NOT CONFIGURED**

---

## PostgreSQL Status

**LOCAL: CONNECTED & MIGRATED**  
**PRODUCTION: NOT CONFIGURED (BLOCKED)**

- Local development database: `postgresql+asyncpg://postgres:Goal%40495@localhost:5432/apollo_ecommerce` ✅
- Alembic migrations: **CURRENT AT HEAD** (`008_order_customer`) ✅
- All 8 migrations applied: users, sessions, products, price_versions, quotes, quote_items, orders, order_items, order_addresses, payments, shipments, inventory, inventory_reservations, webhook_events ✅
- **Production Vercel backend uses same `DATABASE_URL` pointing to localhost** → Connection refused ❌

> **CRITICAL**: Production backend fails closed on all database-dependent endpoints because `DATABASE_URL` resolves to `localhost:5432` which does not exist in Vercel serverless environment.

---

## Migration Status

```
alembic current  →  008_order_customer (head)
alembic heads    →  008_order_customer (head)
alembic upgrade head  →  No changes (already at head)
```
All schema objects exist in local PostgreSQL. Production database does not exist.

---

## Environment Variable Matrix

| Variable | Classification | Local Status | Production Status |
|----------|---------------|--------------|-------------------|
| `DATABASE_URL` | REQUIRED | SET (localhost) | **MISSING** — points to localhost |
| `DATABASE_SYNC_URL` | REQUIRED | SET (localhost) | **MISSING** |
| `ENVIRONMENT` | REQUIRED | development | **NOT SET** (defaults to development) |
| `JWT_SECRET` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `RAZORPAY_KEY_ID` | REQUIRED | SET (live) | **NOT VERIFIED** in Vercel |
| `RAZORPAY_KEY_SECRET` | REQUIRED | SET (live) | **NOT VERIFIED** in Vercel |
| `RAZORPAY_WEBHOOK_SECRET` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `MSG91_AUTH_KEY` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `MSG91_TEMPLATE_ID` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `INDIA_POST_API_URL` | REQUIRED | SET (test) | **NOT VERIFIED** in Vercel |
| `INDIA_POST_USERNAME` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `INDIA_POST_PASSWORD` | REQUIRED | SET | **NOT VERIFIED** in Vercel |
| `ADMIN_INIT_EMAIL` | OPTIONAL | SET | **NOT VERIFIED** in Vercel |
| `ADMIN_INIT_PASSWORD` | OPTIONAL | SET | **NOT VERIFIED** in Vercel |
| `ADMIN_PASSWORD_HASH` | REQUIRED (prod) | NOT SET | **MISSING** |
| `ADMIN_TOTP_SECRET` | REQUIRED (prod) | NOT SET | **MISSING** |

> **OWNER VALUE REQUIRED**: Production PostgreSQL connection string (managed PostgreSQL: Neon, Supabase, Railway, etc.) must be provisioned and `DATABASE_URL`/`DATABASE_SYNC_URL` set in Vercel backend project environment variables.

---

## API Endpoint Matrix (Runtime Tested via `https://apollo-web-three.vercel.app/api/v1/`)

| Endpoint | Method | Auth | Runtime Status | Notes |
|----------|--------|------|----------------|-------|
| `/health` | GET | None | **ACTIVE** ✅ | 200 JSON |
| `/auth/login` | POST | None | **FAILED** ❌ | 500 DB connection refused |
| `/auth/admin-login` | POST | None | **FAILED** ❌ | 500 DB connection refused |
| `/auth/logout` | POST | Cookie | **NOT TESTED** | Requires auth |
| `/auth/me` | GET | Cookie | **ACTIVE** ✅ | 401 JSON (correct unauthenticated) |
| `/auth/csrf` | GET | Cookie | **NOT TESTED** | Requires auth |
| `/auth/otp/send` | POST | None | **ACTIVE** ✅ | 200 JSON, MSG91 works |
| `/auth/otp/verify` | POST | None | **ACTIVE** ✅ | 400 JSON on invalid OTP |
| `/quotes` | POST | Optional | **FAILED** ❌ | 500 DB connection refused |
| `/orders` | POST | Optional | **FAILED** ❌ | 500 DB connection refused |
| `/orders/{id}` | GET | Cookie | **FAILED** ❌ | 500 DB connection refused |
| `/orders` | GET | Cookie | **FAILED** ❌ | 500 DB connection refused |
| `/orders/{id}/status` | PATCH | Owner/Ops | **FAILED** ❌ | 500 DB connection refused |
| `/payments/razorpay/create-order` | POST | Optional | **FAILED** ❌ | 500 DB connection refused |
| `/payments/razorpay/verify` | POST | Optional | **FAILED** ❌ | 500 DB connection refused |
| `/payments/razorpay/webhook` | POST | HMAC | **ACTIVE** ✅ | 401 on invalid sig, endpoint exists |
| `/products` | GET | None | **FAILED** ❌ | 500 DB connection refused |
| `/products` | POST | Owner/Catalog | **FAILED** ❌ | 500 DB connection refused |
| `/products/{id}/variants` | POST | Owner/Catalog | **FAILED** ❌ | 500 DB connection refused |
| `/pricing/versions` | POST | Owner/Finance | **FAILED** ❌ | 500 DB connection refused |
| `/pricing/active` | GET | None | **FAILED** ❌ | 500 DB connection refused |
| `/pricing/calculate` | POST | None | **ACTIVE** ✅ | Stateless, Decimal math verified |
| `/inventory/items` | GET | Owner/Inv/Auditor | **AUTH REQUIRED** ✅ | 401 JSON (correct) |
| `/inventory/receipt` | POST | Owner/Inv | **FAILED** ❌ | 500 DB connection refused |
| `/inventory/adjustment` | POST | Owner/Inv | **FAILED** ❌ | 500 DB connection refused |

**Summary**: 8/25 endpoints **ACTIVE** (stateless or auth-gated), 17/25 **FAILED** (database connection refused)

---

## Authentication Status

- **Customer Login**: ❌ FAILED (DB connection)
- **Admin Login**: ❌ FAILED (DB connection)
- **Logout**: ⏸️ NOT TESTED (requires auth)
- **Current User (`/auth/me`)**: ✅ ACTIVE — returns 401 JSON correctly
- **CSRF Token**: ⏸️ NOT TESTED (requires auth)
- **Session Cookies**: ✅ HttpOnly, Secure, SameSite=lax configured in code
- **OTP Send/Verify**: ✅ ACTIVE — MSG91 integration working in production
- **Expired/Invalid Sessions**: ✅ Handled by middleware (returns 401)
- **Hardcoded Credentials**: ❌ None found
- **OWNER Auto-provisioning**: ✅ Only on startup if no OWNER exists and `ADMIN_INIT_PASSWORD` set
- **TOTP Bypass**: ❌ None — admin login requires both password AND TOTP
- **Client-controlled Role**: ❌ None — roles assigned server-side only

---

## MSG91 OTP Status

**FULLY ACTIVE AND VERIFIED** ✅

- `POST /api/v1/auth/otp/send` → 200, OTP dispatched via MSG91
- `POST /api/v1/auth/otp/verify` → 400 on invalid/expired OTP, attempt tracking works
- Server-side only: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` used in backend
- No secrets exposed to frontend
- Rate limiting: 30s cooldown returned in response
- Replay/reuse rejected (attempt counter decrements)
- Frontend proxy `/api/msg91/*` **REMOVED** (no obsolete routes found)

---

## Quote API Status

**BLOCKED** — Database connection required

- Server authority: Loads prices from PostgreSQL `PriceVersion` ✅ (code verified)
- Client price rejection: `ClientPriceRejectedError` implemented ✅
- Decimal math: `PricingEngine.calculate_order()` uses `Decimal` ✅
- Shipping calculation: Server-side via `ShippingService` ✅
- GST calculation: Server-side, line-total method ✅
- COD rules: Server-side (2.5% surcharge + rounding) ✅
- Immutable quote persistence: `Quote` + `QuoteItem` models ✅
- Quote expiry: 15-min TTL with injectable clock ✅
- **Production runtime: 500 (DB connection refused)**

---

## Order API Status

**BLOCKED** — Database connection required

- Quote validation: Expiry + price freshness (`PriceChangedError`) ✅
- PIN consistency: Quote destination vs shipping address ✅
- Customer persistence: `Order` + `OrderAddress` snapshot ✅
- Order items: Line-level GST breakdown stored ✅
- Shipment record: India Post, origin 382430 ✅
- Payment record: `Payment` model with provider tracking ✅
- Inventory reservation: `InventoryService.reserve_stock()` with row locks ✅
- Atomic transaction: Single commit/rollback ✅
- **Production runtime: 500 (DB connection refused)**

---

## Order Authorization / BOLA Status

**NOT TESTABLE** — Requires database

Code review confirms:
- `GET /orders/{id}` enforces BOLA check: `user_id` match OR staff role (`OWNER`, `ORDER_OPERATIONS`, `CATALOG_MANAGER`, `FINANCE`, `SUPPORT`, `AUDITOR`)
- Guest orders (`user_id` NULL) mask PII for unauthorized access
- Order listing restricted to user's orders or staff
- Staff roles properly scoped
- **No IDOR vulnerability in code**

---

## Product API Status

**BLOCKED** — Database connection required

- `GET /products`: Returns catalog with variants, stock, current price ✅ (code)
- `POST /products`: RBAC `OWNER`/`CATALOG_MANAGER` ✅
- `POST /products/{id}/variants`: Dynamic variants (28/30/33/35/40mm) ✅
- Optimistic locking via `If-Match` header / version field ✅
- Soft archive only (no hard delete) ✅
- **Production runtime: 500 (DB connection refused)**

---

## Pricing API Status

**PARTIALLY ACTIVE**

| Endpoint | Status |
|----------|--------|
| `POST /pricing/calculate` | ✅ ACTIVE — Stateless, Decimal math verified |
| `GET /pricing/active` | ❌ FAILED — Needs DB |
| `POST /pricing/versions` | ❌ FAILED — Needs DB |
| `GET /pricing/versions` | ❌ FAILED — Needs DB |

- PriceVersion temporal model: `valid_from`/`valid_to`, channel, MOQ tiers ✅
- GST rates per SKU/HSN configurable ✅
- Tax mode: `GST_INCLUSIVE` (B2C) / `GST_EXCLUSIVE` (B2B) ✅
- Shipping GST fixed 18% ✅
- COD rounding to nearest ₹5 ✅
- No frontend override possible ✅

---

## Inventory API Status

**BLOCKED** — Database connection required

- `GET /inventory/items`: 401 auth required ✅
- `POST /inventory/receipt`: Idempotency key, row locking ✅
- `POST /inventory/adjustment`: Audit ledger, idempotency ✅
- `GET /inventory/movements`: Immutable ledger ✅
- Reservation rollback on failed order: `InventoryService.reserve_stock()` in order transaction ✅
- No overselling: `SELECT FOR UPDATE` on inventory items ✅
- **Production runtime: 500 (DB connection refused)**

---

## India Post / Shipping API Status

**CONFIGURATION REQUIRED**

- `ShippingService.calculate_shipping()`: Falls back to rate table when CEPT unavailable ✅
- Production safeguard: `ShippingRateUnavailableError` raised if `ENVIRONMENT=production` and no live rate ✅
- CEPT credentials configured in local `.env`:
  - `INDIA_POST_API_URL=https://test.cept.gov.in/beextcustomer`
  - `INDIA_POST_USERNAME=1812232688`
  - `INDIA_POST_PASSWORD=Dop@1234`
  - `INDIA_POST_CUSTOMER_ID=9999265476`
  - `INDIA_POST_CONTRACT_ID=41636817`
  - `INDIA_POST_DROPOFF_OFFICE_ID=21260024`
- **Production credentials NOT VERIFIED in Vercel**
- Origin hub locked to Kathwada GIDC, Ahmedabad (382430) ✅

---

## Razorpay Create Order Status

**BLOCKED** — Database connection required

- Backend loads order from DB, derives amount from `order.total_payable` ✅
- Never trusts frontend amount ✅
- Currency units: INR → paise (×100) ✅
- Stores Razorpay order ID in `Payment.provider_payment_id` ✅
- Idempotency via `Payment` record per order ✅
- **Production runtime: 500 (DB connection refused)**

---

## Razorpay Verify Status

**BLOCKED** — Requires order + payment flow

- Server-side HMAC-SHA256 verification: `order_id|payment_id` ✅
- Timing-safe comparison: `hmac.compare_digest()` ✅
- On success: `PaymentStatus.CAPTURED`, `OrderStatus.CONFIRMED` ✅
- On invalid: `PaymentStatus.FAILED`, no order confirmation ✅
- Duplicate verification idempotent ✅

---

## Razorpay Webhook URL

**CONFIGURED IN CODE, REACHABLE IN PRODUCTION**

```
https://backend-ten-pi-57.vercel.app/api/v1/payments/razorpay/webhook
```
- Proxied via frontend: `https://apollo-web-three.vercel.app/api/v1/payments/razorpay/webhook` ✅
- Endpoint exists at runtime (tested) ✅

---

## Webhook Configuration Status

**PARTIALLY CONFIGURED — NEEDS RAZORPAY DASHBOARD SETUP**

- Endpoint implemented: `POST /api/v1/payments/razorpay/webhook` ✅
- Reads RAW body for HMAC ✅
- Reads `X-Razorpay-Signature` header ✅
- Verifies HMAC-SHA256 using `RAZORPAY_WEBHOOK_SECRET` ✅
- **Current code tries multiple secrets** (webhook secret + key secret fallback) — **NEEDS REFACTOR** for production to use dedicated webhook secret only
- Parses JSON only after signature validation ✅
- Idempotency: `WebhookEvent` table with unique `event_id` ✅
- Processes `payment.captured` → Order/Payment = CAPTURED/CONFIRMED ✅
- Processes `payment.failed` → Order/Payment = FAILED ✅
- Returns 2xx for processed/duplicate ✅
- No internal exception details exposed ✅
- **Razorpay Dashboard webhook URL NOT CONFIGURED** — Owner action required

---

## Webhook Secret Status

**SET IN LOCAL .env, NOT VERIFIED IN VERCEL**

- Local: `RAZORPAY_WEBHOOK_SECRET=whsec_apollo_webhook_secret_2026` ✅
- Production: **OWNER VALUE REQUIRED** in Vercel backend environment variables
- **CRITICAL**: Production code must use **only** `RAZORPAY_WEBHOOK_SECRET` (remove key secret fallback)

---

## Webhook Signature Test

**VERIFIED — INVALID SIGNATURE REJECTED**

```bash
curl -X POST https://apollo-web-three.vercel.app/api/v1/payments/razorpay/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: invalid" \
  -d '{"event": "payment.captured"}'
```
→ **401 Unauthorized** `{"detail":"Invalid webhook signature"}` ✅

---

## Invalid Signature Test

**VERIFIED — 401 RETURNED**

Same as above. Malformed JSON after valid signature would return 400.

---

## Duplicate Webhook / Idempotency Test

**CODE VERIFIED — NOT RUNTIME TESTED (NEEDS DB)**

- `WebhookEvent` table: unique `event_id` constraint ✅
- First delivery: INSERT + process → 200
- Second delivery: SELECT finds existing → returns `{"status":"ignored","reason":"already_processed"}` ✅
- Database unique constraint is final protection ✅
- No browser/local memory idempotency relied upon ✅

---

## Webhook Database Persistence Test

**NOT TESTABLE** — Requires production PostgreSQL

Code flow verified:
1. Signature validated
2. `WebhookEvent` INSERT (flush)
3. Process event → update Order/Payment
4. Single commit
5. Rollback on any exception ✅

---

## Payment/Order Transition Result

**NOT TESTABLE** — Requires production PostgreSQL + Razorpay test webhook

Expected flow (code verified):
```
payment.captured webhook
  → WebhookEvent INSERT
  → Order.payment_status = CAPTURED
  → Order.order_status = CONFIRMED
  → Payment.status = CAPTURED
  → Payment.provider_payment_id = razorpay_payment_id
```

---

## CORS Status

**CONFIGURED IN CODE — PRODUCTION VERIFICATION NEEDED**

- `allow_origins`: `["http://localhost:3000", "http://localhost:5173"]` (development only)
- **Production frontend `https://apollo-web-three.vercel.app` NOT IN LIST** — will fail in browser
- `allow_credentials: true` ✅
- `allow_methods: ["*"]` ✅
- `allow_headers: ["*"]` ✅
- **ACTION REQUIRED**: Add `https://apollo-web-three.vercel.app` and `https://apolloengineering.co.in` (if active) to `allow_origins` in production

---

## Cookie / CSRF Status

**CODE CONFIGURED — PRODUCTION VERIFICATION NEEDED**

- Session cookie: `HttpOnly=true, Secure=true, SameSite=lax, max_age=86400` ✅
- CSRF cookie: `HttpOnly=false, Secure=true, SameSite=lax, max_age=86400` ✅
- Double-submit pattern implemented ✅
- CSRF verification dependency on mutating endpoints ✅
- Logout revokes session in DB + deletes cookies ✅
- **Production test blocked by DB connection**

---

## Security Headers / CSP Review

- **Security Headers Middleware**: Implemented in `main.py` ✅
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Frontend CSP** (vercel.json): Allows `checkout.razorpay.com`, `control.msg91.com`, `api.razorpay.com`, backend URL ✅
- No `connect-src *` ✅
- No secrets in JS bundle / vercel.json / public env ✅
- Frontend `.env` contains only public keys (`VITE_RAZORPAY_KEY_ID`, `VITE_MSG91_WIDGET_ID`) ✅

---

## Rate Limiting

- **Auth endpoints**: `AuthService.check_rate_limit()` — DB-backed sliding window ✅
- **Admin login**: Separate rate limit + lockout after 5 failures (15 min) ✅
- **OTP send**: MSG91 cooldown (30s) returned in response ✅
- **Quote/Order creation**: No explicit rate limit — **CONSIDER ADDING**
- **Payment verify**: No explicit rate limit — **CONSIDER ADDING**

---

## Observability

- **Logging**: `logging.getLogger("apollo.security")` used for security events ✅
- **Structured logs**: Endpoint, status, provider error category, webhook event ID, event type, processing result ✅
- **No secrets logged**: OTP, passwords, JWT, Razorpay secrets, webhook secrets, full payment credentials ✅
- **Audit logs**: `AuthService.record_audit_log()` for login attempts ✅
- **Outbox pattern**: `OutboxEvent` table for SSE/real-time fan-out ✅

---

## Runtime Smoke Tests (Production Frontend Domain)

| Test | Result |
|------|--------|
| `GET /api/v1/health` | ✅ 200 JSON |
| `GET /api/v1/nonexistent` | ✅ 404 JSON (not HTML) |
| `GET /api/v1/auth/me` (unauth) | ✅ 401 JSON |
| `POST /api/v1/auth/otp/send` | ✅ 200 JSON |
| `POST /api/v1/auth/otp/verify` (invalid) | ✅ 400 JSON |
| `POST /api/v1/quotes` | ❌ 500 DB |
| `POST /api/v1/orders` | ❌ 500 DB |
| `POST /api/v1/payments/razorpay/create-order` | ❌ 500 DB |
| `POST /api/v1/payments/razorpay/verify` | ❌ 500 DB |
| `POST /api/v1/payments/razorpay/webhook` (invalid sig) | ✅ 401 JSON |
| `GET /api/v1/pricing/calculate` | ✅ 200 JSON |
| `GET /api/v1/products` | ❌ 500 DB |

---

## Backend Tests

```
Unit tests:      101 passed (24.33s)
Integration tests: 62 skipped (require live PostgreSQL on localhost:5433)
Coverage:        68% overall
```

---

## Frontend Tests

```
Typecheck:       ✅ PASS (tsc --noEmit)
Unit tests:      115 passed (17 test files)
Build:           ✅ SUCCESS (Vite production build)
```

---

## Remaining Manual Actions

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Provision managed PostgreSQL (Neon/Supabase/Railway) | Owner | **CRITICAL** |
| 2 | Set `DATABASE_URL` + `DATABASE_SYNC_URL` in Vercel backend project env | Owner | **CRITICAL** |
| 3 | Set `ENVIRONMENT=production` in Vercel backend project env | Owner | **CRITICAL** |
| 4 | Set `JWT_SECRET` (32+ chars) in Vercel backend project env | Owner | **CRITICAL** |
| 5 | Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in Vercel | Owner | **CRITICAL** |
| 6 | Set `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` in Vercel | Owner | **CRITICAL** |
| 7 | Set `INDIA_POST_*` credentials in Vercel (or disable shipping API) | Owner | HIGH |
| 8 | Set `ADMIN_PASSWORD_HASH` (Argon2id) + `ADMIN_TOTP_SECRET` (Base32) in Vercel | Owner | **CRITICAL** |
| 9 | Update CORS `allow_origins` in `main.py` to include production frontend URL | Dev | **CRITICAL** |
| 10 | Refactor webhook signature validation to use **only** `RAZORPAY_WEBHOOK_SECRET` in production | Dev | **CRITICAL** |
| 11 | Configure Razorpay Dashboard webhook: `https://backend-ten-pi-57.vercel.app/api/v1/payments/razorpay/webhook` | Owner | **CRITICAL** |
| 12 | Trigger Razorpay test webhook → verify end-to-end flow | Dev | HIGH |
| 13 | Run integration tests against production PostgreSQL | Dev | HIGH |
| 14 | Run Playwright e2e tests against production | Dev | MEDIUM |

---

## Final Status

### CONFIGURATION REQUIRED

**Reason**: Production backend cannot connect to PostgreSQL. The `DATABASE_URL` in Vercel environment points to `localhost:5432` which does not exist in the serverless environment. All database-dependent API endpoints (17/25) return HTTP 500 with "Connection refused".

**Blocking items**:
1. No managed PostgreSQL provisioned for production
2. `DATABASE_URL` / `DATABASE_SYNC_URL` not set in Vercel backend project
3. `ENVIRONMENT=production` not set
4. Critical secrets (`JWT_SECRET`, `RAZORPAY_*`, `MSG91_*`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOTP_SECRET`) not verified in Vercel
5. CORS origins not updated for production frontend
6. Webhook secret fallback logic not hardened for production
7. Razorpay Dashboard webhook URL not configured

**Working integrations** (stateless or external):
- Health endpoint
- MSG91 OTP send/verify
- Pricing calculation engine
- Razorpay webhook signature validation (rejects invalid)
- Authentication middleware (returns proper 401/403/422)
- Frontend build + typecheck + all unit tests pass
- Backend unit tests pass (101/101)

---

**Next Step**: Owner must provision managed PostgreSQL and configure all production environment variables in Vercel backend project (`prj_YvBJUtymxorGt8ALnGYVIwlJCe2l`). Once database is reachable, re-run this verification suite.

# 📋 Apollo Engineering E-Commerce — Audit Remediation Checklist

This checklist tracks the implementation of fixes for all 23 confirmed findings identified during the system-wide audit. 

---

## 🚨 Phase 1 — Critical Security Vulnerabilities & P0 Blockers

- [ ] **P0-001: Purge Committed Git Secrets & Isolate Client-Side Environment Keys**
  - **Files**: `.env`, `.gitignore`, `git history` (commits `ec8fbd1`, `7839244`, `b10e1ce`)
  - **Action**: Run `git-filter-repo` to permanently scrub committed `.env` files; immediately rotate Razorpay keys, India Post credentials, MSG91 tokens, and JWT secret; remove `VITE_` prefix from all server-only credentials.

- [ ] **P0-002: Eliminate Hardcoded Credentials & Client-Side Super Admin Backdoor**
  - **File**: [`src/components/SuperAdminDashboard.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/SuperAdminDashboard.tsx#L426-L436)
  - **Action**: Remove hardcoded password `'NIL@apl321'` and delete the client-side fallback bypass that creates an offline Super Admin session on API failure.

- [ ] **P0-003: Remove Unauthenticated Privilege Escalation in Admin Login Route**
  - **File**: [`backend/app/api/v1/endpoints/auth.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/auth.py#L128-L187)
  - **Action**: Delete the emergency user-creation branch and static passcode validation (`NIL@apl321` + `123456`) that provisions unverified users as `UserRole.OWNER`.

- [ ] **P0-004: Persist Customer Contact & Full Delivery Address on Order Placement**
  - **Files**: [`backend/app/api/v1/endpoints/orders.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L86-L228), [`backend/app/models/order.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/models/order.py)
  - **Action**: Create an `OrderAddress` model / embedded address fields (`recipient_name`, `phone`, `email`, `address_line1`, `address_line2`, `city`, `state`, `pincode`) in SQLAlchemy, generate an Alembic migration, and persist `OrderCreate.shipping_address` during order creation.

- [ ] **P0-005: Configure API Reverse Proxy Rewrite in Vercel Deployment**
  - **File**: [`vercel.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vercel.json#L1-L12)
  - **Action**: Add a priority rewrite mapping `/api/(.*)` to the deployed FastAPI backend URL to prevent Vercel SPA routing from returning `index.html` on API calls.

---

## ⚠️ Phase 2 — P1 Business Bugs & Core E-Commerce Flaws

- [ ] **P1-001: Resolve Broken Object-Level Authorization (BOLA) in Order Lookup**
  - **File**: [`backend/app/api/v1/endpoints/orders.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L281)
  - **Action**: Require an unguessable cryptographic tracking token or authenticated user ownership check before returning order status.

- [ ] **P1-002: Fix AttributeError Crash on Customer Order History Listing**
  - **Files**: [`backend/app/api/v1/endpoints/orders.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L310), [`backend/app/models/order.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/models/order.py)
  - **Action**: Add `user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)` to the `Order` model and migration.

- [ ] **P1-003: Connect Admin & Super Admin Panels to Live FastAPI REST Endpoints**
  - **Files**: [`src/components/AdminPanel.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/AdminPanel.tsx), [`src/components/SuperAdminDashboard.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/SuperAdminDashboard.tsx)
  - **Action**: Replace `localStorage` reads/writes (`apollo_products`, `apollo_orders`) with authenticated Axios/fetch API queries to `/api/v1/admin/*`.

- [ ] **P1-004: Correct Customer Registration Role Inversion**
  - **Files**: [`backend/app/api/v1/endpoints/otp.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/otp.py#L74), [`backend/app/models/auth.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/models/auth.py)
  - **Action**: Add `UserRole.CUSTOMER = "customer"` to `UserRole` enum and default all OTP registrations to `CUSTOMER` instead of `SUPPORT`.

- [ ] **P1-005: Enforce Live Razorpay Orders & Handle Webhook Verification Failures**
  - **File**: [`backend/app/api/v1/endpoints/payments.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/payments.py#L52-L111)
  - **Action**: Remove mock `order_` generation fallback in production; return HTTP 400/500 on webhook verification failures so Razorpay retries delivery.

- [ ] **P1-006: Prevent Catalog Card Fallback to Default Product (Solar Clamp)**
  - **File**: [`src/components/ProductCard.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/ProductCard.tsx#L173)
  - **Action**: Disallow silent fallback to `products[0]`; require strict `productId` matching and display a clean error state if an item cannot be found.

- [ ] **P1-007: Implement True Path-Based Routing for Product Detail Pages**
  - **File**: [`src/App.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/App.tsx#L131-L137)
  - **Action**: Replace `useState(selectedProduct)` with URL route parameters (`/product/:slug`) to ensure direct links and browser refreshes persist the viewed item.

---

## 🔧 Phase 3 — P2 Reliability, Database & Integration Hardening

- [ ] **P2-001: Stabilize Integration Test Suite with SQLite In-Memory / CI Service Container**
  - **File**: [`backend/tests/integration/conftest.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/tests/integration/conftest.py)
  - **Action**: Enable automatic in-memory SQLite fallback for local test runs and spin up PostgreSQL 16 container in GitHub Actions CI to unskip 50 integration tests.

- [ ] **P2-002: Resolve Database Driver Discrepancies & Untrack Local SQLite File**
  - **Files**: [`backend/app/core/database.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/core/database.py), `.gitignore`
  - **Action**: Standardize backend on `asyncpg`, remove `backend/apollo_ecommerce.db` from git tracking, and add `*.db` to `.gitignore`.

- [ ] **P2-003: Sanitize Internal Exception Messages in Order Placement API**
  - **File**: [`backend/app/api/v1/endpoints/orders.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L254)
  - **Action**: Prevent returning raw exception strings in HTTP 500 responses; log tracebacks to secure server logs and return generic sanitized client errors.

- [ ] **P2-004: Align Frontend COD Calculation Formula with Backend ₹5 Snapping**
  - **Files**: [`src/context/CartContext.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/context/CartContext.tsx#L85-L110), [`backend/app/services/pricing.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/services/pricing.py)
  - **Action**: Unify the 2.5% COD surcharge rounding to ensure the client-side cart matches backend statutory quotation calculations down to the exact rupee.

- [ ] **P2-005: Optimize Production JavaScript Bundle via Dynamic Code Splitting**
  - **Files**: [`vite.config.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vite.config.ts), [`package.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/package.json)
  - **Action**: Configure `manualChunks` in Rollup options to split `exceljs`, Lucide icons, and administrative components into separate lazy-loaded chunks.

- [ ] **P2-006: Restore WCAG Color Contrast Compliance in Playwright Test Suite**
  - **Files**: [`tests/e2e/a11y.spec.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/tests/e2e/a11y.spec.ts#L11), [`src/index.css`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/index.css)
  - **Action**: Adjust CSS custom properties for steel grey badges and buttons to exceed 4.5:1 contrast, and re-enable `color-contrast` rule in Axe tests.

- [ ] **P2-007: Disallow Indexing of Admin and Checkout Routes in robots.txt**
  - **File**: [`public/robots.txt`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/public/robots.txt#L1-L4)
  - **Action**: Add explicit `Disallow: /admin`, `Disallow: /super-admin`, `Disallow: /account`, and `Disallow: /checkout` directives.

- [ ] **P2-008: Update Vulnerable Image Processing Dependency (Sharp)**
  - **File**: [`package.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/package.json#L35)
  - **Action**: Upgrade `sharp` to `>=0.35.4` to remediate high-severity CVE and memory corruption risk.

---

## 🧹 Phase 4 & 5 — Code Quality, CI/CD Gates & Technical Debt

- [ ] **P3-001: Enforce Strict Security Quality Gates in GitHub Actions CI**
  - **File**: [`.github/workflows/ci.yml`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.github/workflows/ci.yml#L28-L42)
  - **Action**: Remove `continue-on-error: true` from secret scanning and high-severity vulnerability audit steps.

- [ ] **P3-002: Remove Hidden Admin Logo Navigation & Revealing Tooltip**
  - **Files**: [`src/components/Header.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/Header.tsx#L109), [`src/components/Footer.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/Footer.tsx)
  - **Action**: Remove `onDoubleClick` handler and `title="Double-click for Super Admin"` from public storefront logos.

- [ ] **P3-003: Resolve Backend Code Style & Mypy Static Type Errors**
  - **Files**: [`backend/app/`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/)
  - **Action**: Execute `ruff check --fix backend/` and resolve all 17 Mypy type annotations across models and endpoints.

---

**Generated by Antigravity Agentic Auditor**  
*Verification Gate*: Each checkbox requires accompanying automated test confirmation and evidence before marking complete.

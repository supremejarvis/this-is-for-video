# 📑 CODEBASE AUDIT REPORT: Apollo E-Commerce Platform

**Date:** September 19, 2026  
**Audited Directory:** `apolllo web - Copy/web`  
**Execution Scope:** Full Project Audit (Next.js Frontend + Python FastAPI Backend)

---

## 1. Project Architecture & Tech Stack

### High-Level Architecture

A decoupled dual-tier architecture combining a modern React/Next.js client interface with a high-performance asynchronous Python backend service, alongside a secondary direct API handler inside Next.js.

* **Frontend:** Next.js 14+ (App Router architecture under `src/app/`) with TypeScript.
* **UI & Styling:** Tailwind CSS (`src/index.css`), custom accessible design primitives (`src/components/ui/`).
* **Client State Management:** Zustand (`src/store/useStore.ts`) paired with domain hooks (`useCart`, `useAuth`, `useDebounce`).
* **Backend Framework:** Python (FastAPI / ASGI) located at `backend/app/main.py`.
* **Database & ORM:**
  * Primary Relational DB: SQLAlchemy + Alembic Migrations (`backend/alembic/`).
  * Secondary/Direct Inquiries DB: MongoDB via Mongoose (`src/lib/mongoose.ts` & `src/models/Inquiry.ts`).
* **Caching & Queue:** Redis integration (`backend/app/cache/redis...`), background async tasks (`backend/app/workers/`).
* **Third-Party Integrations:** Razorpay (Payments), MSG91 (OTP Auth), CEPT/India Post (Logistics calculation), GST/GSTR-1 engine.

### Directory Structure Breakdown

```
web/
├── backend/                  # Python FastAPI Backend
│   ├── alembic/              # Schema versioning & migrations
│   ├── app/                  # Application layer (core, models, schemas, services, api/v1)
│   └── tests/                # Pytest contract, unit, and integration tests
├── public/                   # Static browser assets, media, SEO manifests
├── src/                      # Next.js Fullstack Application
│   ├── app/                  # App Router pages and internal API route handlers
│   ├── components/           # UI modules (admin, auth, cart, checkout, storefront)
│   ├── hooks/                # Stateful React hooks
│   ├── lib/                  # Utilities, SEO schemas, database connectors
│   ├── services/             # Frontend-to-Backend HTTP client bridges
│   ├── store/                # Zustand global state slices
│   └── utils/                # Pure utility functions (GST, i18n, numbers)
├── docs/                     # Architectural specifications and past audit trails
├── reports/ & test-results/  # Artifacts, test screenshots, coverage traces
└── tests/                    # E2E Playwright, k6 load tests, and security tests
```

---

## 2. File Inventory & Categorized Statistics

| Category | File Count (Estimated) | Description / Primary Locations |
| :--- | :--- | :--- |
| **Frontend Pages & Routes** | ~18 | `src/app/**/page.tsx`, `layout.tsx`, `api/**/route.ts` |
| **Frontend UI Components** | ~55 | `src/components/{admin, auth, cart, checkout, storefront, ui}/*` |
| **Frontend Services & API Clients** | ~24 | `src/services/api/*`, `src/services/*.service.ts` |
| **Backend Core & Domain Logic** | ~65 | `backend/app/{api, core, database, models, schemas, services, workers}/*` |
| **Database Migrations** | ~18 | `backend/alembic/versions/*` |
| **Unit & Integration Tests** | ~75 | `backend/tests/*`, `src/**/__tests__/*`, `src/test/*` |
| **E2E, Performance & Security Tests**| ~15 | `tests/e2e/*`, `tests/load/*`, `tests/security/*` |
| **Generated Artifacts & Reports** | ~250+ | `backend/htmlcov/*`, `playwright-report/*`, `test-results/*`, `reports/*` |
| **Virtual Environment Files** | ~1,000+ | `backend/.venv/*` (Dependencies only) |

---

## 3. Active vs. Dead / Unused Files

### Active (Production-Critical)

* `src/app/layout.tsx`, `src/app/page.tsx`
* `src/app/(auth)/*`, `src/app/(shop)/*`, `src/app/admin/*`, `src/app/b2b/*`
* `src/components/cart/CartDrawer.tsx`, `src/components/checkout/CheckoutModal.tsx`
* `src/store/useStore.ts`, `src/hooks/useCart.ts`, `src/hooks/useAuth.ts`
* `src/services/api/client.ts`, `src/services/razorpay.ts`, `src/services/order.service.ts`
* `backend/app/main.py`, `backend/app/api/v1/api.py`, `backend/app/database/*`
* `backend/app/models/*`, `backend/app/schemas/*`, `backend/app/services/*`

### Dead, Orphan, or Potentially Redundant Files

1. **`src/data/mockData.ts`**: Likely an early development stub. If storefront pulls from API, this file is dead weight.
2. **`src/lib/mongoose.ts` & `src/models/Inquiry.ts`**: Redundant dual-ORM architecture if MongoDB is only used for one contact endpoint while PostgreSQL/SQLAlchemy handles the rest.
3. **`web/reports/*.png` & `web/reports/report.json`**: Static local screenshots and devtools runs that shouldn't live in code control.
4. **Duplicate documentation logs**: `docs/audits/FIX_P0_00*` (approx. 9 repetitive fix logs that can be archived into a single changelog).

---

## 4. Duplicate & Testing Files

### Test Files (Non-production code)

* **Backend Pytest Suites:**
  * `backend/tests/contract/*`
  * `backend/tests/integration/*`
  * `backend/tests/unit/test_*.py`
* **Frontend Component & Logic Tests:**
  * `src/lib/ecommerce/__tests__/*`
  * `src/lib/seo/__tests__/*`
  * `src/models/__tests__/*`
  * `src/services/__tests__/*`
  * `src/utils/__tests__/*`
* **System Verification:**
  * `tests/e2e/a11y.spec.ts`
  * `tests/e2e/admin_audit.spec.ts`
  * `tests/e2e/buyer_catalog.spec.ts`
  * `tests/e2e/responsive.spec.ts`
  * `tests/load/k6-staging.js`
  * `tests/security/zap-staging.conf`

### Identified Structural Duplications

* **Dual Coverage Reports:** `web/htmlcov/` and `backend/htmlcov/` both exist and duplicate test coverage records.
* **Dual API Layers:** Service calls split between `src/services/*.service.ts` (e.g., `cart.service.ts`, `order.service.ts`) and `src/services/api/*` (e.g., `api/orders.ts`, `api/pricing.ts`). They must be consolidated into a single unified client service library.

---

## 5. End-to-End API & Route Coverage Matrix

| Route / Domain | Method | Backend Endpoint (`backend/app/api/v1/endpoints/`) | Frontend Client Invocation (`src/services/`) | Triggering UI Component / Page | Status / Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth / OTP** | `POST` | `/auth/otp/send` | `src/services/msg91Otp.ts` | `AuthModal.tsx`, `login/page.tsx` | Active (MSG91 SMS Gateway) |
| **Auth / Verify** | `POST` | `/auth/otp/verify` | `src/services/api/auth.ts` | `AuthModal.tsx` | Active (JWT issuance) |
| **Catalog / Products** | `GET` | `/products/` | `src/services/catalogService.ts` | `storefront/*`, `store/page.tsx` | Active (DB Read + Redis Cache) |
| **Product Detail** | `GET` | `/products/{slug}` | `src/services/product.service.ts` | `(shop)/products/page.tsx` | Active |
| **Cart Price Calc** | `POST` | `/pricing/calculate` | `src/services/api/pricing.ts` | `useCart.ts`, `CartDrawer.tsx` | Active (Tiered B2B MOQ + GST Rules) |
| **Order Placement** | `POST` | `/orders/create` | `src/services/order.service.ts` | `checkout/page.tsx`, `CheckoutModal.tsx` | Active (DB Transaction) |
| **Payment Order** | `POST` | `/payments/razorpay/create-order` | `src/services/razorpay.ts` | `CheckoutModal.tsx` | Active (Razorpay Orders API) |
| **Payment Webhook** | `POST` | `/payments/razorpay/verify` | *Server-to-Server Webhook* | Razorpay Callback | Active (HMAC SHA256 Signature Verify) |
| **Logistics / Pin** | `GET` / `POST` | `/logistics/shipping-cost` | `src/services/logisticsService.ts` | `components/logistics/*` | Active (CEPT / India Post Matrix) |
| **B2B Inquiries** | `POST` | Direct Next.js API `/api/inquiries` | `fetch('/api/inquiries')` | `b2b/page.tsx`, `contact/page.tsx` | Active (Direct Mongoose write) |
| **Admin Operations** | `GET`, `PUT`, `DELETE` | `/admin/inventory/*`, `/admin/orders/*` | `src/services/api/inventory.ts`, `api/orders.ts` | `src/app/admin/page.tsx` | Active (Admin Role Guarded) |

---

## 6. Cleanup & Optimization Recommendations

### Phase 1: Immediate Space Reclamation (Zero Code Risk)

Execute cleanup of all generated and ephemeral testing files. These can be removed safely without impacting codebase functionality:
```powershell
Remove-Item -Recurse -Force .\htmlcov, .\backend\htmlcov, .\playwright-report, .\test-results, .\reports\*.png
```

*Ensure `.gitignore` contains:*
```gitignore
.venv/
htmlcov/
playwright-report/
test-results/
reports/
__pycache__/
*.pyc
```

### Phase 2: Consolidation & Code Hygiene

1. **Unify the API Client:** Consolidate `src/services/*.service.ts` into `src/services/api/` to establish a single source of truth for endpoints and response types.
2. **Standardize the Persistence Layer:** Decide on the database strategy:
   * If PostgreSQL/SQLAlchemy is the enterprise database, migrate the inquiry logic away from `Mongoose` (`src/lib/mongoose.ts`) into a FastAPI endpoint (`/inquiries`) backed by SQLAlchemy.
3. **Purge Dummy Artifacts:** Deprecate `src/data/mockData.ts` once all catalog UI components are verified against the real `/products/` endpoint.

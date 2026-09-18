# 🏛️ APOLLO ENGINEERING — COMPLETE E-COMMERCE FULL SYSTEM AUDIT REPORT
**Authoritative Architectural, Security, Code Quality, Statutory Business Logic & Production Readiness Assessment**

**Audit Execution Date:** 2026-09-12  
**Target System:** Apollo Engineering E-Commerce Platform (React 19 / Vite SPA Frontend & Python FastAPI Backend)  
**Corpus / Repository:** `supremejarvis/this-is-for-video` (`c:\Users\patel\OneDrive\Desktop\PRAVIN\web`)  
**Audit Mode:** **AUDIT ONLY (STRICT DISCOVERY — ZERO SOURCE CODE MODIFIED)**  
**Production Readiness Status:** **NOT READY FOR PRODUCTION**  

---

## 1. EXECUTIVE SUMMARY

An exhaustive, evidence-based architectural, full-stack, security, statutory, and operational audit of the entire Apollo Engineering e-commerce ecosystem was conducted. The audit covered all frontend applications, the Python FastAPI backend, database schemas, authentication mechanisms, checkout flows, payment processing, statutory GST calculations, COD rounding, logistics integrations, CI/CD pipelines, and repository history.

In strict compliance with Directive 38 (**Stage 1 — Audit Only**), zero source files, configuration parameters, dependencies, or database records were modified. Every single claim, score, and vulnerability in this report is substantiated with direct line-numbered source code evidence, static analysis results (`tsc`, `mypy`, `ruff`, `npm audit`, `gitleaks`), or runtime execution logs.

### Key Audit Metrics & Severity Breakdown

| Severity | Count | Definition & Primary Issues |
| :--- | :---: | :--- |
| **P0 — Critical** | **5** | Production compromised: Live secrets in Git history; Plaintext admin password & emergency backdoor in client bundle; Unauthenticated admin account creation exploit; Complete dropping of customer & address data in backend orders; Missing `/api/v1` proxy in Vercel. |
| **P1 — High** | **7** | Major business & security failure: Broken Object-Level Authorization (BOLA) on guest orders; Backend crash on order listing (`Order.user_id` missing); Admin panel completely decoupled from PostgreSQL; Customer role inversion (assigned `SUPPORT` staff role); Simulated Razorpay orders & swallowed webhook failures; Fallback to wrong product in `ProductCard`; Unrouted product detail page. |
| **P2 — Medium** | **7** | Broken integration & reliability risks: 50+ backend integration tests skipped (offline PostgreSQL container); Internal exception leak in HTTP 500 handler; Excessive uncompressed JS bundle (>3.1 MB); Disabled WCAG color contrast checks; Unrestricted robots.txt; 7 NPM CVEs (High severity in `sharp`); Broken backend requirements & suppressed CI gates. |
| **P3 — Low** | **4** | Quality & hygiene issues: Double-click admin backdoor tooltip; 50 Ruff lint errors; 17 Mypy static typing errors; Invalid CSS classes in build. |
| **Total Findings** | **23** | **23 Distinct Confirmed Findings Across Stack** |

---

## 2. ARCHITECTURE OVERVIEW

### 2.1 Complete System Architecture Map

```mermaid
graph TD
    Client[Browser Client: React 19 / Vite SPA] -->|CDN / Static Assets| VercelEdge[Vercel Edge Network]
    Client -->|Relative /api/v1 Requests| ReverseProxy[Vercel Rewrites / Vite Dev Proxy]
    ReverseProxy -->|Proxy /api/v1| FastAPI[FastAPI Backend: Python 3.12/3.13]
    Client -->|Direct REST / Proxy| MSG91[MSG91 OTP & WhatsApp API]
    Client -->|Standard Checkout SDK| RazorpayClient[Razorpay Client SDK]
    
    subgraph "FastAPI Authoritative Layer"
        FastAPI --> AuthEngine[Auth & Session Engine: Argon2id + HttpOnly Cookies]
        FastAPI --> PricingEngine[PricingEngine: 100% Decimal Statutory Math]
        FastAPI --> QuoteSvc[QuoteService: Expiring Authoritative Quotes]
        FastAPI --> OrderSvc[Order Lifecycle State Machine]
        FastAPI --> InvSvc[InventoryService: Append-Only Stock Ledger]
        FastAPI --> ShipSvc[ShippingService: Speed Post Tariffs]
        FastAPI --> PmtSvc[Payments: HMAC-SHA256 & Webhook Processing]
    end
    
    subgraph "Data Storage Tier"
        FastAPI --> SQLAlchemy[SQLAlchemy 2.0 Async ORM]
        SQLAlchemy --> PostgreSQL[(Authoritative PostgreSQL 16 DB)]
        SQLAlchemy -.-> SQLite[(Fallback Dev SQLite: apollo_ecommerce.db)]
    end
    
    subgraph "External Third-Party Gateways"
        FastAPI --> RazorpayAPI[Razorpay REST API]
        FastAPI --> IndiaPost[India Post Speed Post CEPT Hub 382430]
        RazorpayAPI -->|Webhook Events| PmtSvc
    end
    
    subgraph "Client-Side Local Storage Fallback (Decoupled)"
        Client --> LocalStorage[(Browser localStorage: apollo_products, apollo_orders, apollo_coupons)]
    end
```

### 2.2 Core Architectural Inconsistencies & Duplications Detected

1. **Dual State Truth (PostgreSQL vs. LocalStorage)**:
   The backend implements an authoritative PostgreSQL relational model for catalog, pricing versions, inventory ledgers, and orders. However, the frontend Admin Panel (`SuperAdminDashboard.tsx`, `ApeProductListingWizard.tsx`, `EnterpriseDispatchConsole.tsx`) reads and mutates browser `localStorage` (`apollo_products`, `apollo_orders`). Admin updates never reach PostgreSQL.
2. **Monetary Arithmetic Divergence**:
   While the backend `PricingEngine` strictly follows Directive 3 with 100% Python `Decimal` calculations, the frontend implements `calculateStatutoryQuoteFallback` in `useStore.ts` (lines 1250–1328) using native JavaScript floating-point arithmetic with `Math.ceil(codRawTotal / 5) * 5` and hardcoded ₹59 shipping.
3. **Customer & Delivery Data Vacuum**:
   The backend API schemas (`CreateOrderRequest`) accept customer contact details and structured delivery addresses, but the database models (`Order`, `Shipment`) have zero columns or foreign keys to store this data.

---

## 3. REPOSITORY STRUCTURE

```
apollo-engineering/
├── .agents/                    # GSD orchestrator configuration & skill manifests
├── .github/
│   ├── dependabot.yml          # Automated dependency updates
│   └── workflows/
│       ├── ci.yml              # Enterprise CI pipeline (7 jobs)
│       └── codeql.yml          # GitHub CodeQL security scanning
├── backend/
│   ├── alembic/                # Alembic migration scripts (001 to 007)
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini             # Alembic migration configuration
│   ├── apollo_ecommerce.db     # Committed SQLite binary database (TRACKED IN GIT)
│   ├── app/
│   │   ├── api/                # FastAPI routing & dependencies (deps.py)
│   │   │   └── v1/endpoints/   # 10 Route modules (auth, orders, products, etc.)
│   │   ├── cli/                # Seeding CLI utilities (seed_catalog, seed_owner)
│   │   ├── core/               # App configuration, security primitives, DB session
│   │   ├── models/             # SQLAlchemy ORM models (order, product, auth, etc.)
│   │   ├── schemas/            # Pydantic v2 schemas
│   │   └── services/           # Authoritative business logic services
│   ├── pyproject.toml          # Python dependencies & tool configs (pytest, ruff, mypy)
│   ├── tests/                  # Backend test suite (unit, integration, contract)
│   └── uv.lock                 # Python locked dependencies
├── docs/                       # Project architecture documentation
├── public/                     # Static assets, WebP images, sitemap.xml, robots.txt
├── src/
│   ├── components/
│   │   ├── admin/              # SuperAdminDashboard, ApeProductListingWizard, etc.
│   │   ├── auth/               # AuthModal, AddressModal, CustomerAccountModal
│   │   ├── b2b/                # B2BPortal
│   │   ├── checkout/           # CartDrawer, CheckoutModal
│   │   ├── logistics/          # LiveOrderTracker, GstInvoice, ThermalShippingLabel
│   │   ├── pages/              # StorePage, AboutPage, ContactPage, WishlistPage
│   │   ├── reports/            # ReportingSuite
│   │   └── storefront/         # ProductCard, ProductDetail, Header, BuyerCatalog
│   ├── constants/              # System constants (Kathwada 382430, GST rates)
│   ├── data/                   # Mock fallback datasets (mockData.ts)
│   ├── lib/                    # Utilities, SEO keywords, observability
│   ├── services/               # Frontend API clients (apiService, razorpayService, etc.)
│   ├── store/                  # Zustand global application store (useStore.ts - 108 KB)
│   ├── types/                  # TypeScript interfaces & enums (index.ts)
│   └── utils/                  # GST calculations, i18n, storage migration
├── package.json                # Frontend NPM scripts & dependencies
├── playwright.config.ts        # Playwright E2E configuration
├── vercel.json                 # Vercel deployment rewrites & security headers
├── vite.config.ts              # Vite 6 SPA build & proxy configuration
└── vitest.config.ts            # Vitest unit test configuration
```

---

## 4. TECHNOLOGY STACK

| Tier | Component | Specification |
| :--- | :--- | :--- |
| **Frontend Runtime** | React | React 19 (`19.0.0`) with React DOM 19 |
| **Frontend Tooling** | Vite | Vite 6.2.0 / 6.4.3 SPA compiler |
| **Language** | TypeScript | TypeScript 5.8.2 in Strict Mode (`noEmit: true`) |
| **Styling** | Tailwind CSS | Tailwind CSS v4 (`@tailwindcss/vite` 4.1.14) |
| **State Management** | Zustand | Zustand 5.0.15 with custom `localStorage` sync |
| **Routing** | React Router | React Router DOM 7.18.3 |
| **Backend Runtime** | Python FastAPI | FastAPI 0.115.0+, Uvicorn 0.32.0, Python 3.12/3.13 |
| **Data Validation** | Pydantic | Pydantic v2.10.0 & Pydantic-Settings 2.6.0 |
| **ORM & Migrations** | SQLAlchemy & Alembic | SQLAlchemy 2.0.36 (Async Native) & Alembic 1.14.0 |
| **Database Engines** | PostgreSQL & SQLite | Managed PostgreSQL 16 (Target) / SQLite 3 (Dev) |
| **Security / Crypto** | Argon2id & HMAC | `argon2-cffi` 25.1.0 (RFC 9106), Web Crypto HMAC-SHA1/SHA256 |
| **Logistics Gateway** | India Post Speed Post | Official CEPT API Adapter (Origin Hub 382430) |
| **SMS / OTP / WhatsApp** | MSG91 | MSG91 SendOTP v5 REST API & WhatsApp Business API |
| **Payment Gateway** | Razorpay | Razorpay Standard Checkout SDK + Webhook Processor |

---

## 5. OVERALL HEALTH SCORE

| Dimension | Score / 100 | Grade | Justification & Summary |
| :--- | :---: | :---: | :--- |
| **Security** | **32 / 100** | **F** | Live secrets committed in Git history; Plaintext password in client bundle; BOLA vulnerability on orders; Emergency client-side admin backdoor. |
| **Frontend** | **78 / 100** | **C+** | Polished UI aesthetics, rich micro-animations, but massive monolithic files (useStore 108KB, SuperAdminDashboard 199KB) and unrouted PDP. |
| **Backend** | **68 / 100** | **D+** | Strong mathematical service designs (PricingEngine, InventoryService), but orders fail to persist customer/address data and route crashes on missing user_id. |
| **FastAPI** | **74 / 100** | **C** | Pydantic v2 models, async dependency injection, and clean router hierarchy; dragged down by unhandled exceptions and mock payment order IDs. |
| **Database** | **58 / 100** | **F** | Excellent append-only inventory ledger and price versioning, but fatal omission of customer/address tables and missing `user_id` on `orders`. |
| **Authentication** | **45 / 100** | **F** | Solid Argon2id and cookie hashing on backend, but bypassable by client backdoor, hardcoded password hashes, and OTP role confusion (`SUPPORT`). |
| **Ecommerce Flow** | **62 / 100** | **D** | End-to-end cart, quote, and checkout components exist, but state relies on localStorage fallbacks, and Vercel lacks backend routing. |
| **Performance** | **64 / 100** | **D** | Client bundle exceeds 3.1 MB uncompressed (`exceljs` 940 KB, `index.js` 602 KB); heavy initial JavaScript payload. |
| **Accessibility** | **72 / 100** | **C** | Good semantic layout and ARIA labels on modals, but color-contrast rule was explicitly disabled in automated Axe test suite. |
| **SEO** | **80 / 100** | **B** | Schema.org JSON-LD tags, dynamic titles, sitemap.xml present, but robots.txt fails to disallow sensitive `/admin` and `/account` endpoints. |
| **Testing** | **55 / 100** | **F** | Frontend vitest (112 tests) passes, but 50+ backend integration tests are skipped due to offline PostgreSQL, and backend coverage is only 66%. |
| **CI/CD** | **48 / 100** | **F** | Gitleaks and npm audit errors suppressed with `continue-on-error`; backend job attempts to install missing `requirements.txt`. |
| **OVERALL** | **61.3 / 100** | **D** | **CRITICAL ARCHITECTURAL & SECURITY DEFECTS PREVENT PRODUCTION RELEASE** |

---

## 6. CRITICAL FINDINGS (P0)

### FINDING P0-001: Production Secrets Committed in Git History and Exposed Client-Side
* **Category:** Security / Secrets Exposure (OWASP A02: Cryptographic Failures / A05: Security Misconfiguration)
* **Severity:** **P0 — Critical**
* **Status:** **CONFIRMED BUG**
* **Repository:** Root & Backend
* **Affected Files:** [.env](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.env), [backend/.env](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/.env), Git Commits `ec8fbd1`, `7839244`, `b10e1ce`
* **Evidence:**
  1. Git commit history contains full plaintext `.env` files committed in commits `ec8fbd1d6ffdfe2f8f1e796448ea4fd744db328a` and `7839244d14a18cf669aef12dac209c55315149dc`.
  2. Root `.env` lines 6–32 expose:
     - `VITE_INDIA_POST_PASSWORD="[REDACTED]"` (Exposed to public browser bundle via `VITE_` prefix)
     - `VITE_MSG91_AUTH_KEY="[REDACTED]"` (Exposed to public browser bundle via `VITE_` prefix)
     - `RAZORPAY_KEY_ID="rzp_live_TPhyOgY7jM1yqR"` (Live production key)
     - `RAZORPAY_KEY_SECRET="[REDACTED]"` (Live production secret)
     - `RAZORPAY_WEBHOOK_SECRET="[REDACTED]"`
  3. `backend/.env` line 15 exposes:
     - `MONGODB_URI="mongodb+srv://apollo_user:[REDACTED]@cluster0.mongodb.net/..."`
* **How to Reproduce:** Run `git log --all --full-history -- "**.env*"` to view committed production secrets. Inspect Vite bundle build output to observe `VITE_` variables in client assets.
* **Impact:** Immediate compromise of live Razorpay payment gateway, MSG91 SMS balance, MongoDB Atlas database, and official India Post account credentials.
* **Recommended Fix:**
  1. Immediately rotate all live API keys, secrets, and database credentials with Razorpay, MSG91, MongoDB Atlas, and India Post.
  2. Rewrite git history using `git-filter-repo` or BFG Repo-Cleaner to permanently purge `.env` files from all commits.
  3. Remove all `VITE_` prefixes from backend secrets; route India Post and MSG91 requests strictly through the FastAPI backend.
* **Confidence:** **High**

---

### FINDING P0-002: Hardcoded Plaintext Admin Password and Client-Side Emergency Backdoor
* **Category:** Authentication / Backdoor (OWASP A07: Identification and Authentication Failures)
* **Severity:** **P0 — Critical**
* **Status:** **CONFIRMED BUG**
* **Affected Files:**
  - [src/components/admin/SuperAdminDashboard.tsx:426-436](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/admin/SuperAdminDashboard.tsx#L426-L436)
  - [backend/app/main.py:27-31](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/main.py#L27-L31)
  - [backend/app/core/config.py:35-46](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/core/config.py#L35-L46)
* **Evidence:**
  1. In `SuperAdminDashboard.tsx` lines 426–436:
     ```tsx
     } catch {
       if (cleanPass === 'NIL@apl321' && cleanCode.length === 6) {
         completeAdminLogin({
           id: 'u_apollo_admin_master',
           email: DEFAULT_ADMIN_EMAIL,
           full_name: 'Apollo Engineering Administrator',
           role: 'SUPER_ADMIN',
           is_superuser: true,
           phone: DEFAULT_ADMIN_PHONE,
         });
         return;
       }
     ```
  2. In `backend/app/main.py` lines 27–31:
     ```python
     await async_seed_owner(
         email="admin@apolloengineering.co.in",
         password="NIL@apl321",
         name="Apollo Administrator"
     )
     ```
  3. In `backend/app/core/config.py` line 36:
     `ADMIN_PASSWORD_HASH` defaults to the Argon2id hash of `NIL@apl321`. Line 43 sets `ADMIN_DEV_BYPASS_TOTP = True`, which accepts `123456` and `000000`.
* **How to Reproduce:** Disconnect network connectivity or block `/api/v1/auth/admin-login` in browser devtools. Enter `admin@apolloengineering.co.in`, password `NIL@apl321`, and any 6-digit code (e.g. `000000`). The dashboard immediately completes login and renders full Super Admin capabilities.
* **Impact:** Full compromise of admin console by anyone inspecting the public client JavaScript bundle.
* **Recommended Fix:** Purge all fallback authentication code and plaintext strings from `SuperAdminDashboard.tsx`. Require cryptographically verified server-side sessions.
* **Confidence:** **High**

---

### FINDING P0-003: Unauthenticated Privilege Escalation in `POST /api/v1/auth/admin-login`
* **Category:** Authorization / Privilege Escalation (OWASP A01: Broken Access Control)
* **Severity:** **P0 — Critical**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/app/api/v1/endpoints/auth.py:128-187](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/auth.py#L128-L187)
* **Evidence:**
  In `auth.py`:
  ```python
  if settings.ADMIN_PASSWORD_HASH:
      password_valid = verify_password(payload.password, settings.ADMIN_PASSWORD_HASH)
  ...
  stmt = select(User).where(User.email == normalized_email)
  user = (await db.execute(stmt)).scalar_one_or_none()
  if not user:
      user = User(
          email=normalized_email,
          password_hash=settings.ADMIN_PASSWORD_HASH or hash_password(payload.password),
          full_name="Apollo Engineering Administrator",
          role=UserRole.OWNER,
          is_active=True,
          mfa_enabled=True,
      )
      db.add(user)
      await db.commit()
  ```
* **How to Reproduce:** Submit a POST request to `/api/v1/auth/admin-login` with `{"email": "attacker@external.com", "password": "NIL@apl321", "totp_code": "123456"}`.
* **Expected Result:** HTTP 401 Unauthorized (user does not exist).
* **Actual Result:** The system provisions a brand-new `UserRole.OWNER` user in PostgreSQL and returns an authenticated session with full administrative privileges.
* **Impact:** Any external actor knowing the default password can create arbitrary `OWNER` accounts in the database.
* **Recommended Fix:** Only authenticate pre-existing users verified in the database with role `OWNER`. Never auto-provision administrative accounts based on a static master hash.
* **Confidence:** **High**

---

### FINDING P0-004: Customer Contact & Delivery Address Dropped in Backend Order Creation
* **Category:** Database / Data Integrity (Ecommerce Order Architecture)
* **Severity:** **P0 — Critical**
* **Status:** **CONFIRMED BUG**
* **Affected Files:**
  - [backend/app/api/v1/endpoints/orders.py:86-228](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L86-L228)
  - [backend/app/models/order.py:60-98](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/models/order.py#L60-L98)
  - [backend/app/services/quote_service.py:280-358](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/services/quote_service.py#L280-L358)
* **Evidence:**
  `CreateOrderRequest` accepts `customer: CustomerInfoInput`, `shipping_address: AddressInput`, `claim_gst`, and `company_name`. In `orders.py:create_order`, `order = await QuoteService.create_order_from_quote(session=db, quote_id=quote_id, payment_method=payload.payment_method)`.
  The `Order` and `Shipment` models in `models/order.py` lack columns for customer name, phone, email, address line, city, state, or GSTIN. Only `destination_pincode` is stored on `Shipment`.
* **How to Reproduce:** Submit an order via `POST /api/v1/orders`. Query PostgreSQL for the persisted order. Observe that customer name, phone, email, and street address are absent.
* **Impact:** Physical warehouse fulfillment is impossible; neither standard shipping labels nor statutory tax invoices can be generated from database records.
* **Recommended Fix:** Add an `addresses` table or embed structured delivery and customer columns (`customer_name`, `customer_phone`, `customer_email`, `address_line1`, `address_line2`, `city`, `state`, `state_code`, `gstin`) onto `Order` with Alembic migration 008.
* **Confidence:** **High**

---

### FINDING P0-005: Missing Production Routing & Reverse Proxy for `/api/v1` on Vercel
* **Category:** Deployment / Vercel Configuration (DevOps / Network)
* **Severity:** **P0 — Critical**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [vercel.json:51-60](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vercel.json#L51-L60)
* **Evidence:**
  In `vercel.json`:
  ```json
  "rewrites": [
    {
      "source": "/api/msg91/:path*",
      "destination": "https://control.msg91.com/api/v5/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
  ```
* **How to Reproduce:** Deploy static bundle to Vercel. Request `GET /api/v1/health` or `POST /api/v1/orders`.
* **Expected Result:** FastAPI JSON response.
* **Actual Result:** Returns HTTP 200 with `index.html` (text/html). JSON parsing fails on frontend, forcing client fallback.
* **Impact:** Complete failure of all production API endpoints on Vercel deployments.
* **Recommended Fix:** Configure rewrite in `vercel.json` pointing `/api/v1/:path*` to the production FastAPI backend deployment domain, and update CSP headers in `vercel.json` to allow connections to the backend host.
* **Confidence:** **High**

---

## 7. HIGH FINDINGS (P1)

### FINDING P1-001: Broken Object Level Authorization (BOLA) on Guest Orders
* **Category:** API Security (OWASP A01: Broken Access Control)
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/app/api/v1/endpoints/orders.py:280-290](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L280-L290)
* **Evidence:**
  ```python
  # BOLA check: if order is tied to a user, caller must be owner or administrative staff
  if order.user_id is not None:
      if not current_user or (
          current_user.id != order.user_id
          and current_user.role not in (UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.CATALOG_MANAGER)
      ):
          raise HTTPException(status_code=403, detail="Access forbidden...")
  return _to_order_response(order)
  ```
* **Impact:** For guest orders where `order.user_id is None`, the check evaluates to `False`. Any unauthenticated caller who knows or guesses an order number can inspect the full order, including items, totals, and shipment details.
* **Recommended Fix:** Require an order-specific cryptographically random access token (`view_token`) or verify customer phone number via OTP before exposing guest order details.
* **Confidence:** **High**

---

### FINDING P1-002: Backend Crash on Order Listing Due to Non-Existent `Order.user_id` Attribute
* **Category:** Backend / FastAPI Error Handling
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/app/api/v1/endpoints/orders.py:309-310](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L309-L310)
* **Evidence:**
  Mypy output:
  `app\api\v1\endpoints\orders.py:310: error: "type[Order]" has no attribute "user_id" [attr-defined]`
  Lines 309–310:
  ```python
  if current_user.role not in (UserRole.OWNER, UserRole.ORDER_OPERATIONS, UserRole.CATALOG_MANAGER):
      stmt = stmt.where(Order.user_id == current_user.id)
  ```
* **Impact:** Whenever a non-staff customer attempts to list their orders via `GET /api/v1/orders`, the server crashes with an `AttributeError`, returning HTTP 500.
* **Recommended Fix:** Add `user_id` foreign key column to `Order` model linked to `users.id`.
* **Confidence:** **High**

---

### FINDING P1-003: Admin Panel Decoupled from Authoritative PostgreSQL Backend
* **Category:** Architecture / State Synchronization
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected Files:**
  - [src/components/admin/SuperAdminDashboard.tsx](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/admin/SuperAdminDashboard.tsx)
  - [src/store/useStore.ts:809-810, 1593-1650](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/store/useStore.ts#L809-L810)
* **Evidence:**
  `SuperAdminDashboard.tsx` loads products and orders from Zustand store (`useStore.ts`), which in turn initializes state from `localStorage.getItem('apollo_products')` and `localStorage.getItem('apollo_orders')`. When an admin adjusts stock or adds an ASIN, only `localStorage` is updated. No HTTP requests are made to `/api/v1/products` or `/api/v1/inventory`.
* **Impact:** Catalog and inventory adjustments made in the Admin panel are local to the administrator's individual browser. Real customers and backend quote calculations continue using stale or initial database records.
* **Recommended Fix:** Connect `SuperAdminDashboard` and related panels directly to `/api/v1/products`, `/api/v1/orders`, and `/api/v1/inventory` with proper bearer/cookie authentication.
* **Confidence:** **High**

---

### FINDING P1-004: Customer Role Inversion — OTP Registrations Assigned Staff Role `SUPPORT`
* **Category:** RBAC / Identity Management
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected Files:**
  - [backend/app/api/v1/endpoints/otp.py:74](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/otp.py#L74)
  - [backend/app/models/auth.py:19-26](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/models/auth.py#L19-L26)
* **Evidence:**
  `UserRole` in `models/auth.py` contains only: `OWNER`, `CATALOG_MANAGER`, `INVENTORY_MANAGER`, `ORDER_OPERATIONS`, `FINANCE`, `SUPPORT`, `AUDITOR`. There is no customer role. In `otp.py` line 74:
  `role=UserRole.SUPPORT`
* **Impact:** Normal retail customers who register with mobile OTP are granted an internal staff role (`SUPPORT`), blurring the boundary between external buyers and internal personnel.
* **Recommended Fix:** Add `CUSTOMER` and `B2B_CUSTOMER` to `UserRole` enum and assign `CUSTOMER` on mobile registration.
* **Confidence:** **High**

---

### FINDING P1-005: Simulated Razorpay Order Creation and Swallowed Webhook Failures
* **Category:** Payment Security & Verification
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/app/api/v1/endpoints/payments.py:52, 218-220](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/payments.py#L52)
* **Evidence:**
  1. Line 52: `razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}"`. The backend mocks Razorpay order IDs instead of calling the live Razorpay API.
  2. Line 218: Webhook exceptions inside `payment.captured` are caught with `except Exception: await db.rollback()`, and the endpoint returns `{"status": "processed"}` (HTTP 200) without updating the order, preventing Razorpay from retrying failed webhook deliveries.
* **Impact:** Discrepancy between frontend Razorpay SDK and backend orders; silent payment dropouts where money is captured but order remains unpaid in PostgreSQL.
* **Recommended Fix:** Integrate the official `razorpay` Python client; return HTTP 500 when webhook processing fails so Razorpay retries delivery.
* **Confidence:** **High**

---

### FINDING P1-006: Silent Fallback to Wrong Product in `ProductCard.tsx`
* **Category:** E-Commerce Flow / Catalog Integrity
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [src/components/ProductCard.tsx:170-173](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/ProductCard.tsx#L170-L173)
* **Evidence:**
  ```tsx
  const matchedProduct = (asin && products.find((p) => p.asin === asin)) || 
    products.find((p) => p.title.toLowerCase() === name.toLowerCase()) || 
    products.find((p) => p.title.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.title.toLowerCase())) || 
    products[0];
  ```
* **Impact:** If an ASIN does not match exactly or title fuzzy-matching fails, the card silently binds to `products[0]`. When the user clicks "Add to Cart", `products[0]` is added instead of the displayed product.
* **Recommended Fix:** Remove `|| products[0]`. If no product matches, render a graceful placeholder or log an error; never bind to an arbitrary product.
* **Confidence:** **High**

---

### FINDING P1-007: Product Detail Page Unrouted in React Router
* **Category:** Frontend Navigation / Architecture
* **Severity:** **P1 — High**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [src/App.tsx:131-153](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/App.tsx#L131-L153)
* **Evidence:**
  `App.tsx` conditionally renders `ProductDetail` via `{selectedProduct ? <ProductDetail /> : <Routes>...}`. There is no route for `/products/:id` or `/product/:asin`.
* **Impact:** When a user refreshes the page on a product detail view, `selectedProduct` is reset to `null` in memory, and the user is redirected to the home page. Direct links to products shared on WhatsApp or social media cannot open the product page.
* **Recommended Fix:** Add `<Route path="/product/:asin" element={<ProductDetailWrapper />} />` to `App.tsx` and load the product from the catalog by ASIN parameter.
* **Confidence:** **High**

---

## 8. MEDIUM FINDINGS (P2)

### FINDING P2-001: 50+ Backend Integration Tests Skipped Due to Offline PostgreSQL
* **Category:** Testing / Database
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/tests/integration/conftest.py:19-23](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/tests/integration/conftest.py#L19-L23)
* **Evidence:**
  Running `pytest` skips 50 integration tests with message: `Live PostgreSQL 16 server on localhost:5433 is not running`. Test coverage drops to 66%. Critical database constraints and concurrency tests in `test_db_constraints.py` and `test_inventory_concurrency.py` are unvalidated locally.
* **Recommended Fix:** Provide automated Docker Compose configuration for disposable PostgreSQL 16 on port 5433 for local test runs.

---

### FINDING P2-002: Internal Exception Leakage in HTTP 500 Handlers
* **Category:** API Security (OWASP A05: Security Misconfiguration)
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [backend/app/api/v1/endpoints/orders.py:254](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/orders.py#L254)
* **Evidence:**
  `raise HTTPException(status_code=500, detail=f"ERROR: {type(e).__name__}: {e}")`
* **Impact:** Internal exception types, database schema details, and file paths are sent to external callers.
* **Recommended Fix:** Return generic error message `{"detail": "An internal server error occurred"}` and log the traceback internally.

---

### FINDING P2-003: Excessive Uncompressed Bundle Size (>3.1 MB)
* **Category:** Performance / Bundle Optimization
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [vite.config.ts:52-65](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vite.config.ts#L52-L65)
* **Evidence:**
  `npm run build` generates:
  - `dist/assets/excel-vendor-DToW-h95.js`: 939.77 kB
  - `dist/assets/index-HC1oz5X9.js`: 602.46 kB
  - `dist/assets/SuperAdminDashboard-rsSvDVpC.js`: 425.18 kB
  - `dist/assets/pdf-vendor-Al-Z6QKN.js`: 404.41 kB
* **Impact:** Degraded First Contentful Paint (FCP) and Largest Contentful Paint (LCP) on mobile 3G/4G networks.
* **Recommended Fix:** Dynamically import `exceljs` only when GSTR-1 export is clicked; lazy-load PDF generation libraries.

---

### FINDING P2-004: WCAG Color Contrast Rules Explicitly Disabled in E2E Tests
* **Category:** Accessibility (WCAG 2.1 AA)
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [tests/e2e/a11y.spec.ts:11](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/tests/e2e/a11y.spec.ts#L11)
* **Evidence:**
  `.disableRules(['color-contrast']) // Soft-check color contrast during draft theme adjustments`
* **Impact:** Text elements failing WCAG 4.5:1 minimum contrast ratio pass undetected in CI.
* **Recommended Fix:** Enable `color-contrast` in Axe builder and fix low-contrast slate/amber text pairings.

---

### FINDING P2-005: Robots.txt Allows Indexing of Admin and Account Portals
* **Category:** SEO / Information Disclosure
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [public/robots.txt:1-23](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/public/robots.txt#L1-L23)
* **Evidence:**
  `public/robots.txt` specifies `Allow: /` without any `Disallow:` directives for `/admin`, `/account`, or `/b2b`.
* **Impact:** Search engine crawlers can index the admin login portal and private account screens.
* **Recommended Fix:** Add `Disallow: /admin` and `Disallow: /account` to `robots.txt`.

---

### FINDING P2-006: Seven Vulnerable NPM Dependencies (High Severity in `sharp`)
* **Category:** Dependency Security (OWASP A06: Vulnerable Components)
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [package.json](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/package.json)
* **Evidence:**
  `npm audit` reports:
  - `sharp <= 0.35.4-rc.0`: High severity (GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c)
  - `esbuild 0.27.3 - 0.28.0`: Arbitrary file read on Windows dev server (GHSA-g7r4-m6w7-qqqr)
  - `@vitest/mocker`: Path traversal (GHSA-82fw-gwwq-j7x9)
  - `uuid < 11.1.1` (via `exceljs`): Buffer bounds check flaw (GHSA-w5hq-g745-h8pq)
* **Recommended Fix:** Upgrade `sharp` to `>=0.35.4`, update `esbuild` and `vitest`.

---

### FINDING P2-007: Broken Backend Requirements and Suppressed CI Quality Gates
* **Category:** CI/CD & DevSecOps
* **Severity:** **P2 — Medium**
* **Status:** **CONFIRMED BUG**
* **Affected File:** [.github/workflows/ci.yml:74, 78, 192](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.github/workflows/ci.yml#L74)
* **Evidence:**
  Lines 74 & 78 specify `continue-on-error: true` on Gitleaks and npm audit. Line 192 specifies `pip install -r backend/requirements.txt || true`, but `backend/requirements.txt` does not exist in the repository.
* **Impact:** Broken dependencies or security leaks in PRs do not block the pipeline.
* **Recommended Fix:** Remove `continue-on-error: true`, generate `backend/requirements.txt` or use `uv sync`.

---

## 9. LOW FINDINGS (P3)

### FINDING P3-001: Double-Click Backdoor and Tooltip in Header & Footer
* **Category:** UX / Security Hygiene
* **Severity:** **P3 — Low**
* **Status:** **CONFIRMED BUG**
* **Affected Files:** [src/components/Footer.tsx:26-32](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/Footer.tsx#L26-L32), [src/components/storefront/Header.tsx:49-54](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/storefront/Header.tsx#L49-L54)
* **Evidence:**
  `onDoubleClick` navigates to `/admin`. Footer logo has tooltip `title="Apollo Engineering (Double-click to open Admin Portal Login)"`.
* **Recommended Fix:** Remove double-click handlers and exposed tooltips; access admin via dedicated URL or navigation item.

---

### FINDING P3-002: 50 Ruff Linter Warnings in Python Backend
* **Category:** Code Quality / Formatting
* **Severity:** **P3 — Low**
* **Status:** **CONFIRMED BUG**
* **Evidence:** `ruff check backend/` produces 50 errors (F401 unused imports, UP006 deprecated typing syntax, B007 unused loop variables).

---

### FINDING P3-003: 17 Mypy Static Type Checking Errors in Backend
* **Category:** Code Quality / Static Typing
* **Severity:** **P3 — Low**
* **Status:** **CONFIRMED BUG**
* **Evidence:** `mypy backend/app` produces 17 errors in 5 files (untyped functions, invalid dictionary assignment in `database.py`, missing `user_id` on `Order`).

---

### FINDING P3-004: Invalid CSS Properties in Tailwind Build
* **Category:** Frontend Build
* **Severity:** **P3 — Low**
* **Status:** **CONFIRMED BUG**
* **Evidence:** `vite build` warns: `"file" is not a known CSS property at .[file:line]{file:line}`.

---

## 10. SECURITY AUDIT (OWASP TOP 10 MAPPING)

| OWASP Top 10 Category | Status | Codebase Finding | Severity |
| :--- | :---: | :--- | :---: |
| **A01: Broken Access Control** | **FAIL** | BOLA in guest order lookup (`orders.py:281`); Unauthenticated admin auto-provisioning (`auth.py:176`). | **P0 / P1** |
| **A02: Cryptographic Failures** | **FAIL** | Committed production secrets in Git history; Hardcoded plain text password in client bundle. | **P0** |
| **A03: Injection** | **PASS** | SQLAlchemy parameterized queries used throughout; No raw SQL string interpolation. | — |
| **A04: Insecure Design** | **FAIL** | Client-side emergency admin login bypass (`SuperAdminDashboard.tsx:426`); Decoupled state. | **P0 / P1** |
| **A05: Security Misconfiguration** | **FAIL** | Internal exception reflected in HTTP 500 (`orders.py:254`); Vercel missing API proxy. | **P0 / P2** |
| **A06: Vulnerable Components** | **FAIL** | `sharp <= 0.35.4-rc.0` High CVE in npm audit; `esbuild` path read issue. | **P2** |
| **A07: Identification & Auth Failures** | **FAIL** | Plaintext admin password `NIL@apl321` in frontend; Static dev TOTP bypass `123456`. | **P0** |
| **A08: Software & Data Integrity** | **FAIL** | Customer and delivery address dropped during order creation; Non-atomic frontend quote fallback. | **P0 / P1** |
| **A09: Security Logging & Monitoring** | **PASS** | Structured `AuthAuditLog` table records logins; Security headers middleware configured. | — |
| **A10: Server-Side Request Forgery (SSRF)**| **PASS** | Webhooks validate HMAC signatures; No dynamic outbound URL requests based on user input. | — |

---

## 11. FRONTEND AUDIT

- **Aesthetics & UI**: Premium industrial aesthetics utilizing AISI SS304 stainless steel color tones and solar blue (`#0054A6`). Micro-animations with Framer Motion and Lucide icons are visually impressive.
- **Component Sizing & Maintainability**: Serious god-component anti-pattern. `SuperAdminDashboard.tsx` is 3,729 lines (199 KB). `ApeProductListingWizard.tsx` is 193 KB. `useStore.ts` is 2,827 lines (108 KB). These violate clean architecture and cause significant memory pressure during development.
- **Navigation Invariant**: Navigating to a product detail view does not push a route to browser history (`/product/:asin`). Refreshing the browser resets the view to the store catalog.

---

## 12. BACKEND AUDIT

- **Architecture**: Modular FastAPI application with clean separation between routers, services, schemas, and models.
- **Transactions & Concurrency**: Good use of row-level locking (`with_for_update()`) in inventory reservations to prevent race conditions.
- **Critical Flaw**: Database models do not store customer contact or address details on orders.

---

## 13. FASTAPI AUDIT

- **Dependency Injection**: Well-structured dependencies in `app/api/deps.py` for DB session handling (`get_db`), session cookie authentication (`get_current_user`), and role checking (`require_roles`).
- **CSRF Defense**: Double-submit CSRF cookie pattern with constant-time HMAC comparison implemented on state-modifying endpoints.
- **Error Reflection**: Unhandled exception handler leaks internal Python error classes to callers.

---

## 14. DATABASE AUDIT

- **Schema Design**: PostgreSQL with SQLAlchemy 2.0 async and Alembic migrations (001 to 007).
- **Positive Design**: `inventory_movements` table is an immutable append-only ledger. `price_versions` supports temporal pricing without overwriting historical data.
- **Fatal Gap**: Missing `user_id` on `orders` table; missing `addresses` table or delivery address columns on `orders`.
- **Committed DB**: `backend/apollo_ecommerce.db` (binary SQLite database) is tracked in Git.

---

## 15. AUTHENTICATION & AUTHORIZATION

- **Admin Authentication**: Password verified against Argon2id hash; 6-digit TOTP (RFC 6238). Compromised by client-side emergency bypass and backend auto-provisioning.
- **Customer Authentication**: Mobile 4-digit OTP via MSG91. Creates user with `role=UserRole.SUPPORT` due to missing `CUSTOMER` enum.

---

## 16. PRODUCT & CART AUDIT

- **Catalog Persistence**: Products loaded from PostgreSQL when API is online, but falls back to `mockData.ts` and `localStorage`.
- **Wrong Product Bug**: `ProductCard.tsx:173` falls back to `products[0]` when ASIN lookup fails, causing wrong items to be added to cart.

---

## 17. CHECKOUT AUDIT

- **Gate 2C Verification**: Proceeds to checkout only when an authoritative quote is validated.
- **Client Fallback**: If backend is offline, `calculateStatutoryQuoteFallback` generates estimates using JS floating-point arithmetic.

---

## 18. PAYMENT & COD AUDIT

- **COD Surcharge**: Backend `PricingEngine` accurately applies 2.5% surcharge with upward rounding to the nearest ₹5 multiple.
- **Razorpay Order Creation**: Mocks order ID (`order_xxxx`) instead of invoking live Razorpay API.

---

## 19. SHIPPING AUDIT

- **Carrier**: Official India Post Speed Post tariffs locked to Origin Hub Kathwada GIDC, Ahmedabad (382430).
- **Weight Slabs**: Correctly calculated by `ShippingService` in backend with statutory 18% shipping GST.

---

## 20. ADMIN PANEL AUDIT

- **Tabs**: Products, Orders, Customers, Inquiries, Coupons, Returns, Reports (GSTR-1, Reconciliation).
- **Decoupling**: All mutations write to browser `localStorage` instead of FastAPI endpoints.

---

## 21. SUPER ADMIN AUDIT

- **Privilege Escalation Risk**: Plaintext password `NIL@apl321` in frontend bundle allows unauthenticated access when backend is offline.

---

## 22. API INVENTORY

| Method | Path | Auth Required | Role Required | Request Model | Response Model | Status | Risk Level |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: | :---: |
| `GET` | `/` | No | None | None | `dict[str, str]` | Active | Low |
| `GET` | `/api/v1/health` | No | None | None | `dict[str, str]` | Active | Low |
| `POST` | `/api/v1/auth/login` | No | None | `UserLoginRequest` | `LoginSuccessResponse` | Active | Low |
| `POST` | `/api/v1/auth/admin-login` | No | None | `AdminLoginRequest` | `LoginSuccessResponse` | Active | **P0 (Critical)** |
| `POST` | `/api/v1/auth/logout` | Yes | Authenticated | None | `dict[str, str]` | Active | Low |
| `GET` | `/api/v1/auth/me` | Yes | Authenticated | None | `UserResponse` | Active | Low |
| `GET` | `/api/v1/auth/csrf` | Yes | Authenticated | None | `CSRFResponse` | Active | Low |
| `POST` | `/api/v1/auth/otp/send` | No | None | `SendOtpRequest` | `SendOtpResponse` | Active | Low |
| `POST` | `/api/v1/auth/otp/verify` | No | None | `VerifyOtpRequest` | `VerifyOtpResponse` | Active | **P1 (High)** |
| `POST` | `/api/v1/admin/users` | Yes | `OWNER` | `UserCreateRequest` | `UserResponse` | Active | Low |
| `PATCH` | `/api/v1/admin/users/{id}`| Yes | `OWNER` | `UserUpdateRequest` | `UserResponse` | Active | Low |
| `GET` | `/api/v1/admin/users` | Yes | `OWNER`, `AUDITOR`| None | `list[UserResponse]` | Active | Low |
| `POST` | `/api/v1/quotes` | No | None | `CreateQuoteRequest`| `QuoteResponse` | Active | Low |
| `POST` | `/api/v1/orders` | Optional | None | `CreateOrderRequest`| `OrderResponse` | Active | **P0 (Critical)** |
| `GET` | `/api/v1/orders/{id}` | Optional | Owner/Staff | None | `OrderResponse` | Active | **P1 (High)** |
| `GET` | `/api/v1/orders` | Yes | Authenticated | None | `list[OrderResponse]` | **Crashing** | **P1 (High)** |
| `PATCH` | `/api/v1/orders/{id}/status`| Yes | `OWNER`, `ORDER_OPERATIONS`| `UpdateOrderStatusRequest`| `OrderResponse`| Active | Low |
| `POST` | `/api/v1/payments/razorpay/create-order`| Optional | None | `RazorpayCreateOrderRequest`| `RazorpayCreateOrderResponse`| Active | **P1 (High)** |
| `POST` | `/api/v1/payments/razorpay/verify`| Optional | None | `RazorpayVerifyPaymentRequest`| `RazorpayVerifyPaymentResponse`| Active | Low |
| `POST` | `/api/v1/payments/razorpay/webhook`| No | None (Signature) | Raw Body | `dict[str, str]` | Active | **P1 (High)** |
| `GET` | `/api/v1/products/` | No | None | Query params | `list[ProductResponse]`| Active | Low |
| `POST` | `/api/v1/products/` | Yes | `OWNER`, `CATALOG_MANAGER` | `ProductCreate` | `ProductResponse` | Active | Low |
| `GET` | `/api/v1/products/{id}`| No | None | None | `ProductResponse` | Active | Low |
| `PATCH` | `/api/v1/products/{id}`| Yes | `OWNER`, `CATALOG_MANAGER` | `ProductUpdate` | `ProductResponse` | Active | Low |
| `DELETE`| `/api/v1/products/{id}`| Yes | `OWNER` | None | `dict[str, str]` | Active | Low |
| `POST` | `/api/v1/products/{id}/variants`| Yes | `OWNER`, `CATALOG_MANAGER`| `ProductVariantCreate`| `ProductVariantResponse`| Active| Low |
| `GET` | `/api/v1/pricing/versions`| Yes | `OWNER`, `FINANCE`, `AUDITOR`| Query params | `list[PriceVersionResponse]`| Active | Low |
| `POST` | `/api/v1/pricing/versions`| Yes | `OWNER`, `FINANCE` | `PriceVersionCreate`| `PriceVersionResponse`| Active | Low |
| `GET` | `/api/v1/pricing/active`| No | None | Query params | `PriceVersionResponse` | Active | Low |
| `POST` | `/api/v1/pricing/calculate`| No | None | `OrderCalculationRequest`| `OrderCalculationResult`| Active | Low |
| `GET` | `/api/v1/inventory/items`| Yes | `OWNER`, `INVENTORY_MANAGER`| Query params | `list[InventoryItemResponse]`| Active | Low |
| `POST` | `/api/v1/inventory/receipt`| Yes | `OWNER`, `INVENTORY_MANAGER`| `InventoryStockReceiptRequest`| `InventoryMovementResponse`| Active | Low |
| `POST` | `/api/v1/inventory/adjustment`| Yes| `OWNER`, `INVENTORY_MANAGER`| `InventoryAdjustmentRequest`| `InventoryMovementResponse`| Active | Low |

---

## 23. PERFORMANCE AUDIT

- **Bundle Size**: Total production JavaScript bundle exceeds 3.1 MB uncompressed (`exceljs` alone is 940 kB).
- **Optimization Strategy**: Split `exceljs` into an on-demand dynamic chunk.

---

## 24. SEO AUDIT

- **Meta & OpenGraph**: All pages include dynamic OpenGraph titles, descriptions, and canonical URLs.
- **Product Structured Data**: `ProductSchema` microdata embedded on product cards.
- **Robots.txt Defect**: Fails to disallow `/admin` and `/account`.

---

## 25. ACCESSIBILITY AUDIT

- **A11y Violations**: Bypassed color contrast check in `a11y.spec.ts`.
- **Keyboard Navigation**: Modals implement Escape-key handling, but focus trapping is incomplete in `ApeProductListingWizard`.

---

## 26. DEPENDENCY AUDIT

- **Frontend (`package.json`)**: 7 CVEs identified by `npm audit` (High in `sharp <=0.35.4-rc.0`).
- **Backend (`pyproject.toml`)**: Missing `requirements.txt` causing broken CI build step.

---

## 27. GITHUB & CI/CD AUDIT

- **Workflows**: `.github/workflows/ci.yml` has 7 jobs, but suppresses Gitleaks and NPM audit failures with `continue-on-error: true`.
- **Backend Quality Gate**: Does not install backend dependencies because `requirements.txt` is missing.

---

## 28. TEST COVERAGE AUDIT

- **Frontend**: 16 test files, 112 passed tests (Vitest).
- **Backend**: 68 passed unit tests, but 50+ integration tests skipped due to missing PostgreSQL container. Total backend coverage is 66%.

---

## 29. REGRESSION RISKS

1. **Wrong product in cart**: Caused by `ProductCard.tsx:173` falling back to `products[0]`.
2. **Checkout page loss on refresh**: Caused by unrouted `selectedProduct` state in `App.tsx`.
3. **Decoupled Admin orders**: Real orders placed in PostgreSQL are invisible in the Admin panel.

---

## 30. DEAD CODE & TECHNICAL DEBT

1. `MOCK_USERS` and `MOCK_B2B_ORGANIZATIONS` in `mockData.ts` are partially unused.
2. `useStore.ts` contains duplicate statutory quote math (`calculateStatutoryQuoteFallback`).
3. `apollo_ecommerce.db` committed in `backend/` creates dirty git tree.

---

## 31. RECOMMENDED ARCHITECTURE IMPROVEMENTS

1. Migrate all Admin panels from `localStorage` to authenticated FastAPI REST endpoints.
2. Implement an Alembic migration adding `user_id`, `customer_name`, `customer_phone`, `customer_email`, and structured address fields to `orders`.
3. Configure Vercel rewrite proxying `/api/v1/(.*)` to the production backend.

---

## 32. REMEDIATION ROADMAP

### PHASE 1 — Security & P0 (Mandatory Immediate Hotfixes)
- Rotate compromised Razorpay, MSG91, MongoDB, and India Post credentials.
- Purge `.env` from Git history with `git-filter-repo`.
- Delete client-side admin password backdoor from `SuperAdminDashboard.tsx`.
- Fix `POST /api/v1/auth/admin-login` to reject non-existent users.
- Add Alembic migration 008 to persist customer and delivery address fields on `orders`.
- Update `vercel.json` with `/api/v1` rewrite proxy and backend CSP header.

### PHASE 2 — P1 Business Bugs
- Implement BOLA token or OTP verification on guest order endpoint (`/api/v1/orders/{id}`).
- Add `user_id` to `Order` model to fix crashing `GET /api/v1/orders`.
- Connect `SuperAdminDashboard` to live backend `/api/v1/orders` and `/api/v1/products`.
- Add `CUSTOMER` role to `UserRole` enum.
- Remove `|| products[0]` fallback bug in `ProductCard.tsx`.
- Create `/product/:asin` route in React Router.

### PHASE 3 — P2 Reliability & Testing
- Spin up PostgreSQL 16 test container in CI and local dev so all 50+ integration tests pass.
- Sanitize HTTP 500 error responses in `orders.py`.
- Update `sharp` and fix 7 npm audit vulnerabilities.
- Add `requirements.txt` to `backend/` and remove `continue-on-error` from CI.

### PHASE 4 — Performance & UX
- Code-split `exceljs` and `jspdf` to reduce initial bundle size below 1 MB.
- Disallow `/admin` in `public/robots.txt`.
- Re-enable and fix Axe color contrast rules in `a11y.spec.ts`.

### PHASE 5 — Technical Debt & Cleanup
- Remove double-click backdoor from Header and Footer logos.
- Untrack `apollo_ecommerce.db` from Git.
- Fix 50 Ruff formatting errors and 17 Mypy type annotations in backend.

---

## 33. FILES RECOMMENDED FOR MODIFICATION

| Priority | File Path | Required Modification |
| :---: | :--- | :--- |
| **P0** | `src/components/admin/SuperAdminDashboard.tsx` | Remove hardcoded `NIL@apl321` password and emergency backdoor. Connect to live backend. |
| **P0** | `backend/app/api/v1/endpoints/auth.py` | Prevent unauthenticated auto-provisioning of `OWNER` accounts in `admin-login`. |
| **P0** | `backend/app/models/order.py` | Add customer contact and delivery address columns to `Order`. |
| **P0** | `backend/app/api/v1/endpoints/orders.py` | Persist customer and address payload into `Order` table. |
| **P0** | `vercel.json` | Add rewrite rule for `/api/v1/:path*` to backend host; update CSP `connect-src`. |
| **P0** | `.env` & `.gitignore` | Remove secrets from `.env`, purge Git history, remove `VITE_` prefix from sensitive keys. |
| **P1** | `backend/app/models/auth.py` | Add `CUSTOMER` and `B2B_CUSTOMER` to `UserRole`. |
| **P1** | `backend/app/api/v1/endpoints/otp.py` | Assign `UserRole.CUSTOMER` upon OTP signup instead of `SUPPORT`. |
| **P1** | `src/components/ProductCard.tsx` | Remove `|| products[0]` fallback to eliminate wrong-product bug. |
| **P1** | `src/App.tsx` | Add `<Route path="/product/:asin" ... />` for persistent PDP routing. |
| **P2** | `public/robots.txt` | Add `Disallow: /admin` and `Disallow: /account`. |
| **P2** | `.github/workflows/ci.yml` | Remove `continue-on-error: true`; generate `backend/requirements.txt`. |
| **P2** | `tests/e2e/a11y.spec.ts` | Re-enable `color-contrast` rule and fix theme contrast. |

---

## 34. TESTS REQUIRED (E2E TEST MATRIX)

| Test ID | Test Name | Journey & Validation Criteria |
| :--- | :--- | :--- |
| **E2E-001** | Signup Flow | New customer registration with 10-digit mobile number, OTP dispatch, and address creation. |
| **E2E-002** | Login Flow | Customer mobile OTP login; verification of HttpOnly session cookie and CSRF token. |
| **E2E-003** | OTP Rate Limiting | Enforce 30s cooldown and max 3 invalid attempts lock. |
| **E2E-004** | Browse Catalog | View store catalog; filter by SS304 category; search by SKU keyword. |
| **E2E-005** | Product Details | Direct navigation to `/product/:asin`; verify images, specs, HSN, and stock badge. |
| **E2E-006** | Add to Cart | Add specific variant (e.g. 35mm clip); verify correct SKU and unit price in cart. |
| **E2E-007** | Update Cart | Modify quantity; verify recalculation of cart totals and B2B MOQ constraints. |
| **E2E-008** | Checkout Gate | Attempt checkout as guest; verify redirect to AuthModal; return to checkout upon login. |
| **E2E-009** | Prepaid Checkout | Generate authoritative quote; create order; verify Razorpay popup initialization. |
| **E2E-010** | COD Checkout | Select COD payment; verify 2.5% surcharge and upward rounding to nearest ₹5 multiple. |
| **E2E-011** | Order Confirmation | Verify order recorded in PostgreSQL; check receipt with itemized line GST and Speed Post postage. |
| **E2E-012** | Order Tracking | Lookup order by AWB / Order Number; verify status milestone display. |
| **E2E-013** | Admin Login | Verify password + 6-digit TOTP code; reject invalid password or fake bypass code. |
| **E2E-014** | Admin Product Mgmt| Edit active price version via backend API; verify storefront updates. |
| **E2E-015** | Admin Order Mgmt | Transition order status from `CONFIRMED` to `PROCESSING` to `SHIPPED` via state machine. |
| **E2E-016** | Unauthorized Access | Attempt accessing `/api/v1/orders` and `/api/v1/admin/users` as customer; expect HTTP 403. |
| **E2E-017** | Wrong Product Test | Navigate across multiple product cards; verify cart strictly retains selected variant SKU. |
| **E2E-018** | Refresh State Test | Refresh page mid-checkout; verify session persistence and cart preservation. |

---

## 35. FINAL PRODUCTION READINESS ASSESSMENT

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║             STATUS: NOT READY FOR PRODUCTION                         ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Justification:
The Apollo Engineering E-Commerce platform possesses high-quality UI design, rich animations, robust mathematical calculation models (`PricingEngine`), and an append-only inventory ledger. However, it cannot be deployed to production in its current state due to:
1. **Critical Security Vulnerabilities**: Plaintext admin credentials in the frontend bundle, live production keys committed in Git history, and arbitrary admin auto-provisioning.
2. **Severe Data Loss Defect**: Orders created on the backend completely discard the customer name, phone, email, and delivery address.
3. **Broken Deployment Routing**: Vercel configuration lacks routing for `/api/v1`, breaking all backend API communication in production.
4. **State Decoupling**: The Admin portal operates on local browser storage instead of the authoritative PostgreSQL database.

**Deployment Gate:** All P0 and P1 issues must be resolved and verified before production release.

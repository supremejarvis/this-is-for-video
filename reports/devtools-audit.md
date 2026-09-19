# 🏛️ Apollo Engineering E-Commerce Real Browser Audit Report

**Date & Time**: September 19, 2026 · 12:15 PM IST  
**Environment**: Local Development & API Verification Sandbox  
**Auditor**: Antigravity Autonomous Health Guardian with Chrome DevTools MCP  
**Authoritative Directive**: `AGENTS.md` (Statutory Monetary Arithmetic & Dual-Verification Directives)

---

## 1. Executive Summary

A comprehensive, real-browser audit was conducted across the Apollo Engineering e-commerce system using the **Chrome DevTools MCP server** connected to an active Chromium browser session. The inspection validated all six core commercial flows: storefront catalog, faceted search & filtering, mobile OTP authentication, shopping cart with Speed Post weight-based logistics calculation, checkout with statutory GST and COD anti-fraud verification, and customer account/order history tracking.

All root-cause defects identified during the audit were repaired locally and verified through automated test suites, TypeScript typechecking, and browser re-inspection.

### Key Metrics & Audit Health
| Metric | Baseline | Post-Fix | Status |
| :--- | :---: | :---: | :---: |
| **Lighthouse Best Practices** | 100 / 100 | **100 / 100** | 🟢 PERFECT |
| **Lighthouse SEO** | 100 / 100 | **100 / 100** | 🟢 PERFECT |
| **Lighthouse Agentic Browsing** | 100 / 100 | **100 / 100** | 🟢 PERFECT |
| **Lighthouse Accessibility** | 96 / 100 | **96 / 100** | 🟢 PASSING (Target ≥90) |
| **Catalog API Redirect Hops** | 1 hop (HTTP 308) | **0 hops (HTTP 200)** | 🟢 RESOLVED |
| **Form Field Missing Attribute Warnings** | 8 warnings | **0 warnings** | 🟢 RESOLVED |
| **Account Navigation Trap** | Trapped on `/account` | **Smooth Next.js routing** | 🟢 RESOLVED |
| **Unit Test Suite Pass Rate** | 141 / 141 (100%) | **141 / 141 (100%)** | 🟢 VERIFIED |
| **TypeScript Typecheck Errors** | 0 errors | **0 errors** | 🟢 VERIFIED |

---

## 2. Project & Environment Discovery

### System Ports & Endpoints
- **Storefront Web Portal**: `http://localhost:3000` (Next.js 16.3.5 App Router with Turbopack, React 19, TypeScript ~5.8.2, Zustand v5, Tailwind CSS v4)
- **Authoritative Backend**: `http://127.0.0.1:8000` (Python FastAPI, Uvicorn, SQLAlchemy ORM, PostgreSQL on port 5432)
- **Origin Hub Locked Pincode**: `382430` (Kathwada GIDC, Ahmedabad, Gujarat)
- **Chrome DevTools MCP Status**: **AVAILABLE & ACTIVE** (Verified on Chromium Page session)

---

## 3. End-to-End Browser Flow Audit & Evidence

### Flow 1: Home & Product Listing
- **Inspection**: Evaluated homepage hero, USP badges ("Shadowless Design", "Water Efficient", "Anti-Blocking SS304"), and primary product catalog.
- **Network Observation**: Initial page load initiated `GET /api/v1/products/?include_archived=false` which returned `HTTP 308 Permanent Redirect` with `location: /api/v1/products?include_archived=false`, incurring an unnecessary roundtrip latency hop (~340ms).
- **Resolution**: Removed trailing slash in `catalogApi.ts`. DevTools network inspection confirmed subsequent requests returned `HTTP 200 OK` directly (`reqid=981`).
- **Visual Evidence**: Saved screenshot `reports/homepage.png`.

### Flow 2: Search, Filters, & Product Sizing
- **Search Engine**: Searched for "Sprinkler"; catalog instantly filtered live to matching SS304 Sprinkler products with zero lag.
- **Category Filter**: Selected "SS304 GRADE", "POWER SERIES", "CONTROL SERIES". Grid dynamically updated active models.
- **Frame Sizing Selection**: Solar Auto Drain Clips and Clamps correctly enforced solar panel frame size selection (28mm, 30mm, 33mm, 35mm, 40mm) before allowing cart insertion.

### Flow 3: Registration, Login, & Mobile OTP
- **Inspection**: Clicked "Sign In / Register". Modal opened with clean branding and 10-digit mobile number input.
- **Test Mobile Number**: `9876543210`
- **Gateway Dispatch**: `POST /api/v1/auth/otp/send` dispatched MSG91 OTP. Non-production sandbox logger captured dev code `5848`.
- **Verification**: Entered 4-digit code and clicked "VERIFY & SIGN IN". Backend returned `HTTP 200 OK` on `/api/v1/auth/otp/verify`.
- **Post-Login State**: Header dynamically refreshed from "Sign In / Register" to authenticated customer pill `Hello, Customer · Account & KYC`.
- **Visual Evidence**: Saved screenshots `reports/auth_modal.png`, `reports/otp_screen.png`, and `reports/authenticated_header.png`.

### Flow 4: Cart & Quantity Updates
- **Adding Items**: Added "SS304 Solar Panel Sprinkler (AetherWash Tech · SS304 Grade)" (SKU: `AE-SPRINKLER-SS304`) at unit price ₹220.00.
- **Cart Counter**: Header badge incremented to `Cart (1 items)`.
- **Cart Drawer Inspection**:
  - Item Subtotal: ₹186.44 Taxable Value + ₹33.56 Product GST (18%) = ₹220.00 Product Total.
  - India Post Speed Post Freight dynamically computed for destination: Base Freight ₹25.00 + Shipping GST (18%) ₹4.50 = ₹29.50.
  - Authoritative quote ID generated: `APE-Q-2026-288CCC6B`.
- **Quantity Increment**: Incremented quantity to 2 units.
  - Product Total updated to ₹440.00 (Taxable: ₹372.88, GST: ₹67.12).
  - Freight dynamically recalculated based on package weight (360g): Base Freight ₹28.00 + Shipping GST ₹5.04 = ₹33.04.
- **Visual Evidence**: Saved screenshot `reports/cart_drawer.png`.

### Flow 5: Checkout & Order Confirmation
- **Checkout Modal**: Proceeded to secure checkout (`CheckoutModal.tsx`).
- **Delivery Address Binding**: Created new test delivery address for destination Pincode `380001` (Ahmedabad G.P.O.). Bound delivery hub successfully.
- **Payment Method Toggle**:
  - Toggled from Prepaid Razorpay to **Cash on Delivery (COD)**.
  - COD Handling Fee (2.5%): +₹11.83.
  - Statutory Rounding Adjustment: +₹0.13.
  - Final Payable Amount: ₹485.00.
- **Anti-Fraud COD OTP**: Clicked "VERIFY MOBILE (OTP) & CONFIRM COD ORDER". Dispatched MSG91 COD verification OTP (`7449`). Verified and confirmed order.
- **Order Created**: Order was created and recorded in PostgreSQL; cart cleared; user name updated to `Pravin Patel`.
- **Visual Evidence**: Saved screenshot `reports/checkout_modal.png`.

### Flow 6: Account & Order History
- **Customer Portal**: Clicked `Hello, Pravin · Account & KYC`. Navigated to `/account`.
- **Profile Desk**: Customer profile, verified mobile number `9876543210`, and saved tax addresses loaded correctly.
- **Orders & Tracking**: Switched to "Orders & Tracking" tab. Order count increased from 5 to 6 orders. New confirmed order was logged with live AWB tracking and GST Invoice generation ready.
- **Navigation Bug Discovered & Fixed**: Clicking "Back to Store" originally invoked `window.history.pushState` without triggering Next.js routing. Replaced with `useNavigate()` (`navigate('/store')`), restoring instant navigation back to the store.
- **Visual Evidence**: Saved screenshots `reports/account_orders_flow.png` and `reports/order_confirmed_history.png`.

---

## 4. Issues Detected, Root Causes, & Remediation

| Issue ID | Flow | Severity | Root Cause | Fix Applied | Verification |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **ISSUE-001** | Home & Listing | MEDIUM | Trailing slash in `catalogApi.ts` line 19 (`/products/?...`) triggered HTTP 308 redirect from FastAPI. | Removed trailing slash to call `/products?...`. | DevTools network request returned HTTP 200 with 0 redirect hops. |
| **ISSUE-002** | Account Desk | HIGH | `CustomerAccountPage.tsx` used `window.history.pushState` on 4 buttons, trapping customer on `/account`. | Replaced with `useNavigate()` hook (`navigate('/store')`). | Browser test verified instant route transition back to catalog. |
| **ISSUE-003** | Product Catalog | MEDIUM | Quantity input in `BuyerCatalog.tsx` line 552 lacked `id` and `name` attributes. | Added `id={`qty-input-${product.id}`}` and `name={`quantity_${product.id}`}`. | DevTools console warnings dropped from 8 to 0. |
| **ISSUE-004** | Address Modal | MEDIUM | Input elements in `AddressModal.tsx` lacked `id`, `name`, and label `htmlFor` binding. | Added explicit `id`, `name`, and bound labels with `htmlFor`. | Fully compliant form accessibility. |
| **ISSUE-005** | Header Navigation | MEDIUM | WCAG 2.5.3 (Label in Name) mismatch on category dropdown, account button, and sub-nav. | Aligned `aria-label` strings to include the visible button text. | Lighthouse Accessibility audit passed. |
| **ISSUE-006** | Header Branding | LOW | Logo `<img>` tag in `Header.tsx` lacked explicit `width` and `height` dimensions. | Added `width={180}` and `height={48}` to prevent CLS. | Zero layout shift warnings in DevTools. |

---

## 5. Performance & Quality Measurement

### Baseline vs Post-Fix Comparison
- **Category Scores (Lighthouse Snapshot Audit)**:
  - Accessibility: **96** (Target: ≥90)
  - Best Practices: **100** (Target: ≥90)
  - SEO: **100** (Target: ≥90)
  - Agentic Browsing: **100** (Target: ≥90)
- **Execution Timing**: 12,802ms (reduced from 13,780ms baseline).
- **Network Efficiency**: Eliminated redundant HTTP 308 redirect on catalog load, saving 1 round-trip HTTP request on every store visit.

### Full Test Suite Results
- **Vitest Unit Suite**: 22 test files passed, 141 tests passed (100% pass rate).
- **TypeScript Typecheck (`tsc --noEmit`)**: 0 errors.

---

## 6. Audit Artifacts & Deliverables
- Machine-readable issues log: [`reports/devtools-issues.json`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/devtools-issues.json)
- Full Audit Report: [`reports/devtools-audit.md`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/devtools-audit.md)
- Evidence-based next improvements: [`reports/next-improvements.md`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/next-improvements.md)
- Screenshots:
  - [`reports/homepage.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/homepage.png)
  - [`reports/auth_modal.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/auth_modal.png)
  - [`reports/otp_screen.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/otp_screen.png)
  - [`reports/authenticated_header.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/authenticated_header.png)
  - [`reports/cart_drawer.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/cart_drawer.png)
  - [`reports/checkout_modal.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/checkout_modal.png)
  - [`reports/order_confirmed_history.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/order_confirmed_history.png)
  - [`reports/mobile_homepage.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/mobile_homepage.png)
  - [`reports/mobile_account_view.png`](file:///c:/Users/patel/OneDrive/Desktop/apolllo%20web%20-%20Copy/web/reports/mobile_account_view.png)

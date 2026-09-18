# Roadmap: Apollo Engineering (APE Store)

## Overview

A phased architectural implementation of the Apollo Engineering B2B & B2C hybrid industrial e-commerce platform. The roadmap establishes the authoritative Python FastAPI backend and PostgreSQL single source of truth first (with exact Decimal money arithmetic, Razorpay webhook validation, and India Post adapter), followed by Next.js App Router storefront alignment, multi-lingual UI, B2B wholesale features, admin verification workflows, and end-to-end Playwright test validation.

## Phases

- [ ] **Phase 1: Authoritative FastAPI Backend Core, Decimal Money Engine & PostgreSQL Single Source of Truth** - Establish Python FastAPI backend, PostgreSQL models with Alembic migrations, authoritative Decimal pricing engine (B2C/B2B GST, COD rounding), Razorpay HMAC SHA256 webhook validation, and India Post CEPT adapter with fallback rates.
- [ ] **Phase 2: Next.js App Router Storefront Alignment, Visual Sizing Guide & Multi-Lingual UI** - Align presentation layer to Next.js App Router, implement AISI SS304 steel & solar blue visual identity via `frontend-design`, mandatory frame thickness sizing guide, and native Gujarati/Hindi/English localization.
- [ ] **Phase 3: B2B Wholesale Engine, Admin Central & Thermal Dispatch Manifests** - B2B GSTIN verification, Net-30 credit workflows, manual UPI QR approval dashboard, thermal 4x6" shipping label/manifest generation, and wrong-size replacement verification workflow.
- [ ] **Phase 4: Playwright End-to-End Validation, Vercel UI Performance Audits & Verification** - Comprehensive headless browser testing of full customer and admin journeys, a11y compliance, sub-50ms TTFB optimization, and GSD verification.

## Phase Details

### Phase 1: Authoritative FastAPI Backend Core, Decimal Money Engine & PostgreSQL Single Source of Truth

**Goal**: Build the authoritative Python FastAPI service and PostgreSQL single source of truth with mathematically exact Decimal money calculation, payment webhook safety, and India Post adapter.  
**Depends on**: Nothing (first phase)  
**Requirements**: ARCH-02, ARCH-03, MONEY-01, MONEY-02, MONEY-03, MONEY-04, MONEY-05, MONEY-06, PAY-01, PAY-02, PAY-03, PAY-04, LOG-01, LOG-02, LOG-03  
**Success Criteria** (what must be TRUE):

1. FastAPI backend runs with Pydantic v2 schemas and SQLAlchemy 2.0 ORM connected to PostgreSQL 16.
2. Alembic migrations manage database schema; all monetary columns use exact integer `paise` or `NUMERIC(12, 2)`.
3. Authoritative Decimal pricing engine calculates B2C inclusive GST, B2B exclusive GST, Shipping GST at 18%, Prepaid Total, and COD 2.5% surcharge rounded upward by admin rounding multiple.
4. Pytest boundary and unit tests verify every financial calculation formula with 100% precision.
5. Razorpay webhook handler validates `X-Razorpay-Signature` HMAC SHA256 and idempotently transitions orders to `PAID`.
6. Direct UPI QR orders persist as `PAYMENT_PENDING` with no automated confirmation.
7. India Post Speed Post adapter calculates rates using Kathwada GIDC origin (`382430`) with official CEPT contracts and domestic fallback rate tables.  

**Plans**: 4 plans (01-01: Backend Scaffold & PostgreSQL Models, 01-02: Decimal Money Engine & Boundary Tests, 01-03: Payment Webhook Safety & Idempotency, 01-04: India Post CEPT Adapter & Fallback Rates)

### Phase 2: Next.js App Router Storefront Alignment, Visual Sizing Guide & Multi-Lingual UI

**Goal**: Modernize storefront to Next.js App Router with React 19, Tailwind CSS, AISI SS304 steel aesthetics (`frontend-design`), mandatory solar panel frame thickness sizing guide, and trilingual support (Gujarati, Hindi, English).  
**Depends on**: Phase 1  
**Requirements**: ARCH-01, SIZE-01, LANG-01  
**Success Criteria** (what must be TRUE):

1. Storefront runs on Next.js App Router with React 19 and Tailwind CSS.
2. PDP includes a mandatory visual sizing guide requiring frame thickness selection (30mm, 35mm, 40mm) before cart addition.
3. UI fully localized in Gujarati, Hindi, and English with dynamic language switching.
4. Visual design reflects premium industrial engineering standards (AISI SS304 steel tones, solar blue `#0054A6`).  

**Plans**: TBD

### Phase 3: B2B Wholesale Engine, Admin Central & Thermal Dispatch Manifests

**Goal**: Implement B2B organizational onboarding with GSTIN validation, admin UPI verification portal, thermal shipping label printing, and wrong-size replacement workflow.  
**Depends on**: Phase 2  
**Requirements**: LOG-04, SIZE-02, LANG-02, LANG-03  
**Success Criteria** (what must be TRUE):

1. B2B customers can register with GSTIN, view tiered wholesale grids, and request wholesale invoices.
2. Admin portal enables manual inspection and approval of Direct UPI QR orders.
3. Admin can generate thermal 4x6" India Post shipping labels and daily pickup manifests.
4. Wrong-size replacement workflow enforces customer caliper photo upload, delivery fee collection (+18% GST), and admin inspection.  

**Plans**: TBD

### Phase 4: Playwright End-to-End Validation, Vercel UI Performance Audits & Verification

**Goal**: End-to-end automated verification with Playwright, performance audits using Vercel best practices, and final `/gsd-verify-work`.  
**Depends on**: Phase 3  
**Requirements**: All active requirements  
**Success Criteria** (what must be TRUE):

1. Playwright test suite passes full user journeys: B2C retail checkout, B2B wholesale quotation, UPI admin approval, and India Post tracking.
2. Vercel React best practices and web design guidelines audit passes with zero critical violations.
3. All UAT criteria verified via `/gsd-verify-work`.  

**Plans**: TBD

# Apollo Engineering (APE Store) Hybrid E-Commerce Ecosystem

## What This Is

Apollo Engineering is a world-class, high-concurrency B2B and B2C hybrid e-commerce platform specializing in industrial solar accessories (AISI SS304 solar panel water drain clips, automated solar panel cleaning sprinklers, walkaways, and brackets). Built with a Next.js App Router frontend, an authoritative Python FastAPI backend, and PostgreSQL as the single source of truth.

## Core Value

Zero-error authoritative transaction and logistics lifecycle — ensuring 100% paisa-accurate GST/COD money calculations, fraud-proof payment state transitions, and verified India Post Speed Post fulfillment from Kathwada GIDC (382430).

## Business Context

- **Customer**: B2C solar rooftop owners and B2B EPC contractors, solar installers, distributors, and industrial fabricators across India.
- **Revenue model**: Direct-to-consumer retail orders and high-volume B2B wholesale orders (tiered bulk pricing, Net-30 credit terms, GST input tax credit pass-through).
- **Success metric**: 100% billing accuracy, zero inventory overselling, <50ms storefront TTFB, and seamless Speed Post parcel dispatch.

## Requirements

### Validated
(None yet — brownfield codebase mapped, initializing project release)

### Active
- [ ] **ARCH-01**: Next.js App Router frontend with React 19, TypeScript, and Tailwind CSS.
- [ ] **ARCH-02**: Authoritative Python FastAPI backend with PostgreSQL 16, SQLAlchemy 2.0, and Alembic migrations as the single source of truth.
- [ ] **MONEY-01**: Authoritative Decimal pricing engine calculating Product Amount, 18% GST (B2C inclusive & B2B exclusive modes), Shipping GST, Prepaid Total, and 2.5% COD surcharge rounded upward by admin rounding multiple.
- [ ] **MONEY-02**: Comprehensive unit and boundary tests covering every tax, fee, and pricing formula.
- [ ] **PAY-01**: Razorpay HMAC SHA256 server-side webhook validation with idempotent event deduplication.
- [ ] **PAY-02**: Direct UPI QR orders strictly kept in `PAYMENT_PENDING` until manual admin inspection and approval (no auto-confirm via OCR/screenshots).
- [ ] **LOG-01**: India Post Speed Post shipping provider adapter with official CEPT API integration, Kathwada GIDC origin (382430), and domestic fallback rate tables.
- [ ] **LOG-02**: Thermal 4x6" shipping label and dispatch manifest generation.
- [ ] **SIZE-01**: Mandatory solar panel frame thickness visual sizing guide (30mm, 35mm, 40mm) and replacement policy enforcement.
- [ ] **LANG-01**: Multi-lingual storefront UI supporting Gujarati, Hindi, and English.
- [ ] **LANG-02**: AI customer support architecture supporting scheduled Indian languages with auto language detection.

### Out of Scope
- Secondary Node.js backend services (explicitly prohibited: Python FastAPI is the sole backend).
- Automatic payment confirmation via OCR or image scanning of payment screenshots.
- Client-side floating-point financial arithmetic.
- Inventing unverified CEPT API endpoints.

## Context

- Physical manufacturing hub: Kathwada GIDC, Ahmedabad, Gujarat (Origin Pincode: 382430).
- State code: Gujarat (24). Intrastate transactions use CGST 9% + SGST 9%; interstate transactions use IGST 18%.
- Existing frontend codebase in `src/` provides rich UI components, Zustand state, and styling tokens that are being structured into the Next.js App Router architecture.

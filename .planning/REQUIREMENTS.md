# Requirements: Apollo Engineering (APE Store)

**Defined:** 2026-09-04  
**Core Value:** Zero-error authoritative transaction and logistics lifecycle — ensuring 100% paisa-accurate GST/COD money calculations, fraud-proof payment state transitions, and verified India Post Speed Post fulfillment from Kathwada GIDC (382430).

## v1 Requirements

### 1. Architecture & Persistence (ARCH)
- [ ] **ARCH-01**: Unified Next.js App Router presentation tier using React 19, TypeScript, and Tailwind CSS.
- [ ] **ARCH-02**: Python FastAPI backend as the exclusive authoritative API service (no secondary Node.js backend).
- [ ] **ARCH-03**: PostgreSQL 16 database with SQLAlchemy 2.0 and Alembic migrations as the single source of truth for products, pricing, inventory, customers, orders, and payment statuses.

### 2. Money Calculation & GST Engine (MONEY)
- [ ] **MONEY-01**: Prohibit JavaScript floating-point arithmetic for money; perform all authoritative calculations in FastAPI using Python `Decimal` and store values in paise or exact decimal columns.
- [ ] **MONEY-02**: Support Dual Configured Unit Price modes:
  - B2C GST-Inclusive Mode: $\text{Net Base} = \frac{\text{Unit Price}}{1.18}$; $\text{Product GST} = \text{Unit Price} - \text{Net Base}$.
  - B2B GST-Exclusive Mode: $\text{Product Amount} = \text{Qty} \times \text{Unit Price}$; $\text{Product GST} = \text{Product Amount} \times 0.18$.
- [ ] **MONEY-03**: Calculate Shipping GST at 18% on Base Shipping ($\text{Shipping GST} = \text{Base Shipping} \times 0.18$), and determine Prepaid Total ($\text{Prepaid Total} = \text{Product Amount (incl. GST)} + \text{Base Shipping} + \text{Shipping GST}$).
- [ ] **MONEY-04**: Apply Cash on Delivery (COD) 2.5% surcharge on Prepaid Total ($\text{COD Total} = \text{Prepaid Total} \times 1.025$), rounded upward only according to the admin-configured rounding multiple (e.g. nearest ₹1 or ₹5).
- [ ] **MONEY-05**: Ensure frontend totals are treated as provisional estimates with backend re-computing authoritative totals before order creation.
- [ ] **MONEY-06**: Provide 100% unit and boundary test coverage for all pricing, tax, and fee calculations.

### 3. Payment Safety & Webhooks (PAY)
- [ ] **PAY-01**: Razorpay payments transition to `PAID` status exclusively after verified server-side HMAC SHA256 webhook signature validation.
- [ ] **PAY-02**: Direct UPI QR orders strictly remain in `PAYMENT_PENDING` status until an administrator manually inspects bank records and confirms.
- [ ] **PAY-03**: Prohibit automatic payment confirmation from OCR or uploaded payment screenshots.
- [ ] **PAY-04**: Implement webhook idempotency in PostgreSQL to prevent duplicate order confirmations, payments, or inventory updates.

### 4. Logistics & India Post Integration (LOG)
- [ ] **LOG-01**: Implement a standardized shipping provider adapter adhering strictly to official CEPT India Post API documentation and credentials (no invented endpoints).
- [ ] **LOG-02**: Lock shipping origin hub to Kathwada GIDC, Ahmedabad (**Pincode: 382430**).
- [ ] **LOG-03**: Provide a configurable fallback domestic rate table based on destination pincode distance zones and parcel weight slabs when CEPT API is unreachable.
- [ ] **LOG-04**: Generate thermal 4x6" shipping labels with official India Post consignment barcodes and dispatch manifests.

### 5. Sizing Verification & Replacement Policy (SIZE)
- [ ] **SIZE-01**: Mandatory solar panel frame thickness visual measurement guide (30mm, 35mm, 40mm) on PDP before checkout.
- [ ] **SIZE-02**: Enforce wrong-size replacement workflow: customer photo upload with caliper/ruler measurement, customer liability for return/replacement shipping + 18% GST, and manual admin inspection approval before replacement dispatch.

### 6. Multi-Lingual Architecture (LANG)
- [ ] **LANG-01**: Multi-lingual storefront UI with first-class support for **Gujarati (ગુજરાતી)**, **Hindi (हिन्दी)**, and **English**.
- [ ] **LANG-02**: Customer language auto-detection and conversational response matching without language mixing.
- [ ] **LANG-03**: AI customer support architecture designed to support all scheduled Indian languages.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Secondary Node.js / Express Backend | Python FastAPI is the single authoritative backend. |
| Automated OCR Payment Verification | Anti-fraud mandate: manual admin approval required for Direct UPI QR. |
| Invented CEPT API Endpoints | Compliance mandate: use only official documented CEPT endpoints and fallback tables. |
| Floating-Point JS Math for Authoritative Totals | Precision mandate: money must be calculated with FastAPI Decimal / paise. |

## Traceability Matrix

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 2 | Planned |
| ARCH-02 | Phase 1 | Planned |
| ARCH-03 | Phase 1 | Planned |
| MONEY-01 | Phase 1 | Planned |
| MONEY-02 | Phase 1 | Planned |
| MONEY-03 | Phase 1 | Planned |
| MONEY-04 | Phase 1 | Planned |
| MONEY-05 | Phase 1 | Planned |
| MONEY-06 | Phase 1 | Planned |
| PAY-01 | Phase 1 | Planned |
| PAY-02 | Phase 1 | Planned |
| PAY-03 | Phase 1 | Planned |
| PAY-04 | Phase 1 | Planned |
| LOG-01 | Phase 1 | Planned |
| LOG-02 | Phase 1 | Planned |
| LOG-03 | Phase 1 | Planned |
| LOG-04 | Phase 3 | Planned |
| SIZE-01 | Phase 2 | Planned |
| SIZE-02 | Phase 3 | Planned |
| LANG-01 | Phase 2 | Planned |
| LANG-02 | Phase 3 | Planned |
| LANG-03 | Phase 3 | Planned |

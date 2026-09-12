# External Integrations

**Analysis Date:** 2026-09-04

## APIs & External Services

**Payment Processing:**
- **Razorpay Payment Gateway** (`src/services/razorpayService.ts`):
  - Purpose: Online prepaid payment collection via Cards, UPI, NetBanking, and Wallets.
  - Client / SDK: Frontend Razorpay Checkout script (`https://checkout.razorpay.com/v1/checkout.js`) with backend signature verification.
  - Auth: `VITE_RAZORPAY_KEY_ID` (client) and `RAZORPAY_KEY_SECRET` (backend).
  - Security Mandate: Orders transition to `PAID` status **strictly and only** after verified server-side HMAC SHA256 webhook signature validation. Frontend callbacks are treated as advisory.
  - Webhook Idempotency: Webhook events must be idempotent using unique transaction IDs to avoid duplicate order processing or inventory decrements.

- **Direct UPI QR (Offline / Manual)**:
  - Purpose: Zero-fee direct bank transfers via dynamic/static UPI QR codes.
  - Verification Mandate: Orders remain in `PAYMENT_PENDING` status until an admin manually verifies the payment in bank records and approves it.
  - Anti-Fraud Mandate: OCR or uploaded payment screenshots must NEVER automatically confirm payments.

**SMS & WhatsApp Messaging:**
- **MSG91 Integrated Communications** (`src/services/msg91OtpService.ts`):
  - Purpose: High-deliverability OTP login verification, fallback SMS/Voice retries, and transactional WhatsApp order updates.
  - Auth: `MSG91_AUTH_KEY` / `VITE_MSG91_AUTH_KEY`.
  - Flow:
    - Primary: Send OTP via MSG91 OTP API (`/api/v5/otp`).
    - Fallback: Voice call retry (`/api/v5/otp/retry?retrytype=voice`) or SMS retry.
    - WhatsApp Alerts: Outbound WhatsApp template messages for order booking and Speed Post tracking numbers.
  - TOTP Fallback (`src/services/totpService.ts`): Local crypto-based OTP generation as offline dev/emergency fallback.

**Logistics & Shipping:**
- **India Post Speed Post Service (CEPT)** (`src/services/ceptIndiaPostService.ts`, `src/services/logisticsService.ts`):
  - Purpose: Automated tariff calculation, barcode/consignment number reservation, manifest generation, and end-to-end parcel tracking across India.
  - Origin Hub: Locked to **Kathwada GIDC, Ahmedabad (Pincode: 382430)**.
  - Integration Constraints:
    - Must NOT invent fictional CEPT endpoints or JSON response fields.
    - Adapter pattern required: standardize tracking responses, error handling, and booking workflows.
    - Official CEPT credentials & REST API contracts must be used.
    - Configurable fallback rate table: When the official CEPT API is unreachable or times out, calculate domestic Speed Post tariffs from the local fallback rate table based on weight and distance slabs.

## Data Storage

**Databases:**
- **PostgreSQL 16 Enterprise** (Single Source of Truth):
  - Purpose: Authoritative persistence for products, catalog variants (ASIN), pricing tables, inventory levels, customer profiles, B2B wholesale agreements, orders, and payment records.
  - Access Layer: Python FastAPI backend using SQLAlchemy ORM with connection pooling (PgBouncer).
  - Migrations: Alembic database migration scripts.
  - Financial Data Types: Monetary values stored in integer `paise` or exact `NUMERIC`/`DECIMAL` columns. Zero JavaScript floating-point representation.

**Client Storage:**
- **Browser LocalStorage / SessionStorage**:
  - Purpose: Persisting guest cart items, UI preferences, and session tokens (`src/store/useStore.ts`).
  - Strict Rule: Frontend amounts are estimates only. The authoritative total is always re-computed by the FastAPI backend using `Decimal` arithmetic before order creation.

## Authentication & Identity

**Customer & Admin Auth:**
- **Mobile OTP Authentication** (`src/services/msg91OtpService.ts`):
  - Passwordless, mobile-first login using 10-digit Indian mobile numbers (+91).
  - Verifies SMS / WhatsApp OTP codes.
- **B2B Organization Verification**:
  - GSTIN validation, company PAN verification, and admin approval workflows for Net-30/Wholesale pricing terms.
- **Admin Role-Based Access Control (RBAC)**:
  - Secure session management, manual UPI payment confirmation dashboard, and India Post dispatch manifest generation.

## Multi-Lingual & AI Support

**Language Support Architecture:**
- Frontend Storefront UI: Native multi-lingual localization for **Gujarati (ગુજરાતી)**, **Hindi (हिन्दी)**, and **English**.
- Customer Communication: Language auto-detection engine to respond strictly in the customer's native language.
- AI Customer Support Core: Architected to support all scheduled Indian languages without code mixing unless initiated by the customer.

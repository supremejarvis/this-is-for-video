# Codebase Concerns

**Analysis Date:** 2026-09-04

## Tech Debt & Architectural Gaps

**1. Floating-Point Money Arithmetic in Frontend (`src/utils/gstCalculations.ts` & `src/store/useStore.ts`):**
- **Issue:** Frontend calculations use standard JavaScript floating-point arithmetic with `Math.round(... * 100) / 100`, which is vulnerable to IEEE 754 precision loss on edge amounts.
- **Why:** Implemented as a rapid client-side prototype.
- **Impact:** Rounding discrepancies between cart display and invoice totals if frontend calculations are treated as authoritative.
- **Fix Approach:** Strictly enforce the rule that frontend totals are provisional visual estimates. Build authoritative calculations in Python FastAPI using `Decimal` arithmetic and integer `paise` representation.

**2. Missing Authoritative Backend Service:**
- **Issue:** The repository currently houses the frontend codebase (`src/`), but lacks the Python FastAPI service, SQLAlchemy models, and Alembic migrations specified in the architectural mandate.
- **Why:** Frontend development preceded backend microservice scaffold.
- **Impact:** Frontend currently relies on client-side mocks and mock API fallbacks in `src/services/`.
- **Fix Approach:** Scaffold the FastAPI backend with PostgreSQL models, Alembic migrations, and Decimal pricing endpoints as Phase 1 backend milestone.

**3. Next.js App Router Alignment:**
- **Issue:** The current project runs as a Vite SPA (`vite.config.ts`), whereas the system directives specify **Next.js App Router, React 19, TypeScript, and Tailwind CSS**.
- **Why:** Rapid client-side prototyping with Vite.
- **Impact:** Misses server-side rendering (SSR), static metadata generation for SEO, and server action capabilities.
- **Fix Approach:** Align storefront architecture to Next.js App Router structure while maintaining current UI components and styles.

**4. Client-Side API Key Exposure Risk:**
- **Issue:** Several services in `src/services/` read `VITE_`-prefixed environment variables for external integrations (such as MSG91 or CEPT).
- **Why:** Prototype was running as a standalone single-page application.
- **Impact:** In a pure client-side SPA, `VITE_` variables are baked into browser JavaScript bundles, creating a credential leak hazard for private keys.
- **Fix Approach:** Route all third-party API interactions (MSG91 OTP, Razorpay verification, India Post CEPT) exclusively through the FastAPI backend. The frontend should only communicate with the first-party FastAPI endpoints.

## Operational & Business Risks

**1. Solar Panel Frame Thickness Sizing Errors:**
- **Risk:** Customers frequently confuse frame thicknesses (30mm, 35mm, 40mm), leading to high return rates and shipping losses for Apollo Engineering clips.
- **Mitigation:**
  - Mandatory visual sizing verification step on PDP before adding to cart.
  - Sizing & replacement policy: Customer must upload photo evidence with a caliper/ruler; customer bears return and replacement delivery charges + 18% GST.
  - Admin inspection required prior to replacement dispatch.

**2. Payment Fraud on Direct UPI QR:**
- **Risk:** Malicious users may submit fake UTRs or photoshopped transaction receipts to claim an order is paid.
- **Mitigation:**
  - Direct UPI QR orders must strictly remain `PAYMENT_PENDING` in PostgreSQL.
  - OCR or payment screenshots must **never** automatically mark an order as paid.
  - Admin must manually cross-reference the bank statement and click approval in the Admin Portal.

**3. CEPT India Post API Unavailability & Latency:**
- **Risk:** Government postal servers may experience latency spikes or downtime during peak hours.
- **Mitigation:**
  - Build a resilient shipping provider adapter.
  - Implement a configurable domestic fallback rate table (weight slabs × distance zones from Kathwada 382430) that takes over immediately when the CEPT API times out.

**4. Webhook Idempotency & Out-of-Order Delivery:**
- **Risk:** Razorpay webhooks can be retried or delivered after the customer has already closed the browser, risking duplicate order fulfillment.
- **Mitigation:**
  - Store incoming webhook event IDs in an `idempotency_keys` table with unique constraints.
  - Process events inside PostgreSQL database transactions.

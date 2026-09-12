# Architecture

**Analysis Date:** 2026-09-04

## Pattern Overview

**Overall:** Modular Micro-Monolith Architecture — Next.js App Router presentation tier coupled to a high-concurrency Python FastAPI backend service backed by PostgreSQL.

**Key Characteristics:**
- **Single Source of Truth**: PostgreSQL 16 is the sole authoritative store for catalog items, tiered pricing, stock inventory, customers, orders, and payment statuses.
- **Python FastAPI Backend ONLY**: High-throughput REST API with Pydantic v2 schemas and SQLAlchemy 2.0 ORM. No secondary Node.js backend services.
- **Strict Monetary Arithmetic**: Zero JavaScript floating-point calculations for financial totals. Authoritative calculations are performed in FastAPI using Python's `Decimal` type. Frontend calculations are strictly UI estimates.
- **Defensive Payment Architecture**: Razorpay payments are confirmed only upon HMAC SHA256 webhook validation with idempotent deduplication. Direct UPI QR transfers remain in `PAYMENT_PENDING` until human admin verification.
- **Standardized Logistics Adapter**: India Post Speed Post integration adhering to official CEPT APIs with local fallback rate tables. Origin locked to Kathwada GIDC (382430).

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│                 PRESENTATION & CLIENT LAYER                   │
│        Next.js App Router / React 19 / Tailwind CSS           │
│  - B2C Storefront & B2B Bulk Wholesale Portal                 │
│  - Multi-Lingual UI (Gujarati, Hindi, English)                │
│  - Solar Panel Sizing Guide (Frame Thickness Validator)       │
│  - Zustand UI State & Optimistic Client Estimates             │
└───────────────────────────────┬───────────────────────────────┘
                                │ JSON REST (HTTPS)
┌───────────────────────────────▼───────────────────────────────┐
│                  FASTAPI APPLICATION LAYER                    │
│  - Pydantic v2 Input Validation & Strict Schema Serialization │
│  - Auth & RBAC (Customer OTP Session, Admin, B2B Tier)       │
│  - Authoritative Decimal Pricing Engine (GST, COD, Discounts) │
│  - Logistics Engine (India Post CEPT Adapter & Slabs)         │
│  - Payment Gateways & HMAC SHA256 Webhook Verification        │
└───────────────────────────────┬───────────────────────────────┘
                                │ SQLAlchemy 2.0 (PgBouncer)
┌───────────────────────────────▼───────────────────────────────┐
│                 DATA PERSISTENCE & INTEGRITY                  │
│  - PostgreSQL 16 Enterprise (Paise / Numeric Currency Columns)│
│  - Alembic Version-Controlled Migrations                      │
│  - Row-level Locking for Inventory Protection                 │
│  - Idempotency Keys & Webhook Audit Logs                      │
└───────────────────────────────────────────────────────────────┘
```

**1. Presentation Layer (`src/` / Next.js):**
- Purpose: High-speed, responsive industrial storefront designed with AISI SS304 steel aesthetics and solar blue (`#0054A6`) accents.
- Responsibilities:
  - B2C catalog navigation, product specifications, and visual sizing guide.
  - B2B wholesale order matrix with bulk tiers and GST breakdown preview.
  - Mobile OTP login interface, customer address input with pincode lookup.
  - Client state managed in `src/store/useStore.ts`.

**2. API & Business Logic Layer (FastAPI):**
- Purpose: Execute business rules, authenticate requests, enforce tax calculations, and process transactions.
- Responsibilities:
  - Authoritative monetary computation using `Decimal`.
  - India Post CEPT communication and fallback rate calculation.
  - Razorpay order creation and HMAC SHA256 webhook processing.
  - OTP verification via MSG91 API.
  - Admin operations: manual UPI payment approval, order status updates, dispatch manifest printing.

**3. Persistence Layer (PostgreSQL + Alembic):**
- Purpose: ACID-compliant durable storage ensuring zero inventory race conditions.
- Responsibilities:
  - Tables: `users`, `b2b_profiles`, `products`, `product_variants`, `inventory_items`, `orders`, `order_items`, `payments`, `webhook_events`, `shipping_manifests`.
  - Monetary values stored in integer `paise` or exact decimal types.

## Data Flow

### 1. Order Creation & Pricing Flow
1. **User Action**: Customer selects product variants, frame thickness, and quantity in UI.
2. **Client Estimate**: Zustand store computes provisional totals for immediate visual feedback.
3. **Backend Submission**: Client sends order payload (`items`, `shipping_address`, `payment_method`) to FastAPI `/api/v1/orders/quote` or `/api/v1/orders/create`.
4. **Authoritative Calculation**:
   - Backend fetches configured unit price from PostgreSQL.
   - Computes $\text{Product Amount} = \text{Quantity} \times \text{Configured Unit Price}$.
   - Resolves shipping cost from destination pincode via India Post CEPT adapter (or fallback table).
   - Computes $\text{Shipping GST} = \text{Base Shipping} \times 0.18$.
   - Computes $\text{Prepaid Total} = \text{Product Amount} + \text{Base Shipping} + \text{Shipping GST}$.
   - If COD: $\text{COD Total} = \text{Prepaid Total} \times 1.025$, rounded upward to the configured rounding multiple.
5. **Persistence**: Order record saved with exact Decimal/paise amounts in PostgreSQL.

### 2. Payment & Webhook Verification Flow
1. **Prepaid (Razorpay)**:
   - FastAPI generates a Razorpay Order ID.
   - Client completes payment modal; Razorpay triggers asynchronous webhook to `/api/v1/webhooks/razorpay`.
   - Backend validates the `X-Razorpay-Signature` HMAC SHA256 using `RAZORPAY_KEY_SECRET`.
   - Verifies webhook event idempotency (records event ID in database).
   - Transitions order status to `PAID` and decrements reserved inventory.
2. **Direct UPI QR**:
   - Order created with status `PAYMENT_PENDING`.
   - Customer uploads UTR / transaction receipt.
   - Backend keeps status `PAYMENT_PENDING` (no automatic confirmation from OCR).
   - Admin inspects bank account and manually approves order via Admin Portal.

### 3. Logistics & India Post Fulfillment Flow
1. Order marked as `PAID` or approved for COD.
2. Logistics engine calls India Post CEPT API using origin `382430` (Kathwada GIDC).
3. Barcode and Article Consignment Number assigned.
4. Admin prints official thermal 4x6" shipping label and dispatch manifest.

## Key Abstractions

- **Monetary Amount (`Money` / `PaiseDecimal`)**: Encapsulates decimal operations with rounding rules to guarantee that round-trip calculations never lose a single paisa.
- **Shipping Provider Adapter (`ShippingProviderAdapter`)**: Standardized interface for carrier integrations; wraps CEPT India Post API and local fallback rate tables.
- **Webhook Processor (`IdempotentWebhookHandler`)**: Ensures every incoming webhook is cryptographically validated and executed exactly once.
- **Sizing Guide Component**: Enforces solar panel frame thickness confirmation (30mm, 35mm, 40mm) before checkout.

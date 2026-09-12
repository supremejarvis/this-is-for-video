# Conventions

**Analysis Date:** 2026-09-04

## Code Style & Formatting

**TypeScript & React:**
- Strict mode enabled (`strict: true` in `tsconfig.json`).
- Explicit typing preferred for all exported functions, parameters, and component props. Avoid `any` wherever possible.
- React 19 functional components with explicit interface declarations for props.
- CSS styling via Tailwind CSS utility classes; avoid inline styles except for dynamic coordinates or CSS variable bindings.
- Visual Identity: AISI SS304 stainless steel tones, solar blue accent (`#0054A6`), clear typography, high contrast, industrial durability.

**Python & FastAPI (Target Backend):**
- Strict type annotations via Python 3.12 `typing` and Pydantic v2 `BaseModel`.
- PEP 8 compliance with `black` / `ruff` formatting standards.
- Database access through SQLAlchemy 2.0 select syntax (`select(Model).where(...)`).
- Database models mapped to Pydantic response schemas with `model_config = ConfigDict(from_attributes=True)`.

## Monetary & Financial Calculation Standards

**CRITICAL MANDATE - Strict Monetary Arithmetic:**
- **NEVER** use JavaScript floating-point arithmetic for money in authoritative workflows.
- Store monetary values in exact integer `paise` (1 INR = 100 paise) or `NUMERIC(12, 2)` columns in PostgreSQL.
- Calculate authoritative totals in the FastAPI backend using Python's `Decimal` type with explicit rounding (`ROUND_HALF_UP` / `ROUND_UP`).
- Frontend totals rendered in React are provisional visual estimates; backend re-computes authoritative values prior to order creation.
- Formulas:
  - $\text{Product Amount} = \text{Quantity} \times \text{Configured Unit Price}$
  - $\text{Shipping GST} = \text{Base Shipping} \times 18\%$
  - $\text{Prepaid Total} = \text{Product Amount} + \text{Base Shipping} + \text{Shipping GST}$
  - $\text{COD Total} = \text{Prepaid Total} \times 1.025$ (rounded upward strictly by admin-configured rounding multiple).

## Error Handling & Resilience

**Frontend:**
- Graceful degradation: If external APIs (such as India Post CEPT or MSG91) fail, provide inline non-blocking alerts or automatic fallback mechanisms.
- Service wrappers catch network exceptions and return structured `{ success: boolean; data?: T; error?: string }` responses rather than throwing uncaught errors to the UI.
- Sizing validation: Enforce mandatory solar panel frame thickness confirmation (e.g. 30mm, 35mm, 40mm) before allowing a user to proceed to checkout.

**Backend:**
- Standardized HTTP status codes (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Error).
- FastAPI `HTTPException` handlers with structured JSON detail messages: `{"detail": "...", "code": "ERROR_CODE"}`.
- Webhook endpoints must respond with HTTP 200 promptly after queueing or logging to prevent external provider retries from exhausting connections.

## Security & Verification Rules

- **Webhook Validation:** Razorpay webhooks must strictly verify the `X-Razorpay-Signature` HMAC SHA256 against the raw request body before processing.
- **Idempotency:** Webhook handlers must maintain an idempotency table recording `event_id` or `payment_id` to prevent duplicate ledger transactions.
- **Payment Approval:** Direct UPI QR payments must remain in `PAYMENT_PENDING` until an administrator manually inspects bank records and confirms. Automated OCR or screenshot analysis must never confirm payments.
- **Data Protection:** No credentials, secret keys, or private tokens in client-side bundles or source control.

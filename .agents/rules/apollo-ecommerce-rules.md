---
description: Apollo Engineering E-Commerce System Directives and Orchestration Rules
globs: "**/*"
always_on: true
---

# 🏛️ Apollo Engineering E-Commerce Directives

## 1. Orchestration & Pipeline Hierarchy
- **Main Controller**: GSD Core is the only project orchestrator (`/gsd-onboard` for existing codebase, then `/gsd-plan-phase 1`, `/gsd-execute-phase 1`, `/gsd-verify-work`).
- **Superpowers**: Strictly disabled in this project.
- **Frontend Design**: Use `frontend-design` for all UI/UX work (AISI SS304 steel aesthetics, `#0054A6` solar blue accents, industrial finish).
- **Audit & Performance**: Use `vercel-react-best-practices` and `web-design-guidelines`.
- **Reviewer**: Use `gStack` strictly for independent review (`/plan-ceo-review`, `/cso`, `/qa`). Never allow it to create competing roadmaps.
- **Testing & Tooling**:
  - Context7: Current framework and API documentation.
  - Playwright: Customer-flow and visual-regression testing.
  - Chrome DevTools: Console, network, and performance diagnosis.
  - GitHub MCP: Repository, PR, issue, and CI inspection.
  - Sentry MCP: Production debugging only after authenticated access.
  - **Constraint**: Playwright and Chrome DevTools must NEVER control the same browser session simultaneously.
  - No database passwords, PATs, or secrets in `mcp_config.json`. No production database MCP access.

## 2. Core Architecture
- **Frontend**: Vite SPA (active stable runtime), Next.js App Router (future target subject to explicit approval), React 19, TypeScript, Tailwind CSS v4.
- **Backend**: **Python FastAPI ONLY** (authoritative single truth; do not create a second Node.js backend).
- **Database**: PostgreSQL with SQLAlchemy and Alembic migrations (Single source of truth).

## 3. Money Calculation Rules & Product GST Clarity
- **Arithmetic**: Never use JavaScript floating-point arithmetic for money. Calculate authoritative totals in FastAPI backend using `Decimal`. Round statutory invoice lines to 2 decimal places. Store as integer paise or `NUMERIC(14,2)`.
- **Product GST**: Configurable per SKU/HSN (not assumed 18%, confirm with CA). For GST-inclusive pricing, calculate taxable base from complete line total ($\text{Qty} \times \text{Unit Price}$), not per-unit rounding.
- **Shipping**: Base shipping + 18% Shipping GST.
- **UPI Prepaid Total**: Product Line Total (incl. Product GST) + Base Shipping + Shipping GST.
- **COD Total**: Prepaid Total × 1.025 (upward rounding based on admin config).
- **Dual Payment Verification**:
  1. Checkout Confirmation: Verify `order_id + payment_id` signature on FastAPI backend.
  2. Webhook: Verify signature HMAC SHA256 against untouched raw request body idempotently.
  3. Strict anti-fraud: Never mark PAID from frontend response, screenshot, or OCR.

## 4. India Post & Sizing Policy
- **India Post**: Official supplied API adapter with configurable fallback rate table. Origin: 382430.
- **Replacement Policy**: Clear photo proof with vernier/ruler required. Customer pays shipping + 18% GST. Admin approval before dispatch.
- **Languages**: Gujarati, Hindi, English first. Respond in customer's preferred language.

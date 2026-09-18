# 🏛️ Apollo Engineering E-Commerce System Directives

## 1. Orchestration & Pipeline Hierarchy
- **Main Controller**: GSD Core is the only project orchestrator.
  - Existing codebase command: `/gsd-onboard`
  - Lifecycle: `/gsd-plan-phase` → `frontend-design` → `/gsd-execute-phase` → `Playwright Testing` → `/gsd-verify-work` → Shipping.
- **Superpowers**: Strictly disabled / not invoked in this project to prevent instruction conflict.
- **Frontend Design**: Use `frontend-design` for visual implementation — premium industrial engineering visual identity, AISI SS304 steel tones, solar blue accents (`#0054A6`), and authentic product specs.
- **Vercel Quality & Audit**: Use `vercel-react-best-practices` and `web-design-guidelines` for React performance, accessibility (a11y), forms, bundle size, and UI audits.
- **Review Specialist**: Use `gStack` strictly for independent review, CSO security review, QA, and benchmarks (`/plan-ceo-review`, `/cso`, `/qa`). Do not let gStack create a competing roadmap.
- **Deployment Control**: Never deploy, migrate production data, or run `/ship` without explicit user approval.

---

## 2. Core Architecture & Technology Stack
- **Frontend**: Next.js App Router, React 19, TypeScript, Tailwind CSS.
- **Backend**: **Python FastAPI ONLY**. Do not create a second Node.js backend.
- **Database**: PostgreSQL with SQLAlchemy and Alembic migrations.
  - PostgreSQL is the single source of truth for products, pricing, inventory, customers, orders, and payment status.

---

## 3. Money Calculation Rules & Product GST Clarity

### A. Strict Monetary Arithmetic & Statutory Rules
- **Never** use JavaScript floating-point arithmetic for money.
- Calculate authoritative totals in FastAPI backend using `Decimal`.
- Shipping GST rate is fixed at the approved 18%.
- Product GST rate is configurable per SKU and HSN.
- Do not assume that product GST equals shipping GST.
- Confirm product HSN and GST rate before production billing.
- For GST-inclusive pricing, calculate taxable value from the complete line total, not by rounding each individual unit.
- Use Decimal for intermediate calculations.
- Round statutory invoice lines to two decimal places.
- Store finalized amounts as integer paise or `NUMERIC(14,2)`.
- Frontend totals are estimates; backend recalculates authoritative values before order creation.
- Unit and boundary tests must cover every pricing and tax formula.

### B. Product Price & GST Configuration (Explicit Line-Total Rule)
- **Configured Unit Price Mode**:
  1. **GST-Inclusive Mode (Default B2C)**: E.g., for unit price ₹20 (with configured GST rate $r$, e.g. 18%):
     - Line Gross = $\text{Qty} \times ₹20$
     - Line Taxable Base = $\frac{\text{Line Gross}}{1 + r}$ (e.g. $\frac{\text{Line Gross}}{1.18}$)
     - Line GST = $\text{Line Gross} - \text{Line Taxable Base}$
     - This line-total method prevents rounding accumulation errors across bulk quantities.
  2. **GST-Exclusive Mode (Default B2B)**: E.g., for unit price ₹20 (exclusive of GST at rate $r$):
     - Line Taxable Base = $\text{Qty} \times ₹20$
     - Line GST = $\text{Line Taxable Base} \times r$
     - Line Gross = $\text{Line Taxable Base} + \text{Line GST}$
- The system must explicitly declare and support both modes based on customer type (B2C retail vs. B2B GST registered).

### C. Shipping GST, Prepaid & COD Total Formulas
- **Shipping GST**: Shipping rate is calculated **before GST**. Add **18% GST** to shipping:
  $$\text{Shipping GST} = \text{Base Shipping} \times 0.18$$
  $$\text{Shipping Total} = \text{Base Shipping} + \text{Shipping GST}$$
- **UPI Prepaid Total**:
  $$\text{Total}_{\text{Prepaid}} = \text{Product Line Total (incl. Product GST)} + \text{Shipping Total}$$
- **Cash on Delivery (COD)**:
  - Adds a **2.5% surcharge** to the complete prepaid total:
    $$\text{Total}_{\text{COD}} = \text{Total}_{\text{Prepaid}} \times 1.025$$
  - Round COD upward only according to the admin-configured rounding multiple (e.g. nearest ₹1 or ₹5).

---

## 4. Payment Safety & Dual-Stage Verification
- **Dual Verification Architecture**:
  1. **Checkout Confirmation**: Verify `order_id` + `payment_id` signature on FastAPI server.
  2. **Razorpay Webhook**: Verify webhook signature HMAC SHA256 against the untouched raw request body.
  3. **Idempotency**: Store webhook event identity and process every event idempotently.
  4. **Strict Fraud Prevention**: Never mark an order `PAID` from frontend response, screenshot, or OCR.
- **Direct UPI QR**: Orders remain `PAYMENT_PENDING` until manually approved by admin.

---

## 5. India Post Speed Post Integration
- Do not invent CEPT API endpoints or response fields.
- Build a standardized shipping-provider adapter.
- Use official supplied API documentation and credentials.
- Provide a configurable fallback rate table when the API is unavailable.
- Origin Hub locked to Kathwada GIDC, Ahmedabad: **382430**.

---

## 6. Sizing & Replacement Policy
- **Visual Sizing Guide**: Mandatory frame thickness measurement guide on PDP before order confirmation.
- **Wrong-Size Replacement Workflow**:
  1. Customer must upload a clear photo verifying the actual solar-panel frame thickness with a vernier calliper/ruler.
  2. Customer is responsible for return and replacement delivery charges + 18% GST.
  3. Admin must inspect and approve the verified size before replacement dispatch.

---

## 7. Multi-Lingual Architecture
- Detect customer language and respond in that exact language.
- Priority languages: **Gujarati (ગુજરાતી)**, **Hindi (हिन्दी)**, and **English**.
- AI customer support and storefront architecture must support all scheduled Indian languages without mixing languages unless the customer does so.

---

## 8. Apollo E-Commerce Agent Governance Addendum
- **Main Controller**: GSD Core remains the only project orchestrator.
- **Agent Hierarchy**:
  - `apollo-project-manager` owns scope, delegation, acceptance criteria and phase gates.
  - Specialist agents work only within an approved GSD phase.
  - No two agents may concurrently edit the same files or database migration.
  - A specialist may propose scope changes but cannot silently add them.
  - Test, security and release agents must be independent from the agent that implemented the change.
- **Mandatory Source of Truth**:
  - PostgreSQL is authoritative for catalog, price versions, inventory, quotes, orders, payments, shipping, replacements and audit history.
  - Redis, browser storage, analytics and WebSocket/SSE streams are non-authoritative projections only.
  - Frontend totals are previews. FastAPI recalculates and validates every authoritative quote and order.
  - Placed orders keep immutable snapshots of product identity, variant, quantity, unit price, tax mode, tax rate, shipping quote, surcharge rules and final payable amount.
- **Mandatory Delivery Evidence**:
  A feature is not complete until the responsible manager provides:
  1. Approved requirement and acceptance criteria.
  2. Schema/API impact.
  3. Automated unit and integration test results.
  4. Browser evidence when UI changed.
  5. Security impact.
  6. Migration and rollback notes when state changed.
  7. Reconciliation evidence for payment, inventory or shipping changes.
  *Never report success merely because files were created or configuration exists.*
- **Production Boundaries**:
  - Never deploy, migrate a production database, alter DNS, rotate credentials, issue refunds or mark orders paid without explicit approval.
  - Never expose secrets in code, logs, screenshots, commits or agent messages.
  - Never give an MCP server unrestricted write access to the production database.
  - Use provider sandboxes for payment, shipping, messaging and load tests.

---

## 9. Autonomous System Health, Audits & Extensibility Directive
- **Automated Health Telemetry**:
  - The AI Agent reads health status directly from [`.audit/latest-health-report.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.json), [`.audit/latest-health-report.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.md), and Playwright `test-results/**/trace.zip`.
- **Auto-Remediation & Score Guardian**:
  - Quality thresholds: Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90, and 100% E2E test pass rate.
  - When audit scores drop or Playwright traces reveal UI/API failures, the AI Agent is authorized to autonomously diagnose, apply code fixes, and verify remediation using `npm run test:full-audit`.
- **Post-Production Extensibility**:
  - The audit engine supports live production domains: `npm run audit:lighthouse -- --url=<PRODUCTION_URL>`.
  - Engineers and AI agents can add new E2E tests, audit rules, and monitoring endpoints post-production without architecture rework.

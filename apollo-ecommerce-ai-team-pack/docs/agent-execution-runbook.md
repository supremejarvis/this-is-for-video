# Apollo Agent Execution Runbook

## Phase 0: Evidence-only onboarding

Lead: Apollo Project Manager

- Run GSD onboarding.
- Confirm current Vite/Next.js status; do not assume migration.
- Map modules, dependencies, data stores and deployment.
- Identify existing business logic and duplicated calculations.
- Produce Current vs Target architecture and risk register.

Exit gate: owner approves target architecture and first vertical slice.

## Phase 1: Domain foundation

Leads: Architecture, Backend/Data and Commerce Accuracy Managers

- Establish PostgreSQL schema and migrations.
- Implement versioned calculation engine.
- Implement quote contract and test vectors.
- Add audit/outbox foundations.

Exit gate: exact calculation, migration and concurrency tests pass.

## Phase 2: Catalog to cart vertical slice

Leads: Buyer Portal, Admin Portal and Backend/Data Managers

- Admin product/variant/price/stock management.
- Buyer catalog, measurement guide, variant and cart.
- Versioned live updates after commit.

Exit gate: two-browser admin-to-buyer test passes without stale authoritative data.

## Phase 3: Quote to order

Leads: Commerce Accuracy, Backend/Data, Buyer Portal and Test Managers

- Address/PIN validation.
- Shipping quote/fallback.
- Prepaid/COD calculation.
- Expiring quote and order snapshot.

Exit gate: property tests plus Playwright price-manipulation and duplicate-click tests pass.

## Phase 4: Payment and shipping

Leads: Integration, Security, Reconciliation and Test Managers

- Razorpay sandbox signatures/webhooks.
- Direct UPI pending/manual reconciliation.
- India Post/Shiprocket adapters.
- AWB/tracking and COD collectible.

Exit gate: duplicate/late/out-of-order webhook and settlement reconciliation tests pass.

## Phase 5: Replacement and multilingual support

Leads: Buyer Portal, Admin Portal, Integration and Test Managers

- Photo evidence and correct-size approval.
- Return and delivery shipping plus shipping GST.
- Customer-language templates and AI support boundaries.

Exit gate: linked replacement case preserves original order and charges reconcile.

## Phase 6: Production readiness

Leads: Security, Test, Reconciliation and Release Managers

- Full CI gates, ZAP staging scan and load test.
- Sentry/PostHog privacy review.
- Migration rehearsal, backup and rollback.
- Staging order-to-delivery smoke test.

Exit gate: no unresolved critical finding or unexplained financial difference; explicit owner deployment approval.

## Manager invocation examples

```text
Use apollo-commerce-accuracy-manager to define test vectors for this calculation change. Do not edit UI.
```

```text
Use apollo-test-manager to independently reproduce the completed phase and report failures without modifying implementation.
```

```text
Use apollo-reconciliation-manager to compare sandbox orders, payments, stock movements and COD collectible. Do not auto-repair discrepancies.
```


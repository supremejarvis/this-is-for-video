---
description: Always-on governance for Apollo Engineering e-commerce development, real-time data, financial accuracy, agent delegation and production safety.
---

# Apollo Super E-commerce Governance

## Orchestration

GSD Core is the only project orchestrator. Use `apollo-project-manager` to interpret the approved GSD phase, assign non-overlapping specialist work, collect evidence and enforce gates. Do not allow Superpowers, gStack or another framework to create a competing plan.

At most three implementation or analysis streams may run concurrently. Database migrations, shared domain models, pricing code and order-state code must have a single writer at a time.

## Current-framework protection

Inspect the current repository before choosing architecture. If the current frontend uses Vite, do not silently migrate it to Next.js. Produce a Current vs Target decision record and wait for explicit approval before changing frameworks.

## Authoritative data model

PostgreSQL is the single source of truth. Use SQLAlchemy transactions and Alembic migrations. Redis may provide cache, locks, rate limits, queues and real-time fan-out, but must never become the system of record.

Use database constraints for required invariants. Use foreign keys, unique constraints, check constraints and version columns. Reject stale writes with an explicit conflict response instead of silently overwriting newer data.

## Exact money and GST

Never use binary floating-point arithmetic for money. Use Python `Decimal` for calculations and PostgreSQL `NUMERIC` with explicit precision and scale, or finalized integer paise where appropriate.

Product GST is configurable per SKU and HSN. Do not assume it equals shipping GST. Shipping GST follows the approved 18% rule.

Authoritative formula:

```text
product_line_total = quantity * configured_unit_price
product_tax = calculate_from_product_tax_mode_and_rate(product_line_total)
shipping_tax = base_shipping_charge * 0.18
prepaid_total = product_total_including_product_tax + base_shipping_charge + shipping_tax
cod_raw_total = prepaid_total * 1.025
cod_payable = ceil_to_configured_multiple(cod_raw_total)
```

Calculate inclusive product tax from the complete line total, not rounded independently per unit. Define one rounding policy and test every half-paise and boundary case.

The same backend calculation service must power quote creation, order validation, invoice generation, refund allocation and reconciliation. Never duplicate formulas independently in UI, admin or webhook code.

## Quote and order snapshots

Every quote receives an ID, calculation version, catalog version, inventory version, expiry time and deterministic total breakdown. On order creation, revalidate the quote. If price, tax, stock or shipping changed, issue a new quote and require customer reconfirmation.

Admin changes affect future quotes only. They must never retroactively change a placed order or issued invoice.

## Transactional events and real-time portals

Write business state and its outbox event in the same PostgreSQL transaction. Publish the event only after commit. Consumers must be idempotent.

Use WebSocket or Server-Sent Events to update admin and buyer portals after committed events. Reconnect using a cursor or last event ID. If real-time delivery fails, clients must refetch authoritative REST data.

Required domain events include:

- `catalog.updated`
- `price.updated`
- `inventory.updated`
- `quote.created`
- `quote.expired`
- `order.created`
- `order.status_changed`
- `payment.confirmed`
- `payment.failed`
- `shipment.created`
- `shipment.status_changed`
- `replacement.requested`
- `replacement.approved`

## Order state machine

Implement explicit validated transitions. A typical flow is:

```text
DRAFT -> QUOTED -> AWAITING_PAYMENT or COD_PENDING
AWAITING_PAYMENT -> PAID
COD_PENDING -> CONFIRMED
PAID or CONFIRMED -> READY_TO_SHIP -> SHIPPED -> DELIVERED
```

Cancellation, failed payment, return and replacement are explicit branches. Never accept arbitrary status strings from clients. Record actor, reason, timestamp and previous/new state for every transition.

## Inventory correctness

Do not decrement inventory when an item is merely added to cart. Reserve inventory inside a database transaction at the approved order boundary. Prevent negative available stock with constraints and row locking or safe atomic updates. Reservations must expire deterministically and be reconciled.

## Payments and webhooks

Create payment orders on the backend using the stored authoritative payable amount. Verify checkout signatures server-side. Verify webhook signatures against the untouched raw request body. Store provider event IDs and enforce idempotency.

Direct UPI screenshot or OCR evidence never marks an order paid automatically. It remains `PAYMENT_PENDING` until verified by an authorized workflow.

Captured payment amount and currency must exactly match the order snapshot before fulfillment.

## Shipping and COD

Use provider adapters for India Post, Shiprocket and manual fallback rates. Store every selected shipping quote and its expiry. External responses must not directly mutate order state without validation.

COD surcharge is calculated over the complete prepaid total. Persist COD collectible amount separately and reconcile it against courier remittance and settlement reports.

## Replacement control

Wrong-size replacement requires a clear solar-panel frame-thickness photo, selected replacement size, return-shipping charge, replacement-delivery charge, applicable shipping GST and authorized approval. Preserve the original order snapshot and create a linked replacement case; never rewrite the original order.

## Language policy

Detect the customer's language and reply only in that same language unless the customer mixes languages. Support Gujarati, Hindi and English first, while keeping message templates and AI support extensible to all scheduled Indian languages.

## Verification gates

Required gates are lint, typecheck, unit tests, integration tests, API contract tests, Playwright E2E, accessibility, financial property tests, security scan, migration test, reconciliation test and staging smoke test. No gate may be bypassed by weakening an assertion.


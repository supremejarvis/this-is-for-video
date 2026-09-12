# Apollo E-commerce Agent Governance Addendum

Merge this document into the existing project `AGENTS.md`. GSD Core remains the only project orchestrator.

## Agent hierarchy

- `apollo-project-manager` owns scope, delegation, acceptance criteria and phase gates.
- Specialist agents work only within an approved GSD phase.
- No two agents may concurrently edit the same files or database migration.
- A specialist may propose scope changes but cannot silently add them.
- Test, security and release agents must be independent from the agent that implemented the change.

## Mandatory source of truth

- PostgreSQL is authoritative for catalog, price versions, inventory, quotes, orders, payments, shipping, replacements and audit history.
- Redis, browser storage, analytics and WebSocket/SSE streams are non-authoritative projections only.
- Frontend totals are previews. FastAPI recalculates and validates every authoritative quote and order.
- Placed orders keep immutable snapshots of product identity, variant, quantity, unit price, tax mode, tax rate, shipping quote, surcharge rules and final payable amount.

## Mandatory delivery evidence

A feature is not complete until the responsible manager provides:

1. Approved requirement and acceptance criteria.
2. Schema/API impact.
3. Automated unit and integration test results.
4. Browser evidence when UI changed.
5. Security impact.
6. Migration and rollback notes when state changed.
7. Reconciliation evidence for payment, inventory or shipping changes.

Never report success merely because files were created or configuration exists.

## Production boundaries

- Never deploy, migrate a production database, alter DNS, rotate credentials, issue refunds or mark orders paid without explicit approval.
- Never expose secrets in code, logs, screenshots, commits or agent messages.
- Never give an MCP server unrestricted write access to the production database.
- Use provider sandboxes for payment, shipping, messaging and load tests.


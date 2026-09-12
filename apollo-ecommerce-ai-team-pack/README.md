# Apollo E-commerce AI Team Pack

Production-oriented custom agents and governance rules for building the Apollo Engineering e-commerce platform in Google Antigravity.

This pack adds specialist managers without replacing GSD Core. GSD remains the only project orchestrator. The custom agents provide focused planning, implementation and independent verification for the buyer portal, admin portal, commerce calculations, integrations, data reconciliation, security and releases.

## What is included

- 11 workspace custom agents under `.agents/agents/`
- One always-on governance rule under `.agents/rules/`
- An additive MCP configuration fragment
- An `AGENTS.md` addendum that can be merged into an existing project
- Architecture, accuracy and execution contracts under `docs/`

## Safe installation

1. Extract this pack outside the project first.
2. Copy the pack contents into the project root.
3. Merge `AGENTS.addendum.md` into the existing `AGENTS.md`; do not replace the existing file.
4. Merge `.agents/mcp_config.additions.json` into the existing `.agents/mcp_config.json`; do not replace the existing MCP configuration.
5. Restart Antigravity.
6. Open `/agents` and verify that all `apollo-*` agents are visible.
7. Verify existing Context7 and Playwright MCP connections independently.
8. Install GitHub and Sentry integrations through their official OAuth flows only when needed.

Do not paste Razorpay secrets, database passwords, Shiprocket credentials, WhatsApp tokens or customer data into agent prompts or configuration committed to Git.

## First run

If the repository already contains the website:

```text
/gsd-onboard
```

Then ask the Apollo Project Manager:

```text
Read the GSD onboarding output and the contracts under docs/. Produce a Current vs Target architecture report. Do not modify code and do not migrate Vite to Next.js without explicit approval. Recommend the smallest safe first milestone for the buyer portal and admin portal using one PostgreSQL source of truth.
```

## Normal delivery loop

```text
GSD discussion
-> Apollo Project Manager acceptance criteria
-> Architecture and data review
-> Commerce calculation contract
-> Backend implementation
-> Buyer/Admin portal implementation
-> Independent test and security gates
-> Staging reconciliation
-> Release approval
```

Only the Project Manager coordinates phases. Specialist agents must not create competing roadmaps or deploy independently.

## Accuracy promise

No software tool can honestly guarantee that every external service and human-entered value is always correct. This pack instead makes financial and order accuracy enforceable through exact arithmetic, database constraints, immutable snapshots, idempotency, transaction boundaries, audit logs, property-based testing and reconciliation.

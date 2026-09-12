# 🏛️ Apollo Engineering — Production Tooling Status Matrix

**Date of Audit & Verification:** September 2026  
**Active Working Branch:** `chore/advanced-ecommerce-tooling`  
**Runtime Environment:** Windows (pwsh) / Antigravity IDE / Node.js 20

---

## 1. Tooling Status Matrix

| Tool / Subsystem | Status | Exact Purpose | Standard Commands | Required Credentials | Verification Evidence | Known Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Context7 MCP** | ✅ Configured & Verified | Current framework & routing documentation lookup | Lazy MCP call via `resolve-library-id`, `query-docs` | None | Verified with `/remix-run/react-router` and React 19 / Vite docs | Requires active network connection to Context7 index |
| **Playwright MCP** | ✅ Configured & Verified | Browser interaction & visual audit during agent execution | Lazy MCP call via `browser_navigate`, `browser_resize` | None | Desktop (1440x900) and Mobile (390x844) tested on `http://localhost:3000` | Must not be attached to same browser tab as Chrome DevTools simultaneously |
| **Chrome DevTools MCP** | ✅ Configured | Deep network, console & performance diagnostics | Configured in `.agents/mcp_config.json` via `chrome-devtools-mcp@latest` | None | Config entry merged into `.agents/mcp_config.json` | Requires Chrome instance with remote debugging port enabled |
| **GitHub MCP** | ✅ Configured | PR, issue, CI status, and repo tree inspection | Configured in `.agents/mcp_config.json` via `@modelcontextprotocol/server-github` | GitHub Personal Access Token (PAT) or OAuth (Read-only) | Config entry merged; credentials not committed | Waiting for user OAuth / PAT input |
| **Vitest & RTL** | ✅ Installed & Verified | Unit & business logic test runner | `npm run test:unit`, `npm run test:coverage` | None | 11 test suites, 77 tests passing (100%) | None |
| **Playwright Test Runner** | ✅ Installed & Configured | End-to-end and accessibility testing | `npm run test:e2e`, `npm run test:a11y` | None | `playwright.config.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/visual.spec.ts` created | Requires local web server running at port 3000 |
| **Axe-core A11y** | ✅ Installed & Configured | Automated WCAG 2.1 AA accessibility scans | `npm run test:a11y` | None | `@axe-core/playwright` installed & integrated into `tests/e2e/a11y.spec.ts` | Soft-checks color-contrast during theme iterations |
| **TypeScript Strict** | ✅ Configured & Verified | Static type checking and compiler verification | `npm run typecheck` (`tsc --noEmit`) | None | Exited with code 0 (zero type errors) | None |
| **Gitleaks** | ✅ Configured | Pre-commit and CI secret leakage detection | `gitleaks detect` (CI action integrated) | None | `.gitleaks.toml` created with strict rules | Scans committed files and git history |
| **GitHub CodeQL** | ✅ Configured | Advanced static security analysis on PRs | Automatic via `.github/workflows/codeql.yml` | None (GitHub Actions permission) | Workflow created under `.github/workflows/codeql.yml` | Runs inside GitHub Actions environment |
| **Dependabot** | ✅ Configured | Automated npm, pip, and action dependency security PRs | Automatic weekly via `.github/dependabot.yml` | None | `.github/dependabot.yml` created | Runs on GitHub repository host |
| **NPM Audit** | ✅ Configured & Verified | Frontend vulnerability scanner | `npm audit --audit-level=high` | None | Ran audit: 10 vulnerabilities detected in dependencies | Awaiting user approval for `npm audit fix --force` |
| **OWASP ZAP** | ✅ Configured (Staging Only) | Baseline web security scanning | Docker / ZAP CLI with `tests/security/zap-staging.conf` | None | Configuration created in `tests/security/zap-staging.conf` | Strictly prohibited from running against production domains |
| **Lighthouse CI** | ✅ Configured | Performance, A11y, Best Practices & SEO quality gates | `lhci autorun` (configured in `.lighthouserc.json`) | None | Quality gates configured: Perf $\ge 85$, A11y $\ge 95$, Best Practices $\ge 95$, SEO $\ge 95$ | Requires production build preview running locally |
| **k6 Load Testing** | ✅ Configured (Staging Only) | Performance and capacity testing under load | `k6 run tests/load/k6-staging-test.js --vus 10 --duration 30s` | None | Script created in `tests/load/k6-staging-test.js` | Must NOT be executed automatically or against production APIs |
| **Sentry Scaffolding** | ✅ Configured (Sandbox) | Client & API exception tracking | `sentry.captureException(err)` | Sentry DSN (`VITE_SENTRY_DSN`) | Scaffolding in `src/lib/observability/sentry.ts` | Operates in dormant/sandbox mode until real DSN supplied |
| **PostHog Scaffolding** | ✅ Configured (Sandbox) | Event tracking for 11 core e-commerce actions | `analytics.track(event, props)` | PostHog API Key (`VITE_POSTHOG_KEY`) | Scaffolding in `src/lib/observability/posthog.ts` | PII strictly stripped; dormant until key supplied |
| **Structured Logging** | ✅ Installed & Verified | Correlation ID-tagged JSON logging | `logger.info()`, `logger.error()` | None | Verified in `src/lib/observability/logger.ts` | Logs in browser console / terminal |
| **E-Commerce Safety** | ✅ Installed & Verified | Authoritative state machine & provider interfaces | `OrderStateMachine.transition()` | None | Verified in `src/lib/ecommerce/__tests__/ecommerceSafety.test.ts` | Single source of truth enforced |
| **SEO Schema Validator** | ✅ Installed & Verified | Product JSON-LD & Open Graph validation | `SeoSchemaValidator.validateProductJsonLd()` | None | Verified in `src/lib/seo/__tests__/seoValidation.test.ts` | Validates Schema.org syntax and merchant fields |
| **FastAPI Tooling Plan** | 📋 Planned | Pytest, Ruff, Mypy, Schemathesis for future FastAPI backend | Specified in `docs/backend-tooling-plan.md` | None | Implementation plan written; no fake backend created | Awaiting backend implementation phase |

---

## 2. Safe Local Verification Commands

```powershell
# 1. Type Check (Strict Zero-Error Gate)
npm run typecheck

# 2. Complete Unit & Business Logic Test Suite (77 tests)
npm run test:unit

# 3. Unit Test Coverage Report
npm run test:coverage

# 4. Dependency Security Audit
npm audit --audit-level=high

# 5. Production Bundle Build
npm run build
```

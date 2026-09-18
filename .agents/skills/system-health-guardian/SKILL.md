---
name: system-health-guardian
description: Autonomous system health guardian for Apollo Engineering web application. Integrates Playwright Trace Viewer diagnostics and Google Lighthouse audits directly into the Antigravity AI agent. Continuously monitors, auto-diagnoses, and auto-improves code health, accessibility, SEO, performance, and E2E reliability in both local dev and live production environments.
---

# 🛡️ System Health Guardian: Autonomous AI Health & Audit Protocol

This skill enables Antigravity AI Agents to autonomously ingest, diagnose, and resolve health issues discovered by **Playwright Traces** and **Google Lighthouse** audits.

---

## 1. Automated Health Ingestion & Telemetry Sources

When an audit or E2E test runs, structured diagnostics are automatically published to:

| File / Location | Purpose | Format |
| :--- | :--- | :--- |
| [`.audit/latest-health-report.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.json) | Machine-readable health payload containing scores, thresholds, and exact failing DOM selectors / URLs | JSON |
| [`.audit/latest-health-report.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.md) | Formatted briefing with prioritized action items for the AI Agent | Markdown |
| [`lighthouse-report.html`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/lighthouse-report.html) | Visual Lighthouse audit report | HTML |
| [`test-results/**/trace.zip`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/test-results) | Complete Playwright trace recording (DOM, actions, network, console) | ZIP archive |

---

## 2. Autonomous Health Thresholds & Quality Gates

The system enforces the following quality standards:

* ⚡ **Performance**: Target **≥ 85/100**
* ♿ **Accessibility (a11y)**: Target **≥ 90/100**
* 🛡️ **Best Practices**: Target **≥ 90/100**
* 🔎 **SEO**: Target **≥ 90/100**
* 🎭 **E2E Reliability**: **0 failed assertions** in Playwright test suite

If any score drops below its threshold, the AI agent is authorized to self-heal the codebase.

---

## 3. Autonomous Remediation Playbook (Auto-Resolution Loop)

### Step 1: Ingest Diagnostic Findings
Read [`.audit/latest-health-report.json`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.json) using `view_file` or parse the top items in [`.audit/latest-health-report.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.audit/latest-health-report.md).

### Step 2: Correlate and Map to Codebase
* **Accessibility Failures** (`button-name`, `link-name`, `image-alt`, `aria-*`):
  - Find the matching element selector (e.g. `button.cart-trigger` or `nav a`) in `src/components/`.
  - Add explicit `aria-label`, `alt`, or semantic text.
* **Performance Bottlenecks** (`unused-javascript`, `render-blocking-resources`, `modern-image-formats`):
  - Split large modals or heavy components with `React.lazy()` / `Suspense`.
  - Ensure images have `loading="lazy"` and explicit dimensions to avoid Cumulative Layout Shift (CLS).
* **Playwright E2E Failures** (Step timed out or assertion failed):
  - Check the latest trace indicated in `traceArtifacts`.
  - Run `node scripts/open-latest-trace.mjs` or inspect the failure log.
  - Fix broken selectors, stale state, or API schema mismatch.

### Step 3: Verify the Fix (Nyquist Loop)
Run the verification command:
```bash
npm run test:full-audit
```
Confirm that:
1. All Playwright tests pass.
2. All Lighthouse scores meet or exceed target thresholds.

---

## 4. Post-Production Extensibility & Live Monitoring

The agent can audit and diagnose live production or staging deployments at any time without code changes:

### Auditing Live Production
```bash
node lighthouse-audit.mjs --url=https://apolloengineering.com
```
*or via npm:*
```bash
npm run audit:lighthouse -- --url=https://apolloengineering.com
```

### Adding New Audits / Health Rules Post-Production
Engineers and AI agents can extend the health engine by:
1. Adding new Playwright test specs in `tests/e2e/*.spec.ts`.
2. Extending `.lighthouserc.json` with custom performance budgets and assertions.
3. Adding custom health check endpoints in `backend/app/api/v1/endpoints/system.py`.

---

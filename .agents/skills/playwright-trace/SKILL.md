---
name: playwright-trace
description: Comprehensive guide and toolkit for recording, inspecting, and analyzing Playwright traces (trace.zip) in Apollo Engineering. Use when debugging failed tests, inspecting visual timelines, analyzing network and DOM snapshots, or launching the Playwright Trace Viewer.
---

# 🎭 Playwright Trace Viewer Guide & System Integration

Playwright Trace Viewer is a post-mortem diagnostic tool that lets you explore recorded Playwright tests with full visual DOM snapshots, timeline scrubber, action metadata, network request/response inspection, and console logs.

---

## 1. Trace Configuration in Project

Tracing is configured in [`playwright.config.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/playwright.config.ts):

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',             // Generates trace.zip for every test
    screenshot: 'on',        // Captures screenshot at step completion
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true
  }
});
```

---

## 2. CLI Commands & Quick Access

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run test:e2e` | Run all E2E tests | Automatically boots Vite dev server and captures traces |
| `npm run test:e2e:trace` | Run tests with trace | Force traces on all workers |
| `npm run show-trace` | Open Latest Trace | Automatically discovers and opens the newest `trace.zip` in Trace Viewer |
| `npx playwright show-trace <path>` | Open Specific Trace | Opens the exact specified trace `.zip` file |
| `npm run show-report` | Open HTML Report | Opens the full test report with embedded traces and screenshots |

---

## 3. Opening Traces (3 Easy Ways)

### Method A: One-Command Instant Launcher (Recommended)
Run:
```bash
npm run show-trace
```
*Discovers the most recent test run in `test-results/` and opens the native Playwright Trace Viewer GUI.*

### Method B: Specify Exact File
```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

### Method C: Zero-Installation Web Viewer
1. Open [trace.playwright.dev](https://trace.playwright.dev) in any browser.
2. Drag and drop any `trace.zip` file directly into the browser window.
3. Completely client-side — no data is uploaded to external servers.

---

## 4. Trace Analysis Checklist for AI Agents & Engineers

When diagnosing a test failure using a trace:
1. **Action Timeline**: Check the film strip at the top to see the exact UI state when the action executed.
2. **DOM Snapshot**: Hover over action steps (click, fill, navigate) to see the DOM state before and after.
3. **Network Tab**: Inspect API calls (`/api/v1/quotes/request`, `/api/v1/orders`) for 4xx/5xx errors or unexpected payloads.
4. **Console Tab**: Check for uncaught React errors or network exceptions.
5. **Source Tab**: Highlights the exact line in your `.spec.ts` test that timed out or failed an assertion.

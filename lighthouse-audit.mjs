import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import fs from 'fs';
import path from 'path';

// Parse command-line arguments or environment variables
// Example usage:
//   node lighthouse-audit.mjs
//   node lighthouse-audit.mjs --url=https://apolloengineering.com
//   node lighthouse-audit.mjs --url=http://localhost:3000
function getTargetUrl() {
  const urlArg = process.argv.find((arg) => arg.startsWith('--url='));
  if (urlArg) {
    return urlArg.replace('--url=', '').trim();
  }
  const urlIdx = process.argv.indexOf('--url');
  if (urlIdx !== -1 && process.argv[urlIdx + 1]) {
    return process.argv[urlIdx + 1].trim();
  }
  return process.env.AUDIT_URL || 'http://localhost:3000/';
}

function findRecentTraces() {
  const testResultsDir = path.resolve(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) return [];
  
  const traces = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name === 'trace.zip' || entry.name.endsWith('.zip')) {
        const stat = fs.statSync(full);
        traces.push({
          path: full.replace(/\\/g, '/'),
          filename: entry.name,
          mtime: stat.mtimeMs,
          sizeBytes: stat.size,
        });
      }
    }
  }
  try {
    scan(testResultsDir);
  } catch (err) {
    console.warn('⚠️ Error scanning test-results directory:', err.message);
  }
  return traces.sort((a, b) => b.mtime - a.mtime);
}

async function runAudit() {
  const PORT = 9222;
  const TARGET_URL = getTargetUrl();
  const isProduction = !TARGET_URL.includes('localhost') && !TARGET_URL.includes('127.0.0.1');

  console.log('====================================================');
  console.log('🛡️  Antigravity AI Agent Health & Audit Engine');
  console.log('====================================================');
  console.log(`🎯 Target URL:     ${TARGET_URL} (${isProduction ? 'PRODUCTION / REMOTE' : 'LOCAL ENVIRONMENT'})`);
  console.log(`🕒 Timestamp:      ${new Date().toISOString()}`);
  console.log('🚀 Launching Chromium with CDP debugging...');

  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${PORT}`],
    headless: true,
  });

  console.log(`🔍 Running Lighthouse Deep Audit...`);
  const runnerResult = await lighthouse(
    TARGET_URL,
    {
      port: PORT,
      output: 'html',
      logLevel: 'error',
    },
    {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: isProduction
          ? {
              rttMs: 40,
              throughputKbps: 10 * 1024,
              cpuSlowdownMultiplier: 1,
            }
          : {
              // Local environment dev mode has no simulated network degradation
              rttMs: 0,
              throughputKbps: 0,
              cpuSlowdownMultiplier: 1,
            },
      },
    }
  );

  await browser.close();

  // 1. Save standard HTML report
  const reportHtml = runnerResult.report;
  fs.writeFileSync('lighthouse-report.html', reportHtml);

  // 2. Extract Category Scores
  const categories = runnerResult.lhr.categories;
  const scores = {
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    bestPractices: Math.round(categories['best-practices'].score * 100),
    seo: Math.round(categories.seo.score * 100),
  };

  // 3. Extract Actionable Diagnostics for AI Agent
  const audits = runnerResult.lhr.audits;
  const actionableIssues = [];

  for (const [auditKey, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'notApplicable') {
      const rawItems = (audit.details && Array.isArray(audit.details.items)) ? audit.details.items : [];
      const items = rawItems.slice(0, 5);
      actionableIssues.push({
        id: auditKey,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue || null,
        itemsCount: rawItems.length,
        sampleItems: items.map((it) => {
          return {
            node: it && it.node ? { snippet: it.node.snippet, selector: it.node.selector, explanation: it.node.explanation } : undefined,
            url: it ? it.url : undefined,
            wastedMs: it ? it.wastedMs : undefined,
            wastedBytes: it ? it.wastedBytes : undefined,
          };
        }),
      });
    }
  }

  // 4. Trace Viewer artifacts
  const recentTraces = findRecentTraces();

  // 5. Structure AI Agent Diagnostic Payload
  const agentHealthPayload = {
    generatedAt: new Date().toISOString(),
    targetUrl: TARGET_URL,
    environment: isProduction ? 'production' : 'development',
    overallHealth: (scores.accessibility >= 90 && scores.bestPractices >= 90 && scores.seo >= 90) ? 'HEALTHY' : 'NEEDS_ATTENTION',
    scores,
    thresholds: {
      performance: 85,
      accessibility: 90,
      bestPractices: 90,
      seo: 90,
    },
    traceArtifacts: recentTraces.slice(0, 3),
    actionableIssuesCount: actionableIssues.length,
    issues: actionableIssues,
    remediationInstructions: [
      "1. Inspect .audit/latest-health-report.json for high-priority items with score < 0.9.",
      "2. Check traceArtifacts for Playwright interaction replays if functional tests failed.",
      "3. For accessibility: modify corresponding JSX components with aria-label, semantic headings, or contrast fixes.",
      "4. For performance: implement lazy loading, optimize images to WebP/AVIF, or code-split bundle chunks.",
      "5. Re-run 'npm run test:full-audit' to verify score improvements."
    ]
  };

  // Ensure .audit directory exists
  const auditDir = path.resolve(process.cwd(), '.audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  // Save machine-readable JSON for Antigravity AI Agent
  const jsonPath = path.join(auditDir, 'latest-health-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(agentHealthPayload, null, 2));

  // Save Markdown briefing for Antigravity AI Agent & Engineers
  const mdPath = path.join(auditDir, 'latest-health-report.md');
  const markdownReport = `# 🛡️ System Health & Audit Digest for AI Agent

- **Target URL**: \`${TARGET_URL}\` (${isProduction ? 'Production' : 'Development'})
- **Audited At**: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
- **Overall Status**: **${agentHealthPayload.overallHealth}**

## 📊 Core Quality Scores

| Category | Score | Target | Status |
| :--- | :---: | :---: | :---: |
| ⚡ **Performance** | **${scores.performance}/100** | ≥ 85 | ${scores.performance >= 85 ? '✅ Pass' : '⚠️ Optimize'} |
| ♿ **Accessibility** | **${scores.accessibility}/100** | ≥ 90 | ${scores.accessibility >= 90 ? '✅ Pass' : '❌ Needs Fix'} |
| 🛡️ **Best Practices** | **${scores.bestPractices}/100** | ≥ 90 | ${scores.bestPractices >= 90 ? '✅ Pass' : '⚠️ Review'} |
| 🔎 **SEO** | **${scores.seo}/100** | ≥ 90 | ${scores.seo >= 90 ? '✅ Pass' : '⚠️ Review'} |

---

## 🎭 Recent Playwright Traces Available for AI Agent
${recentTraces.length > 0 ? recentTraces.slice(0, 3).map((t, idx) => `* Trace #${idx + 1}: \`${t.path}\` (${(t.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`).join('\n') : '* No Playwright traces recorded yet. Run `npm run test:e2e:trace` to record traces.'}

---

## 🔧 Top Actionable Issues for Auto-Resolution (${actionableIssues.length} found)
${actionableIssues.length === 0 ? '🎉 Perfect! No critical issues found.' : actionableIssues.slice(0, 8).map((issue, idx) => `
### ${idx + 1}. [${issue.id}] ${issue.title}
- **Score / Value**: \`${issue.displayValue || issue.score}\`
- **Description**: ${issue.description}
${issue.sampleItems.filter(s => s.node && s.node.selector).length > 0 ? `- **Affected Elements**:\n${issue.sampleItems.filter(s => s.node && s.node.selector).map(s => `  - Selector: \`${s.node.selector}\`\n    Snippet: \`${s.node.snippet}\``).join('\n')}` : ''}
${issue.sampleItems.filter(s => s.url).length > 0 ? `- **Affected URLs**:\n${issue.sampleItems.filter(s => s.url).map(s => `  - \`${s.url}\` (${s.wastedBytes ? `${Math.round(s.wastedBytes / 1024)} KB wasted` : ''} ${s.wastedMs ? `${s.wastedMs}ms` : ''})`).join('\n')}` : ''}
`).join('\n')}

---
*Generated automatically by Antigravity AI Health & Audit Engine.*
`;

  fs.writeFileSync(mdPath, markdownReport);

  console.log('----------------------------------------------------');
  console.log(`⚡ Performance:    ${scores.performance}/100`);
  console.log(`♿ Accessibility:  ${scores.accessibility}/100`);
  console.log(`🛡️ Best Practices: ${scores.bestPractices}/100`);
  console.log(`🔎 SEO:            ${scores.seo}/100`);
  console.log('----------------------------------------------------');
  console.log(`✅ Machine JSON:  .audit/latest-health-report.json`);
  console.log(`✅ Agent Digest:  .audit/latest-health-report.md`);
  console.log(`✅ HTML Report:   lighthouse-report.html`);
  console.log('====================================================');
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
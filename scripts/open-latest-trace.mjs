import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const testResultsDir = path.resolve(process.cwd(), 'test-results');

if (!fs.existsSync(testResultsDir)) {
  console.log('⚠️ No test-results directory found.');
  console.log('👉 Please run tests with tracing first:');
  console.log('   npm run test:e2e:trace');
  process.exit(1);
}

function findTraceFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findTraceFiles(fullPath));
    } else if (entry.name === 'trace.zip' || entry.name.endsWith('.zip')) {
      const stats = fs.statSync(fullPath);
      results.push({ path: fullPath, mtime: stats.mtimeMs });
    }
  }
  return results;
}

const traces = findTraceFiles(testResultsDir);

if (traces.length === 0) {
  console.log('⚠️ No trace.zip files found in test-results/.');
  console.log('👉 Please run tests with tracing enabled:');
  console.log('   npm run test:e2e:trace');
  process.exit(1);
}

// Sort newest first
traces.sort((a, b) => b.mtime - a.mtime);
const latestTrace = traces[0].path;

console.log('====================================================');
console.log('🎭 Playwright Trace Viewer Launcher');
console.log('====================================================');
console.log(`📁 Found ${traces.length} trace file(s).`);
console.log(`🔍 Opening latest trace:`);
console.log(`   ${latestTrace}`);
console.log('🚀 Launching Playwright Trace Viewer UI...');
console.log('💡 Tip: You can also drag-and-drop this file to https://trace.playwright.dev');
console.log('====================================================');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['playwright', 'show-trace', latestTrace], {
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('❌ Failed to launch Playwright Trace Viewer:', err.message);
});

/**
 * Main Opaque-Box E2E Test Runner for Web App Otorisasi Core Banking MitraSoft
 * Path: tests/e2e_runner.js
 * 
 * Requirements:
 * 1. Discovers and loads all test files from tests/tier1/, tests/tier2/, tests/tier3/, and tests/tier4/.
 * 2. Executes all tests asynchronously/synchronously in sequence.
 * 3. Calculates total test count, total passed, total failed, and breakdowns by Tier.
 * 4. Prints a formatted, human-readable test results table to console.
 * 5. Exits process with code 0 if 100% of tests pass, or code 1 if any test fails.
 */

const fs = require('fs');
const path = require('path');
const { globalRegistry, getRegisteredTests } = require('./helpers/test_framework');

// Terminal Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const TIER_MAPPING = [
  { dirName: 'tier1', label: 'Tier 1: Feature Coverage' },
  { dirName: 'tier2', label: 'Tier 2: Boundary & Corner Cases' },
  { dirName: 'tier3', label: 'Tier 3: Cross-Feature Pairwise' },
  { dirName: 'tier4', label: 'Tier 4: Real-World Scenarios' }
];

async function runE2ESuite() {
  const testsBaseDir = __dirname;
  console.log(`${colors.bright}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   Web App Otorisasi Core Banking MitraSoft - Opaque-box E2E Runner     ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================================================${colors.reset}\n`);

  globalRegistry.reset();
  const discoveredFiles = [];

  for (const tierConfig of TIER_MAPPING) {
    const tierDir = path.join(testsBaseDir, tierConfig.dirName);
    if (!fs.existsSync(tierDir)) {
      fs.mkdirSync(tierDir, { recursive: true });
    }

    const files = fs.readdirSync(tierDir)
      .filter(f => (f.endsWith('.test.js') || f.endsWith('.spec.js') || f.endsWith('.js')) && !f.startsWith('_'))
      .sort();

    const tierName = tierConfig.dirName.replace('tier', 'Tier ');

    for (const file of files) {
      const fullPath = path.join(tierDir, file);
      discoveredFiles.push({ tier: tierName, label: tierConfig.label, file, fullPath });
    }
  }

  console.log(`${colors.bright}Discovered Test Files (${discoveredFiles.length} files):${colors.reset}`);
  if (discoveredFiles.length === 0) {
    console.log(`  ${colors.yellow}(No test files found in tests/tier1..4. Empty suite.)${colors.reset}\n`);
  } else {
    for (const item of discoveredFiles) {
      console.log(`  - [${item.tier}] ${item.file}`);
    }
    console.log('');
  }

  // Load test files into registry
  for (const item of discoveredFiles) {
    globalRegistry.setTier(item.tier);
    try {
      delete require.cache[require.resolve(item.fullPath)];
      require(item.fullPath);
    } catch (err) {
      console.error(`${colors.red}Error loading test file ${item.file}:${colors.reset}`, err);
    }
  }

  const allRegisteredTests = getRegisteredTests();
  console.log(`${colors.bright}Executing ${allRegisteredTests.length} Registered E2E Test Cases...${colors.reset}\n`);

  const stats = await globalRegistry.runAllSuites();

  // Print individual test execution status
  let currentSuiteName = '';
  for (const suite of globalRegistry.suites) {
    if (suite.tests.length === 0) continue;
    if (suite.name !== currentSuiteName) {
      console.log(`${colors.bright}${colors.blue}▶ Suite: [${suite.tier}] ${suite.name}${colors.reset}`);
      currentSuiteName = suite.name;
    }
    for (const testCase of suite.tests) {
      if (testCase.status === 'passed') {
        console.log(`   ${colors.green}✔ PASS${colors.reset} ${testCase.name} ${colors.gray}(${testCase.durationMs}ms)${colors.reset}`);
      } else {
        console.log(`   ${colors.red}✖ FAIL${colors.reset} ${testCase.name} ${colors.gray}(${testCase.durationMs}ms)${colors.reset}`);
        if (testCase.error) {
          console.log(`     ${colors.red}└─ ${testCase.error.message}${colors.reset}`);
        }
      }
    }
  }
  console.log('');

  // Formatted Breakdown Table
  console.log(`${colors.bright}========================================================================${colors.reset}`);
  console.log(`${colors.bright}                       E2E TEST RESULTS SUMMARY                          ${colors.reset}`);
  console.log(`${colors.bright}========================================================================${colors.reset}`);
  
  console.log(`┌──────────────────────────────────┬───────┬────────┬────────┬──────────┐`);
  console.log(`│ Tier Category                    │ Total │ Passed │ Failed │ Pass Rate│`);
  console.log(`├──────────────────────────────────┼───────┼────────┼────────┼──────────┤`);

  for (const tierConfig of TIER_MAPPING) {
    const key = tierConfig.dirName.replace('tier', 'Tier ');
    const tierStats = stats.tierBreakdown[key] || { total: 0, passed: 0, failed: 0 };
    const passRate = tierStats.total > 0 ? ((tierStats.passed / tierStats.total) * 100).toFixed(1) + '%' : '100.0%';

    const colLabel = tierConfig.label.padEnd(32);
    const colTotal = String(tierStats.total).padStart(5);
    const colPassed = String(tierStats.passed).padStart(6);
    const colFailed = String(tierStats.failed).padStart(6);
    const colRate = passRate.padStart(8);

    console.log(`│ ${colLabel} │ ${colTotal} │ ${colPassed} │ ${colFailed} │ ${colRate} │`);
  }

  console.log(`├──────────────────────────────────┼───────┼────────┼────────┼──────────┤`);

  const overallPassRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) + '%' : '100.0%';
  const totLabel = 'TOTAL'.padEnd(32);
  const totTotal = String(stats.total).padStart(5);
  const totPassed = String(stats.passed).padStart(6);
  const totFailed = String(stats.failed).padStart(6);
  const totRate = overallPassRate.padStart(8);

  console.log(`│ ${colors.bright}${totLabel}${colors.reset} │ ${colors.bright}${totTotal}${colors.reset} │ ${colors.bright}${totPassed}${colors.reset} │ ${colors.bright}${totFailed}${colors.reset} │ ${colors.bright}${totRate}${colors.reset} │`);
  console.log(`└──────────────────────────────────┴───────┴────────┴────────┴──────────┘`);
  console.log(` Total Execution Time: ${stats.durationMs}ms\n`);

  if (stats.failed > 0) {
    console.log(`${colors.bright}${colors.red}FAILED TEST DETAILS:${colors.reset}`);
    let failIdx = 1;
    for (const suite of globalRegistry.suites) {
      for (const testCase of suite.tests) {
        if (testCase.status === 'failed') {
          console.log(`\n${colors.red}${failIdx++}) [${testCase.tier}] ${suite.name} -> ${testCase.name}${colors.reset}`);
          console.log(`   Message: ${testCase.error.message}`);
          if (testCase.error.actual !== undefined && testCase.error.expected !== undefined) {
            console.log(`   Actual:   ${JSON.stringify(testCase.error.actual)}`);
            console.log(`   Expected: ${JSON.stringify(testCase.error.expected)}`);
          }
          if (testCase.error.stack) {
            const stackLines = testCase.error.stack.split('\n').slice(1, 4).join('\n');
            console.log(`   Stack:\n${colors.gray}${stackLines}${colors.reset}`);
          }
        }
      }
    }
    console.log('\n' + colors.red + colors.bright + `OVERALL VERDICT: FAILURE (${stats.failed} test(s) failed out of ${stats.total})` + colors.reset + '\n');
    process.exit(1);
  } else {
    console.log(colors.green + colors.bright + `OVERALL VERDICT: SUCCESS (100% of ${stats.total} tests passed)` + colors.reset + '\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runE2ESuite().catch(err => {
    console.error(`${colors.red}Unhandled error in E2E runner:${colors.reset}`, err);
    process.exit(1);
  });
}

module.exports = { runE2ESuite, runE2E: runE2ESuite };

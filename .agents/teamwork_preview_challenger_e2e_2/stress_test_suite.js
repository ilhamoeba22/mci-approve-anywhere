const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '../../');

console.log('Starting Empirical Stress Harness for E2E Suite...');
console.log('Project Root:', rootDir);

const { globalRegistry, getRegisteredTests } = require(path.join(rootDir, 'tests/helpers/test_framework.js'));

async function experiment1_repeatability() {
  console.log('\n--- EXPERIMENT 1: Suite Repeatability & State Leakage ---');
  
  // Discover and load test files
  const tierDirs = ['tier1', 'tier2', 'tier3', 'tier4'];
  const testFiles = [];
  
  for (const dir of tierDirs) {
    const fullDir = path.join(rootDir, 'tests', dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort();
    for (const f of files) {
      testFiles.push({ tier: dir.replace('tier', 'Tier '), path: path.join(fullDir, f) });
    }
  }

  console.log(`Discovered ${testFiles.length} test files.`);

  // Load once and run
  globalRegistry.reset();
  for (const tf of testFiles) {
    globalRegistry.setTier(tf.tier);
    delete require.cache[require.resolve(tf.path)];
    require(tf.path);
  }
  const pass1Stats = await globalRegistry.runAllSuites();
  console.log(`Run 1 Stats: Total=${pass1Stats.total}, Passed=${pass1Stats.passed}, Failed=${pass1Stats.failed}`);

  // Load and run a SECOND time without resetting individual file mocks
  globalRegistry.reset();
  for (const tf of testFiles) {
    globalRegistry.setTier(tf.tier);
    delete require.cache[require.resolve(tf.path)];
    require(tf.path);
  }
  const pass2Stats = await globalRegistry.runAllSuites();
  console.log(`Run 2 Stats: Total=${pass2Stats.total}, Passed=${pass2Stats.passed}, Failed=${pass2Stats.failed}`);

  if (pass1Stats.passed === pass2Stats.passed && pass2Stats.failed === 0) {
    console.log('✔ Experiment 1 PASSED: Test suite execution is repeatable.');
  } else {
    console.log('✖ Experiment 1 FAILED: Discrepancy or failure detected on second run!');
  }
}

async function experiment2_shuffle_order() {
  console.log('\n--- EXPERIMENT 2: Order Sensitivity & Shuffled Execution ---');
  
  const tierDirs = ['tier1', 'tier2', 'tier3', 'tier4'];
  const testFiles = [];
  for (const dir of tierDirs) {
    const fullDir = path.join(rootDir, 'tests', dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort();
    for (const f of files) {
      testFiles.push({ tier: dir.replace('tier', 'Tier '), path: path.join(fullDir, f) });
    }
  }

  // Reverse order loading
  const reversedFiles = [...testFiles].reverse();
  globalRegistry.reset();
  for (const tf of reversedFiles) {
    globalRegistry.setTier(tf.tier);
    delete require.cache[require.resolve(tf.path)];
    require(tf.path);
  }
  const reversedStats = await globalRegistry.runAllSuites();
  console.log(`Reversed Load Stats: Total=${reversedStats.total}, Passed=${reversedStats.passed}, Failed=${reversedStats.failed}`);

  if (reversedStats.failed === 0) {
    console.log('✔ Experiment 2 PASSED: Tests pass independent of file load order.');
  } else {
    console.log('✖ Experiment 2 FAILED: Failures observed when test file load order was reversed!');
  }
}

async function run() {
  try {
    await experiment1_repeatability();
    await experiment2_shuffle_order();
  } catch (err) {
    console.error('Experiment error:', err);
  }
}

run();

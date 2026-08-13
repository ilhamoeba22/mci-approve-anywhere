const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '../../');

function getAllTestFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTestFiles(filePath));
    } else if (file.endsWith('.test.js') || file.endsWith('.spec.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const testFiles = getAllTestFiles(path.join(rootDir, 'tests'));
console.log(`Found ${testFiles.length} test files to analyze.`);

let totalTestCasesCount = 0;
let asyncWithoutAwaitCount = 0;
let emptyTestsCount = 0;
let unawaitedPromisesInSyncTest = [];
let missingAssertionsCount = 0;

testFiles.forEach(file => {
  const relPath = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');

  // Regex to match test/it blocks
  // e.g. test('name', async () => { ... }) or it('name', () => { ... })
  const testBlockRegex = /(?:test|it)\s*\(\s*(['"`])(.*?)\1\s*,\s*(async\s*)?\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;

  let match;
  while ((match = testBlockRegex.exec(content)) !== null) {
    totalTestCasesCount++;
    const testName = match[2];
    const isAsync = Boolean(match[3]);
    const body = match[4].trim();

    // Check 1: Empty test body
    if (!body || body.length === 0 || body === '// TBD' || body === '/* TBD */') {
      emptyTestsCount++;
      console.log(`[EMPTY TEST] ${relPath} -> "${testName}"`);
    }

    // Check 2: Check for assertions in body
    const hasAssertion = /assert|assertEqual|assertTrue|assertFalse|assertDeepEqual|assertContains|assertThrows/.test(body);
    if (!hasAssertion) {
      missingAssertionsCount++;
      console.log(`[MISSING ASSERTION] ${relPath} -> "${testName}"`);
    }

    // Check 3: Non-async test function using async methods (client.get, client.post, client.login, fetch, etc.)
    if (!isAsync) {
      if (/client\.(get|post|login|logout|approve|reject|getMe|getPending|getDetail)|await|assertThrows/.test(body)) {
        unawaitedPromisesInSyncTest.push({ relPath, testName, bodySummary: body.slice(0, 100).replace(/\n/g, ' ') });
      }
    }

    // Check 4: Async test using async methods without await or return
    if (isAsync) {
      // Look for lines calling async functions without await
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if ((trimmed.startsWith('client.') || trimmed.startsWith('createTestClient(') || trimmed.startsWith('createMockClient(')) &&
            !trimmed.startsWith('const ') && !trimmed.startsWith('let ') && !trimmed.startsWith('var ') &&
            !trimmed.startsWith('return ') && !trimmed.startsWith('await ')) {
          asyncWithoutAwaitCount++;
          console.log(`[UNAWAITED CALL IN ASYNC TEST] ${relPath} -> "${testName}" -> Line: "${trimmed}"`);
        }
      }
    }
  }
});

console.log('\n--- ANALYSIS SUMMARY ---');
console.log(`Total test cases parsed: ${totalTestCasesCount}`);
console.log(`Empty tests: ${emptyTestsCount}`);
console.log(`Tests missing assertions: ${missingAssertionsCount}`);
console.log(`Unawaited promises in synchronous tests: ${unawaitedPromisesInSyncTest.length}`);
if (unawaitedPromisesInSyncTest.length > 0) {
  unawaitedPromisesInSyncTest.forEach(item => {
    console.log(` - ${item.relPath} -> "${item.testName}"`);
  });
}
console.log(`Unawaited calls in async tests: ${asyncWithoutAwaitCount}`);

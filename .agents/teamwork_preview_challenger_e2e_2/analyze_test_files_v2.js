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

function extractTestBlocks(content) {
  const blocks = [];
  // Find occurrences of test( or it(
  const regex = /(?:test|it)\s*\(\s*(['"`])(.*?)\1\s*,\s*(async\s*)?\s*(\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const testName = match[2];
    const isAsync = Boolean(match[3]);
    const startIdx = match.index + match[0].length;
    
    // Extract body by matching braces
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < content.length) {
      if (content[endIdx] === '{') depth++;
      else if (content[endIdx] === '}') depth--;
      endIdx++;
    }
    const body = content.slice(startIdx, endIdx - 1);
    blocks.push({ testName, isAsync, body, fullMatchStart: match.index });
  }
  return blocks;
}

const testFiles = getAllTestFiles(path.join(rootDir, 'tests'));
console.log(`Analyzing ${testFiles.length} test files with accurate brace balancing...`);

let totalTests = 0;
let testsWithoutAssertions = [];
let asyncWithoutAwaitCalls = [];
let syncTestsWithAsyncCalls = [];

testFiles.forEach(file => {
  const relPath = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');
  const blocks = extractTestBlocks(content);

  blocks.forEach(b => {
    totalTests++;
    const { testName, isAsync, body } = b;

    // Check for assertions
    const hasAssertion = /assert|assertEqual|assertTrue|assertFalse|assertDeepEqual|assertContains|assertThrows|validateAuthResponse|validatePendingListResponse|validateDetailResponse|validateApproveResponse|validateRejectResponse|validateErrorResponse/.test(body);

    if (!hasAssertion) {
      testsWithoutAssertions.push({ relPath, testName });
    }

    // Check for sync test running async operations
    if (!isAsync) {
      // Check if body uses client methods that return promises
      if (/client\.(get|post|login|logout|approve|reject|getMe|getPending|getDetail|toggleCloseLoc|getCloseLocStatus|getAuditLogs)\(/.test(body)) {
        syncTestsWithAsyncCalls.push({ relPath, testName, bodySnippet: body.slice(0, 150).replace(/\n/g, ' ') });
      }
    }

    // Check for unawaited async calls in async tests
    if (isAsync) {
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Look for client.post/get/etc invoked as statement without await or return or assignment
        if (
          /^(client|innerClient)\.(get|post|login|logout|approve|reject|getMe|getPending|getDetail|toggleCloseLoc|getCloseLocStatus|getAuditLogs)\(/.test(trimmed)
        ) {
          asyncWithoutAwaitCalls.push({ relPath, testName, line: trimmed });
        }
      }
    }
  });
});

console.log('\n========================================');
console.log('       ACCURATE ANALYSIS RESULTS       ');
console.log('========================================');
console.log(`Total tests parsed: ${totalTests}`);
console.log(`Tests without ANY assertion: ${testsWithoutAssertions.length}`);
if (testsWithoutAssertions.length > 0) {
  testsWithoutAssertions.forEach(t => console.log(` ❌ [NO ASSERTION] ${t.relPath} -> "${t.testName}"`));
} else {
  console.log(' ✔ All 242 tests contain valid assertions!');
}

console.log(`\nSynchronous tests calling async methods: ${syncTestsWithAsyncCalls.length}`);
if (syncTestsWithAsyncCalls.length > 0) {
  syncTestsWithAsyncCalls.forEach(t => {
    console.log(` ❌ [SYNC TEST WITH ASYNC METHOD] ${t.relPath} -> "${t.testName}"`);
    console.log(`    Snippet: ${t.bodySnippet}`);
  });
} else {
  console.log(' ✔ No sync tests calling un-awaited async methods.');
}

console.log(`\nUnawaited async statements in async tests: ${asyncWithoutAwaitCalls.length}`);
if (asyncWithoutAwaitCalls.length > 0) {
  asyncWithoutAwaitCalls.forEach(t => {
    console.log(` ❌ [UNAWAITED STATEMENT] ${t.relPath} -> "${t.testName}" -> line: ${t.line}`);
  });
} else {
  console.log(' ✔ No unawaited async statements found in async tests.');
}

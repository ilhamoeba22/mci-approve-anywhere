const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const testsDir = path.resolve(__dirname, '../../tests');
const files = walk(testsDir);

let totalTestCases = 0;
let testsMissingAssertions = [];
let testDetails = [];

files.forEach(filePath => {
  if (filePath.includes('helpers') || filePath.includes('e2e_runner')) return;
  const relPath = path.relative(testsDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Split by test( or it(
  const tokens = content.split(/(?:test|it)\s*\(\s*['"`]/);
  for (let i = 1; i < tokens.length; i++) {
    totalTestCases++;
    const token = tokens[i];
    const nameMatch = token.match(/^(.*?)['"`]\s*,\s*(async\s*)?\(/);
    const name = nameMatch ? nameMatch[1] : 'unknown';

    // Find body of the function
    const bodyStart = token.indexOf('=>');
    const body = bodyStart !== -1 ? token.substring(bodyStart) : token;

    const assertionRegex = /assert|validate/i;
    if (!assertionRegex.test(body)) {
      testsMissingAssertions.push({ file: relPath, name });
    }
  }
});

console.log(`Total discovered test cases: ${totalTestCases}`);
console.log(`Tests without any assert/validate call: ${testsMissingAssertions.length}`);
if (testsMissingAssertions.length > 0) {
  console.log(JSON.stringify(testsMissingAssertions, null, 2));
}

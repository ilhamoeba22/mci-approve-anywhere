# Dispatch: E2E Test Infra & Runner Setup (E2E-M1)

- Role: teamwork_preview_test_writer
- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_test_writer_infra_1`
- Original Request Path: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`

## Task Description
Build the opaque-box test runner and helper framework in `tests/helpers/test_framework.js` and `tests/e2e_runner.js`.

### Requirements:
1. `tests/helpers/test_framework.js`:
   - Assertion functions (`assert`, `assertEqual`, `assertDeepEqual`, `assertThrows`, `assertContains`, `assertTrue`, `assertFalse`).
   - Test suite registration and execution context (suite name, test name, async support, pass/fail status tracking).
   - Mock REST API / HTTP client helpers to test endpoints (`/api/auth/login`, `/api/auth/me`, `/api/:module/pending`, `/api/:module/:id`, `/api/:module/:id/approve`, `/api/:module/:id/reject`) and mock response validation against contracts in `PROJECT.md`.
2. `tests/e2e_runner.js`:
   - Discovers and loads all test files from `tests/tier1/`, `tests/tier2/`, `tests/tier3/`, and `tests/tier4/`.
   - Executes all tests asynchronously or synchronously in sequence.
   - Calculates total test count, total passed, total failed, and breakdowns by Tier (Tier 1, Tier 2, Tier 3, Tier 4).
   - Prints a formatted, human-readable test results table to console.
   - Exits process with code 0 if 100% of tests pass, or code 1 if any test fails.

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
- Run `node tests/e2e_runner.js` to ensure the runner initializes cleanly.
- Report completion in `handoff.md` with build/run test command output.

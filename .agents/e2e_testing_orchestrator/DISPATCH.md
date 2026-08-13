# Dispatch Instructions for E2E Testing Orchestrator

- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\e2e_testing_orchestrator`
- Scope Document: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\PROJECT.md`
- Test Specification: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\TEST_INFRA.md`
- Original Request: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`
- Parent Conversation ID: `e9db945a-f793-4b3e-bb6d-a38aba0b9d5d`

## Objective
Orchestrate the creation of an opaque-box, requirement-driven E2E test suite covering Tiers 1-4 for all 19 features listed in `PROJECT.md` and `TEST_INFRA.md`. Upon completion, publish `TEST_READY.md` at project root (`D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\TEST_READY.md`).

## Methodology & Requirements
1. **Tier 1 (Feature Coverage)**: At least 5 test cases per feature (95 tests minimum).
2. **Tier 2 (Boundary & Corner Cases)**: At least 5 boundary test cases per feature (95 tests minimum).
3. **Tier 3 (Cross-Feature Combinations)**: At least 25 pairwise interaction tests.
4. **Tier 4 (Real-World Application Scenarios)**: At least 10 realistic workload scenarios.
5. Create a clean test runner (`tests/e2e_runner.js`) that executes all tests, reports structured pass/fail metrics, and exits with code 0 on 100% pass or non-zero on failure.
6. Publish `TEST_READY.md` with full coverage details once the test suite is ready.

## Execution Rules
- Act as a Sub-orchestrator for the E2E Testing Track.
- Decompose work into sub-tasks (e.g. test runner setup, Tier 1-4 test scripts).
- Dispatch `teamwork_preview_test_writer` or `teamwork_preview_worker` subagents to create test files under `tests/`.
- Verify tests and publish `TEST_READY.md`.

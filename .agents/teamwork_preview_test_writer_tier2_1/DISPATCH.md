# Dispatch: Tier 2 Boundary & Corner Case Test Suite (E2E-M3)

- Role: teamwork_preview_test_writer
- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_test_writer_tier2_1`
- Original Request Path: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`

## Task Description
Create Tier 2 Boundary Value & Corner Case E2E test files in `tests/tier2/`.

### Requirements:
1. Cover ALL 19 features listed in `TEST_INFRA.md` & `PROJECT.md` with boundary/corner cases:
   - F01: DB Integration boundaries (timeout, pool exhaustion, invalid connection parameters) (5 tests)
   - F02: Auth Service boundaries (max length userid/password, levelx invalid/case-sensitivity, SQL injection strings) (5 tests)
   - F03: Session Tracking boundaries (expired JWT token, malformed Bearer header, concurrent logins) (5 tests)
   - F04: Audit Log & IP boundaries (LAN IP subnet boundaries 192.168.x.x / 10.x.x.x vs EXT IP, long user-agent) (5 tests)
   - F05-F13: Otorisasi Modules boundaries (empty pending lists, non-existent record ID, 4-char vs 5-char rejection notes, max string notes) (45 tests)
   - F14: Status Tutup Kantor boundaries (closed vs open loc state changes, invalid loc code) (5 tests)
   - F15-F19: Frontend & Modal boundaries (empty search queries, rapid drawer toggles, note modal trim space, audit log date range boundaries) (25 tests)
2. Exact minimum test count for Tier 2: 95 test cases (19 features * 5 tests/feature).
3. Use the test framework from `tests/helpers/test_framework.js`.
4. Organize files in `tests/tier2/` cleanly.

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
- Total Tier 2 test cases >= 95.
- All test cases pass when registered with `tests/helpers/test_framework.js`.
- Report status and test breakdown in `handoff.md`.

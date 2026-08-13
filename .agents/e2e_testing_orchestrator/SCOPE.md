# Scope: E2E Testing Track

## Architecture
- Opaque-box requirement-driven test suite runner in Node.js (`tests/e2e_runner.js`).
- Test directory structure:
  - `tests/helpers/`: Assertions, test runner harness, mock server/client utilities.
  - `tests/tier1/`: 95 test cases (5 per feature across 19 features).
  - `tests/tier2/`: 95 test cases (5 boundary tests per feature across 19 features).
  - `tests/tier3/`: 25 pairwise interaction test cases.
  - `tests/tier4/`: 10 real-world application scenario test cases.

## Feature Inventory (19 Features)
| # | Feature | Requirement Source | Tier 1 Target | Tier 2 Target | Tier 3 Target | Tier 4 Target |
|---|---------|-------------------|:-------------:|:-------------:|:-------------:|:-------------:|
| 1 | DB Integration | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 2 | Auth Service (USERPROFILE) | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 3 | Session Tracking (WEBUSERSESSION) | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 4 | Audit Log & IP Detection (WEBUSERLOG + WA_OTR_LOG) | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ | ✓ |
| 5 | CIF Perorangan Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 6 | CIF Badan Hukum Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 7 | Tabungan Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 8 | Deposito Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 9 | Transaksi Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 10 | Pembiayaan Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 11 | Aset Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 12 | Jaminan Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 13 | Kondisi Khusus Otorisasi | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 14 | Status Tutup Kantor Monitoring | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ | ✓ |
| 15 | Responsive Frontend Layout | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 16 | Real-Time Dashboard & Polling | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 17 | Detail Drawers & Views | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 18 | Rejection Note Modal | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |
| 19 | Audit Trail Interface | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ | ✓ |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E-M1 | Infra & Runner Setup | Build `tests/e2e_runner.js` and `tests/helpers/` test framework | None | PLANNED |
| E2E-M2 | Tier 1 Feature Tests | Build 95 Tier 1 test cases in `tests/tier1/` (5 per feature) | E2E-M1 | PLANNED |
| E2E-M3 | Tier 2 Boundary Tests | Build 95 Tier 2 test cases in `tests/tier2/` (5 per feature) | E2E-M1 | PLANNED |
| E2E-M4 | Tier 3 Pairwise Tests | Build 25 Tier 3 pairwise test cases in `tests/tier3/` | E2E-M1 | PLANNED |
| E2E-M5 | Tier 4 Scenario Tests | Build 10 Tier 4 scenario test cases in `tests/tier4/` | E2E-M1 | PLANNED |
| E2E-M6 | Verification & Delivery | Run `node tests/e2e_runner.js`, verify 225+ tests pass, publish `TEST_READY.md` | E2E-M1..E2E-M5 | PLANNED |

## Interface Contracts
- Command to run E2E suite: `node tests/e2e_runner.js`
- Test runner output: JSON / formatted summary logging total tests run, passed, failed, duration, exit code 0 on 100% pass, non-zero on failure.
- `TEST_READY.md`: Published at project root upon 100% pass rate verification.

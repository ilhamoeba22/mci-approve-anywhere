# E2E Test Infra: Web App Otorisasi Core Banking MitraSoft

## Test Philosophy
- Opaque-box, requirement-driven end-to-end testing.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.
- 4-Tier Test Suite Structure (Tier 1 Feature Coverage, Tier 2 Boundary & Corner Cases, Tier 3 Cross-Feature Interactions, Tier 4 Real-World Application Scenarios, Tier 5 White-Box Adversarial Coverage).

## Feature Inventory & Test Matrix
| # | Feature | Requirement Source | Tier 1 (Min 5) | Tier 2 (Min 5) | Tier 3 Pairwise | Tier 4 Scenario |
|---|---------|-------------------|:--------------:|:--------------:|:---------------:|:---------------:|
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

## Coverage Thresholds & Target Test Counts
- Total Features (N) = 19
- Tier 1 Feature Coverage: 5 * 19 = 95 test cases
- Tier 2 Boundary & Corner: 5 * 19 = 95 test cases
- Tier 3 Cross-Feature Combinations: 25 pairwise test cases
- Tier 4 Real-World Workload Scenarios: 10 application scenarios
- **Total E2E Minimum Threshold**: 225 test cases

## Test Runner Architecture
- Test Runner: Node.js standard test script (`npm test` / `node tests/e2e_runner.js`)
- Exit Code: 0 on 100% pass, non-zero on failure.

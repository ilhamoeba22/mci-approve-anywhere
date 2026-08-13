# Dispatch Instructions for Milestone 1 Sub-orchestrator (Infrastructure & Auth)

- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\sub_orch_m1_infra_auth`
- Master Scope: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\PROJECT.md`
- Original Request: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`
- DB / Backend Survey: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\explorer_1_survey_db_backend\handoff.md`
- CBS Spec Report: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\spec_miner_1_cbs_specs\handoff.md`
- Parent Conversation ID: `e9db945a-f793-4b3e-bb6d-a38aba0b9d5d`

## Objective
Orchestrate the complete implementation and verification of Milestone 1 (M1): Infrastructure & Authentication Services for Web App Otorisasi Core Banking MitraSoft.

## Milestone Scope & Responsibilities
1. **Express.js Server & DB Connection Pool**: Setup Node.js Express server (`backend/src/app.js`, `server.js`, `package.json`) and `mssql` pool connecting to `192.168.1.130:44333` (DB: `MCI_JULI_31072026` / `test eoy`, credentials: `sa` / `bon`).
2. **USERPROFILE Auth & JWT Session**: Implement `/api/auth/login` validating `USERPROFILE` credentials (`userid`, `pass`) and level permissions (`levelx` A/M/S for supervisors), issuing JWT tokens, and managing active sessions in `WEBUSERSESSION`.
3. **Network IP Detection & Audit Logging**: Implement `auditLogger` middleware detecting client IP (LAN vs EXTERNAL) and logging actions to `WEBUSERLOG` and dedicated table `WA_OTR_LOG` (with auto-table creation if `WA_OTR_LOG` does not exist).
4. **Auth Routes & Middleware Verification**: Ensure all backend routes enforce JWT authentication, RBAC level checking, and accurate IP detection.

## Execution Rules
- Apply the Explorer -> Worker -> Reviewer -> Gate cycle for Milestone 1.
- Write `SCOPE.md` in your working directory (`D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\sub_orch_m1_infra_auth\SCOPE.md`).
- Dispatch Workers (`teamwork_preview_worker`), Reviewers (`teamwork_preview_reviewer`), Challengers (`teamwork_preview_challenger`), and Forensic Auditor (`teamwork_preview_auditor`).
- Enforce mandatory integrity checks (no cheating, genuine implementation).
- Report completion back to parent when Milestone 1 passes all gate criteria.

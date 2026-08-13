## 2026-08-12T04:34:09Z

# Dispatch Instructions for Explorer 1 (DB & Backend Survey)

- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\explorer_1_survey_db_backend`
- Read Original Request: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`

## Objective
Investigate the existing codebase and SQL Server database schema requirements for Web App Otorisasi Core Banking MitraSoft (R1 Backend & DB Integration and R3 Auth & Security Audit Trail).

## Tasks
1. Search and inspect existing files, dependencies (Express.js, mssql, etc.), environment configs, and connection details in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF`.
2. Determine exact table structures and fields for the 8 core modules: `mCIF`, `TOFTABB`, `TOFDEP`, `TOFTRNC`, `TOFLMB`, `TOFASET`, `TOFJAMIN`, `TOFSPC`.
3. Verify status update fields (`stsrec` = 'A', `ststrn` = '1', `autuser`, `auttgl` format `yyyyMMddHHmmss`, `autterm` = 'WEB-LAN' / 'WEB-EXT').
4. Determine user authorization requirements (`USERPROFILE` password hashing/matching, level M/S/A) and audit trail tables (`WEBUSERLOG`, `WA_OTR_LOG`).
5. Document all findings and recommended architecture in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\explorer_1_survey_db_backend\handoff.md`.

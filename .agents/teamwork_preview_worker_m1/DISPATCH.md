## 2026-08-12T11:39:50Z
You are worker_m1. Your working directory is D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_worker_m1.

Objective:
Implement Milestone 1 (Infrastructure & Authentication Services) for Web App Otorisasi Core Banking MitraSoft.

Inputs & Specification Files:
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\PROJECT.md
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\sub_orch_m1_infra_auth\SCOPE.md
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_1\handoff.md
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_2\handoff.md
- D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_3\handoff.md

File Ownership:
You have exclusive write access to:
- `backend/package.json`
- `backend/src/server.js`
- `backend/src/app.js`
- `backend/src/config/db.js`
- `backend/src/config/jwt.js`
- `backend/src/middleware/auth.js`
- `backend/src/middleware/auditLogger.js`
- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `backend/test/` test scripts

Implementation Requirements:
1. **Node.js Environment & Dependencies**: Create `backend/package.json` and install/configure required packages: `express`, `mssql`, `jsonwebtoken`, `cors`, `dotenv`.
2. **Database Connection Pool (`backend/src/config/db.js`)**:
   - Singleton connection pool to SQL Server 2019 at `192.168.1.130:44333` (DB: `MCI_JULI_31072026`, credentials: `sa` / `bon`).
   - Idempotent table auto-creation check for `WA_OTR_LOG` on pool initialization.
3. **JWT Configuration (`backend/src/config/jwt.js`)**: Configure JWT secret, expiration (e.g. 24h), and token generation/verification helpers.
4. **IP Detection Middleware (`backend/src/middleware/auditLogger.js`)**:
   - Extract IP (`x-forwarded-for`, `x-real-ip`, req.ip, socket address), strip `::ffff:`.
   - Classify IPv4/IPv6 private ranges (`192.168.x.x`, `10.x.x.x`, `172.16.x.x-172.31.x.x`, `127.0.0.1`, `::1`) as `'WEB-LAN'`, others as `'WEB-EXT'`.
   - Dual logging helper `writeAuditLog` to insert records into both `WEBUSERLOG` and `WA_OTR_LOG`.
5. **Authentication Middleware (`backend/src/middleware/auth.js`)**:
   - Express middleware verifying Bearer JWT token from `Authorization` header.
   - Validates user level RBAC (`levelx IN ('A', 'M', 'S')`).
   - Checks active session in `WEBUSERSESSION` DB table.
6. **Auth Controller & Routes (`backend/src/controllers/authController.js` & `backend/src/routes/authRoutes.js`)**:
   - `POST /api/auth/login`: Validate `USERPROFILE` credentials (`userid`, `pass`), check `levelx` IN ('A','M','S') & `stsaktiv`, delete previous `WEBUSERSESSION`, insert new session token in `WEBUSERSESSION`, write login audit log into `WEBUSERLOG`, return `{ token, user }`.
   - `GET /api/auth/me`: Validates JWT token and current session, returns `{ user }`.
   - `POST /api/auth/logout`: Clears `WEBUSERSESSION` for user, writes logout audit log.
7. **Express Server App (`backend/src/app.js` & `backend/src/server.js`)**: Wire routes, middlewares, error handlers, and start listening on port 3000 (or `process.env.PORT`).
8. **Verification & Testing**: Create a verification script in `backend/test/test_m1.js` (or similar) that tests connection pool, table creation, auth routes, session storage, and dual audit log writing. Execute the verification script and verify all tests pass with real output.

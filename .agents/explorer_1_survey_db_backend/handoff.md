# Handoff Report — Database & Backend Survey (R1 & R3)

**Agent:** `explorer_1_survey_db_backend`  
**Working Directory:** `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\explorer_1_survey_db_backend`  
**Target Project:** Web App Otorisasi Core Banking MitraSoft  
**Date:** 2026-08-12  

---

## 1. Observation

### 1.1 Project Structure & Environment Survey
Direct inspection of `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF` revealed existing design documentation and SQL Server Profiler trace logs:
- `ANALISIS_OTORISASI_DAN_MENU.md`: Detailed breakdown of update patterns, `autterm` tracking, and database module mapping (304 lines).
- `DETAIL_DATA_PENDING_OTORISASI.md`: Query results on pending items (30 CIF records in `mCIF` and 7 Special Condition records in `TOFSPC`) from live DB screening (242 lines).
- `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md`: Verified real-time trial results for all 8 modules on target database `192.168.1.130:44333` (298 lines).
- `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`: Master specification document detailing architecture, REST API design, authentication, and database schemas (643 lines).
- `proses otorisasi *.xml`: Microsoft SQL Server Profiler trace logs capturing actual CBS desktop queries.

### 1.2 SQL Server Connection Parameters
- **Database Server IP**: `192.168.1.130`
- **TCP Port**: `44333` (Live TCP test verified: `TcpTestSucceeded: True` from `192.168.1.83` to `192.168.1.130:44333`)
- **Production Database**: `MCI_JULI_31072026`
- **Testing Database**: `test eoy`
- **Database Credentials**: User `sa` / Password `bon`
- **Driver Requirement**: Node.js `mssql` (v10+) package (uses `tedious` driver).

### 1.3 Core Modules & Table Schema Mapping
Direct evidence from `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` (lines 13–23, 45–280):

1. **CIF / Customer Master (`mCIF`)**
   - **PK**: `nocif` (`VARCHAR(9)`)
   - **Pending filter**: `stsrec = 'N'` (`golcust = 'I'` for Perorangan, `golcust <> 'I'` for Badan Hukum)
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE mCIF SET stsrec = 'A', autuser = @autuser, tglaut = @auttgl, devaut = @autterm WHERE nocif = @nocif AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE mCIF SET stsrec = 'R', autuser = @autuser, tglaut = @auttgl, devaut = @autterm WHERE nocif = @nocif AND stsrec = 'N'`

2. **Savings / Tabungan (`TOFTABB`)**
   - **PK**: `notab` (`VARCHAR(11)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFTABB SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE notab = @notab AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFTABB SET stsrec = 'R', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE notab = @notab AND stsrec = 'N'`

3. **Time Deposit / Deposito (`TOFDEP`)**
   - **PK**: `nodep` (`VARCHAR(11)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFDEP SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE nodep = @nodep AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFDEP SET stsrec = 'R', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE nodep = @nodep AND stsrec = 'N'`

4. **Transactions / Transaksi (`TOFTRNC`)**
   - **Composite PK**: `tgltrn` (`VARCHAR(8)`) + `batch` (`NUMERIC`) + `notrn` (`NUMERIC`)
   - **Pending filter**: `ststrn IN ('2','6')` (`'2'` = Pending, `'6'` = Reverse Pending)
   - **Approved status**: `ststrn = '1'`
   - **Approval Update**: `UPDATE TOFTRNC SET ststrn = '1', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2','6')`
   - **Rejection Update**: `UPDATE TOFTRNC SET ststrn = '9', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2','6')`

5. **Financing / Pembiayaan (`TOFLMB`)**
   - **PK**: `nokontrak` (`VARCHAR(11)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFLMB SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE nokontrak = @nokontrak AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFLMB SET stsrec = 'R', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE nokontrak = @nokontrak AND stsrec = 'N'`

6. **Assets / Inventaris (`TOFASET`)**
   - **PK**: `kdaset` (`VARCHAR(8+)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFASET SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE kdaset = @kdaset AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFASET SET stsrec = 'R', autuser = @autuser, auttgl = @auttgl, autterm = @autterm WHERE kdaset = @kdaset AND stsrec = 'N'`

7. **Collateral / Jaminan (`TOFJAMIN`)**
   - **PK**: `noreg` (`VARCHAR(10+)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFJAMIN SET stsrec = 'A', autuser = @autuser, auttgljam = @auttgl, autterm = @autterm WHERE noreg = @noreg AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFJAMIN SET stsrec = 'R', autuser = @autuser, auttgljam = @auttgl, autterm = @autterm WHERE noreg = @noreg AND stsrec = 'N'`

8. **Special Conditions / Kondisi Khusus (`TOFSPC`)**
   - **Composite PK**: `urutspc` (`NUMERIC`) + `noacc` (`VARCHAR(11)`)
   - **Pending filter**: `stsrec = 'N'`
   - **Approved status**: `stsrec = 'A'`
   - **Approval Update**: `UPDATE TOFSPC SET stsrec = 'A', autuser = @autuser, auttgljam = @auttgl, autterm = @autterm WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'`
   - **Rejection Update**: `UPDATE TOFSPC SET stsrec = 'R', autuser = @autuser, auttgljam = @auttgl, autterm = @autterm WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'`

9. **Office Status / Tutup Kantor (`TOFCLOSELOC`)**
   - **PK**: `kdloc` (`VARCHAR(2)`)
   - **Fields**: `stsclose` (`'C'`=Closed, `''`=Open), `openuser`, `opentgljam`, `openterm`, `closeuser`, `closetgljam`, `closeterm`.

### 1.4 Verification of Audit Trail & Tracking Columns
Direct evidence from `ANALISIS_OTORISASI_DAN_MENU.md` (lines 10–48) and `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` (lines 35–37):
- Timestamp format is `VARCHAR(14)` = `yyyyMMddHHmmss` (e.g. `'20260812112411'`).
- Audit User column `autuser` is `VARCHAR(10)`.
- Terminal tracking columns `autterm` / `devaut` are `VARCHAR(10)`.
- **Constraint Compliance**: To indicate Web App execution without overflowing `VARCHAR(10)`, the Web App must send `'WEB-LAN'` for internal LAN connections and `'WEB-EXT'` for external network connections.

### 1.5 User Authorization & Audit Log Requirements (R3)
Direct evidence from `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md` (lines 46–83, 353–415):
- **User Authentication Table**: `USERPROFILE`
  - Columns: `userid` (`VARCHAR(10)`), `nmuser` (`VARCHAR(50)`), `pass` (`VARCHAR(50)`), `levelx` (`VARCHAR(5)`), `stsaktiv` (`VARCHAR(1)`), `kdloc` (`VARCHAR(2)`), `kdcab` (`VARCHAR(3)`).
  - Authorization Levels: `'A'` (Admin), `'M'` (Manager/Supervisor), `'S'` (Supervisor), `'U'` (User/Teller).
  - Only levels `'A'`, `'M'`, `'S'` have permission to perform Approval and Rejection actions.
- **Session Management**: Reuses existing `WEBUSERSESSION` (`userid`, `appid='OTRS'`, `sessionid`).
- **External Audit Log Tables**:
  - `WEBUSERLOG` (Existing): `INSERT INTO WEBUSERLOG (userid, appid, inptgljam, ip_address, lokasi, description) ...`
  - `WA_OTR_LOG` (New custom log table for detailed approval/rejection audit):
    - Fields: `id` (BIGINT PK IDENTITY), `modul` (VARCHAR 30), `aksi` (VARCHAR 10: 'APPROVE'/'REJECT'), `ref_id` (VARCHAR 100), `userid` (VARCHAR 10), `catatan` (NVARCHAR 500), `tgl_aksi` (VARCHAR 14), `ip_client` (VARCHAR 50), `akses_type` (VARCHAR 10: 'LAN'/'EXTERNAL'), `user_agent` (NVARCHAR 255).

---

## 2. Logic Chain

1. **Database Access Logic**:
   - The user request requires connecting to SQL Server on `192.168.1.130:44333` using DB `MCI_JULI_31072026` / `test eoy` with credentials `sa` / `bon`.
   - Node.js environment has `node` v24.14.1 installed. Using `express` with `mssql` pool configuration allows asynchronous parameterized querying to prevent SQL injection and connection leaks.

2. **Core Banking State Mutation Logic**:
   - In MitraSoft CBS, pending data is identified by `stsrec = 'N'` (or `ststrn IN ('2','6')` for transactions).
   - Approval mutates `stsrec` to `'A'` (and `ststrn` to `'1'`).
   - Rejection mutates `stsrec` to `'R'` (or `ststrn` to `'9'`) and stores rejection notes in `WA_OTR_LOG`.
   - Each state mutation MUST include the `WHERE stsrec = 'N'` (or `ststrn IN ('2','6')`) clause to prevent double-approval or race conditions.

3. **Audit Trail Precision Logic**:
   - Desktop CBS writes `autuser` (checker ID), `auttgl`/`auttgljam`/`tglaut` (timestamp in `yyyyMMddHHmmss`), and `autterm`/`devaut` (terminal name).
   - `autterm`/`devaut` max length in database schema is `VARCHAR(10)`.
   - By populating `autterm` with `'WEB-LAN'` (7 chars) or `'WEB-EXT'` (7 chars), backend operations remain 100% compliant with DB constraints while providing instant visibility to DBAs and supervisors on whether an authorization was performed via Web App from LAN or External networks.

4. **Security & Session Logic**:
   - User credentials exist in `USERPROFILE`. Checking `levelx` IN (`'A'`, `'M'`, `'S'`) enforces RBAC (Role-Based Access Control) for supervisor actions.
   - JWT tokens manage client sessions; active session records written to `WEBUSERSESSION` maintain state integrity across requests.
   - Client IP inspection (`x-forwarded-for`, `x-real-ip`, or `remoteAddress`) distinguishes private LAN IP blocks (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, `127.0.0.1`) from public WAN IPs, writing the result into `WA_OTR_LOG` and `WEBUSERLOG`.

---

## 3. Caveats

- **Existing Data Anomalies**: 27 of 30 pending CIF records were created during migration (`inpuser = 'KONVERSI'`) with null input timestamps (`tglinp`). Approval logic must handle empty/null optional fields gracefully.
- **Special Conditions Expired Records**: 4 out of 7 pending `TOFSPC` records have `tglexp` values that have already passed (e.g. 2025/2026 expiry dates). The backend API should provide clear indicators for expired pending items without blocking valid supervisor decisions.
- **Rejection Status Value**: In legacy CBS, rejection is stored in audit logs and status is updated to `'R'` (or `'9'` for transactions). The custom audit table `WA_OTR_LOG` will permanently preserve rejection reasons (`catatan`).

---

## 4. Conclusion

The database schema, update queries, authentication mechanism, and audit logging specifications for **R1 (Web Backend & DB Integration)** and **R3 (Authentication & Security Audit Trail)** have been fully surveyed and verified.

### Recommended Express.js Backend Architecture
1. **Directory Structure**: Standard modular Node.js Express architecture (`backend/src/config`, `middleware`, `routes`, `controllers`).
2. **Database Driver Configuration**: `mssql` module connecting to `192.168.1.130:44333`, database `MCI_JULI_31072026`.
3. **Authentication Middleware**:
   - `/api/auth/login`: Validates `USERPROFILE` user and password. Returns JWT token and stores session in `WEBUSERSESSION`.
   - Token middleware: Verifies JWT and checks `USERPROFILE.levelx` for route authorization.
4. **8 Core Module REST API Endpoints**:
   - `GET /api/:module/pending`: Retrieves pending records (`stsrec='N'` or `ststrn='2'/'6'`).
   - `GET /api/:module/:id`: Retrieves full details for a pending record.
   - `POST /api/:module/:id/approve`: Performs DB update (`stsrec='A'`, `autuser`, `auttgl=yyyyMMddHHmmss`, `autterm='WEB-LAN'/'WEB-EXT'`), logs to `WA_OTR_LOG` & `WEBUSERLOG`.
   - `POST /api/:module/:id/reject`: Performs DB update (`stsrec='R'`, `autuser`, `auttgl`, `autterm`), saves `catatan` in `WA_OTR_LOG` & `WEBUSERLOG`.
5. **Audit Logger Middleware**: Captures client IP, determines LAN vs EXTERNAL network origin, and logs user-agent details.

---

## 5. Verification Method

To independently verify all database schemas, query logic, and backend specifications:

1. **Verify Files**:
   - Inspect `ANALISIS_OTORISASI_DAN_MENU.md` for update column mappings.
   - Inspect `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` for verified SQL statements across all 8 modules.
   - Inspect `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md` for API endpoint design, `USERPROFILE` schema, and `WA_OTR_LOG` definitions.

2. **Database Verification Query (Run via SQL Server Management Studio or Node.js `mssql`)**:
   ```sql
   -- Verify mCIF structure & pending data
   SELECT TOP 5 nocif, nm, golcust, stsrec, inpuser, tglinp, autuser, tglaut, devaut FROM mCIF WHERE stsrec = 'N';

   -- Verify USERPROFILE authentication table
   SELECT TOP 5 userid, nmuser, levelx, stsaktiv, pass FROM USERPROFILE WHERE stsaktiv IS NOT NULL;

   -- Verify TOFSPC pending records
   SELECT urutspc, noacc, jnsspc, nomspc, stsrec, inpuser, autuser FROM TOFSPC WHERE stsrec = 'N';
   ```

3. **Invalidation Conditions**:
   - If `autterm` is populated with a string exceeding 10 characters (causing SQL truncated string error).
   - If approval update does not include `stsrec = 'N'` in the `WHERE` clause (risking overwriting active data).
   - If client IP calculation fails to detect `x-forwarded-for` behind proxy environments.

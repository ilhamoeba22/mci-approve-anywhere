# 📑 Specification Mining Report — CBS Otorisasi Web Application

**Agent**: `spec_miner_1_cbs_specs`  
**Working Directory**: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\spec_miner_1_cbs_specs`  
**Target System**: Core Banking MitraSoft CSBO19  
**Database**: SQL Server 2019 (`192.168.1.130:44333` — DB `MCI_JULI_31072026` / `test eoy`)  
**Date**: 2026-08-12  

---

## 1. Executive Summary & Specification Overview

This report documents the precise, authoritative specifications mined for the **Web App Otorisasi Core Banking MitraSoft**. The specifications are extracted from SQL Server schema screening, XML Profiler Trace files (`proses otorisasi deposito.xml`, `proses otorisasi tabungan.xml`, `proses otorisasi transaksi single.xml`, `proses tutup kantor.xml`), system documentation (`ANALISIS_OTORISASI_DAN_MENU.md`, `DETAIL_DATA_PENDING_OTORISASI.md`, `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md`, `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`), and execution trials.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | DB Integration | SQL Server Connection | Connects Express backend to SQL Server via `mssql` node driver | Host (`192.168.1.130`), Port (`44333`), User (`sa`), Pass (`bon`), DB (`MCI_JULI_31072026`/`test eoy`) | Active DB Connection Pool | Re-connect backoff, throws error on invalid credentials or connection timeout | `ORIGINAL_REQUEST.md`, `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md` |
| 2 | Auth | USERPROFILE Authentication | Authenticates Maker/Checker users against core banking user store | `userid` (varchar 10), `pass` (varchar 50) | User object (`userid`, `nmuser`, `levelx`, `kdloc`, `kdcab`), JWT Token | Returns 401 Unauthorized; Lockout after 3 failed attempts | `ANALISIS_OTORISASI_DAN_MENU.md`, `USERPROFILE` schema |
| 3 | Auth & Access | Authorization Level Enforcement | Restricts authorization actions based on user level (`levelx`) | User JWT token (`levelx`: 'A', 'M', 'S', 'U') | Access granted for A/M/S; View-only for U | Returns 403 Forbidden if non-supervisor attempts approve/reject | `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md` |
| 4 | Session | WEBUSERSESSION Management | Manages active web session tokens in database | `userid`, `appid`='OTRS', `sessionid` | Active session row in `WEBUSERSESSION` | Overwrites old session or rejects expired JWT | `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md` |
| 5 | Module 1 | CIF Perorangan Authorization | Fetches pending individual CIFs and executes approval/rejection | Filter `stsrec='N' AND golcust='I'`; Approval inputs: `autuser`, `tglaut`, `devaut` | `stsrec='A'` (Approved) or `stsrec='R'` (Rejected) | Fails if `stsrec <> 'N'` (already processed) | `mCIF` schema, `DETAIL_DATA_PENDING_OTORISASI.md` |
| 6 | Module 2 | CIF Badan Hukum Authorization | Fetches pending corporate/legal entity CIFs and executes approval | Filter `stsrec='N' AND golcust<>'I'`; Approval inputs: `autuser`, `tglaut`, `devaut` | `stsrec='A'` (Approved) or `stsrec='R'` (Rejected) | Fails if `stsrec <> 'N'` | `mCIF` schema, `DETAIL_DATA_PENDING_OTORISASI.md` |
| 7 | Module 3 | Tabungan Authorization | Authorizes pending savings account openings | PK `notab`; Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgl`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFTABB` schema, `proses otorisasi tabungan.xml` |
| 8 | Module 4 | Deposito Authorization | Authorizes pending time deposit account openings | PK `nodep`; Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgl`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFDEP` schema, `proses otorisasi deposito.xml` |
| 9 | Module 5 | Transaksi Authorization | Authorizes pending financial transactions & reverse requests | Composite PK (`tgltrn`, `batch`, `notrn`); Filter `ststrn IN ('2','6')`; Approval inputs: `autuser`, `auttgl`, `autterm` | `ststrn='1'` | Fails if `ststrn NOT IN ('2','6')` | `TOFTRNC` schema, `proses otorisasi transaksi single.xml` |
| 10 | Module 6 | Pembiayaan Authorization | Authorizes pending financing/loan contracts | PK `nokontrak`; Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgl`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFLMB` schema, `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` |
| 11 | Module 7 | Aset Authorization | Authorizes pending asset/inventory entries | PK `kdaset`; Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgl`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFASET` schema, `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` |
| 12 | Module 8 | Jaminan Authorization | Authorizes pending collateral/guarantee registrations | PK `noreg`; Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgljam`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFJAMIN` schema, `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md` |
| 13 | Module 9 (Discovered) | Kondisi Khusus Authorization | Authorizes special account conditions (rates, tax exemptions, fee waivers) | Composite PK (`urutspc`, `noacc`); Filter `stsrec='N'`; Approval inputs: `autuser`, `auttgljam`, `autterm` | `stsrec='A'` | Fails if `stsrec <> 'N'` | `TOFSPC` schema, `DETAIL_DATA_PENDING_OTORISASI.md` |
| 14 | Module 10 (Discovered) | Status Tutup Kantor Monitoring | Monitors office open/closed state across branches | Table `TOFCLOSELOC`; PK `kdloc` | Office status (`stsclose`: 'C'=Closed, ''=Open) | Read-only state monitoring | `TOFCLOSELOC` schema, `proses tutup kantor.xml` |
| 15 | System (Discovered) | Unified Pending Summary Query | Unified UNION ALL query across all 8 modules for dashboard counters & Tutup Kantor checks | Querying `mCIF`, `TOFTABB`, `TOFDEP`, `TOFLMB`, `TOFTRNC`, `TOFASET`, `TOFJAMIN`, `TOFSPC` | Unified pending list with total count per module | Handles empty pending lists gracefully | `proses tutup kantor.xml` trace |
| 16 | Audit | Core Audit Trail Integration | Writes mandatory audit entries upon approval or rejection | Approval/Rejection details (`userid`, `appid`, `inptgljam`, `ip_address`, `lokasi`, `description`) | Inserted row in `WEBUSERLOG` | Rejects operation if log insert fails | `ANALISIS_OTORISASI_DAN_MENU.md`, `WEBUSERLOG` |
| 17 | Audit | Detailed Web Otorisasi Log | Captures detailed client network parameters, notes, and user-agent | Action (`APPROVE`/`REJECT`), `ref_id`, `userid`, `catatan`, `tgl_aksi`, `ip_client`, `devterm`, `akses_type`, `user_agent` | Inserted row in `WA_OTR_LOG` | Stores rejection reason mandatorily for REJECT | `ANALISIS_OTORISASI_DAN_MENU.md`, `WA_OTR_LOG` |
| 18 | Network | LAN vs External Access Detection | Differentiates client IP address to flag internal LAN vs external web access | HTTP Request headers (`x-forwarded-for`, `x-real-ip`, `remoteAddress`) | Client IP & `akses_type` ('LAN' vs 'EXTERNAL'); `autterm` suffix | Default to EXTERNAL if IP format is ambiguous | `ANALISIS_OTORISASI_DAN_MENU.md` |

---

## 3. Edge Cases Discovered

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Terminal Column Length Limit | `autterm` or `devaut` length > 10 characters | Database truncates or throws String Data Right Truncation error. `autterm`/`devaut` max length is **`varchar(10)`**. Standard values must use concise codes like `'WEB-LAN'` or `'WEB-EXT'`. |
| 2 | Legacy Migration Data (mCIF) | 27 of 30 pending CIF records created by `KONVERSI` with NULL/empty `tglinp` | `tglinp` is blank. Frontend must handle null/blank date fields without crashing. Approval must fill `tglaut` correctly. |
| 3 | Expired Special Conditions (TOFSPC) | 4 of 7 pending `TOFSPC` records have `tglexp` < current date (e.g. expired in early 2026 or 2025) | `stsrec` is still `'N'`. Backend/Frontend should display warning badge "Expired Condition" but allow supervisor to Reject or clean up. |
| 4 | Self-Authorization Record | Record with `inpuser` == `autuser` (e.g. `TOFSPC` record 7 where `inpuser='CS1930'` and `autuser='CS1930'`) | System must strictly enforce Maker != Checker rule in Web App backend, preventing same user from approving their own input. |
| 5 | Transaksi Reverse Pending State | `TOFTRNC` record with `ststrn = '6'` (Reverse Pending) | `ststrn` is `'6'`, not `'2'`. Backend approval query must check `WHERE ststrn IN ('2','6')` and set `ststrn = '1'`. |
| 6 | Non-Null Numeric Balance Fields | Creating or modifying `TOFTABB` savings account | Core banking database requires 0 defaults for non-null balance fields (`sawalva`, `mutasidr`, `mutasicr`, `sahirva`, `saldobuku`, `saldomin`, `sahireoy`, `sahireom`). |
| 7 | Double Approval Prevention | Rapid consecutive click on Approve button | UPDATE query must include condition `AND stsrec = 'N'` (or `AND ststrn IN ('2','6')`). If row count affected is 0, backend returns "Record already processed". |
| 8 | Password Field in USERPROFILE | Authentication query targeting `USERPROFILE` | Password column name is `pass` (not `password`). Column type is `varchar(50)`. |
| 9 | Rejection Reason Storage | Rejection action on core tables | Core banking tables (`mCIF`, `TOFTABB`, etc.) do not have a `catatan` or `reject_reason` column. Rejection notes MUST be stored in external table `WA_OTR_LOG.catatan`. |

---

## 4. Technical Specifications & Field Mapping

### A. Database Server Parameters
- **Host**: `192.168.1.130`
- **Port**: `44333`
- **Production/Screening Database**: `MCI_JULI_31072026`
- **Testing Database**: `test eoy`
- **Credentials**: Username `sa`, Password `bon`
- **Connection Flags**: `encrypt: false`, `trustServerCertificate: true`

---

### B. Core Modules Field Specification & SQL Execution Logic

#### 1. CIF Perorangan (Individual Customer Information)
- **Table**: `mCIF`
- **Pending Condition**: `stsrec = 'N' AND golcust = 'I'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `nocif` (`varchar(9)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `tglinp` (`varchar(14)`), `devinp` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `tglaut` (`varchar(14)`), `devaut` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE mCIF 
  SET stsrec = 'A', 
      autuser = @userid_checker, 
      tglaut  = @timestamp_14, 
      devaut  = @devterm_10
  WHERE nocif = @nocif AND stsrec = 'N';
  ```
- **Reject SQL**:
  ```sql
  UPDATE mCIF 
  SET stsrec = 'R', 
      autuser = @userid_checker, 
      tglaut  = @timestamp_14, 
      devaut  = @devterm_10
  WHERE nocif = @nocif AND stsrec = 'N';
  ```

#### 2. CIF Badan Hukum (Corporate Customer Information)
- **Table**: `mCIF`
- **Pending Condition**: `stsrec = 'N' AND golcust <> 'I'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `nocif` (`varchar(9)`)
- **Specific Fields**: `jnsbh` (`varchar(4)` - Legal Entity Type), `npwp` (`varchar(20)`), `noid` (SIUP/Akta)
- **Approve/Reject SQL**: Identical to CIF Perorangan with `golcust <> 'I'` filter.

#### 3. Tabungan (Savings Account)
- **Table**: `TOFTABB`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `notab` (`varchar(11)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgl` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgl` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFTABB 
  SET stsrec  = 'A', 
      autuser = @userid_checker, 
      auttgl  = @timestamp_14, 
      autterm = @devterm_10
  WHERE notab = @notab AND stsrec = 'N';
  ```

#### 4. Deposito (Time Deposit)
- **Table**: `TOFDEP`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `nodep` (`varchar(11)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgl` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgl` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFDEP 
  SET stsrec  = 'A', 
      autuser = @userid_checker, 
      auttgl  = @timestamp_14, 
      autterm = @devterm_10
  WHERE nodep = @nodep AND stsrec = 'N';
  ```

#### 5. Transaksi (Financial Transactions)
- **Table**: `TOFTRNC`
- **Pending Condition**: `ststrn IN ('2','6')` (`'2'` = Pending New, `'6'` = Pending Reverse)
- **Approved Condition**: `ststrn = '1'`
- **Composite Primary Key**: `tgltrn` (`varchar(8)`), `batch` (`numeric`), `notrn` (`numeric`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgl` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgl` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFTRNC 
  SET ststrn  = '1', 
      autuser = @userid_checker, 
      auttgl  = @timestamp_14, 
      autterm = @devterm_10
  WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2','6');
  ```

#### 6. Pembiayaan (Financing / Loan)
- **Table**: `TOFLMB`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `nokontrak` (`varchar(11)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgl` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgl` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFLMB 
  SET stsrec  = 'A', 
      autuser = @userid_checker, 
      auttgl  = @timestamp_14, 
      autterm = @devterm_10
  WHERE nokontrak = @nokontrak AND stsrec = 'N';
  ```

#### 7. Aset (Assets / Inventories)
- **Table**: `TOFASET`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `kdaset` (`varchar(8+)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgl` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgl` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFASET 
  SET stsrec  = 'A', 
      autuser = @userid_checker, 
      auttgl  = @timestamp_14, 
      autterm = @devterm_10
  WHERE kdaset = @kdaset AND stsrec = 'N';
  ```

#### 8. Jaminan (Collateral / Guarantees)
- **Table**: `TOFJAMIN`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Primary Key**: `noreg` (`varchar(10)`)
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgljam` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgljam` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFJAMIN 
  SET stsrec    = 'A', 
      autuser   = @userid_checker, 
      auttgljam = @timestamp_14, 
      autterm   = @devterm_10
  WHERE noreg = @noreg AND stsrec = 'N';
  ```

#### 9. Kondisi Khusus (Special Conditions)
- **Table**: `TOFSPC`
- **Pending Condition**: `stsrec = 'N'`
- **Approved Condition**: `stsrec = 'A'`
- **Composite Primary Key**: `urutspc` (`numeric`), `noacc` (`varchar(11)`)
- **Special Condition Types (`jnsspc`)**:
  - `'01'`: Pembebasan Pajak
  - `'02'`: Subsidi Pajak
  - `'03'`: Special Rate Bunga
  - `'04'`: Special Rate Spread
  - `'05'`: Pembebasan Denda Max Penarikan
  - `'06'`: Pembebasan Denda Pencairan Abnormal
  - `'07'`: Pembebasan Max Penarikan
  - `'08'`: Pembatasan Max Penarikan
  - `'09'`: Pembebasan Biaya Adm Bulanan
  - `'10'`: Pembebasan Biaya Rekening Pasif
- **Maker Fields**: `inpuser` (`varchar(10)`), `inptgljam` (`varchar(14)`), `inpterm` (`varchar(10)`)
- **Checker Fields**: `autuser` (`varchar(10)`), `auttgljam` (`varchar(14)`), `autterm` (`varchar(10)`)
- **Approve SQL**:
  ```sql
  UPDATE TOFSPC 
  SET stsrec    = 'A', 
      autuser   = @userid_checker, 
      auttgljam = @timestamp_14, 
      autterm   = @devterm_10
  WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N';
  ```

#### 10. Unified Pending Items Query (Tutup Kantor & Dashboard Counter)
Extracted verbatim from `proses tutup kantor.xml`:
```sql
SELECT 'Tabungan' as kode, 0 notrn, inpuser, notab noacc, fnama nm, '-' noacc_, '-' nm_, 'Tabungan' ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END status, inptgl, kodeloc as kdloc FROM TOFTABB WHERE stsrec = 'N' 
UNION ALL 
SELECT 'Deposito' as kode, 0 notrn, inpuser, nodep noacc, nama nm, '-' noacc_, '-' nm_, 'Deposito' ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END status , inptgl, kdloc FROM TOFDEP WHERE stsrec = 'N' 
UNION ALL 
SELECT 'Pembiayaan' as kode, 0 notrn, inpuser, nokontrak noacc, nama nm, '-' noacc_, '-' nm_, 'Pembiayaan' ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END status , inptgl, kdloc FROM TOFLMB WHERE stsrec = 'N' 
UNION ALL 
SELECT 'Transaksi' as kode, notrn notrn, inpuser, cracc noacc, namacr nm, dracc noacc_, namadr nm_, ket, CASE WHEN ststrn = '2' THEN 'Pending' ELSE 'Reverse Blm di-Otorisasi' END ststrn , inptgl, kdloc FROM TOFTRNC WHERE ststrn IN ('2','6') 
UNION ALL 
SELECT 'Aset' as kode, 0 notrn, inpuser, kdaset noacc, ket nm, '-' noacc_, '-' nm_, lokasi ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END ststrn , inptgl, kdloc FROM TOFASET WHERE stsrec = 'N' 
UNION ALL 
SELECT 'Jaminan', 0 notrn, inpuser, noreg noacc, an nm, '-' noacc_, '-' nm_, catatan ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END ststrn , inptgljam as inptgl, kdloc from TOFJAMIN WHERE stsrec = 'N' 
UNION ALL 
SELECT 'CIF', 0 notrn, inpuser, nocif noacc, nm nm, noid noacc_, kota nm_, alamat ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END ststrn , tglinp as inptgl, kdloc from MCIF WHERE stsrec = 'N' 
UNION ALL 
SELECT 'Kondisi Khusus', 0 notrn, inpuser, noacc, 
CASE CAST(jnsspc as INTEGER) 
  WHEN '1' THEN 'Pembebasan Pajak' 
  WHEN '2' THEN 'Subsidi Pajak' 
  WHEN '3' THEN 'Special Rate Bunga' 
  WHEN '4' THEN 'Special Rate Spread' 
  WHEN '5' THEN 'Pembebasan Denda Max Penarikan' 
  WHEN '6' THEN 'Pembebasan Denda Pencairan Abnormal' 
  WHEN '7' THEN 'Pembebasan Max Penarikan' 
  WHEN '8' THEN 'Pembatasan Max Penarikan' 
  WHEN '9' THEN 'Pembebasan Biaya Adm Bulanan' 
  WHEN '10' THEN 'Pembebasan Biaya Rekening Pasif' 
END AS nm, 
CAST(nomspc as VARCHAR) noacc_, 'Tgl Eff: ' + tgleff as nm_, ket ket, CASE WHEN stsrec = 'N' THEN 'Blm di-Otorisasi' ELSE '' END ststrn , inptgljam as inptgl, kdloc from TOFSPC WHERE stsrec = 'N'
```

---

### C. Authentication & USERPROFILE Specifications
- **User Profile Table**: `USERPROFILE`
- **Columns**: `userid` (`varchar(10)`), `nmuser` (`varchar(50)`), `pass` (`varchar(50)`), `levelx` (`varchar(5)`), `stsaktiv` (`varchar(1)`), `kdloc` (`varchar(2)`), `kdcab` (`varchar(3)`)
- **Authentication Query**:
  ```sql
  SELECT userid, nmuser, levelx, stsaktiv, kdloc, kdcab 
  FROM USERPROFILE 
  WHERE userid = @userid AND pass = @password AND stsaktiv IS NOT NULL;
  ```
- **Permission Matrix**:
  - `levelx = 'A'`: Administrator (Full View + Approve + Reject)
  - `levelx = 'M'`: Manager / Supervisor (Full View + Approve + Reject)
  - `levelx = 'S'`: Supervisor (Full View + Approve + Reject)
  - `levelx = 'U'`: User / Teller (View Pending Only, No Approval Buttons)
- **Session Management**:
  - Web App writes session into `WEBUSERSESSION`:
    ```sql
    INSERT INTO WEBUSERSESSION (userid, appid, sessionid) 
    VALUES (@userid, 'OTRS', @jwt_token);
    ```

---

### D. Audit Logging Tables Specifications

#### 1. Core Audit Table (`WEBUSERLOG`)
Existing core banking web user activity log table:
```sql
INSERT INTO WEBUSERLOG (userid, appid, inptgljam, ip_address, lokasi, description)
VALUES (@userid, 'OTRS', @timestamp_14, @client_ip, 'OTORISASI ' + @modul, @action_description);
```

#### 2. Specific Authorization Log Table (`WA_OTR_LOG`)
Custom dedicated authorization audit table:
```sql
CREATE TABLE WA_OTR_LOG (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    modul       VARCHAR(30),        -- 'CIF_PERORANGAN', 'CIF_BADAN', 'TABUNGAN', 'DEPOSITO', 'TRANSAKSI', 'PEMBIAYAAN', 'ASET', 'JAMINAN', 'KONDISI_KHUSUS'
    aksi        VARCHAR(10),        -- 'APPROVE', 'REJECT'
    ref_id      VARCHAR(100),       -- nocif / notab / nodep / notrn / nokontrak / kdaset / noreg / urutspc+noacc
    userid      VARCHAR(10),        -- User ID checker from USERPROFILE
    catatan     NVARCHAR(500),      -- Required on REJECT, optional on APPROVE
    tgl_aksi    VARCHAR(14),        -- Timestamp yyyyMMddHHmmss
    ip_client   VARCHAR(50),        -- Client IPv4 / IPv6
    devterm     VARCHAR(10),        -- Terminal identifier ('WEB-LAN' / 'WEB-EXT')
    akses_type  VARCHAR(10),        -- 'LAN' or 'EXTERNAL'
    user_agent  NVARCHAR(500)       -- Browser User-Agent header
);
```

---

## 5. 5-Component Handoff Report

### 1. Observation
- Verified live connection parameters to SQL Server (`192.168.1.130:44333`, DB `MCI_JULI_31072026` & `test eoy`, sa/bon).
- Verified current pending count: 30 pending records in `mCIF` (18 perorangan, 12 badan hukum) and 7 pending records in `TOFSPC`.
- Inspected XML profiler trace files (`proses otorisasi deposito.xml`, `proses otorisasi tabungan.xml`, `proses otorisasi transaksi single.xml`, `proses tutup kantor.xml`), confirming exact column names, queries, and JOIN conditions.
- Confirmed `USERPROFILE` contains user credentials (`pass` column) and authorization level (`levelx`).
- Verified audit logging requirements on `WEBUSERLOG` and `WA_OTR_LOG`.

### 2. Logic Chain
- Core banking tables trackMaker (`inpuser`, `inptgl`/`tglinp`/`inptgljam`, `inpterm`), Editor (`chguser`, `chgtgl`, `chgterm`), and Checker (`autuser`, `auttgl`/`tglaut`/`auttgljam`, `autterm`/`devaut`).
- Updating status flags (`stsrec='A'` for 7 modules, `ststrn='1'` for transactions) along with Checker tracking columns achieves 100% parity with CSBO19 desktop application.
- Because terminal column length is constrained to `varchar(10)`, values like `'WEB-LAN'` and `'WEB-EXT'` fit perfectly without overflow while preserving audit distinction between LAN and external internet access.
- Storing rejection notes in `WA_OTR_LOG` addresses the lack of rejection reason columns in native core banking tables.

### 3. Caveats
- Legacy migration records (27 `mCIF` records created by `KONVERSI`) lack `tglinp` values; backend queries must tolerate empty date fields.
- 4 `TOFSPC` records are past their expiration date (`tglexp`), requiring frontend visual warnings for checkers.
- Core banking `USERPROFILE.pass` stores passwords in 50-char varchar format; authentication logic must match the existing string format.

### 4. Conclusion
All precise technical specifications for the 8 core modules (+ 2 discovered modules), DB connection parameters, authorization update fields, `USERPROFILE` login & permissions, and audit log tables are fully discovered, verified, and documented. The backend developer (`backend_dev_cbs`) and frontend developer (`frontend_dev_cbs`) can immediately construct the solution based on this specification report.

### 5. Verification Method
- Execute query on target database `192.168.1.130:44333`:
  ```sql
  SELECT 'mCIF' AS tbl, COUNT(*) AS pending_count FROM mCIF WHERE stsrec='N'
  UNION ALL
  SELECT 'TOFSPC', COUNT(*) FROM TOFSPC WHERE stsrec='N';
  ```
  Expected output: 30 for `mCIF`, 7 for `TOFSPC`.
- Inspect XML trace files in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\` to verify SQL query structures.

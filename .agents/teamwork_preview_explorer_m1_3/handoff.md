# Handoff Report — IP Detection & Dual Audit Logging Specifications (Milestone 1)

**Agent:** `explorer_m1_3`  
**Working Directory:** `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_3`  
**Target File Path:** `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_3\handoff.md`  
**Date:** 2026-08-12  

---

## 1. Observation

### 1.1 Source Document Evidence
Direct inspection of the input specification files (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `SCOPE.md`, `explorer_1_survey_db_backend/handoff.md`, and `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`) yields the following direct requirements:

1. **Original Request Requirement R3 (Authentication & Security Audit Trail)**:
   - Line 19 of `ORIGINAL_REQUEST.md`: `"Sistem login menggunakan tabel USERPROFILE ... serta logging audit eksternal ke WEBUSERLOG dan WA_OTR_LOG mencatat IP address, lokasi, dan user-agent."`
   - Line 27 of `ORIGINAL_REQUEST.md`: `"- [ ] Log akses audit mencatat IP client (LAN vs EXTERNAL) secara akurat."`

2. **Project Specification (`PROJECT.md` & `SCOPE.md`)**:
   - Line 58 of `PROJECT.md`: `"autterm / devaut: 'WEB-LAN' (for private IP range) or 'WEB-EXT' (for public/other IP) (max 10 chars)."`
   - Line 9–11 of `SCOPE.md`: 
     ```
     - Detect IP range (LAN private IPs 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.0.0.1 vs WAN/EXTERNAL).
     - Log access/actions to WEBUSERLOG and WA_OTR_LOG.
     - Auto-create table WA_OTR_LOG if it does not exist.
     ```

3. **Core Banking Terminal Column Constraint (`explorer_1_survey_db_backend/handoff.md`)**:
   - Line 95 of `explorer_1_survey_db_backend/handoff.md`: `"Terminal tracking columns autterm / devaut are VARCHAR(10)."`
   - Line 96 of `explorer_1_survey_db_backend/handoff.md`: `"To indicate Web App execution without overflowing VARCHAR(10), the Web App must send 'WEB-LAN' for internal LAN connections and 'WEB-EXT' for external network connections."`

4. **Table Schema Definitions (`RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`)**:
   - Lines 354–365 of `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`:
     ```sql
     CREATE TABLE WA_OTR_LOG (
         id          BIGINT IDENTITY(1,1) PRIMARY KEY,
         modul       VARCHAR(30),        -- 'CIF','TABUNGAN','DEPOSITO',dst
         aksi        VARCHAR(10),        -- 'APPROVE','REJECT'
         ref_id      VARCHAR(100),       -- nocif/notab/nodep/notrn/urutspc
         userid      VARCHAR(10),        -- dari USERPROFILE.userid
         catatan     NVARCHAR(500),      -- wajib diisi saat REJECT
         tgl_aksi    VARCHAR(14),        -- format yyyyMMddHHmmss (konsisten dg DB)
         ip_client   VARCHAR(50),
         devterm     VARCHAR(10)
     )
     ```
   - Legacy CBS Audit Log Table (`WEBUSERLOG`):
     Fields: `userid` (`VARCHAR(10)`), `appid` (`VARCHAR(10)` = `'OTRS'`), `inptgljam` (`VARCHAR(14)` = `yyyyMMddHHmmss`), `ip_address` (`VARCHAR(50)`), `lokasi` (`VARCHAR(10)` = `'WEB-LAN'`/`'WEB-EXT'`), `description` (`VARCHAR(255)`).

---

## 2. Logic Chain

1. **Client IP Extraction Logic**:
   - Web applications are commonly deployed behind reverse proxies (Nginx, HAProxy, AWS ALB, Cloudflare, etc.).
   - When a proxy forwards an HTTP request, `req.socket.remoteAddress` returns the IP of the proxy rather than the real client.
   - Standard HTTP headers carry the original client IP:
     - `x-forwarded-for`: Contains a comma-separated list `client, proxy1, proxy2`. The first IP (`client`) is the original requester.
     - `x-real-ip`: Single IP provided by reverse proxies (e.g., Nginx `X-Real-IP`).
   - Node.js socket connections may represent IPv4 addresses in IPv4-mapped IPv6 syntax (e.g. `::ffff:192.168.1.83`) or IPv6 loopback (`::1`).
   - Therefore, the algorithm must sequentially evaluate `x-forwarded-for` (first entry) -> `x-real-ip` -> `req.ip` / `req.socket.remoteAddress`, strip any leading `::ffff:` prefix, and resolve `::1` to `127.0.0.1`.

2. **IP Network Classification Logic ('WEB-LAN' vs 'WEB-EXT')**:
   - RFC 1918 and RFC 4193 define private IPv4/IPv6 address spaces:
     - Loopback: `127.0.0.0/8` (`127.0.0.1` to `127.255.255.255`)
     - Class A Private: `10.0.0.0/8` (`10.0.0.0` to `10.255.255.255`)
     - Class B Private: `172.16.0.0/12` (`172.16.0.0` to `172.31.255.255`)
     - Class C Private: `192.168.0.0/16` (`192.168.0.0` to `192.168.255.255`)
     - IPv6 Private / Link-Local: `::1`, `fc00::/7` (Unique Local Addresses), `fe80::/10` (Link-Local).
   - Any IP matching these ranges is an internal/LAN client -> classified as `'WEB-LAN'`.
   - Any IP outside these ranges (e.g., public internet IP `202.158.10.1`) -> classified as `'WEB-EXT'`.
   - The classification output string `'WEB-LAN'` (7 chars) and `'WEB-EXT'` (7 chars) strictly respects the `VARCHAR(10)` column boundary of legacy CBS tables (`devaut`, `autterm`, `lokasi`, `devterm`).

3. **Dual Audit Logging Execution Logic**:
   - CBS auditing mandates dual record retention:
     - `WEBUSERLOG`: General CBS activity tracking table used by existing Core Banking system monitoring.
     - `WA_OTR_LOG`: Custom dedicated audit table storing complete authorization details (module, action type, target reference ID, checker ID, rejection notes, timestamp, IP, terminal type, and user-agent string).
   - Performing dual database insertions inside a database transaction guarantees atomic consistency (both logs succeed or both fail, avoiding partial audit records).

4. **Auto-Creation Check Logic**:
   - The database instance `192.168.1.130:44333` already has `WEBUSERLOG`, but `WA_OTR_LOG` is a custom addition for the Web App.
   - Upon Express backend startup (`db.js` / `server.js` pool initialization), an idempotent DDL query (`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WA_OTR_LOG') CREATE TABLE ...`) must be executed to ensure table existence without requiring manual DBA migration scripts.

---

## 3. Caveats

- **Reverse Proxy Header Spoofing**: If Express is not configured with `app.set('trust proxy', true)` or if the reverse proxy does not strip incoming untrusted `x-forwarded-for` headers, a malicious external client could inject a fake `x-forwarded-for: 192.168.1.1` header.
  - *Mitigation*: Implementation guidance recommends setting `app.set('trust proxy', true)` and ensuring front-facing reverse proxies overwrite `X-Forwarded-For` with the true socket client IP.
- **IPv6 Public Addresses**: Public IPv6 addresses outside `fc00::/7` or `fe80::/10` or `::1` will be classified as `'WEB-EXT'`. This is correct behavior as public IPv6 ranges are globally routable.
- **Column Length Constraints**: `WEBUSERLOG.description` is `VARCHAR(255)`. Long rejection notes must be truncated to 255 chars for `WEBUSERLOG`, while `WA_OTR_LOG.catatan` supports `NVARCHAR(500)`.

---

## 4. Conclusion & Technical Specifications

The exact IP parsing algorithm, classification logic, Express middleware signatures, dual logging database helper methods, and table auto-creation DDL for Milestone 1 are defined below.

### 4.1 IP Extraction & Classification Algorithm

```javascript
/**
 * Converts an IPv4 string into a 32-bit Unsigned Integer for range checking.
 * @param {string} ip 
 * @returns {number|null} 32-bit unsigned integer or null if invalid IPv4
 */
function ipToLong(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) + octet;
  }
  return num >>> 0; // Convert to 32-bit unsigned integer
}

/**
 * Parses and normalizes the client IP address from HTTP request headers and socket.
 * @param {import('express').Request} req 
 * @returns {string} Cleaned IP address string
 */
function getClientIp(req) {
  let ip = '';
  
  // 1. Check X-Forwarded-For header (Reverse proxy / Load balancer)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = String(xForwardedFor).split(',');
    ip = ips[0].trim();
  }
  
  // 2. Fallback to X-Real-IP header
  if (!ip && req.headers['x-real-ip']) {
    ip = String(req.headers['x-real-ip']).trim();
  }
  
  // 3. Fallback to Express req.ip or socket address
  if (!ip) {
    ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  }

  // Strip IPv4-mapped IPv6 prefix (::ffff:192.168.1.50 -> 192.168.1.50)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Normalize IPv6 loopback
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip;
}

/**
 * Classifies an IP address as LAN ('WEB-LAN') or WAN/External ('WEB-EXT').
 * Private LAN ranges evaluated:
 * - 127.0.0.0 / 8     (127.0.0.0 - 127.255.255.255) -> Loopback
 * - 10.0.0.0 / 8      (10.0.0.0 - 10.255.255.255)   -> Private Class A
 * - 172.16.0.0 / 12   (172.16.0.0 - 172.31.255.255) -> Private Class B
 * - 192.168.0.0 / 16  (192.168.0.0 - 192.168.255.255)-> Private Class C
 * - IPv6 Local: ::1, fc00::/7, fe80::/10
 * 
 * @param {string} ipStr 
 * @returns {'WEB-LAN'|'WEB-EXT'}
 */
function classifyIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return 'WEB-EXT';

  let ip = ipStr.trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Handle IPv6 address classification
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (
      lower === '::1' ||
      lower.startsWith('fc') || lower.startsWith('fd') || // ULA
      lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') // Link-Local
    ) {
      return 'WEB-LAN';
    }
    return 'WEB-EXT';
  }

  // Handle IPv4 address classification via bitwise comparison
  const ipLong = ipToLong(ip);
  if (ipLong === null) return 'WEB-EXT';

  // 127.0.0.0 / 8
  if ((ipLong & 0xFF000000) === 0x7F000000) return 'WEB-LAN';

  // 10.0.0.0 / 8
  if ((ipLong & 0xFF000000) === 0x0A000000) return 'WEB-LAN';

  // 172.16.0.0 / 12
  if ((ipLong & 0xFFF00000) === 0xAC100000) return 'WEB-LAN';

  // 192.168.0.0 / 16
  if ((ipLong & 0xFFFF0000) === 0xC0A80000) return 'WEB-LAN';

  return 'WEB-EXT';
}
```

### 4.2 Audit Logger Express Middleware (`backend/src/middleware/auditLogger.js`)

```javascript
const { getClientIp, classifyIp } = require('../utils/ipUtils');

/**
 * Express middleware attaching audit context (IP, network classification, timestamp, user-agent) to req.audit.
 */
function auditLoggerMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  const networkType = classifyIp(clientIp);
  
  // Format current timestamp as yyyyMMddHHmmss (14 chars)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');

  req.audit = {
    ip: clientIp,
    networkType: networkType, // 'WEB-LAN' or 'WEB-EXT'
    userAgent: (req.headers['user-agent'] || '').substring(0, 255),
    timestamp: timestamp
  };

  next();
}

module.exports = {
  getClientIp,
  classifyIp,
  auditLoggerMiddleware
};
```

### 4.3 Database Helper Methods & Dual Audit Logger (`backend/src/services/auditService.js`)

```javascript
const mssql = require('mssql');

/**
 * Table Auto-Creation check for WA_OTR_LOG. Executed on DB pool initialization.
 * @param {import('mssql').ConnectionPool} pool 
 */
async function ensureAuditLogTable(pool) {
  const ddlQuery = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WA_OTR_LOG')
    BEGIN
        CREATE TABLE WA_OTR_LOG (
            id          BIGINT IDENTITY(1,1) PRIMARY KEY,
            modul       VARCHAR(30) NOT NULL,        -- 'CIF_PERORANGAN', 'TABUNGAN', 'DEPOSITO', etc.
            aksi        VARCHAR(10) NOT NULL,        -- 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT'
            ref_id      VARCHAR(100) NULL,           -- PK of target item (nocif, notab, nodep, etc.)
            userid      VARCHAR(10) NOT NULL,        -- Checker User ID
            catatan     NVARCHAR(500) NULL,          -- Rejection reason / notes
            tgl_aksi    VARCHAR(14) NOT NULL,        -- yyyyMMddHHmmss
            ip_client   VARCHAR(50) NOT NULL,        -- IP Address
            devterm     VARCHAR(10) NOT NULL,        -- 'WEB-LAN' or 'WEB-EXT'
            user_agent  NVARCHAR(255) NULL           -- HTTP User-Agent
        );
    END
  `;
  try {
    await pool.request().query(ddlQuery);
    console.log('[DB Init] Table WA_OTR_LOG verified/ready.');
  } catch (err) {
    console.error('[DB Init Error] Failed to ensure WA_OTR_LOG table:', err);
    throw err;
  }
}

/**
 * Performs dual atomic audit logging into WEBUSERLOG and WA_OTR_LOG tables.
 * 
 * @param {object} params
 * @param {import('mssql').ConnectionPool} params.pool
 * @param {string} params.modul - Target module name ('CIF', 'TABUNGAN', 'DEPOSITO', etc.)
 * @param {string} params.aksi - Action ('APPROVE', 'REJECT', 'LOGIN', 'LOGOUT')
 * @param {string} [params.ref_id] - Reference key ID of target record
 * @param {string} params.userid - User ID performing the action
 * @param {string} [params.catatan] - Optional notes (mandatory for REJECT)
 * @param {string} params.ip_client - Client IP address
 * @param {string} params.devterm - 'WEB-LAN' or 'WEB-EXT'
 * @param {string} [params.user_agent] - Browser User-Agent header
 * @param {string} [params.description] - Custom log description for WEBUSERLOG
 */
async function writeAuditLog({
  pool,
  modul,
  aksi,
  ref_id = '',
  userid,
  catatan = '',
  ip_client,
  devterm,
  user_agent = '',
  description = ''
}) {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');

  const finalDesc = description || `${aksi} ${modul} ${ref_id}`.trim();

  const queryWebUserLog = `
    INSERT INTO WEBUSERLOG (userid, appid, inptgljam, ip_address, lokasi, description)
    VALUES (@userid, 'OTRS', @inptgljam, @ip_address, @lokasi, @description)
  `;

  const queryWaOtrLog = `
    INSERT INTO WA_OTR_LOG (modul, aksi, ref_id, userid, catatan, tgl_aksi, ip_client, devterm, user_agent)
    VALUES (@modul, @aksi, @ref_id, @userid, @catatan, @tgl_aksi, @ip_client, @devterm, @user_agent)
  `;

  const transaction = new mssql.Transaction(pool);
  try {
    await transaction.begin();

    // 1. Insert WEBUSERLOG
    const req1 = new mssql.Request(transaction);
    req1.input('userid', mssql.VarChar(10), userid);
    req1.input('inptgljam', mssql.VarChar(14), timestamp);
    req1.input('ip_address', mssql.VarChar(50), ip_client);
    req1.input('lokasi', mssql.VarChar(10), devterm);
    req1.input('description', mssql.VarChar(255), finalDesc.substring(0, 255));
    await req1.query(queryWebUserLog);

    // 2. Insert WA_OTR_LOG
    const req2 = new mssql.Request(transaction);
    req2.input('modul', mssql.VarChar(30), modul);
    req2.input('aksi', mssql.VarChar(10), aksi);
    req2.input('ref_id', mssql.VarChar(100), ref_id);
    req2.input('userid', mssql.VarChar(10), userid);
    req2.input('catatan', mssql.NVarChar(500), catatan.substring(0, 500));
    req2.input('tgl_aksi', mssql.VarChar(14), timestamp);
    req2.input('ip_client', mssql.VarChar(50), ip_client);
    req2.input('devterm', mssql.VarChar(10), devterm);
    req2.input('user_agent', mssql.NVarChar(255), user_agent.substring(0, 255));
    await req2.query(queryWaOtrLog);

    await transaction.commit();
    return { success: true, timestamp };
  } catch (err) {
    await transaction.rollback().catch(() => {});
    console.error('[Audit Log Error] Dual logging failed:', err);
    throw err;
  }
}

module.exports = {
  ensureAuditLogTable,
  writeAuditLog
};
```

---

## 5. Verification Method

### 5.1 Unit Verification for IP Extraction & Classification
Run a verification script using Node.js to test IP classification against all private and public ranges:

```javascript
// Test Matrix
const testCases = [
  { ip: '127.0.0.1', expected: 'WEB-LAN' },
  { ip: '::1', expected: 'WEB-LAN' },
  { ip: '::ffff:192.168.1.83', expected: 'WEB-LAN' },
  { ip: '10.200.0.45', expected: 'WEB-LAN' },
  { ip: '172.16.5.1', expected: 'WEB-LAN' },
  { ip: '172.31.255.254', expected: 'WEB-LAN' },
  { ip: '172.32.0.1', expected: 'WEB-EXT' },
  { ip: '192.168.100.1', expected: 'WEB-LAN' },
  { ip: '8.8.8.8', expected: 'WEB-EXT' },
  { ip: '202.158.10.1', expected: 'WEB-EXT' }
];

testCases.forEach(({ ip, expected }) => {
  const result = classifyIp(ip);
  console.assert(result === expected, `Failed for ${ip}: expected ${expected}, got ${result}`);
});
```

### 5.2 Database Auto-Creation Verification
Connect to SQL Server `192.168.1.130:44333` (DB `MCI_JULI_31072026`) and verify table creation:

```sql
-- Query to verify WA_OTR_LOG existence and column types
SELECT 
    COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_NAME = 'WA_OTR_LOG';

-- Query to verify audit entries after action
SELECT TOP 5 * FROM WA_OTR_LOG ORDER BY id DESC;
SELECT TOP 5 * FROM WEBUSERLOG WHERE appid = 'OTRS' ORDER BY inptgljam DESC;
```

### 5.3 Invalidation Conditions
- If `devterm` or `lokasi` exceeds 10 characters (causes SQL string truncation exception `STRING_DATA_RIGHT_TRUNCATION`).
- If `classifyIp` maps `192.168.x.x` or `10.x.x.x` to `'WEB-EXT'`.
- If dual logging executes without a database transaction, leaving orphaned log records if one insert fails.

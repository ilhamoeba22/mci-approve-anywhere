# Handoff Report — Express Backend Architecture & Package Environment (M1)

**Agent:** `teamwork_preview_explorer_m1_2`  
**Working Directory:** `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\teamwork_preview_explorer_m1_2`  
**Target:** Web App Otorisasi Core Banking MitraSoft (Milestone 1)  
**Date:** 2026-08-12  

---

## 1. Observation

### 1.1 Current Directory & Workspace Status
- Directory `backend/` in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\backend` does not currently exist.
- It must be created and populated during the M1 implementation phase following the precise directory specification defined in `PROJECT.md` and `SCOPE.md`.

### 1.2 Input Specifications & Requirements Survey
1. **Target SQL Server Database**:
   - Host IP: `192.168.1.130`
   - TCP Port: `44333`
   - Target DB: `MCI_JULI_31072026` (Production/Staging) or `test eoy` (Test)
   - DB Credentials: User `sa` / Password `bon`
   - Database driver: `mssql` (v10.0.2+) with `tedious` driver.

2. **Authentication & Session Requirements (R3)**:
   - User table: `USERPROFILE` (`userid`, `nmuser`, `pass`, `levelx`, `stsaktiv`, `kdloc`, `kdcab`).
   - Allowed authorization levels: `'A'` (Admin), `'M'` (Manager), `'S'` (Supervisor). Level `'U'` is restricted from supervisor actions.
   - Session tracking table: `WEBUSERSESSION` (`userid`, `appid='OTRS'`, `sessionid`, `logintgljam`).
   - Password comparison: Plaintext string matching (`pass === input_password`).

3. **Audit Logging & Network IP Detection Requirements (R3)**:
   - Client IP Range classification:
     - LAN private ranges (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, `127.0.0.1`, `::1`) -> Access type `'LAN'`, terminal tag `'WEB-LAN'`.
     - WAN/External ranges -> Access type `'EXTERNAL'`, terminal tag `'WEB-EXT'`.
   - Dual Audit Tables:
     - `WEBUSERLOG` (existing standard log): `userid`, `appid='OTRS'`, `inptgljam` (`yyyyMMddHHmmss`), `ip_address`, `lokasi`, `description`.
     - `WA_OTR_LOG` (custom authorization log): `id` (PK IDENTITY), `modul`, `aksi` ('LOGIN', 'APPROVE', 'REJECT'), `ref_id`, `userid`, `catatan`, `tgl_aksi` (`yyyyMMddHHmmss`), `ip_client`, `akses_type` ('LAN'/'EXTERNAL'), `user_agent`.

4. **REST API Interface Contracts**:
   - `POST /api/auth/login`: `{ userid, password }` -> `{ status: 'success', token, user: { userid, nmuser, levelx, kdloc, kdcab } }`
   - `GET /api/auth/me`: Header `Authorization: Bearer <token>` -> `{ status: 'success', user: { userid, nmuser, levelx, kdloc, kdcab } }`

---

## 2. Logic Chain

The Express backend architecture for Milestone 1 is structured to ensure high reliability, precise database audit trail compliance, strict Role-Based Access Control (RBAC), and robust error handling.

### 2.1 Proposed Folder Structure (`backend/`)
```
backend/
├── package.json
├── .env
├── src/
│   ├── app.js                 # Express application setup & middleware
│   ├── server.js              # Server listener & pool startup
│   ├── config/
│   │   ├── db.js              # mssql pool configuration & singleton connection helper
│   │   └── jwt.js             # JWT secret key & token options configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & supervisor levelx RBAC check
│   │   └── auditLogger.js     # IP detection (LAN/EXT) & dual audit logger (WEBUSERLOG + WA_OTR_LOG)
│   ├── routes/
│   │   └── authRoutes.js      # Login & Session routes (/api/auth)
│   └── controllers/
│       └── authController.js  # Login & session handlers
```

---

### 2.2 Package Environment Configuration (`backend/package.json`)
The module format is set to CommonJS (`"type": "commonjs"`) for compatibility with `mssql` and standard Express ecosystem tooling.

```json
{
  "name": "mitrasoft-cif-otorisasi-backend",
  "version": "1.0.0",
  "description": "Express backend REST API for MitraSoft Core Banking Otorisasi CIF Web App",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "node tests/run_all.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mssql": "^10.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "supertest": "^7.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Environment File (`backend/.env`):
```env
PORT=3000
DB_HOST=192.168.1.130
DB_PORT=44333
DB_NAME=MCI_JULI_31072026
DB_USER=sa
DB_PASS=bon
JWT_SECRET=mitrasoft_cif_otorisasi_secret_key_2026_prod
JWT_EXPIRES_IN=8h
```

---

### 2.3 Database Pool Configuration (`backend/src/config/db.js`)

**Design Rationale & Connection Pattern**:
- Wraps `mssql.ConnectionPool` in a singleton pattern.
- Port `44333` MUST be passed explicitly into `config.port` as an integer.
- Uses `options.trustServerCertificate = true` and `options.encrypt = false` to enable seamless SQL Server 2019 connections over local LAN without SSL verification errors.
- Pool options limit max connections to 10 with a 30-second idle timeout.

**Detailed Code Specification for `db.js`**:
```javascript
const mssql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || 'bon',
  server: process.env.DB_HOST || '192.168.1.130',
  port: parseInt(process.env.DB_PORT || '44333', 10),
  database: process.env.DB_NAME || 'MCI_JULI_31072026',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = new mssql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log(`[DB] Connected to SQL Server at ${config.server}:${config.port} (DB: ${config.database})`);
        pool.on('error', err => {
          console.error('[DB] Connection pool error:', err);
          poolPromise = null; // reset pool on fatal error
        });
        return pool;
      })
      .catch(err => {
        console.error('[DB] Database connection failed:', err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
    console.log('[DB] Connection pool closed.');
  }
}

module.exports = {
  getPool,
  closePool,
  mssql
};
```

---

### 2.4 JWT Configuration (`backend/src/config/jwt.js`)

```javascript
require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'mitrasoft_cif_otorisasi_secret_key_2026',
  options: {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    algorithm: 'HS256'
  }
};
```

---

### 2.5 Auth Middleware & RBAC (`backend/src/middleware/auth.js`)

**Logic & Requirements**:
1. `verifyToken`: Extracts token from header `Authorization: Bearer <token>`. Returns HTTP 401 if missing, expired, or invalid.
2. `checkSupervisorLevel`: Checks `req.user.levelx`. Only allows `'A'`, `'M'`, or `'S'`. Returns HTTP 403 Forbidden if level is `'U'` or invalid.

```javascript
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Akses ditolak: Token autentikasi tidak ditemukan'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Sesi telah kedaluwarsa, silakan login kembali'
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Token autentikasi tidak valid'
    });
  }
}

function checkSupervisorLevel(req, res, next) {
  if (!req.user || !req.user.levelx) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Data pengguna tidak valid'
    });
  }

  const allowedLevels = ['A', 'M', 'S'];
  if (!allowedLevels.includes(req.user.levelx.toUpperCase())) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Anda tidak memiliki wewenang otorisasi (membutuhkan level A, M, atau S)'
    });
  }

  next();
}

module.exports = {
  verifyToken,
  checkSupervisorLevel
};
```

---

### 2.6 Dual Audit Logger & Network IP Detection (`backend/src/middleware/auditLogger.js`)

**Logic & Requirements**:
- `getClientIp(req)`: Checks `x-forwarded-for`, `x-real-ip`, or `req.socket.remoteAddress`.
- `detectNetworkType(ip)`: Matches LAN subnet IPs (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, `127.0.0.1`, `::1`). Returns `{ type: 'LAN', term: 'WEB-LAN' }` or `{ type: 'EXTERNAL', term: 'WEB-EXT' }`.
- `ensureAuditTableExists(pool)`: Creates table `WA_OTR_LOG` if it does not exist.
- `logAuditEvent`: Writes audit records asynchronously to both `WEBUSERLOG` and `WA_OTR_LOG`.

```javascript
const { getPool, mssql } = require('../config/db');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }
  return req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
}

function detectNetworkType(ip) {
  const cleanIp = ip.replace(/^.*:/, ''); // Strip IPv6 prefix if mapped IPv4
  
  const isLan = (
    cleanIp === '127.0.0.1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)
  );

  return isLan 
    ? { type: 'LAN', term: 'WEB-LAN' }
    : { type: 'EXTERNAL', term: 'WEB-EXT' };
}

function formatTimestamp14(date = new Date()) {
  const pad = num => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

async function ensureAuditTableExists(pool) {
  const createTableQuery = `
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WA_OTR_LOG')
    BEGIN
      CREATE TABLE WA_OTR_LOG (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        modul VARCHAR(30) NOT NULL,
        aksi VARCHAR(10) NOT NULL,
        ref_id VARCHAR(100) NULL,
        userid VARCHAR(10) NOT NULL,
        catatan NVARCHAR(500) NULL,
        tgl_aksi VARCHAR(14) NOT NULL,
        ip_client VARCHAR(50) NOT NULL,
        akses_type VARCHAR(10) NOT NULL,
        user_agent NVARCHAR(255) NULL
      );
    END
  `;
  try {
    await pool.request().query(createTableQuery);
  } catch (err) {
    console.error('[AuditLogger] Error ensuring WA_OTR_LOG table exists:', err.message);
  }
}

async function writeAuditLog({ userid, modul, aksi, ref_id, catatan, req }) {
  try {
    const pool = await getPool();
    await ensureAuditTableExists(pool);

    const clientIp = getClientIp(req);
    const { type: aksesType, term: devTerm } = detectNetworkType(clientIp);
    const nowStr = formatTimestamp14();
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // 1. Insert into WA_OTR_LOG
    const waLogQuery = `
      INSERT INTO WA_OTR_LOG 
        (modul, aksi, ref_id, userid, catatan, tgl_aksi, ip_client, akses_type, user_agent)
      VALUES 
        (@modul, @aksi, @ref_id, @userid, @catatan, @tgl_aksi, @ip_client, @akses_type, @user_agent);
    `;
    await pool.request()
      .input('modul', mssql.VarChar(30), modul || 'AUTH')
      .input('aksi', mssql.VarChar(10), aksi)
      .input('ref_id', mssql.VarChar(100), ref_id || null)
      .input('userid', mssql.VarChar(10), userid)
      .input('catatan', mssql.NVarChar(500), catatan || null)
      .input('tgl_aksi', mssql.VarChar(14), nowStr)
      .input('ip_client', mssql.VarChar(50), clientIp)
      .input('akses_type', mssql.VarChar(10), aksesType)
      .input('user_agent', mssql.NVarChar(255), userAgent.substring(0, 255))
      .query(waLogQuery);

    // 2. Insert into WEBUSERLOG
    const desc = `[${aksesType}] ${aksi} ${modul || ''} ${ref_id || ''} ${catatan ? '- ' + catatan : ''}`.trim();
    const webLogQuery = `
      INSERT INTO WEBUSERLOG (userid, appid, inptgljam, ip_address, lokasi, description)
      VALUES (@userid, 'OTRS', @inptgljam, @ip_address, @lokasi, @description);
    `;
    await pool.request()
      .input('userid', mssql.VarChar(10), userid)
      .input('inptgljam', mssql.VarChar(14), nowStr)
      .input('ip_address', mssql.VarChar(50), clientIp)
      .input('lokasi', mssql.VarChar(10), devTerm)
      .input('description', mssql.VarChar(255), desc.substring(0, 255))
      .query(webLogQuery);

  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err.message);
    // Non-blocking for main transaction, log warning only
  }
}

module.exports = {
  getClientIp,
  detectNetworkType,
  formatTimestamp14,
  writeAuditLog
};
```

---

### 2.7 Auth Controller (`backend/src/controllers/authController.js`)

**Logic & Execution Flow**:
1. `login`:
   - Validates input (`userid`, `password`).
   - Parameterized query on `USERPROFILE`: `SELECT userid, nmuser, pass, levelx, stsaktiv, kdloc, kdcab FROM USERPROFILE WHERE userid = @userid`.
   - Checks user existence, active status (`stsaktiv`), and exact password match (`pass === password`).
   - Checks `levelx` in `['A', 'M', 'S']`. If user is `'U'`, returns 403 Forbidden.
   - Generates session ID (e.g. `SES_<timestamp>_<random>`) and inserts/updates `WEBUSERSESSION` table.
   - Signs JWT payload containing `{ userid, nmuser, levelx, kdloc, kdcab, sessionid }`.
   - Writes audit log (`LOGIN`).
   - Returns `{ status: 'success', token, user: { userid, nmuser, levelx, kdloc, kdcab } }`.

2. `getMe`:
   - Returns token payload from `req.user`.

```javascript
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { getPool, mssql } = require('../config/db');
const { writeAuditLog, formatTimestamp14 } = require('../middleware/auditLogger');

async function login(req, res, next) {
  try {
    const { userid, password } = req.body;

    if (!userid || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID dan Password wajib diisi'
      });
    }

    const pool = await getPool();
    const userQuery = `
      SELECT TOP 1 userid, nmuser, pass, levelx, stsaktiv, kdloc, kdcab 
      FROM USERPROFILE 
      WHERE userid = @userid
    `;
    
    const userResult = await pool.request()
      .input('userid', mssql.VarChar(10), userid.trim())
      .query(userQuery);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID atau Password tidak sesuai'
      });
    }

    const user = userResult.recordset[0];

    // Password verification (MitraSoft CBS stores plain text passwords)
    if (user.pass !== password) {
      return res.status(401).json({
        status: 'error',
        message: 'User ID atau Password tidak sesuai'
      });
    }

    // Active status check
    if (user.stsaktiv && user.stsaktiv.toUpperCase() === 'N') {
      return res.status(403).json({
        status: 'error',
        message: 'Akun Anda sedang tidak aktif. Hubungi administrator.'
      });
    }

    // Level permission check for Otorisasi app
    const userLevel = (user.levelx || '').toUpperCase();
    if (!['A', 'M', 'S'].includes(userLevel)) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak: Level pengguna tidak memiliki hak otorisasi (A/M/S)'
      });
    }

    // Session Management in WEBUSERSESSION
    const sessionId = `SES_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const nowStr = formatTimestamp14();

    const sessionQuery = `
      IF EXISTS (SELECT 1 FROM WEBUSERSESSION WHERE userid = @userid AND appid = 'OTRS')
      BEGIN
        UPDATE WEBUSERSESSION 
        SET sessionid = @sessionid, logintgljam = @logintgljam
        WHERE userid = @userid AND appid = 'OTRS'
      END
      ELSE
      BEGIN
        INSERT INTO WEBUSERSESSION (userid, appid, sessionid, logintgljam)
        VALUES (@userid, 'OTRS', @sessionid, @logintgljam)
      END
    `;

    await pool.request()
      .input('userid', mssql.VarChar(10), user.userid)
      .input('sessionid', mssql.VarChar(100), sessionId)
      .input('logintgljam', mssql.VarChar(14), nowStr)
      .query(sessionQuery);

    // Write audit log
    await writeAuditLog({
      userid: user.userid,
      modul: 'AUTH',
      aksi: 'LOGIN',
      ref_id: sessionId,
      catatan: `Login berhasil (Level ${userLevel})`,
      req
    });

    // Sign JWT Token
    const payload = {
      userid: user.userid,
      nmuser: user.nmuser,
      levelx: userLevel,
      kdloc: user.kdloc,
      kdcab: user.kdcab,
      sessionid: sessionId
    };

    const token = jwt.sign(payload, jwtConfig.secret, jwtConfig.options);

    return res.json({
      status: 'success',
      message: 'Login berhasil',
      token,
      user: {
        userid: user.userid,
        nmuser: user.nmuser,
        levelx: userLevel,
        kdloc: user.kdloc,
        kdcab: user.kdcab
      }
    });

  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return res.json({
      status: 'success',
      user: req.user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe
};
```

---

### 2.8 Auth Routes (`backend/src/routes/authRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkSupervisorLevel } = require('../middleware/auth');

// Public route: Login
router.post('/login', authController.login);

// Protected route: Current user session profile
router.get('/me', verifyToken, checkSupervisorLevel, authController.getMe);

module.exports = router;
```

---

### 2.9 Express Application (`backend/src/app.js`)

```javascript
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const { getPool } = require('./config/db');

const app = express();

// Trust reverse proxy for client IP detection
app.set('trust proxy', true);

// Cross-Origin Resource Sharing
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS server_time');
    return res.json({
      status: 'success',
      message: 'Backend API and Database Connection operational',
      db_time: result.recordset[0].server_time,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection check failed',
      error: err.message
    });
  }
});

// Route Mounting
app.use('/api/auth', authRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`
  });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Terjadi kesalahan internal server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
```

---

### 2.10 Server Startup Script (`backend/src/server.js`)

```javascript
require('dotenv').config();
const app = require('./app');
const { getPool, closePool } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 1. Initialize database connection pool
    await getPool();
    
    // 2. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` MitraSoft Core Banking Otorisasi CIF Web Backend API `);
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Target DB: ${process.env.DB_HOST || '192.168.1.130'}:${process.env.DB_PORT || '44333'}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        console.log('[Server] Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('[Server] Critical startup failure:', err);
    process.exit(1);
  }
}

startServer();
```

---

## 3. Caveats

1. **Plaintext Passwords in `USERPROFILE`**:
   - Production CBS table `USERPROFILE` stores passwords as plaintext strings (e.g. `'bon'`). Password verification must compare strings directly (`user.pass === password`). Do NOT attempt `bcrypt` hashing on database reads, as it would cause authentication failures.

2. **Terminal Tracking Column Limits (`VARCHAR(10)`)**:
   - Tables across MitraSoft CBS limit terminal tracking columns (`autterm`, `devaut`, `lokasi`) to `VARCHAR(10)`.
   - Web application network detection MUST output strictly `'WEB-LAN'` (7 chars) or `'WEB-EXT'` (7 chars). Never exceed 10 characters to prevent SQL string truncation errors.

3. **Reverse Proxy & IP Detection**:
   - If Express runs behind Nginx or IIS reverse proxy, `app.set('trust proxy', true)` must be active so `x-forwarded-for` accurately reports client IP rather than proxy internal IP.

4. **Non-blocking Audit Log Failures**:
   - Audit log writing (`writeAuditLog`) uses an internal `try/catch` block. If `WA_OTR_LOG` or `WEBUSERLOG` table encounters temporary write locks, the main login/authorization transaction will succeed while logging a warning to server stderr.

---

## 4. Conclusion

The Express backend architecture and package environment for Milestone 1 are completely defined.
The proposed structure includes:
- **Node.js Package Setup**: Express 4, `mssql` (tedious), `jsonwebtoken`, `cors`, `dotenv`.
- **Database Connection Pool**: Singleton `mssql.ConnectionPool` targeting `192.168.1.130:44333` (DB: `MCI_JULI_31072026`).
- **JWT & RBAC Security**: `verifyToken` middleware, supervisor check (`levelx` IN ('A', 'M', 'S')).
- **Dual Audit Logging**: IP subnet detection (LAN vs EXTERNAL) with writing to `WEBUSERLOG` and `WA_OTR_LOG`.
- **Auth Endpoints**: `POST /api/auth/login` and `GET /api/auth/me`.
- **Application & Server Modules**: Clean separation between `app.js` (Express configuration) and `server.js` (HTTP listener & DB startup).

---

## 5. Verification Method

Once implemented by developer agents, the backend infrastructure and authentication can be verified with the following procedure:

### 5.1 Verification Commands
1. **Directory & Syntax Verification**:
   ```bash
   cd D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\backend
   npm install
   node -c src/server.js src/app.js src/config/db.js src/config/jwt.js src/middleware/auth.js src/middleware/auditLogger.js src/controllers/authController.js src/routes/authRoutes.js
   ```

2. **Server & DB Connection Test**:
   ```bash
   npm start
   ```
   *Expected Output*:
   `[DB] Connected to SQL Server at 192.168.1.130:44333 (DB: MCI_JULI_31072026)`
   `Server running on http://localhost:3000`

3. **Health Check Endpoint Test**:
   ```bash
   curl -s http://localhost:3000/api/health
   ```
   *Expected JSON Output*: `{"status":"success","message":"Backend API and Database Connection operational",...}`

4. **Login Endpoint Test (`POST /api/auth/login`)**:
   ```bash
   curl -s -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"userid\":\"sa\",\"password\":\"bon\"}"
   ```
   *Expected JSON Output*: `{"status":"success","message":"Login berhasil","token":"eyJhbG...", "user":{"userid":"sa", ...}}`

5. **Session Endpoint Test (`GET /api/auth/me`)**:
   ```bash
   curl -s -X GET http://localhost:3000/api/auth/me \
     -H "Authorization: Bearer <TOKEN_FROM_STEP_4>"
   ```
   *Expected JSON Output*: `{"status":"success","user":{"userid":"sa","levelx":"A",...}}`

6. **Audit Database Query Test**:
   Run in SQL Server Management Studio or `mssql`:
   ```sql
   SELECT TOP 5 * FROM WA_OTR_LOG ORDER BY id DESC;
   SELECT TOP 5 * FROM WEBUSERLOG WHERE appid = 'OTRS' ORDER BY inptgljam DESC;
   ```

### 5.2 Invalidation Conditions
- If DB connection fails with `ConnectionError: Port 44333 unreachable` (check local LAN routing or firewall).
- If `GET /api/auth/me` returns HTTP 403 when user `levelx` is not 'A', 'M', or 'S'.
- If audit record writes strings exceeding 10 chars into `autterm`/`lokasi` (truncation error).

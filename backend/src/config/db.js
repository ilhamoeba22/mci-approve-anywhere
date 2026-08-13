const mssql = require('mssql');
require('dotenv').config();

// Pool cache map: key = dbTargetKey -> Promise<pool>
const pools = new Map();

function parseDbHumanLabel(dbName) {
  if (!dbName) return '';
  if (dbName === 'test eoy') {
    return '🟡 test eoy — Database Pengujian EOY (End of Year)';
  }
  if (dbName === 'dashboard_monitoring' || dbName === 'new_dashboard') {
    return `🔵 ${dbName} — Database Dashboard & Monitoring`;
  }
  if (dbName === 'MCI_REALTIME_CLONE') {
    return `🔵 ${dbName} — Database Realtime Clone`;
  }

  const nameUpper = dbName.toUpperCase();

  const monthMap = [
    { keys: ['JUNI', 'JUN'], label: 'Juni' },
    { keys: ['JULI', 'JUL'], label: 'Juli' },
    { keys: ['SEPT', 'SEP'], label: 'September' },
    { keys: ['AGS', 'AGT'], label: 'Agustus' },
    { keys: ['JAN'], label: 'Januari' },
    { keys: ['FEB'], label: 'Februari' },
    { keys: ['MAR'], label: 'Maret' },
    { keys: ['APR'], label: 'April' },
    { keys: ['MEI'], label: 'Mei' },
    { keys: ['OKT'], label: 'Oktober' },
    { keys: ['NOV'], label: 'November' },
    { keys: ['DES'], label: 'Desember' }
  ];

  let foundMonth = '';
  for (const m of monthMap) {
    if (m.keys.some(k => nameUpper.includes(k))) {
      foundMonth = m.label;
      break;
    }
  }

  let foundYear = '';
  const matchYear = nameUpper.match(/(202[0-9])/);
  if (matchYear) {
    foundYear = matchYear[1];
  } else {
    const match2Digit = nameUpper.match(/(2[4-9])/);
    if (match2Digit) {
      foundYear = '20' + match2Digit[1];
    }
  }

  let tag = '🔵';
  let extra = '';
  if (dbName === 'MCI_JULI_31072026') {
    tag = '🟢';
    extra = ' (Database Utama Lokal)';
  }

  if (foundMonth && foundYear) {
    return `${tag} ${dbName} — Database ${foundMonth} ${foundYear}${extra}`;
  } else if (foundMonth) {
    return `${tag} ${dbName} — Database ${foundMonth}${extra}`;
  } else {
    return `${tag} ${dbName}${extra}`;
  }
}

// Target DB Connection Config Resolver
function resolveDbConfig(targetDb) {
  const dbKey = (targetDb || '').trim();

  // 1. Live Production Server
  if (dbKey === 'BPRS_MCI_LIVE' || dbKey.toUpperCase() === 'BPRS_MCI') {
    return {
      key: 'BPRS_MCI_LIVE',
      displayName: 'BPRS_MCI (Live Production)',
      server: process.env.DB_HOST || 'iba-net.02.mglobalperdana.com',
      port: parseInt(process.env.DB_PORT || '44333', 10),
      database: 'BPRS_MCI',
      user: process.env.DB_USER || 'saiba',
      password: process.env.DB_PASS || 'YkETOrtaVerLEMOn'
    };
  }

  // 2. Local Server Databases (Default: MCI_JULI_31072026)
  const localDbName = dbKey || process.env.DB_NAME || 'MCI_JULI_31072026';
  return {
    key: localDbName,
    displayName: `${localDbName} (Local Server)`,
    server: process.env.DB_HOST || '192.168.1.130',
    port: parseInt(process.env.DB_PORT || '44333', 10),
    database: localDbName,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASS || 'bon'
  };
}

async function ensureAuditLogTable(pool) {
  const query = `
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WA_OTR_LOG]') AND type in (N'U'))
    BEGIN
      CREATE TABLE [dbo].[WA_OTR_LOG] (
        [id]         BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [modul]      VARCHAR(30) NOT NULL,
        [aksi]       VARCHAR(10) NOT NULL,
        [ref_id]     VARCHAR(100) NULL,
        [userid]     VARCHAR(10) NOT NULL,
        [catatan]    NVARCHAR(500) NULL,
        [tgl_aksi]   VARCHAR(14) NOT NULL,
        [ip_client]  VARCHAR(50) NULL,
        [akses_type] VARCHAR(10) NULL,
        [devterm]    VARCHAR(10) NULL,
        [user_agent] NVARCHAR(255) NULL
      );

      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WA_OTR_LOG_ref_id')
        CREATE INDEX [IX_WA_OTR_LOG_ref_id] ON [dbo].[WA_OTR_LOG] ([ref_id]);
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WA_OTR_LOG_userid')
        CREATE INDEX [IX_WA_OTR_LOG_userid] ON [dbo].[WA_OTR_LOG] ([userid]);
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_WA_OTR_LOG_tgl_aksi')
        CREATE INDEX [IX_WA_OTR_LOG_tgl_aksi] ON [dbo].[WA_OTR_LOG] ([tgl_aksi]);
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WA_OTR_LOG]') AND name = N'devterm')
        ALTER TABLE [dbo].[WA_OTR_LOG] ADD [devterm] VARCHAR(10) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WA_OTR_LOG]') AND name = N'akses_type')
        ALTER TABLE [dbo].[WA_OTR_LOG] ADD [akses_type] VARCHAR(10) NULL;
    END
  `;
  try {
    await pool.request().query(query);
  } catch (err) {
    console.error('[DB] Error auto-creating WA_OTR_LOG table:', err.message);
  }
}

async function getPool(targetDb) {
  const dbInfo = resolveDbConfig(targetDb);
  const cacheKey = dbInfo.key;

  if (!pools.has(cacheKey)) {
    const config = {
      user: dbInfo.user,
      password: dbInfo.password,
      server: dbInfo.server,
      port: dbInfo.port,
      database: dbInfo.database,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      connectionTimeout: 10000
    };

    const poolPromise = new mssql.ConnectionPool(config)
      .connect()
      .then(async (pool) => {
        console.log(`[DBPool] Connected to ${dbInfo.displayName} at ${dbInfo.server}:${dbInfo.port}`);
        await ensureAuditLogTable(pool);
        pool.on('error', (err) => {
          console.error(`[DBPool] Pool error on ${cacheKey}:`, err);
          pools.delete(cacheKey);
        });
        return pool;
      })
      .catch((err) => {
        console.error(`[DBPool] Connection failed for ${cacheKey}:`, err.message);
        pools.delete(cacheKey);
        throw err;
      });

    pools.set(cacheKey, poolPromise);
  }

  return pools.get(cacheKey);
}

async function closeAllPools() {
  for (const [key, poolPromise] of pools.entries()) {
    try {
      const pool = await poolPromise;
      await pool.close();
    } catch (err) {
      console.error(`[DBPool] Error closing pool for ${key}:`, err.message);
    }
  }
  pools.clear();
}

async function listAvailableDatabases() {
  return {
    live: [
      {
        key: 'BPRS_MCI_LIVE',
        name: '🔴 BPRS_MCI — Database Production Live (iba-net.02.mglobalperdana.com)',
        server: 'iba-net.02.mglobalperdana.com',
        database: 'BPRS_MCI',
        isDefault: true
      }
    ],
    local: []
  };
}

module.exports = {
  getPool,
  resolveDbConfig,
  closeAllPools,
  listAvailableDatabases,
  parseDbHumanLabel,
  mssql
};

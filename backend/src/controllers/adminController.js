const { getActiveConfigInfo, testConnection, switchDatabaseConfig, getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

async function getDbConfig(req, res, next) {
  try {
    const configInfo = getActiveConfigInfo();
    return res.json({
      status: 'success',
      data: configInfo
    });
  } catch (err) {
    next(err);
  }
}

async function testDbConfig(req, res, next) {
  try {
    const { server, port, database, user, password } = req.body;
    if (!server || !database || !user) {
      return res.status(400).json({ status: 'error', message: 'Server, Database, dan User wajib diisi' });
    }

    const testRes = await testConnection({ server, port: port || 1433, database, user, password });
    return res.json(testRes);
  } catch (err) {
    next(err);
  }
}

async function updateDbConfig(req, res, next) {
  try {
    const { server, port, database, user, password, readOnlyUser, activePresetId } = req.body;

    if (!server || !database || !user) {
      return res.status(400).json({ status: 'error', message: 'Server, Database, dan User wajib diisi' });
    }

    const newConfig = {
      activePresetId: activePresetId || 'custom',
      server: String(server).trim(),
      port: parseInt(port || '1433', 10),
      database: String(database).trim(),
      user: String(user).trim(),
      password: String(password || ''),
      readOnlyUser: readOnlyUser ? String(readOnlyUser).trim() : String(user).trim()
    };

    // Test connection first
    const testRes = await testConnection(newConfig);
    if (!testRes.success) {
      return res.status(400).json({
        status: 'error',
        message: `Gagal ganti koneksi database: ${testRes.message}`
      });
    }

    // Switch connection pool
    await switchDatabaseConfig(newConfig);

    // Ensure SUPERADMIN exists in new database so superadmin can keep managing
    try {
      const pool = await getPool();
      const checkSuper = await pool.request().query("SELECT COUNT(*) AS cnt FROM USERPROFILE WHERE UPPER(userid) = 'SUPERADMIN'");
      if (checkSuper.recordset[0].cnt === 0) {
        await pool.request().query(`
          INSERT INTO USERPROFILE (
            userid, batch, nmuser, pass, passweb, levelx, stsaktiv, 
            kdloc, kdcab, email, tokenfcm, twofactorkey, stsrec, inpuser, inptgl
          ) VALUES (
            'SUPERADMIN', 0, 'SUPER ADMIN', 'admin123', 'admin123', 'A', 'A',
            '01', '01', 'admin@mitrasoft.co.id', '', '', 'A', 'SYSTEM', '20260812115500'
          )
        `);
        console.log('[Superadmin] Created SUPERADMIN user in newly selected database.');
      }
    } catch (dbErr) {
      console.error('[Superadmin] Could not auto-insert SUPERADMIN in new DB:', dbErr.message);
    }

    await writeAuditLog({
      userid: req.user.userid,
      modul: 'ADMIN_CONFIG',
      aksi: 'SWITCH_DB',
      ref_id: `${newConfig.server}:${newConfig.port}/${newConfig.database}`,
      catatan: `Database switched to ${newConfig.database} @ ${newConfig.server}`,
      req
    });

    return res.json({
      status: 'success',
      message: `Database berhasil diubah ke ${newConfig.database} pada server ${newConfig.server}:${newConfig.port}`,
      data: getActiveConfigInfo()
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDbConfig,
  testDbConfig,
  updateDbConfig
};

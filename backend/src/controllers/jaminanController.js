const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingJaminan(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT noreg, urut, nocif, an, dokumen, jnsdokumen, jnsikat, jnsjamin, status, stsasr, sandidati2, dd_latitude, dd_longitude, nomtaksasi, nompasar, nomlikuid, nilaiagunbi, plafond, akandiguna, digunakan, tglmasuk, namaci, kdpenilai, tgltaks1, tgltaks2, loksimpan, ketsimpan, lokasi, catatan, nokontrak, kdloc, kdcab, inpuser, inptgljam, autuser, auttgljam, stsrec
      FROM TOFJAMIN 
      WHERE stsrec = 'N'
      ORDER BY inptgljam DESC, noreg DESC, urut ASC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailJaminan(req, res, next) {
  try {
    const { noreg } = req.params;
    const parts = String(noreg).split('_');
    const cleanNoreg = parts[0];
    const urut = parts[1] || null;

    const pool = await getPool(req.user ? req.user.target_db : null);
    let query = `SELECT * FROM TOFJAMIN WHERE noreg = @noreg`;
    if (urut) {
      query += ` AND urut = @urut`;
    }
    const reqSql = pool.request().input('noreg', mssql.VarChar(30), cleanNoreg);
    if (urut) {
      reqSql.input('urut', mssql.Numeric(4, 0), Number(urut));
    }
    const result = await reqSql.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Data Jaminan tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveJaminan(req, res, next) {
  try {
    const { noreg } = req.params;
    const parts = String(noreg).split('_');
    const cleanNoreg = parts[0];
    const urut = parts[1] || null;
    const checker = req.user.userid.toUpperCase();

    const pool = await getPool(req.user ? req.user.target_db : null);

    // Dynamic Database Authorization Check against USERPROFILE (akses, levelx, limitldr)
    const userProfileQuery = await pool.request()
      .input('userid', mssql.VarChar(10), checker)
      .query(`SELECT userid, levelx, akses, limitldr, stsaktiv FROM USERPROFILE WHERE UPPER(userid) = UPPER(@userid)`);

    let isAuthorized = false;
    if (userProfileQuery.recordset.length > 0) {
      const u = userProfileQuery.recordset[0];
      const level = (u.levelx || '').trim().toUpperCase();
      const akses = (u.akses || '').trim();
      const limitldr = Number(u.limitldr || 0);

      // Dynamic rule: Authorized if Level A/M/S OR has 'Y' permission in database profile OR has loan/collateral limit > 0
      isAuthorized = (['A', 'M', 'S'].includes(level) || akses.includes('Y') || limitldr > 0);
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        message: 'Otorisasi Gagal: User Anda tidak memiliki wewenang otorisasi Agunan/Jaminan di database USERPROFILE.'
      });
    }

    const now = getFormattedNow();
    const autterm = req.auditInfo ? (req.auditInfo.devterm || req.auditInfo.networkType || 'WEB-LAN') : 'WEB-LAN';

    let updateQuery = `
      UPDATE TOFJAMIN 
      SET stsrec = 'A', autuser = @autuser, auttgljam = @auttgljam, autterm = @autterm 
      WHERE noreg = @noreg AND stsrec = 'N'
    `;
    if (urut) {
      updateQuery += ` AND urut = @urut`;
    }

    const reqSql = pool.request()
      .input('noreg', mssql.VarChar(30), cleanNoreg)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgljam', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm);
    if (urut) {
      reqSql.input('urut', mssql.Numeric(4, 0), Number(urut));
    }

    const result = await reqSql.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'JAMINAN',
      aksi: 'APPROVE',
      ref_id: urut ? `${cleanNoreg}_${urut}` : cleanNoreg,
      catatan: `Registrasi Jaminan ${cleanNoreg} (Urut: ${urut || '1'}) di-approve`,
      req
    });

    return res.json({ status: 'success', message: 'Registrasi Jaminan berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectJaminan(req, res, next) {
  try {
    const { noreg } = req.params;
    const parts = String(noreg).split('_');
    const cleanNoreg = parts[0];
    const urut = parts[1] || null;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid.toUpperCase();

    const pool = await getPool(req.user ? req.user.target_db : null);

    // Dynamic Database Authorization Check against USERPROFILE (akses, levelx, limitldr)
    const userProfileQuery = await pool.request()
      .input('userid', mssql.VarChar(10), checker)
      .query(`SELECT userid, levelx, akses, limitldr, stsaktiv FROM USERPROFILE WHERE UPPER(userid) = UPPER(@userid)`);

    let isAuthorized = false;
    if (userProfileQuery.recordset.length > 0) {
      const u = userProfileQuery.recordset[0];
      const level = (u.levelx || '').trim().toUpperCase();
      const akses = (u.akses || '').trim();
      const limitldr = Number(u.limitldr || 0);

      isAuthorized = (['A', 'M', 'S'].includes(level) || akses.includes('Y') || limitldr > 0);
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        message: 'Otorisasi Gagal: User Anda tidak memiliki wewenang otorisasi Agunan/Jaminan di database USERPROFILE.'
      });
    }

    const now = getFormattedNow();
    const autterm = req.auditInfo ? (req.auditInfo.devterm || req.auditInfo.networkType || 'WEB-LAN') : 'WEB-LAN';

    let updateQuery = `
      UPDATE TOFJAMIN 
      SET stsrec = 'C', autuser = @autuser, auttgljam = @auttgljam, autterm = @autterm 
      WHERE noreg = @noreg AND stsrec = 'N'
    `;
    if (urut) {
      updateQuery += ` AND urut = @urut`;
    }

    const reqSql = pool.request()
      .input('noreg', mssql.VarChar(30), cleanNoreg)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgljam', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm);
    if (urut) {
      reqSql.input('urut', mssql.Numeric(4, 0), Number(urut));
    }

    const result = await reqSql.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'JAMINAN',
      aksi: 'REJECT',
      ref_id: urut ? `${cleanNoreg}_${urut}` : cleanNoreg,
      catatan: `Penolakan ${cleanNoreg} (Urut: ${urut || '1'}): ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Registrasi Jaminan berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingJaminan,
  getDetailJaminan,
  approveJaminan,
  rejectJaminan
};


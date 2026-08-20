const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// -------------------------------------------------------------
// CIF PERORANGAN
// -------------------------------------------------------------
async function getPendingPerorangan(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT nocif, nm, golcust, jnsbh, jnsid, noid, kota, kdloc, kdcab, inpuser, tglinp, autuser, tglaut, stsrec
      FROM mCIF 
      WHERE stsrec = 'N' AND (golcust = 'I' OR golcust IS NULL OR golcust = '')
      ORDER BY nocif DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailPerorangan(req, res, next) {
  try {
    const { nocif } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .query(`SELECT * FROM mCIF WHERE nocif = @nocif`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'CIF Perorangan tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approvePerorangan(req, res, next) {
  try {
    const { nocif } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const devaut = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .input('autuser', mssql.VarChar(10), checker)
      .input('tglaut', mssql.VarChar(14), now)
      .input('devaut', mssql.VarChar(10), devaut)
      .query(`
        UPDATE mCIF 
        SET stsrec = 'A', autuser = @autuser, tglaut = @tglaut, devaut = @devaut 
        WHERE nocif = @nocif AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'CIF_PERORANGAN',
      aksi: 'APPROVE',
      ref_id: nocif,
      catatan: 'CIF Perorangan di-approve',
      req
    });

    return res.json({ status: 'success', message: 'CIF Perorangan berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectPerorangan(req, res, next) {
  try {
    const { nocif } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const devaut = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .input('autuser', mssql.VarChar(10), checker)
      .input('tglaut', mssql.VarChar(14), now)
      .input('devaut', mssql.VarChar(10), devaut)
      .query(`
        UPDATE mCIF 
        SET stsrec = 'C', autuser = @autuser, tglaut = @tglaut, devaut = @devaut 
        WHERE nocif = @nocif AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'CIF_PERORANGAN',
      aksi: 'REJECT',
      ref_id: nocif,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'CIF Perorangan berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// CIF BADAN HUKUM
// -------------------------------------------------------------
async function getPendingBadanHukum(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT nocif, nm, golcust, jnsbh, jnsid, noid, kota, kdloc, kdcab, inpuser, tglinp, autuser, tglaut, stsrec
      FROM mCIF 
      WHERE stsrec = 'N' AND golcust <> 'I' AND golcust IS NOT NULL AND golcust <> ''
      ORDER BY nocif DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailBadanHukum(req, res, next) {
  try {
    const { nocif } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .query(`SELECT * FROM mCIF WHERE nocif = @nocif`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'CIF Badan Hukum tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveBadanHukum(req, res, next) {
  try {
    const { nocif } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const devaut = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .input('autuser', mssql.VarChar(10), checker)
      .input('tglaut', mssql.VarChar(14), now)
      .input('devaut', mssql.VarChar(10), devaut)
      .query(`
        UPDATE mCIF 
        SET stsrec = 'A', autuser = @autuser, tglaut = @tglaut, devaut = @devaut 
        WHERE nocif = @nocif AND stsrec = 'N';

        UPDATE mCIFMGM
        SET stsrec = 'A', autuser = @autuser, auttgl = @tglaut, autterm = @devaut
        WHERE nocif = @nocif AND stsrec = 'N';
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'CIF_BADANHUKUM',
      aksi: 'APPROVE',
      ref_id: nocif,
      catatan: 'CIF Badan Hukum di-approve',
      req
    });

    return res.json({ status: 'success', message: 'CIF Badan Hukum berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectBadanHukum(req, res, next) {
  try {
    const { nocif } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const devaut = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nocif', mssql.VarChar(9), nocif)
      .input('autuser', mssql.VarChar(10), checker)
      .input('tglaut', mssql.VarChar(14), now)
      .input('devaut', mssql.VarChar(10), devaut)
      .query(`
        UPDATE mCIF 
        SET stsrec = 'C', autuser = @autuser, tglaut = @tglaut, devaut = @devaut 
        WHERE nocif = @nocif AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'CIF_BADANHUKUM',
      aksi: 'REJECT',
      ref_id: nocif,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'CIF Badan Hukum berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingPerorangan,
  getDetailPerorangan,
  approvePerorangan,
  rejectPerorangan,
  getPendingBadanHukum,
  getDetailBadanHukum,
  approveBadanHukum,
  rejectBadanHukum
};


const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingPembiayaan(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT nokontrak, nocif, nama, kdprd, kdcab, kdloc, mdlawal, tglakad, inpuser, inptgl, autuser, auttgl, stsrec
      FROM TOFLMB 
      WHERE stsrec = 'N'
      ORDER BY nokontrak DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailPembiayaan(req, res, next) {
  try {
    const { nokontrak } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nokontrak', mssql.VarChar(11), nokontrak)
      .query(`SELECT * FROM TOFLMB WHERE nokontrak = @nokontrak`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Kontrak Pembiayaan tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approvePembiayaan(req, res, next) {
  try {
    const { nokontrak } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nokontrak', mssql.VarChar(11), nokontrak)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFLMB 
        SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE nokontrak = @nokontrak AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'PEMBIAYAAN',
      aksi: 'APPROVE',
      ref_id: nokontrak,
      catatan: 'Permohonan Pembiayaan di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Pembiayaan berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectPembiayaan(req, res, next) {
  try {
    const { nokontrak } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nokontrak', mssql.VarChar(11), nokontrak)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFLMB 
        SET stsrec = 'C', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE nokontrak = @nokontrak AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'PEMBIAYAAN',
      aksi: 'REJECT',
      ref_id: nokontrak,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Pembiayaan berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingPembiayaan,
  getDetailPembiayaan,
  approvePembiayaan,
  rejectPembiayaan
};


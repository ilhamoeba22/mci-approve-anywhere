const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingAset(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT kdaset, ket, haper, kdloc, kdcab, inpuser, inptgl, autuser, auttgl, stsrec
      FROM TOFASET 
      WHERE stsrec = 'N'
      ORDER BY kdaset DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailAset(req, res, next) {
  try {
    const { kdaset } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('kdaset', mssql.VarChar(20), kdaset)
      .query(`SELECT * FROM TOFASET WHERE kdaset = @kdaset`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Aset tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveAset(req, res, next) {
  try {
    const { kdaset } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('kdaset', mssql.VarChar(20), kdaset)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFASET 
        SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE kdaset = @kdaset AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'ASET',
      aksi: 'APPROVE',
      ref_id: kdaset,
      catatan: 'Pengadaan Aset di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Pengadaan Aset berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectAset(req, res, next) {
  try {
    const { kdaset } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('kdaset', mssql.VarChar(20), kdaset)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFASET 
        SET stsrec = 'C', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE kdaset = @kdaset AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'ASET',
      aksi: 'REJECT',
      ref_id: kdaset,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Pengadaan Aset berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingAset,
  getDetailAset,
  approveAset,
  rejectAset
};


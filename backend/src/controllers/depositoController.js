const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingDeposito(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT nodep, nobilyet, nama, nocif, kdprd, kdloc, kdcab, nomrp, tglbuka, jkwaktu, inpuser, inptgl, autuser, auttgl, stsrec
      FROM TOFDEP 
      WHERE stsrec = 'N'
      ORDER BY nodep DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailDeposito(req, res, next) {
  try {
    const { nodep } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nodep', mssql.VarChar(11), nodep)
      .query(`SELECT * FROM TOFDEP WHERE nodep = @nodep`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Bilyet Deposito tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveDeposito(req, res, next) {
  try {
    const { nodep } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nodep', mssql.VarChar(11), nodep)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFDEP 
        SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE nodep = @nodep AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'DEPOSITO',
      aksi: 'APPROVE',
      ref_id: nodep,
      catatan: 'Pembukaan Deposito di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Pembukaan Deposito berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectDeposito(req, res, next) {
  try {
    const { nodep } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('nodep', mssql.VarChar(11), nodep)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFDEP 
        SET stsrec = 'C', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE nodep = @nodep AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'DEPOSITO',
      aksi: 'REJECT',
      ref_id: nodep,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Pembukaan Deposito berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingDeposito,
  getDetailDeposito,
  approveDeposito,
  rejectDeposito
};


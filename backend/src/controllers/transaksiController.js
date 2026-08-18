const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingTransaksi(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT 
        t.tgltrn, t.batch, t.notrn, t.dracc, t.cracc, t.nominalrp, t.ket, t.kdloc, t.ststrn, t.inpuser, t.inptgl, t.autuser, t.auttgl,
        COALESCE(tb_dr.fnama, dep_dr.nama, lmb_dr.nama, gl_dr.nmsbb, c_dr.nm, '-') AS nama_rek_debet,
        COALESCE(tb_cr.fnama, dep_cr.nama, lmb_cr.nama, gl_cr.nmsbb, c_cr.nm, '-') AS nama_rek_kredit,
        COALESCE(tb_dr.fnama, tb_cr.fnama, dep_dr.nama, dep_cr.nama, lmb_dr.nama, lmb_cr.nama, gl_dr.nmsbb, gl_cr.nmsbb, t.ket) AS nm,
        COALESCE(c_dr.nm, c_cr.nm, tb_dr.fnama, tb_cr.fnama, dep_dr.nama, dep_cr.nama, '-') AS namanasabah
      FROM TOFTRNC t
      LEFT JOIN TOFTABB tb_dr ON t.dracc = tb_dr.notab
      LEFT JOIN mCIF c_dr ON tb_dr.nocif = c_dr.nocif
      LEFT JOIN TOFDEP dep_dr ON t.dracc = dep_dr.nodep
      LEFT JOIN TOFLMB lmb_dr ON t.dracc = lmb_dr.nokontrak
      LEFT JOIN MGL gl_dr ON t.dracc = gl_dr.nosbb

      LEFT JOIN TOFTABB tb_cr ON t.cracc = tb_cr.notab
      LEFT JOIN mCIF c_cr ON tb_cr.nocif = c_cr.nocif
      LEFT JOIN TOFDEP dep_cr ON t.cracc = dep_cr.nodep
      LEFT JOIN TOFLMB lmb_cr ON t.cracc = lmb_cr.nokontrak
      LEFT JOIN MGL gl_cr ON t.cracc = gl_cr.nosbb
      WHERE t.ststrn IN ('2', '6')
      ORDER BY t.tgltrn DESC, t.batch DESC, t.notrn DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailTransaksi(req, res, next) {
  try {
    const { id } = req.params; // format: "tgltrn_batch_notrn"
    const parts = id.split('_');
    if (parts.length !== 3) {
      return res.status(400).json({ status: 'error', message: 'ID transaksi tidak valid. Format: tgltrn_batch_notrn' });
    }
    const [tgltrn, batch, notrn] = parts;

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('tgltrn', mssql.VarChar(8), tgltrn)
      .input('batch', mssql.Numeric(5, 0), batch)
      .input('notrn', mssql.Numeric(5, 0), notrn)
      .query(`
        SELECT 
          t.*,
          COALESCE(tb_dr.fnama, dep_dr.nama, lmb_dr.nama, gl_dr.nmsbb, c_dr.nm, '-') AS nama_rek_debet,
          COALESCE(tb_cr.fnama, dep_cr.nama, lmb_cr.nama, gl_cr.nmsbb, c_cr.nm, '-') AS nama_rek_kredit,
          COALESCE(tb_dr.fnama, tb_cr.fnama, dep_dr.nama, dep_cr.nama, lmb_dr.nama, lmb_cr.nama, gl_dr.nmsbb, gl_cr.nmsbb, t.ket) AS nm,
          COALESCE(c_dr.nm, c_cr.nm, tb_dr.fnama, tb_cr.fnama, dep_dr.nama, dep_cr.nama, '-') AS namanasabah
        FROM TOFTRNC t
        LEFT JOIN TOFTABB tb_dr ON t.dracc = tb_dr.notab
        LEFT JOIN mCIF c_dr ON tb_dr.nocif = c_dr.nocif
        LEFT JOIN TOFDEP dep_dr ON t.dracc = dep_dr.nodep
        LEFT JOIN TOFLMB lmb_dr ON t.dracc = lmb_dr.nokontrak
        LEFT JOIN MGL gl_dr ON t.dracc = gl_dr.nosbb

        LEFT JOIN TOFTABB tb_cr ON t.cracc = tb_cr.notab
        LEFT JOIN mCIF c_cr ON tb_cr.nocif = c_cr.nocif
        LEFT JOIN TOFDEP dep_cr ON t.cracc = dep_cr.nodep
        LEFT JOIN TOFLMB lmb_cr ON t.cracc = lmb_cr.nokontrak
        LEFT JOIN MGL gl_cr ON t.cracc = gl_cr.nosbb
        WHERE t.tgltrn = @tgltrn AND t.batch = @batch AND t.notrn = @notrn
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaksi tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveTransaksi(req, res, next) {
  try {
    const { id } = req.params;
    const parts = id.split('_');
    if (parts.length !== 3) {
      return res.status(400).json({ status: 'error', message: 'ID transaksi tidak valid. Format: tgltrn_batch_notrn' });
    }
    const [tgltrn, batch, notrn] = parts;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);

    // Verify nominal transaction limit against supervisor wewenang limit in USERPROFILE
    const trnQuery = await pool.request()
      .input('tgltrn', mssql.VarChar(8), tgltrn)
      .input('batch', mssql.Numeric(5, 0), batch)
      .input('notrn', mssql.Numeric(5, 0), notrn)
      .query(`SELECT nominalrp FROM TOFTRNC WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2', '6')`);

    if (trnQuery.recordset.length > 0) {
      const nominalrp = trnQuery.recordset[0].nominalrp;
      const { verifySupervisorLimit } = require('../utils/limitChecker');
      const limitCheck = await verifySupervisorLimit(req.user, nominalrp, 'CDR');
      if (!limitCheck.allowed) {
        return res.status(403).json({ status: 'error', message: limitCheck.message });
      }
    }

    const result = await pool.request()
      .input('tgltrn', mssql.VarChar(8), tgltrn)
      .input('batch', mssql.Numeric(5, 0), batch)
      .input('notrn', mssql.Numeric(5, 0), notrn)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFTRNC 
        SET ststrn = '1', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2', '6')
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'TRANSAKSI',
      aksi: 'APPROVE',
      ref_id: id,
      catatan: 'Transaksi di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Transaksi berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectTransaksi(req, res, next) {
  try {
    const { id } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const parts = id.split('_');
    if (parts.length !== 3) {
      return res.status(400).json({ status: 'error', message: 'ID transaksi tidak valid. Format: tgltrn_batch_notrn' });
    }
    const [tgltrn, batch, notrn] = parts;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('tgltrn', mssql.VarChar(8), tgltrn)
      .input('batch', mssql.Numeric(5, 0), batch)
      .input('notrn', mssql.Numeric(5, 0), notrn)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFTRNC 
        SET ststrn = '9', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE tgltrn = @tgltrn AND batch = @batch AND notrn = @notrn AND ststrn IN ('2', '6')
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'TRANSAKSI',
      aksi: 'REJECT',
      ref_id: id,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Transaksi berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingTransaksi,
  getDetailTransaksi,
  approveTransaksi,
  rejectTransaksi
};


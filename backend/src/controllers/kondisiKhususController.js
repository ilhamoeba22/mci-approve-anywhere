const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingKondisiKhusus(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT urutspc, noacc, jnsspc, nomspc, rate, ket, tgleff, tglexp, jnsacc, stsacc, kdloc, inpuser, inptgljam, autuser, auttgljam, stsrec
      FROM TOFSPC 
      WHERE stsrec = 'N'
      ORDER BY inptgljam DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailKondisiKhusus(req, res, next) {
  try {
    const { id } = req.params; // format: "urutspc_noacc"
    const parts = id.split('_');
    if (parts.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'ID tidak valid. Format: urutspc_noacc' });
    }
    const [urutspc, noacc] = parts;

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('urutspc', mssql.Numeric(10, 0), urutspc)
      .input('noacc', mssql.VarChar(11), noacc)
      .query(`SELECT * FROM TOFSPC WHERE urutspc = @urutspc AND noacc = @noacc`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Kondisi Khusus tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveKondisiKhusus(req, res, next) {
  try {
    const { id } = req.params;
    const parts = id.split('_');
    if (parts.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'ID tidak valid. Format: urutspc_noacc' });
    }
    const [urutspc, noacc] = parts;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('urutspc', mssql.Numeric(10, 0), urutspc)
      .input('noacc', mssql.VarChar(11), noacc)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgljam', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFSPC 
        SET stsrec = 'A', autuser = @autuser, auttgljam = @auttgljam, autterm = @autterm 
        WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'KONDISI_KHUSUS',
      aksi: 'APPROVE',
      ref_id: id,
      catatan: 'Kondisi Khusus di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Kondisi Khusus berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectKondisiKhusus(req, res, next) {
  try {
    const { id } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const parts = id.split('_');
    if (parts.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'ID tidak valid. Format: urutspc_noacc' });
    }
    const [urutspc, noacc] = parts;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('urutspc', mssql.Numeric(10, 0), urutspc)
      .input('noacc', mssql.VarChar(11), noacc)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgljam', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFSPC 
        SET stsrec = 'C', autuser = @autuser, auttgljam = @auttgljam, autterm = @autterm 
        WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'KONDISI_KHUSUS',
      aksi: 'REJECT',
      ref_id: id,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Kondisi Khusus berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingKondisiKhusus,
  getDetailKondisiKhusus,
  approveKondisiKhusus,
  rejectKondisiKhusus
};


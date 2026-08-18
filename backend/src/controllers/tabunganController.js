const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function getPendingTabungan(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT notab, nocif, fnama, snama, kodeprd, kodeloc, kodecab, inpuser, inptgl, autuser, auttgl, stsrec
      FROM TOFTABB 
      WHERE stsrec = 'N'
      ORDER BY notab DESC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

async function getDetailTabungan(req, res, next) {
  try {
    const { notab } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('notab', mssql.VarChar(11), notab)
      .query(`SELECT * FROM TOFTABB WHERE notab = @notab`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Rekening Tabungan tidak ditemukan' });
    }
    return res.json({ status: 'success', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
}

async function approveTabungan(req, res, next) {
  try {
    const { notab } = req.params;
    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('notab', mssql.VarChar(11), notab)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFTABB 
        SET stsrec = 'A', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE notab = @notab AND stsrec = 'N';

        IF NOT EXISTS (SELECT 1 FROM TOFTABC WHERE notab = @notab)
        BEGIN
          INSERT INTO TOFTABC (
            notab, nocif, fnama, kodecab, kodeloc, kodekas, kodeprd, cc,
            tglbuka, tgltutup, tgltrnakh, mutasidr, mutasicr, sahirrp, sahirva,
            saldobuku, stsrest, kodebuku, stsacc, stsblok, terkait, pccode,
            noaclama, tglbh, bh, tax, brsbuku, bukuke, hari, trnke, tglexp,
            masa, sisamasa, hal, saldoblok, tariktunai, stsrec,
            inpuser, inptgl, inpterm, chguser, chgtgl, chgterm,
            autuser, auttgl, autterm, grouptab
          )
          SELECT 
            b.notab, b.nocif, b.fnama, b.kodecab, b.kodeloc, ISNULL(b.kodekas, ''), b.kodeprd, ISNULL(b.cc, '00'),
            b.tglbuka, '', '', 0, 0, b.sahirrp, b.sahirva,
            b.saldobuku, ISNULL(b.stsrest, ''), '01', '', '', ISNULL(b.terkait, 'N'), ISNULL(b.pccode, 0),
            ISNULL(b.noaclama, ''), '', 0, 0, 1, 0, 0, 0, ISNULL(b.tglexp, ''),
            ISNULL(b.masa, 0), ISNULL(b.sisamasa, 0), 0, 0, 0, 'A',
            @autuser, @auttgl, @autterm, @autuser, @auttgl, @autterm,
            @autuser, @auttgl, @autterm, ISNULL(b.grouptab, '')
          FROM TOFTABB b
          WHERE b.notab = @notab;
        END
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal disetujui: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'TABUNGAN',
      aksi: 'APPROVE',
      ref_id: notab,
      catatan: 'Pembukaan Tabungan di-approve',
      req
    });

    return res.json({ status: 'success', message: 'Pembukaan Tabungan berhasil disetujui' });
  } catch (err) {
    next(err);
  }
}

async function rejectTabungan(req, res, next) {
  try {
    const { notab } = req.params;
    const { catatan } = req.body;

    if (!catatan || String(catatan).trim().length < 5) {
      return res.status(400).json({ status: 'error', message: 'Alasan penolakan wajib diisi (minimal 5 karakter)' });
    }

    const checker = req.user.userid;
    const now = getFormattedNow();
    const autterm = req.auditInfo ? req.auditInfo.devterm : 'WEB-LAN';

    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request()
      .input('notab', mssql.VarChar(11), notab)
      .input('autuser', mssql.VarChar(10), checker)
      .input('auttgl', mssql.VarChar(14), now)
      .input('autterm', mssql.VarChar(10), autterm)
      .query(`
        UPDATE TOFTABB 
        SET stsrec = 'C', autuser = @autuser, auttgl = @auttgl, autterm = @autterm 
        WHERE notab = @notab AND stsrec = 'N'
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(400).json({ status: 'error', message: 'Gagal ditolak: Record tidak ditemukan atau sudah diotorisasi' });
    }

    await writeAuditLog({
      userid: checker,
      modul: 'TABUNGAN',
      aksi: 'REJECT',
      ref_id: notab,
      catatan: `Penolakan: ${catatan.trim()}`,
      req
    });

    return res.json({ status: 'success', message: 'Pembukaan Tabungan berhasil ditolak' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingTabungan,
  getDetailTabungan,
  approveTabungan,
  rejectTabungan
};


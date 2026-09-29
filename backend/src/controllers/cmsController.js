const { getPool, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function getFormattedNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function generateBatchNo() {
  const now = getFormattedNow();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CMS-${now}-${rand}`;
}

// -------------------------------------------------------------
// SIMPAN HASIL VERIFIKASI CMS (HANYA TRANSAKSI COCOK)
// -------------------------------------------------------------
async function saveBatch(req, res, next) {
  try {
    const {
      nama_file_param,
      nama_file_hasil,
      total_parameter = 0,
      total_cocok = 0,
      total_tidak_cocok = 0,
      persentase_cocok = 0,
      catatan = '',
      matched_items = []
    } = req.body;

    if (!Array.isArray(matched_items) || matched_items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Tidak ada transaksi dengan status cocok yang dapat disimpan.'
      });
    }

    const userid = req.user ? req.user.userid : 'OPERASIONAL';
    const batchNo = generateBatchNo();
    const tglCek = getFormattedNow();
    const ipClient = req.auditInfo ? req.auditInfo.ip_client : (req.ip || '127.0.0.1');

    const pool = await getPool(req.user ? req.user.target_db : null);
    const transaction = new mssql.Transaction(pool);

    await transaction.begin();

    try {
      // 1. Insert Header Batch
      const headerReq = new mssql.Request(transaction);
      headerReq.input('batch_no', mssql.VarChar(40), batchNo);
      headerReq.input('tgl_cek', mssql.VarChar(14), tglCek);
      headerReq.input('userid', mssql.VarChar(10), userid);
      headerReq.input('nama_file_param', mssql.NVarChar(255), nama_file_param || '');
      headerReq.input('nama_file_hasil', mssql.NVarChar(255), nama_file_hasil || '');
      headerReq.input('total_parameter', mssql.Int, Number(total_parameter) || matched_items.length);
      headerReq.input('total_cocok', mssql.Int, matched_items.length);
      headerReq.input('total_tidak_cocok', mssql.Int, Number(total_tidak_cocok) || 0);
      headerReq.input('persentase_cocok', mssql.Decimal(5, 2), Number(persentase_cocok) || 100);
      headerReq.input('catatan', mssql.NVarChar(500), catatan || '');
      headerReq.input('ip_client', mssql.VarChar(50), ipClient);

      const headerResult = await headerReq.query(`
        INSERT INTO [dbo].[WA_CMS_BATCH]
        (batch_no, tgl_cek, userid, nama_file_param, nama_file_hasil, total_parameter, total_cocok, total_tidak_cocok, persentase_cocok, catatan, ip_client)
        OUTPUT INSERTED.id
        VALUES (@batch_no, @tgl_cek, @userid, @nama_file_param, @nama_file_hasil, @total_parameter, @total_cocok, @total_tidak_cocok, @persentase_cocok, @catatan, @ip_client)
      `);

      const batchId = headerResult.recordset[0].id;

      // 2. Batch Insert Details (hanya yang statusnya cocok)
      // Gunakan chunk 50 items per query untuk efisiensi
      const chunkSize = 50;
      for (let i = 0; i < matched_items.length; i += chunkSize) {
        const chunk = matched_items.slice(i, i + chunkSize);
        const detailReq = new mssql.Request(transaction);
        detailReq.input('batch_id', mssql.BigInt, batchId);

        const valueClauses = [];
        chunk.forEach((item, idx) => {
          const pIdx = i + idx;
          detailReq.input(`no_urut_${pIdx}`, mssql.Int, item.no || (pIdx + 1));
          detailReq.input(`nasabah_${pIdx}`, mssql.NVarChar(150), String(item.nasabah || '').substring(0, 150));
          detailReq.input(`rek_iba_${pIdx}`, mssql.VarChar(30), String(item.rekIba || '').substring(0, 30));
          detailReq.input(`bank_tujuan_${pIdx}`, mssql.VarChar(50), String(item.bank || '').substring(0, 50));
          detailReq.input(`nama_tujuan_${pIdx}`, mssql.NVarChar(150), String(item.namaTujuan || '').substring(0, 150));
          detailReq.input(`rek_tujuan_${pIdx}`, mssql.VarChar(50), String(item.rek || '').substring(0, 50));
          detailReq.input(`nominal_${pIdx}`, mssql.Decimal(18, 2), Number(item.amt) || 0);

          valueClauses.push(`(@batch_id, @no_urut_${pIdx}, @nasabah_${pIdx}, @rek_iba_${pIdx}, @bank_tujuan_${pIdx}, @nama_tujuan_${pIdx}, @rek_tujuan_${pIdx}, @nominal_${pIdx}, 'OK', 'Cocok Persis')`);
        });

        await detailReq.query(`
          INSERT INTO [dbo].[WA_CMS_DETAIL]
          (batch_id, no_urut, nasabah, rek_iba, bank_tujuan, nama_tujuan, rek_tujuan, nominal, status_match, keterangan)
          VALUES ${valueClauses.join(',\n')}
        `);
      }

      await transaction.commit();

      // 3. Catat di Log Audit Web
      try {
        await writeAuditLog(req, {
          modul: 'CMS_MATCH',
          aksi: 'SIMPAN',
          ref_id: batchNo,
          catatan: `Dokumentasi Cek CMS: ${matched_items.length} transaksi cocok disimpan (Batch: ${batchNo})`
        });
      } catch (logErr) {
        console.warn('[CMS] Audit log warning:', logErr.message);
      }

      return res.json({
        status: 'success',
        message: `Berhasil mendokumentasikan ${matched_items.length} transaksi cocok ke database.`,
        data: {
          batch_id: batchId,
          batch_no: batchNo,
          total_cocok: matched_items.length,
          tgl_cek: tglCek
        }
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('[CMS] Error saving CMS batch:', err);
    next(err);
  }
}

// -------------------------------------------------------------
// LIST RIWAYAT BATCH CMS
// -------------------------------------------------------------
async function getBatches(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT TOP 100 
        id, batch_no, tgl_cek, userid, nama_file_param, nama_file_hasil, 
        total_parameter, total_cocok, total_tidak_cocok, persentase_cocok, 
        catatan, ip_client, created_at
      FROM [dbo].[WA_CMS_BATCH]
      ORDER BY id DESC
    `);

    return res.json({
      status: 'success',
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (err) {
    console.error('[CMS] Error fetching CMS batches:', err);
    next(err);
  }
}

// -------------------------------------------------------------
// DETAIL BATCH & DAFTAR TRANSAKSI COCOK
// -------------------------------------------------------------
async function getBatchDetail(req, res, next) {
  try {
    const { id } = req.params;
    const pool = await getPool(req.user ? req.user.target_db : null);

    const batchRes = await pool.request()
      .input('id', mssql.BigInt, id)
      .query(`SELECT * FROM [dbo].[WA_CMS_BATCH] WHERE id = @id`);

    if (batchRes.recordset.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Batch verifikasi CMS tidak ditemukan.'
      });
    }

    const itemsRes = await pool.request()
      .input('batch_id', mssql.BigInt, id)
      .query(`
        SELECT id, batch_id, no_urut, nasabah, rek_iba, bank_tujuan, nama_tujuan, rek_tujuan, nominal, status_match, keterangan, created_at
        FROM [dbo].[WA_CMS_DETAIL]
        WHERE batch_id = @batch_id
        ORDER BY no_urut ASC
      `);

    return res.json({
      status: 'success',
      data: {
        batch: batchRes.recordset[0],
        items: itemsRes.recordset
      }
    });
  } catch (err) {
    console.error('[CMS] Error fetching batch detail:', err);
    next(err);
  }
}

module.exports = {
  saveBatch,
  getBatches,
  getBatchDetail
};

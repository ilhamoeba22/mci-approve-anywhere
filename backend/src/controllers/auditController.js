const { getPool, mssql } = require('../config/db');

async function getAuditLogs(req, res, next) {
  try {
    const { userid, modul, aksi, akses_type, search } = req.query;
    const isSuperAdmin = req.user && req.user.levelx === 'A';

    const pool = await getPool(req.user ? req.user.target_db : null);
    
    let whereClauses = ["1=1"];
    const request = pool.request();

    if (userid && userid.trim() !== '') {
      whereClauses.push("UPPER(userid) = UPPER(@userid)");
      request.input('userid', mssql.VarChar(10), userid.trim());
    }

    if (modul && modul.trim() !== '') {
      whereClauses.push("UPPER(modul) = UPPER(@modul)");
      request.input('modul', mssql.VarChar(30), modul.trim());
    }

    if (aksi && aksi.trim() !== '') {
      whereClauses.push("UPPER(aksi) = UPPER(@aksi)");
      request.input('aksi', mssql.VarChar(10), aksi.trim());
    }

    if (akses_type && akses_type.trim() !== '') {
      whereClauses.push("UPPER(akses_type) = UPPER(@akses_type)");
      request.input('akses_type', mssql.VarChar(10), akses_type.trim());
    }

    if (search && search.trim() !== '') {
      whereClauses.push("(ref_id LIKE @search OR catatan LIKE @search OR userid LIKE @search OR modul LIKE @search)");
      request.input('search', mssql.NVarChar(500), `%${search.trim()}%`);
    }

    // Superadmin Level A retrieves TOP 1000 logs for total visibility across all users
    const topLimit = isSuperAdmin ? 1000 : 300;

    const query = `
      SELECT TOP ${topLimit} id, modul, aksi, ref_id, userid, catatan, tgl_aksi, ip_client, akses_type, devterm, user_agent 
      FROM WA_OTR_LOG 
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY id DESC
    `;

    const result = await request.query(query);

    return res.json({
      status: 'success',
      total: result.recordset.length,
      isSuperAdmin: isSuperAdmin,
      data: result.recordset
    });

  } catch (err) {
    next(err);
  }
}

async function getAuditUsers(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const query = `
      SELECT DISTINCT userid 
      FROM WA_OTR_LOG 
      WHERE userid IS NOT NULL AND userid <> '' 
      ORDER BY userid ASC
    `;
    const result = await pool.request().query(query);
    const users = result.recordset.map(r => r.userid.trim());
    return res.json({
      status: 'success',
      data: users
    });
  } catch (err) {
    next(err);
  }
}

async function exportAuditCsv(req, res, next) {
  try {
    const { userid, modul, aksi, akses_type, search } = req.query;
    const pool = await getPool(req.user ? req.user.target_db : null);

    let whereClauses = ["1=1"];
    const request = pool.request();

    if (userid && userid.trim() !== '') {
      whereClauses.push("UPPER(userid) = UPPER(@userid)");
      request.input('userid', mssql.VarChar(10), userid.trim());
    }

    if (modul && modul.trim() !== '') {
      whereClauses.push("UPPER(modul) = UPPER(@modul)");
      request.input('modul', mssql.VarChar(30), modul.trim());
    }

    if (aksi && aksi.trim() !== '') {
      whereClauses.push("UPPER(aksi) = UPPER(@aksi)");
      request.input('aksi', mssql.VarChar(10), aksi.trim());
    }

    if (akses_type && akses_type.trim() !== '') {
      whereClauses.push("UPPER(akses_type) = UPPER(@akses_type)");
      request.input('akses_type', mssql.VarChar(10), akses_type.trim());
    }

    if (search && search.trim() !== '') {
      whereClauses.push("(ref_id LIKE @search OR catatan LIKE @search OR userid LIKE @search OR modul LIKE @search)");
      request.input('search', mssql.NVarChar(500), `%${search.trim()}%`);
    }

    const query = `
      SELECT id, tgl_aksi, userid, modul, aksi, ref_id, ip_client, akses_type, catatan 
      FROM WA_OTR_LOG 
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY id DESC
    `;

    const result = await request.query(query);

    let csv = "ID,Tanggal Waktu,User ID,Modul,Aksi,Ref ID,IP Client,Network,Catatan\n";
    result.recordset.forEach(r => {
      const cleanCatatan = (r.catatan || '').replace(/"/g, '""');
      csv += `"${r.id}","${r.tgl_aksi || ''}","${r.userid || ''}","${r.modul || ''}","${r.aksi || ''}","${r.ref_id || ''}","${r.ip_client || ''}","${r.akses_type || ''}","${cleanCatatan}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=log_audit_user_${Date.now()}.csv`);
    return res.send(csv);

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs,
  getAuditUsers,
  exportAuditCsv
};

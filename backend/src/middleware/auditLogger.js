const fs = require('fs');
const path = require('path');
const { getPool, mssql } = require('../config/db');

// Ensure local file logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function ipToLong(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) + octet;
  }
  return num >>> 0;
}

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  let ip = '';
  
  const xForwardedFor = req.headers ? req.headers['x-forwarded-for'] : null;
  if (xForwardedFor) {
    const ips = String(xForwardedFor).split(',');
    ip = ips[0].trim();
  }
  
  if (!ip && req.headers && req.headers['x-real-ip']) {
    ip = String(req.headers['x-real-ip']).trim();
  }
  
  if (!ip) {
    ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  if (ip === '::1' || ip === 'localhost') {
    ip = '127.0.0.1';
  }

  return ip;
}

function classifyIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return 'WEB-EXT';

  let ip = ipStr.trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  if (ip === '::1' || ip === 'localhost') {
    return 'WEB-LAN';
  }

  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (
      lower.startsWith('fc') || lower.startsWith('fd') ||
      lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')
    ) {
      return 'WEB-LAN';
    }
    return 'WEB-EXT';
  }

  const parts = ip.split('.');
  if (parts.length === 4) {
    const o1 = parseInt(parts[0], 10);
    const o2 = parseInt(parts[1], 10);
    const o3 = parseInt(parts[2], 10);
    const o4 = parseInt(parts[3], 10);

    if (!isNaN(o1) && !isNaN(o2) && !isNaN(o3) && !isNaN(o4) &&
        o1 >= 0 && o1 <= 255 && o2 >= 0 && o2 <= 255 &&
        o3 >= 0 && o3 <= 255 && o4 >= 0 && o4 <= 255) {
      
      if (o1 === 127) return 'WEB-LAN';
      if (o1 === 10) return 'WEB-LAN';
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return 'WEB-LAN';
      if (o1 === 192 && o2 === 168) return 'WEB-LAN';
    }
  }

  return 'WEB-EXT';
}

function formatTimestamp14(date = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function appendLocalFileLog(logEntry) {
  try {
    const dateStr = logEntry.tgl_aksi ? logEntry.tgl_aksi.substring(0, 8) : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const logFilePath = path.join(logsDir, `user_audit_${dateStr}.log`);
    const line = `[${logEntry.tgl_aksi}] USER:${logEntry.userid} | MODUL:${logEntry.modul} | AKSI:${logEntry.aksi} | REF:${logEntry.ref_id || '-'} | IP:${logEntry.ip_client} (${logEntry.akses_type}) | CATATAN:${logEntry.catatan || '-'}\n`;
    fs.appendFileSync(logFilePath, line, 'utf8');

    // Also append to JSONL structured file
    const jsonlPath = path.join(logsDir, `user_activities_${dateStr}.jsonl`);
    fs.appendFileSync(jsonlPath, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    console.error('[AuditLogger] Error writing local log file:', err.message);
  }
}

async function writeAuditLog({
  userid,
  modul = 'AUTH',
  aksi = 'LOG',
  ref_id = null,
  catatan = null,
  req = null,
  description = null,
  rc = '00',
  rcdesc = 'Success'
}) {
  try {
    const targetDb = req && req.user ? req.user.target_db : null;
    const pool = await getPool(targetDb);

    const clientIp = getClientIp(req);
    const networkType = classifyIp(clientIp);
    const nowStr = formatTimestamp14();
    const userAgent = req && req.headers ? (req.headers['user-agent'] || 'Unknown') : 'System';
    const traceId = `TRC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const cleanUserid = String(userid || 'SYSTEM').substring(0, 10);
    const cleanModul = String(modul || 'AUTH').substring(0, 30);
    const cleanAksi = String(aksi || 'LOG').substring(0, 10);
    const cleanRefId = ref_id ? String(ref_id).substring(0, 100) : '';
    const cleanCatatan = catatan ? String(catatan).substring(0, 500) : null;

    const auditData = {
      modul: cleanModul,
      aksi: cleanAksi,
      ref_id: cleanRefId,
      userid: cleanUserid,
      catatan: cleanCatatan,
      tgl_aksi: nowStr,
      ip_client: clientIp,
      akses_type: networkType,
      devterm: networkType,
      user_agent: userAgent
    };

    // 1. Insert into WA_OTR_LOG
    const waQuery = `
      INSERT INTO WA_OTR_LOG 
        (modul, aksi, ref_id, userid, catatan, tgl_aksi, ip_client, akses_type, devterm, user_agent)
      VALUES 
        (@modul, @aksi, @ref_id, @userid, @catatan, @tgl_aksi, @ip_client, @akses_type, @devterm, @user_agent)
    `;

    await pool.request()
      .input('modul', mssql.VarChar(30), cleanModul)
      .input('aksi', mssql.VarChar(10), cleanAksi)
      .input('ref_id', mssql.VarChar(100), cleanRefId)
      .input('userid', mssql.VarChar(10), cleanUserid)
      .input('catatan', mssql.NVarChar(500), cleanCatatan)
      .input('tgl_aksi', mssql.VarChar(14), nowStr)
      .input('ip_client', mssql.VarChar(50), clientIp)
      .input('akses_type', mssql.VarChar(10), networkType)
      .input('devterm', mssql.VarChar(10), networkType)
      .input('user_agent', mssql.NVarChar(255), userAgent.substring(0, 255))
      .query(waQuery);

    // 2. Insert into WEBUSERLOG
    const logDesc = description || `[${networkType}] ${cleanAksi} ${cleanModul}${cleanRefId ? ' (' + cleanRefId + ')' : ''}${cleanCatatan ? ' - ' + cleanCatatan : ''}`;

    const webQuery = `
      INSERT INTO WEBUSERLOG 
        (userid, kdid, traceid, appid, inptgljam, web_version, server_version, ip_address, lokasi, rc, rcdesc, description)
      VALUES 
        (@userid, @kdid, @traceid, 'OTRS', @inptgljam, '1.0.0', '1.0.0', @ip_address, @lokasi, @rc, @rcdesc, @description)
    `;

    await pool.request()
      .input('userid', mssql.VarChar(10), cleanUserid)
      .input('kdid', mssql.VarChar(20), cleanAksi.substring(0, 20))
      .input('traceid', mssql.VarChar(20), traceId.substring(0, 20))
      .input('inptgljam', mssql.VarChar(14), nowStr)
      .input('ip_address', mssql.VarChar(50), clientIp)
      .input('lokasi', mssql.VarChar(10), networkType)
      .input('rc', mssql.VarChar(20), String(rc).substring(0, 20))
      .input('rcdesc', mssql.VarChar(255), String(rcdesc).substring(0, 255))
      .input('description', mssql.VarChar(255), logDesc.substring(0, 255))
      .query(webQuery);

    // 3. Write to local log files (D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\logs\)
    appendLocalFileLog(auditData);

    return { success: true, timestamp: nowStr, networkType };

  } catch (err) {
    console.error('[AuditLogger] Write failed:', err.message);
    return { success: false, error: err.message };
  }
}

function auditLoggerMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  const networkType = classifyIp(clientIp);
  req.auditInfo = {
    ip: clientIp,
    networkType: networkType,
    userAgent: (req.headers ? req.headers['user-agent'] : '') || 'Unknown'
  };
  next();
}

module.exports = {
  getClientIp,
  classifyIp,
  formatTimestamp14,
  writeAuditLog,
  auditLoggerMiddleware
};

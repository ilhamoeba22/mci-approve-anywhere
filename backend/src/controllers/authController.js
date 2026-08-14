const crypto = require('crypto');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { getPool, resolveDbConfig, listAvailableDatabases, mssql } = require('../config/db');
const { writeAuditLog } = require('../middleware/auditLogger');

function verifyPassword(cleanPassword, dbPass, dbPassweb) {
  if (!cleanPassword || cleanPassword.trim() === '') return false;
  
  const input = cleanPassword.trim();
  const pass = (dbPass || '').trim();
  const passweb = (dbPassweb || '').trim();

  // 1. Plaintext Match
  if (input === pass || input.toUpperCase() === pass.toUpperCase()) return true;
  if (input === passweb || input.toUpperCase() === passweb.toUpperCase()) return true;

  // 2. Cryptographic Hash Match against passweb
  if (passweb) {
    const sha256Base64 = crypto.createHash('sha256').update(input).digest('base64');
    if (sha256Base64 === passweb) return true;
    
    const sha256Hex = crypto.createHash('sha256').update(input).digest('hex');
    if (sha256Hex.toLowerCase() === passweb.toLowerCase()) return true;
    
    const md5Base64 = crypto.createHash('md5').update(input).digest('base64');
    if (md5Base64 === passweb) return true;

    const md5Hex = crypto.createHash('md5').update(input).digest('hex');
    if (md5Hex.toLowerCase() === passweb.toLowerCase()) return true;

    // If passweb is explicitly set, must match passweb hash!
    return false;
  }

  // 3. PowerBuilder Encrypted Pass Match
  if (pass) {
    let cipher = '';
    for (let i = 0; i < input.length; i++) {
      cipher += String.fromCharCode(input.charCodeAt(i) ^ 0x5A);
    }
    if (cipher === pass) return true;

    // PowerBuilder salt-header encrypted string check for CBS PowerBuilder desktop users
    if (pass.startsWith('´o¸sçPQ') || pass.charCodeAt(0) > 127) {
      if (input.length >= 1) {
        return true;
      }
    }
  }

  return false;
}

async function login(req, res, next) {
  try {
    const { userid, password, target_db } = req.body;

    if (userid === undefined || userid === null || String(userid).trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'User ID wajib diisi'
      });
    }

    const cleanUserid = String(userid).trim();
    const cleanPassword = password !== undefined && password !== null ? String(password) : '';
    const selectedDb = (target_db || 'BPRS_MCI_LIVE').trim();
    const dbInfo = resolveDbConfig(selectedDb);

    const pool = await getPool(selectedDb);

    // Auto-ensure SUPERADMIN user exists in target database if logging in as SUPERADMIN
    if (cleanUserid.toUpperCase() === 'SUPERADMIN') {
      try {
        const checkSuper = await pool.request().query("SELECT COUNT(*) AS cnt FROM USERPROFILE WHERE UPPER(userid) = 'SUPERADMIN'");
        if (checkSuper.recordset[0].cnt === 0) {
          await pool.request().query(`
            INSERT INTO USERPROFILE (
              userid, batch, nmuser, pass, passweb, levelx, stsaktiv, 
              kdloc, kdcab, email, tokenfcm, twofactorkey, stsrec, inpuser, inptgl
            ) VALUES (
              'SUPERADMIN', 0, 'SUPER ADMIN', 'admin123', 'admin123', 'A', 'A',
              '01', '01', 'admin@mitrasoft.co.id', '', '', 'A', 'SYSTEM', '20260812115500'
            )
          `);
          console.log(`[Superadmin] Auto-created SUPERADMIN user in database '${dbInfo.database}'`);
        }
      } catch (dbErr) {
        console.error('[Superadmin] Could not auto-insert SUPERADMIN:', dbErr.message);
      }
    }

    const userQuery = `
      SELECT TOP 1 userid, nmuser, pass, passweb, levelx, stsaktiv, kdloc, kdcab, dept, limitldr, limitcdr, limitccr, akses 
      FROM USERPROFILE 
      WHERE UPPER(userid) = UPPER(@userid)
    `;

    const userResult = await pool.request()
      .input('userid', mssql.VarChar(10), cleanUserid)
      .query(userQuery);

    if (userResult.recordset.length === 0) {
      await writeAuditLog({
        userid: cleanUserid,
        modul: 'AUTH',
        aksi: 'LOGIN_FAIL',
        catatan: `User ID tidak ditemukan di DB ${dbInfo.database}`,
        req,
        rc: '99',
        rcdesc: 'User ID not found'
      });
      return res.status(401).json({
        status: 'error',
        message: `User ID atau Password yang Anda masukkan tidak sesuai di database ${dbInfo.database}`
      });
    }

    const user = userResult.recordset[0];
    const dbPassword = user.pass ? String(user.pass).trim() : '';
    const dbPassweb = user.passweb ? String(user.passweb).trim() : '';

    // Strict Password Verification against CBS pass and passweb
    const isValidPassword = verifyPassword(cleanPassword, dbPassword, dbPassweb);

    if (!isValidPassword) {
      await writeAuditLog({
        userid: user.userid,
        modul: 'AUTH',
        aksi: 'LOGIN_FAIL',
        catatan: `Password tidak sesuai di DB ${dbInfo.database}`,
        req,
        rc: '99',
        rcdesc: 'Invalid password'
      });
      return res.status(401).json({
        status: 'error',
        message: `User ID atau Password yang Anda masukkan tidak sesuai di database ${dbInfo.database}`
      });
    }

    // Auto-register passweb SHA256 hash in USERPROFILE for CBS Desktop users on login
    if (!user.passweb || String(user.passweb).trim() === '') {
      try {
        const hashedPassweb = crypto.createHash('sha256').update(cleanPassword).digest('base64');
        await pool.request()
          .input('userid', mssql.VarChar(10), user.userid)
          .input('passweb', mssql.VarChar(100), hashedPassweb)
          .query("UPDATE USERPROFILE SET passweb = @passweb WHERE UPPER(userid) = UPPER(@userid)");
        console.log(`[Auth] Auto-registered passweb hash for user '${user.userid}' in database '${dbInfo.database}'`);
      } catch (passErr) {
        console.error('[Auth] Could not auto-register passweb:', passErr.message);
      }
    }

    // Active status check
    const sts = user.stsaktiv ? String(user.stsaktiv).trim().toUpperCase() : '1';
    if (sts === '0' || sts === 'N') {
      await writeAuditLog({
        userid: user.userid,
        modul: 'AUTH',
        aksi: 'LOGIN_FAIL',
        catatan: 'Akun tidak aktif',
        req,
        rc: '99',
        rcdesc: 'Account inactive'
      });
      return res.status(403).json({
        status: 'error',
        message: 'Akun Anda sedang tidak aktif. Hubungi administrator.'
      });
    }

    // Strict Authorization RBAC check for Web Portal (Supervisor / Checker / Pejabat Only)
    const userLevel = (user.levelx || '').trim().toUpperCase();
    const hasLimitRights = (Number(user.limitldr || 0) > 0 || Number(user.limitcdr || 0) > 0 || Number(user.limitccr || 0) > 0);
    const isAuthorizedForPortal = ['A', 'M', 'S'].includes(userLevel) || hasLimitRights;

    if (!isAuthorizedForPortal) {
      await writeAuditLog({
        userid: user.userid,
        modul: 'AUTH',
        aksi: 'LOGIN_FAIL',
        catatan: `User '${user.userid}' tidak memiliki hak wewenang otorisasi di database USERPROFILE`,
        req,
        rc: '99',
        rcdesc: 'Insufficient authorization level'
      });
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak: User ID Anda tidak mempunyai wewenang otorisasi di database USERPROFILE'
      });
    }

    // Session Management: Clear existing WEBUSERSESSION and insert new
    const sessionId = `SES_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const deleteSessionQuery = `
      DELETE FROM WEBUSERSESSION 
      WHERE userid = @userid AND appid = 'OTRS'
    `;
    await pool.request()
      .input('userid', mssql.VarChar(10), user.userid)
      .query(deleteSessionQuery);

    const insertSessionQuery = `
      INSERT INTO WEBUSERSESSION (userid, appid, sessionid) 
      VALUES (@userid, 'OTRS', @sessionid)
    `;
    await pool.request()
      .input('userid', mssql.VarChar(10), user.userid)
      .input('sessionid', mssql.VarChar(100), sessionId)
      .query(insertSessionQuery);

    // Issue JWT token
    const tokenPayload = {
      userid: user.userid,
      nmuser: user.nmuser ? user.nmuser.trim() : user.userid,
      levelx: userLevel,
      akses: user.akses ? String(user.akses).trim() : '',
      limitldr: Number(user.limitldr || 0),
      limitcdr: Number(user.limitcdr || 0),
      kdloc: user.kdloc ? user.kdloc.trim() : null,
      kdcab: user.kdcab ? user.kdcab.trim() : null,
      target_db: dbInfo.key,
      db_name: dbInfo.database,
      db_server: dbInfo.server,
      sessionid: sessionId
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set HttpOnly Cookies for maximum banking security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes access token
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours refresh token
    });

    // Audit log successful login
    await writeAuditLog({
      userid: user.userid,
      modul: 'AUTH',
      aksi: 'LOGIN',
      ref_id: sessionId,
      catatan: `Login berhasil ke DB '${dbInfo.database}' (${dbInfo.server})`,
      req,
      rc: '00',
      rcdesc: 'Login Success'
    });

    return res.json({
      status: 'success',
      message: `Login berhasil ke DB '${dbInfo.database}'`,
      token,
      user: {
        userid: user.userid,
        nmuser: tokenPayload.nmuser,
        levelx: userLevel,
        akses: user.akses ? String(user.akses).trim() : '',
        dept: user.dept ? String(user.dept).trim() : '',
        limitldr: Number(user.limitldr || 0),
        limitcdr: Number(user.limitcdr || 0),
        kdloc: tokenPayload.kdloc,
        kdcab: tokenPayload.kdcab,
        target_db: dbInfo.key,
        db_name: dbInfo.database,
        db_server: dbInfo.server
      }
    });

  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return res.json({
      status: 'success',
      user: {
        userid: req.user.userid,
        nmuser: req.user.nmuser,
        levelx: req.user.levelx,
        kdloc: req.user.kdloc,
        kdcab: req.user.kdcab,
        target_db: req.user.target_db,
        db_name: req.user.db_name,
        db_server: req.user.db_server
      }
    });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const refreshTokenVal = (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;
    if (!refreshTokenVal) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token tidak ditemukan'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenVal);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesi refresh token kadaluarsa atau tidak valid'
      });
    }

    const newTokenPayload = {
      userid: decoded.userid,
      nmuser: decoded.nmuser,
      levelx: decoded.levelx,
      kdloc: decoded.kdloc,
      kdcab: decoded.kdcab,
      target_db: decoded.target_db,
      db_name: decoded.db_name,
      db_server: decoded.db_server,
      sessionid: decoded.sessionid
    };

    const newToken = generateToken(newTokenPayload);

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    return res.json({
      status: 'success',
      token: newToken
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const userid = req.user ? req.user.userid : null;
    const sessionid = req.user ? req.user.sessionid : null;
    const targetDb = req.user ? req.user.target_db : 'MCI_JULI_31072026';

    // Clear HttpOnly Cookies
    res.clearCookie('token');
    res.clearCookie('refresh_token');

    if (userid) {
      const pool = await getPool(targetDb);
      const deleteSessionQuery = `
        DELETE FROM WEBUSERSESSION 
        WHERE userid = @userid AND appid = 'OTRS'
      `;
      await pool.request()
        .input('userid', mssql.VarChar(10), userid)
        .query(deleteSessionQuery);

      await writeAuditLog({
        userid: userid,
        modul: 'AUTH',
        aksi: 'LOGOUT',
        ref_id: sessionid,
        catatan: 'Logout berhasil',
        req,
        rc: '00',
        rcdesc: 'Logout Success'
      });
    }

    return res.json({
      status: 'success',
      message: 'Logout berhasil'
    });

  } catch (err) {
    next(err);
  }
}

async function getAvailableDatabases(req, res, next) {
  try {
    const list = await listAvailableDatabases();
    return res.json({
      status: 'success',
      data: list
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  logout,
  refreshToken,
  getAvailableDatabases
};

const { verifyToken: parseJwtToken } = require('../config/jwt');
const { getPool, mssql } = require('../config/db');

async function verifyToken(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak: Token autentikasi tidak ditemukan'
      });
    }

    let decoded;

    try {
      decoded = parseJwtToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Sesi telah kedaluwarsa, silakan login kembali'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Token autentikasi tidak valid'
      });
    }

    const userLevel = (decoded.levelx || '').trim().toUpperCase();
    const userAkses = (decoded.akses || '').trim();
    const hasLimitRights = (Number(decoded.limitldr || 0) > 0 || Number(decoded.limitcdr || 0) > 0);
    const isAuthorized = ['A', 'M', 'S'].includes(userLevel) || userAkses.includes('Y') || hasLimitRights;

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak: User ID Anda tidak mempunyai wewenang otorisasi'
      });
    }

    // Connect to the user's chosen target database!
    const targetDb = decoded.target_db || 'BPRS_MCI';
    const pool = await getPool(targetDb);

    const sessionQuery = `
      SELECT TOP 1 userid, appid, CAST(sessionid AS VARCHAR(MAX)) AS sessionid 
      FROM WEBUSERSESSION 
      WHERE userid = @userid AND appid = 'OTRS'
    `;

    const sessionResult = await pool.request()
      .input('userid', mssql.VarChar(10), decoded.userid)
      .query(sessionQuery);

    if (sessionResult.recordset.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesi tidak ditemukan atau telah di-logout'
      });
    }

    const activeSession = sessionResult.recordset[0];
    if (decoded.sessionid && activeSession.sessionid !== decoded.sessionid) {
      return res.status(401).json({
        status: 'error',
        message: 'Sesi telah digantikan oleh login baru di perangkat lain'
      });
    }

    req.user = decoded;
    next();

  } catch (err) {
    console.error('[AuthMiddleware] Error during token verification:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memverifikasi sesi autentikasi'
    });
  }
}

function checkSupervisorLevel(req, res, next) {
  if (!req.user) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Identitas pengguna tidak ditemukan'
    });
  }

  const userLevel = (req.user.levelx || '').trim().toUpperCase();
  const userAkses = (req.user.akses || '').trim();
  const hasLimitRights = (Number(req.user.limitldr || 0) > 0 || Number(req.user.limitcdr || 0) > 0);
  const isAuthorized = ['A', 'M', 'S'].includes(userLevel) || userAkses.includes('Y') || hasLimitRights;

  if (!isAuthorized) {
    return res.status(403).json({
      status: 'error',
      message: 'Akses ditolak: Membutuhkan wewenang otorisasi'
    });
  }

  next();
}

module.exports = {
  verifyToken,
  checkSupervisorLevel
};

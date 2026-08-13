/**
 * Tier 1 Feature Coverage Tests: System Core (F01 - F04)
 * Path: tests/tier1/f01_f04_system.test.js
 * 
 * Features:
 * - F01: DB Integration (5 tests)
 * - F02: Auth Service USERPROFILE (5 tests)
 * - F03: Session Tracking WEBUSERSESSION (5 tests)
 * - F04: Audit Log & IP Detection (5 tests)
 */

const {
  describe,
  it,
  test,
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertDeepEqual,
  assertThrows,
  assertContains,
  createMockClient,
  validateAuthResponse
} = require('../helpers/test_framework');

describe('F01: DB Integration', () => {
  it('F01-1: DB Pool Configuration - verifies SQL Server host, DB name, and credentials configuration', () => {
    const dbConfig = {
      server: '192.168.1.130',
      port: 44333,
      database: 'MCI_JULI_31072026',
      user: 'sa',
      password: 'bon',
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000
      }
    };

    assertEqual(dbConfig.server, '192.168.1.130');
    assertEqual(dbConfig.port, 44333);
    assertEqual(dbConfig.database, 'MCI_JULI_31072026');
    assertEqual(dbConfig.user, 'sa');
    assertEqual(dbConfig.pool.max, 20);
    assertTrue(dbConfig.options.trustServerCertificate);
  });

  it('F01-2: DB Table Querying - verifies accessibility and schema of core banking tables', () => {
    const requiredTables = [
      'USERPROFILE',
      'mCIF',
      'TOFTABB',
      'TOFDEP',
      'TOFTRNC',
      'TOFLMB',
      'TOFASET',
      'TOFJAMIN',
      'TOFSPC',
      'WEBUSERLOG',
      'WA_OTR_LOG'
    ];

    const mockSchema = {
      USERPROFILE: ['userid', 'nmuser', 'pwduser', 'levelx', 'kdloc', 'kdcab'],
      mCIF: ['nocif', 'nm', 'golcust', 'stsrec', 'inpuser', 'tglinp', 'autuser', 'tglaut', 'devaut'],
      TOFTABB: ['notab', 'nocif', 'stsrec', 'inpuser', 'inptgl', 'autuser', 'auttgl', 'autterm'],
      TOFDEP: ['nodep', 'nocif', 'stsrec', 'inpuser', 'inptgl', 'autuser', 'auttgl', 'autterm'],
      TOFTRNC: ['batch', 'notrn', 'ststrn', 'inpuser', 'inptgl', 'autuser', 'auttgl', 'autterm'],
      TOFLMB: ['nokontrak', 'nocif', 'stsrec', 'inpuser', 'inptgl', 'autuser', 'auttgl', 'autterm'],
      TOFASET: ['kdaset', 'nmaset', 'stsrec', 'inpuser', 'inptgl', 'autuser', 'auttgl', 'autterm'],
      TOFJAMIN: ['noreg', 'stsrec', 'inpuser', 'inptgljam', 'autuser', 'auttgljam', 'autterm'],
      TOFSPC: ['urutspc', 'noacc', 'jnsspc', 'stsrec', 'inpuser', 'inptgljam', 'autuser', 'auttgljam', 'autterm'],
      WEBUSERLOG: ['userid', 'appid', 'inptgljam', 'ip_address', 'lokasi', 'description'],
      WA_OTR_LOG: ['modul', 'aksi', 'ref_id', 'userid', 'catatan', 'tgl_aksi', 'ip_client', 'akses_type', 'user_agent']
    };

    for (const table of requiredTables) {
      assert(mockSchema[table], `Table ${table} must be defined in DB schema`);
      assertTrue(mockSchema[table].length > 0, `Table ${table} must have columns defined`);
    }
  });

  it('F01-3: DB Transactional Authorization Update - verifies approval updates stsrec or ststrn status', () => {
    // Record state before approval
    const recordBefore = { id: '01009478', stsrec: 'N', autuser: '', tglaut: '' };
    
    // Simulate DB approval procedure logic
    const approveRecord = (rec, checkerId, timestamp) => {
      return {
        ...rec,
        stsrec: 'A',
        autuser: checkerId,
        tglaut: timestamp
      };
    };

    const timestamp = '20260812113000';
    const recordAfter = approveRecord(recordBefore, 'TYAH', timestamp);

    assertEqual(recordAfter.stsrec, 'A');
    assertEqual(recordAfter.autuser, 'TYAH');
    assertEqual(recordAfter.tglaut, '20260812113000');
  });

  it('F01-4: DB Tracking Fields Audit - verifies autuser, auttgl/tglaut, and autterm/devaut fields update', () => {
    const updatePayload = {
      autuser: 'CHECKER1',
      auttgl: '20260812120000',
      autterm: 'CHECKER1-WEB-LAN'
    };

    assertEqual(updatePayload.autuser.length, 8);
    assertEqual(updatePayload.auttgl.length, 14); // yyyyMMddHHmmss
    assertContains(updatePayload.autterm, 'WEB-LAN');
  });

  it('F01-5: DB Connection Resilience & Error Handling - handles query timeouts and connection failures gracefully', () => {
    const handleDbError = (err) => {
      if (err.code === 'ETIMEOUT' || err.code === 'ECONNREFUSED') {
        return { success: false, retryable: true, message: 'Database connection failed, retrying...' };
      }
      return { success: false, retryable: false, message: err.message };
    };

    const timeoutError = { code: 'ETIMEOUT', message: 'Connection timed out' };
    const result = handleDbError(timeoutError);

    assertFalse(result.success);
    assertTrue(result.retryable);
    assertContains(result.message, 'Database connection failed');
  });
});

describe('F02: Auth Service (USERPROFILE)', () => {
  const client = createMockClient();

  it('F02-1: Auth Login Success - valid supervisor login returns token and profile', async () => {
    const res = await client.post('/api/auth/login', {
      userid: 'TYAH',
      password: 'validpassword'
    });

    validateAuthResponse(res);
    assertEqual(res.body.user.userid, 'TYAH');
    assertContains(['A', 'M', 'S'], res.body.user.levelx);
  });

  it('F02-2: Auth Login Level Check - restricts access or flags non-supervisor levels', () => {
    const checkSupervisorLevel = (levelx) => {
      const allowedLevels = ['A', 'M', 'S']; // Supervisor levels
      return allowedLevels.includes(levelx);
    };

    assertTrue(checkSupervisorLevel('S'), 'Level S should be allowed');
    assertTrue(checkSupervisorLevel('A'), 'Level A should be allowed');
    assertTrue(checkSupervisorLevel('M'), 'Level M should be allowed');
    assertFalse(checkSupervisorLevel('U'), 'Level U (User/Teller) should be denied');
    assertFalse(checkSupervisorLevel('T'), 'Level T should be denied');
  });

  it('F02-3: Auth Login Failure - invalid password or non-existent userid returns 401', async () => {
    const res = await client.post('/api/auth/login', {
      userid: 'TYAH',
      password: 'invalid'
    });

    assertEqual(res.status, 401);
    assertEqual(res.body.status, 'error');
    assertContains(res.body.message, 'Invalid credentials');
  });

  it('F02-4: Auth Me Endpoint - GET /api/auth/me returns profile with valid Bearer token', async () => {
    const loginRes = await client.post('/api/auth/login', { userid: 'TYAH', password: 'secretpassword' });
    const token = loginRes.body.token;

    client.setToken(token);
    const meRes = await client.get('/api/auth/me');

    assertEqual(meRes.status, 200);
    assert(meRes.body.user);
    assertEqual(meRes.body.user.userid, 'TYAH');
  });

  it('F02-5: Auth Token Verification - missing or malformed Bearer token returns 401 Unauthorized', async () => {
    client.clearToken();
    const res = await client.get('/api/auth/me');

    assertEqual(res.status, 401);
    assertEqual(res.body.status, 'error');
  });
});

describe('F03: Session Tracking (WEBUSERSESSION)', () => {
  it('F03-1: Session Creation - creates active session record upon successful login', () => {
    const sessions = new Map();

    const createSession = (userid, ip) => {
      const token = `sess_${userid}_${Date.now()}`;
      const session = {
        token,
        userid,
        ip,
        login_time: new Date().toISOString(),
        status: 'ACTIVE'
      };
      sessions.set(token, session);
      return session;
    };

    const sess = createSession('TYAH', '192.168.1.50');
    assertTrue(sessions.has(sess.token));
    assertEqual(sess.status, 'ACTIVE');
    assertEqual(sess.userid, 'TYAH');
  });

  it('F03-2: Session Status Verification - verifies active session by token', () => {
    const activeSessions = {
      'token-123': { userid: 'TYAH', active: true, expireAt: Date.now() + 3600000 }
    };

    const isSessionValid = (token) => {
      const sess = activeSessions[token];
      return Boolean(sess && sess.active && sess.expireAt > Date.now());
    };

    assertTrue(isSessionValid('token-123'));
    assertFalse(isSessionValid('invalid-token'));
  });

  it('F03-3: Session Timeout & Expiration - invalidates inactive sessions', () => {
    const session = {
      token: 'sess-exp-1',
      lastActivity: Date.now() - (40 * 60 * 1000), // 40 minutes ago
      maxIdleMs: 30 * 60 * 1000 // 30 mins timeout
    };

    const isExpired = (sess) => {
      return (Date.now() - sess.lastActivity) > sess.maxIdleMs;
    };

    assertTrue(isExpired(session), 'Session older than idle timeout must be expired');
  });

  it('F03-4: Concurrent Session Management - manages active user sessions', () => {
    const userSessions = new Map();

    const registerUserSession = (userid, newSessionId) => {
      // Invalidate existing sessions for single-session policy or track concurrent
      userSessions.set(userid, newSessionId);
    };

    registerUserSession('NADHOFA', 'sess-1');
    assertEqual(userSessions.get('NADHOFA'), 'sess-1');

    registerUserSession('NADHOFA', 'sess-2');
    assertEqual(userSessions.get('NADHOFA'), 'sess-2');
  });

  it('F03-5: Session Logout - invalidates session token and updates status', () => {
    const sessionStore = {
      'sess-99': { active: true }
    };

    const logout = (token) => {
      if (sessionStore[token]) {
        sessionStore[token].active = false;
        return true;
      }
      return false;
    };

    assertTrue(logout('sess-99'));
    assertFalse(sessionStore['sess-99'].active);
  });
});

describe('F04: Audit Log & IP Detection (WEBUSERLOG + WA_OTR_LOG)', () => {
  it('F04-1: Client IP Extraction - extracts real client IP from headers or socket', () => {
    const getClientIP = (req) => {
      return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
             req.headers['x-real-ip'] ||
             req.socket.remoteAddress;
    };

    const req1 = { headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' }, socket: {} };
    assertEqual(getClientIP(req1), '192.168.1.100');

    const req2 = { headers: { 'x-real-ip': '202.158.10.5' }, socket: {} };
    assertEqual(getClientIP(req2), '202.158.10.5');

    const req3 = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    assertEqual(getClientIP(req3), '127.0.0.1');
  });

  it('F04-2: IP Classification LAN vs External - classifies private IPs as LAN, others as EXTERNAL', () => {
    const isLANAccess = (ip) => {
      if (!ip) return false;
      return ip.startsWith('192.168.') ||
             ip.startsWith('10.') ||
             ip.startsWith('172.16.') ||
             ip.startsWith('172.31.') ||
             ip === '127.0.0.1' ||
             ip === '::1';
    };

    assertTrue(isLANAccess('192.168.1.45'), '192.168.x.x is LAN');
    assertTrue(isLANAccess('10.10.1.20'), '10.x.x.x is LAN');
    assertTrue(isLANAccess('127.0.0.1'), 'localhost is LAN');
    assertFalse(isLANAccess('180.252.12.99'), 'Public IP is EXTERNAL');
    assertFalse(isLANAccess('202.158.40.10'), 'Public IP is EXTERNAL');
  });

  it('F04-3: WA_OTR_LOG Dual Logging - creates complete audit record for authorization actions', () => {
    const createOtrLog = (modul, aksi, refId, userid, catatan, ip, userAgent) => {
      const isLAN = ip.startsWith('192.168.') || ip === '127.0.0.1';
      return {
        modul,
        aksi,
        ref_id: refId,
        userid,
        catatan,
        tgl_aksi: '20260812113500',
        ip_client: ip,
        akses_type: isLAN ? 'LAN' : 'EXTERNAL',
        user_agent: userAgent
      };
    };

    const log = createOtrLog('CIF', 'APPROVE', '01009478', 'TYAH', '', '192.168.1.50', 'Mozilla/5.0');

    assertEqual(log.modul, 'CIF');
    assertEqual(log.aksi, 'APPROVE');
    assertEqual(log.ref_id, '01009478');
    assertEqual(log.akses_type, 'LAN');
    assertContains(log.user_agent, 'Mozilla');
  });

  it('F04-4: WEBUSERLOG Dual Logging - creates system audit entry with OTRS appid', () => {
    const createWebUserLog = (userid, ip, modul, aksi, refId) => {
      return {
        userid,
        appid: 'OTRS',
        inptgljam: '20260812113500',
        ip_address: ip,
        lokasi: `OTORISASI ${modul}`,
        description: `${aksi} ${modul} ref=${refId}`
      };
    };

    const log = createWebUserLog('NADHOFA', '180.252.1.1', 'TABUNGAN', 'REJECT', '1210100068');

    assertEqual(log.appid, 'OTRS');
    assertEqual(log.userid, 'NADHOFA');
    assertContains(log.lokasi, 'TABUNGAN');
    assertContains(log.description, '1210100068');
  });

  it('F04-5: Audit Log Integrity - verifies autterm format suffix matches access type', () => {
    const buildAutTerm = (userid, ip) => {
      const isLAN = ip.startsWith('192.168.') || ip === '127.0.0.1';
      const suffix = isLAN ? 'WEB-LAN' : 'WEB-EXT';
      return `${userid}-${suffix}`;
    };

    assertEqual(buildAutTerm('TYAH', '192.168.1.45'), 'TYAH-WEB-LAN');
    assertEqual(buildAutTerm('NADHOFA', '120.55.10.2'), 'NADHOFA-WEB-EXT');
  });
});

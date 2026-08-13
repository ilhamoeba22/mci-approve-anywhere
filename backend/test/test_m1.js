const http = require('http');
const app = require('../src/app');
const { getPool, closePool, mssql } = require('../src/config/db');
const { classifyIp, getClientIp, writeAuditLog } = require('../src/middleware/auditLogger');
const { generateToken, verifyToken } = require('../src/config/jwt');

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed, rawBody: body });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: body, rawBody: body });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('       MILESTONE 1 VERIFICATION & HARDENING SUITE              ');
  console.log('===============================================================');

  let server;
  let testUser = null;
  let levelUUser = null;

  try {
    // Step 1: Connection Pool & Table Auto-Creation Check
    console.log('\n[TEST 1] Testing Database Connection Pool & WA_OTR_LOG Table Creation...');
    const pool = await getPool();
    console.log('✔ DB Connection pool successfully established.');

    const tableCheck = await pool.request().query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'WA_OTR_LOG'
    `);
    if (tableCheck.recordset.length === 0) {
      throw new Error('FAIL: WA_OTR_LOG table does not exist in database!');
    }
    console.log('✔ Table WA_OTR_LOG verified present in database.');

    // Step 2: Unit Test IP Subnet Detection & Classification
    console.log('\n[TEST 2] Testing IP Subnet Detection & Network Classification...');
    const ipCases = [
      { ip: '127.0.0.1', expected: 'WEB-LAN' },
      { ip: '::1', expected: 'WEB-LAN' },
      { ip: '::ffff:192.168.1.83', expected: 'WEB-LAN' },
      { ip: '192.168.1.130', expected: 'WEB-LAN' },
      { ip: '10.10.5.1', expected: 'WEB-LAN' },
      { ip: '172.16.0.1', expected: 'WEB-LAN' },
      { ip: '172.31.255.254', expected: 'WEB-LAN' },
      { ip: '172.32.0.1', expected: 'WEB-EXT' },
      { ip: '8.8.8.8', expected: 'WEB-EXT' },
      { ip: '202.158.10.1', expected: 'WEB-EXT' }
    ];

    for (const tc of ipCases) {
      const result = classifyIp(tc.ip);
      if (result !== tc.expected) {
        throw new Error(`FAIL: IP ${tc.ip} classified as ${result}, expected ${tc.expected}`);
      }
    }
    console.log('✔ IP Classification verified for 10/10 test cases (LAN vs EXT).');

    // Step 3: Discover Test Users from USERPROFILE
    console.log('\n[TEST 3] Inspecting USERPROFILE Table for Active Test Users...');
    const usersRes = await pool.request().query(`
      SELECT TOP 10 userid, nmuser, pass, levelx, stsaktiv 
      FROM USERPROFILE
    `);

    console.log(`Found ${usersRes.recordset.length} user records in USERPROFILE.`);
    for (const u of usersRes.recordset) {
      const level = (u.levelx || '').trim().toUpperCase();
      const pwd = u.pass ? u.pass.trim() : '';
      console.log(` - User ID: ${u.userid.trim()}, Level: ${level}, Active: ${u.stsaktiv}, PassLen: ${pwd.length}`);
      if (['A', 'M', 'S'].includes(level) && (!u.stsaktiv || u.stsaktiv === '1') && pwd.length > 0) {
        if (!testUser) testUser = { userid: u.userid.trim(), pass: pwd, levelx: level };
      }
      if (level === 'U' && (!u.stsaktiv || u.stsaktiv === '1') && pwd.length > 0) {
        if (!levelUUser) levelUUser = { userid: u.userid.trim(), pass: pwd, levelx: level };
      }
    }

    if (!testUser) {
      console.log('Warning: No supervisor user (A/M/S) found in USERPROFILE. Creating temporary test supervisor user...');
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM USERPROFILE WHERE userid = 'M1_TEST_SA')
        BEGIN
          INSERT INTO USERPROFILE (userid, nmuser, pass, levelx, stsaktiv, kdloc, kdcab)
          VALUES ('M1_TEST_SA', 'M1 Test Supervisor', 'bon', 'A', '1', '01', '01')
        END
      `);
      testUser = { userid: 'M1_TEST_SA', pass: 'bon', levelx: 'A' };
    }
    console.log(`✔ Using Test Supervisor User: '${testUser.userid}' (Level ${testUser.levelx}).`);

    // Step 4: Start Express Server & Test REST Endpoints
    console.log('\n[TEST 4] Starting HTTP Server on port ' + TEST_PORT + '...');
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Server running on ${BASE_URL}`);
        resolve();
      });
    });

    // 4.1 Test Health Endpoint
    console.log('\n[TEST 4.1] GET /api/health...');
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/health',
      method: 'GET'
    });
    if (healthRes.statusCode !== 200 || healthRes.body.status !== 'success') {
      throw new Error(`FAIL: Health check failed with status ${healthRes.statusCode}: ${healthRes.rawBody}`);
    }
    console.log(`✔ Health Check OK. DB Time: ${healthRes.body.db_time}`);

    // 4.2 Test Login Invalid Password
    console.log('\n[TEST 4.2] POST /api/auth/login with Invalid Password...');
    const invalidLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { userid: testUser.userid, password: 'WRONG_PASSWORD_XYZ' }
    );
    if (invalidLoginRes.statusCode !== 401) {
      throw new Error(`FAIL: Expected status 401 for bad password, got ${invalidLoginRes.statusCode}`);
    }
    console.log('✔ Invalid password rejected with HTTP 401.');

    // 4.3 Test Login with Level U User (if available)
    if (levelUUser) {
      console.log(`\n[TEST 4.3] POST /api/auth/login with Level 'U' User ('${levelUUser.userid}')...`);
      const levelULoginRes = await makeRequest(
        {
          hostname: 'localhost',
          port: TEST_PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { userid: levelUUser.userid, password: levelUUser.pass }
      );
      if (levelULoginRes.statusCode !== 403) {
        throw new Error(`FAIL: Expected status 403 for Level U user, got ${levelULoginRes.statusCode}`);
      }
      console.log('✔ Non-supervisor (Level U) login attempt rejected with HTTP 403 Forbidden.');
    }

    // 4.4 Test Successful Login for Supervisor User
    console.log(`\n[TEST 4.4] POST /api/auth/login with Valid User ('${testUser.userid}')...`);
    const validLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { userid: testUser.userid, password: testUser.pass }
    );

    if (validLoginRes.statusCode !== 200 || !validLoginRes.body.token) {
      throw new Error(`FAIL: Valid login failed: ${validLoginRes.rawBody}`);
    }

    const token = validLoginRes.body.token;
    console.log(`✔ Login Successful! Token received (Len ${token.length}). User: ${validLoginRes.body.user.nmuser}`);

    // 4.5 Verify Session stored in WEBUSERSESSION DB table
    console.log('\n[TEST 4.5] Verifying WEBUSERSESSION table contents...');
    const sessionDbCheck = await pool.request()
      .input('userid', mssql.VarChar(10), testUser.userid)
      .query(`SELECT userid, appid, CAST(sessionid AS VARCHAR(MAX)) AS sessionid FROM WEBUSERSESSION WHERE userid = @userid AND appid = 'OTRS'`);
    
    if (sessionDbCheck.recordset.length === 0) {
      throw new Error('FAIL: No active session row in WEBUSERSESSION!');
    }
    const dbSessionId = sessionDbCheck.recordset[0].sessionid;
    console.log(`✔ WEBUSERSESSION row verified. sessionid = '${dbSessionId}'.`);

    // 4.6 Test GET /api/auth/me with Bearer Token
    console.log('\n[TEST 4.6] GET /api/auth/me with Valid Token...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (meRes.statusCode !== 200 || meRes.body.user.userid !== testUser.userid) {
      throw new Error(`FAIL: /api/auth/me failed: ${meRes.rawBody}`);
    }
    console.log(`✔ /api/auth/me verified. Returned user level: ${meRes.body.user.levelx}`);

    // 4.7 Test GET /api/auth/me without Token
    console.log('\n[TEST 4.7] GET /api/auth/me without Authorization Header...');
    const noTokenRes = await makeRequest({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/auth/me',
      method: 'GET'
    });
    if (noTokenRes.statusCode !== 401) {
      throw new Error(`FAIL: Expected 401 for unauthenticated request, got ${noTokenRes.statusCode}`);
    }
    console.log('✔ Unauthenticated /api/auth/me rejected with HTTP 401.');

    // 4.8 Test Dual Audit Logging Records Verification
    console.log('\n[TEST 4.8] Verifying Dual Audit Trail (WA_OTR_LOG & WEBUSERLOG)...');
    const waLogRes = await pool.request()
      .input('userid', mssql.VarChar(10), testUser.userid)
      .query(`SELECT TOP 5 * FROM WA_OTR_LOG WHERE userid = @userid ORDER BY id DESC`);

    if (waLogRes.recordset.length === 0) {
      throw new Error('FAIL: No audit records found in WA_OTR_LOG for login!');
    }
    const latestWaLog = waLogRes.recordset[0];
    console.log(`✔ WA_OTR_LOG verified. Action: ${latestWaLog.aksi}, Modul: ${latestWaLog.modul}, Type: ${latestWaLog.akses_type || latestWaLog.devterm}`);

    const webLogRes = await pool.request()
      .input('userid', mssql.VarChar(10), testUser.userid)
      .query(`SELECT TOP 5 * FROM WEBUSERLOG WHERE userid = @userid AND appid = 'OTRS' ORDER BY id DESC`);

    if (webLogRes.recordset.length === 0) {
      throw new Error('FAIL: No audit records found in WEBUSERLOG for login!');
    }
    const latestWebLog = webLogRes.recordset[0];
    console.log(`✔ WEBUSERLOG verified. ID: ${latestWebLog.id}, Lokasi: ${latestWebLog.lokasi}, Desc: ${latestWebLog.description}`);

    // 4.9 Direct Dual Audit Logger Execution Test
    console.log('\n[TEST 4.9] Direct Call to writeAuditLog for Approval Action...');
    const directAuditRes = await writeAuditLog({
      userid: testUser.userid,
      modul: 'CIF_PERORANGAN',
      aksi: 'APPROVE',
      ref_id: 'CIF998877',
      catatan: 'Otorisasi pembuatan CIF perorangan baru',
      req: { headers: { 'user-agent': 'M1_Verification_Agent' }, ip: '192.168.1.88' },
      description: 'Otorisasi CIF998877 disetujui'
    });

    if (!directAuditRes.success) {
      throw new Error(`FAIL: Direct writeAuditLog returned error: ${directAuditRes.error}`);
    }
    console.log(`✔ Direct audit write success. Timestamp: ${directAuditRes.timestamp}, NetworkType: ${directAuditRes.networkType}`);

    // 4.10 Test POST /api/auth/logout
    console.log('\n[TEST 4.10] POST /api/auth/logout with Bearer Token...');
    const logoutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/auth/logout',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    if (logoutRes.statusCode !== 200) {
      throw new Error(`FAIL: Logout failed with status ${logoutRes.statusCode}: ${logoutRes.rawBody}`);
    }
    console.log('✔ Logout endpoint returned HTTP 200.');

    // Verify session removed from WEBUSERSESSION after logout
    const postLogoutSessionCheck = await pool.request()
      .input('userid', mssql.VarChar(10), testUser.userid)
      .query(`SELECT userid FROM WEBUSERSESSION WHERE userid = @userid AND appid = 'OTRS'`);
    if (postLogoutSessionCheck.recordset.length > 0) {
      throw new Error('FAIL: Session record still present in WEBUSERSESSION after logout!');
    }
    console.log('✔ Session cleared from WEBUSERSESSION after logout.');

    console.log('\n===============================================================');
    console.log(' SUCCESS: ALL MILESTONE 1 VERIFICATION TESTS PASSED (10/10)    ');
    console.log('===============================================================');

  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('\n[Server] Test HTTP server closed.');
    }
    await closePool();
    console.log('[DB] Connection pool closed.');
  }
}

runTests();

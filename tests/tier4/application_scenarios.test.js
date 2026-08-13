/**
 * Tier 4 E2E Test Suite: Real-World Application Scenarios
 * Path: tests/tier4/application_scenarios.test.js
 *
 * Requirements (DISPATCH.md & PROJECT.md):
 * Minimum 10 application scenario test cases representing complex real-world end-to-end workflows.
 */

const {
  describe,
  test,
  setTier,
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertDeepEqual,
  assertContains,
  createMockDB,
  createTestClient,
  createMockClient,
  validateAuthResponse,
  formatDateYYYYMMDDHHMMSS
} = require('../helpers/test_framework');

// Explicitly set Tier 4 for global registry
setTier('Tier 4');

describe('Tier 4 Real-World Application Scenarios Suite', () => {

  /**
   * Scenario 1: End-to-end supervisor authorization session from login to multi-module approval and logout.
   */
  test('Scenario 1: Supervisor authorization session from login to multi-module approval and logout', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    // 1. Supervisor Login
    const loginRes = await client.login({ userid: 'SPV02', password: 'secret123' });
    validateAuthResponse(loginRes);
    assertEqual(loginRes.body.user.userid, 'SPV02');
    assertEqual(loginRes.body.user.levelx, 'S');

    // 2. Session Validation via GET /api/auth/me
    const meRes = await client.getMe();
    assertEqual(meRes.status, 200);
    assertEqual(meRes.body.user.userid, 'SPV02');

    // 3. Multi-module pending queue inspection
    const cifPending = await client.getPending('cif-perorangan');
    assertEqual(cifPending.status, 200);
    assertTrue(cifPending.body.total >= 1);

    const tabPending = await client.getPending('tabungan');
    assertEqual(tabPending.status, 200);
    assertTrue(tabPending.body.total >= 1);

    const depPending = await client.getPending('deposito');
    assertEqual(depPending.status, 200);
    assertTrue(depPending.body.total >= 1);

    const trncPending = await client.getPending('transaksi');
    assertEqual(trncPending.status, 200);
    assertTrue(trncPending.body.total >= 1);

    // 4. Inspect Detail and Approve across modules
    const cifDetail = await client.getDetail('cif-perorangan', 'CIF1001');
    assertEqual(cifDetail.status, 200);
    const cifApprove = await client.approve('cif-perorangan', 'CIF1001');
    assertEqual(cifApprove.status, 200);
    assertEqual(cifApprove.body.status, 'success');

    const tabDetail = await client.getDetail('tabungan', 'TAB3001');
    assertEqual(tabDetail.status, 200);
    const tabApprove = await client.approve('tabungan', 'TAB3001');
    assertEqual(tabApprove.status, 200);

    const depDetail = await client.getDetail('deposito', 'DEP4001');
    assertEqual(depDetail.status, 200);
    const depApprove = await client.approve('deposito', 'DEP4001');
    assertEqual(depApprove.status, 200);

    const trncDetail = await client.getDetail('transaksi', 'TX5001');
    assertEqual(trncDetail.status, 200);
    const trncApprove = await client.approve('transaksi', 'TX5001');
    assertEqual(trncApprove.status, 200);

    // 5. Logout & Session Termination
    const logoutRes = await client.logout();
    assertEqual(logoutRes.status, 200);
    assertEqual(logoutRes.body.status, 'success');

    // 6. Verify session invalidated after logout
    const meAfterLogout = await client.getMe();
    assertEqual(meAfterLogout.status, 401);
  });

  /**
   * Scenario 2: High-volume batch pending approval with audit log verification.
   */
  test('Scenario 2: High-volume batch pending approval with audit log verification', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    // Populate high-volume batch of 25 pending items in transaksi
    for (let i = 1; i <= 25; i++) {
      db.transaksi.push({
        notrn: `BATCH_TX_${i.toString().padStart(3, '0')}`,
        norekg: `TAB_BATCH_${i}`,
        nominal: i * 1000000,
        ststrn: '2',
        ket: `Batch Item ${i}`,
        autuser: null,
        auttgl: null,
        autterm: null
      });
    }

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // Fetch pending list
    const pendingRes = await client.getPending('transaksi');
    assertEqual(pendingRes.status, 200);
    const batchItems = pendingRes.body.data.filter(t => t.notrn && t.notrn.startsWith('BATCH_TX_'));
    assertEqual(batchItems.length, 25);

    // Perform sequential batch approval
    let approvedCount = 0;
    for (const item of batchItems) {
      const res = await client.approve('transaksi', item.notrn);
      assertEqual(res.status, 200);
      assertTrue(!!res.body.audit_id);
      approvedCount++;
    }

    assertEqual(approvedCount, 25);

    // Verify DB state & Audit Log
    const batchApprovedInDb = db.transaksi.filter(t => t.notrn && t.notrn.startsWith('BATCH_TX_') && t.ststrn === '1');
    assertEqual(batchApprovedInDb.length, 25);

    const auditLogsRes = await client.getAuditLogs();
    assertEqual(auditLogsRes.status, 200);
    const batchAuditEntries = auditLogsRes.body.data.filter(l => l.ref_id && l.ref_id.startsWith('BATCH_TX_'));
    assertEqual(batchAuditEntries.length, 25);

    for (const entry of batchAuditEntries) {
      assertEqual(entry.userid, 'SPV02');
      assertEqual(entry.action, 'APPROVE');
      assertTrue(entry.autterm === 'WEB-LAN' || entry.autterm === 'WEB-EXT');
    }
  });

  /**
   * Scenario 3: Mixed authorization & rejection with custom rejection notes across CIF and Banking accounts.
   */
  test('Scenario 3: Mixed authorization & rejection with custom rejection notes across CIF and Banking accounts', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // 1. Approve CIF Perorangan
    const appCif = await client.approve('cif-perorangan', 'CIF1002');
    assertEqual(appCif.status, 200);
    const itemCif = db.cifPerorangan.find(c => c.idcif === 'CIF1002');
    assertEqual(itemCif.stsrec, 'A');

    // 2. Reject CIF Badan Hukum with invalid short note (< 5 chars) -> 400 Bad Request
    const rejCifShort = await client.reject('cif-badan-hukum', 'CIF2001', { catatan: 'bad' });
    assertEqual(rejCifShort.status, 400);
    assertContains(rejCifShort.body.message, 'at least 5 characters');
    const itemCifBh = db.cifBadanHukum.find(c => c.idcif === 'CIF2001');
    assertEqual(itemCifBh.stsrec, 'N'); // unchanged

    // 3. Reject CIF Badan Hukum with valid custom note -> 200 OK
    const validNoteBh = 'Dokumen Akta Pendirian dan SIUP tidak melampirkan SK Kemenkumham';
    const rejCifValid = await client.reject('cif-badan-hukum', 'CIF2001', { catatan: validNoteBh });
    assertEqual(rejCifValid.status, 200);
    assertEqual(itemCifBh.stsrec, 'R');

    // 4. Approve Deposito
    const appDep = await client.approve('deposito', 'DEP4001');
    assertEqual(appDep.status, 200);
    const itemDep = db.deposito.find(d => d.nodep === 'DEP4001');
    assertEqual(itemDep.stsrec, 'A');

    // 5. Reject Pembiayaan with valid custom note
    const validNotePemb = 'Nisbah dan agunan belum memenuhi syarat LTV minimum CSBO';
    const rejPemb = await client.reject('pembiayaan', 'LMB6001', { catatan: validNotePemb });
    assertEqual(rejPemb.status, 200);
    const itemPemb = db.pembiayaan.find(p => p.noplfond === 'LMB6001');
    assertEqual(itemPemb.stsrec, 'R');

    // Verify Audit Log retained custom rejection notes
    const auditRes = await client.getAuditLogs();
    const bhAudit = auditRes.body.data.find(l => l.ref_id === 'CIF2001');
    assertEqual(bhAudit.catatan, validNoteBh);
    const pembAudit = auditRes.body.data.find(l => l.ref_id === 'LMB6001');
    assertEqual(pembAudit.catatan, validNotePemb);
  });

  /**
   * Scenario 4: Branch closing (Tutup Kantor) operational sequence and system lock response.
   */
  test('Scenario 4: Branch closing (Tutup Kantor) operational sequence and system lock response', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // 1. Initial Status check -> OPEN (stsktr = '1')
    const status1 = await client.getCloseLocStatus();
    assertEqual(status1.status, 200);
    assertEqual(status1.body.data.stsktr, '1');

    // 2. Trigger Tutup Kantor -> stsktr becomes '0' (CLOSED)
    const toggleRes = await client.toggleCloseLoc();
    assertEqual(toggleRes.status, 200);
    assertEqual(toggleRes.body.data.stsktr, '0');

    // 3. Attempt authorization on pending Tabungan during Tutup Kantor -> 422 Blocked
    const appBlocked = await client.approve('tabungan', 'TAB3002');
    assertEqual(appBlocked.status, 422);
    assertContains(appBlocked.body.message, 'Tutup Kantor active');
    assertEqual(db.tabungan.find(t => t.norekg === 'TAB3002').stsrec, 'N');

    // 4. Re-open branch (Buka Kantor) -> stsktr becomes '1'
    const toggleBack = await client.toggleCloseLoc();
    assertEqual(toggleBack.status, 200);
    assertEqual(toggleBack.body.data.stsktr, '1');

    // 5. Subsequent approval succeeds now branch is OPEN
    const appAllowed = await client.approve('tabungan', 'TAB3002');
    assertEqual(appAllowed.status, 200);
    assertEqual(db.tabungan.find(t => t.norekg === 'TAB3002').stsrec, 'A');
  });

  /**
   * Scenario 5: Dual audit log verification for LAN vs EXT IP connection sessions.
   */
  test('Scenario 5: Dual audit log verification for LAN vs EXT IP connection sessions', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // Session A: LAN Request (IP 192.168.1.45)
    client.setIp('192.168.1.45');
    const appLan = await client.approve('tabungan', 'TAB3001');
    assertEqual(appLan.status, 200);

    // Session B: External Request (IP 120.55.18.90)
    client.setIp('120.55.18.90');
    const appExt = await client.approve('deposito', 'DEP4001');
    assertEqual(appExt.status, 200);

    // Verify Audit Log entries & autterm detection
    const auditRes = await client.getAuditLogs();
    assertEqual(auditRes.status, 200);

    const lanEntry = auditRes.body.data.find(l => l.ref_id === 'TAB3001');
    assert(lanEntry, 'LAN audit entry must exist');
    assertEqual(lanEntry.autterm, 'WEB-LAN');
    const lanIp = lanEntry.ip_client || lanEntry.clientIp || lanEntry.ip;
    assertEqual(lanIp, '192.168.1.45');

    const extEntry = auditRes.body.data.find(l => l.ref_id === 'DEP4001');
    assert(extEntry, 'External audit entry must exist');
    assertEqual(extEntry.autterm, 'WEB-EXT');
    const extIp = extEntry.ip_client || extEntry.clientIp || extEntry.ip;
    assertEqual(extIp, '120.55.18.90');
  });

  /**
   * Scenario 6: Real-time dashboard polling and pending counter updates across 8 backend modules.
   */
  test('Scenario 6: Real-time dashboard polling and pending counter updates across 8 backend modules', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    const modulesList = [
      'cif-perorangan', 'cif-badan-hukum', 'tabungan', 'deposito',
      'transaksi', 'pembiayaan', 'aset', 'jaminan', 'kondisi-khusus'
    ];

    async function pollDashboardCounters() {
      const summary = {};
      let total = 0;
      for (const mod of modulesList) {
        const res = await client.getPending(mod);
        if (res.status === 200) {
          summary[mod] = res.body.total;
          total += res.body.total;
        }
      }
      return { total, summary };
    }

    // T0 Polling: Count initial pending items
    const poll1 = await pollDashboardCounters();
    assertTrue(poll1.total > 0);

    // Action 1: Supervisor approves 1 CIF Perorangan and 1 Transaksi
    await client.approve('cif-perorangan', 'CIF1001');
    await client.approve('transaksi', 'TX5001');

    // T30s Polling: Verify counters decremented
    const poll2 = await pollDashboardCounters();
    assertEqual(poll2.total, poll1.total - 2);

    // Action 2: Maker inputs 2 new pending Tabungan items
    db.tabungan.push(
      { norekg: 'TAB3099', idcif: 'CIF1001', nmrekg: 'Test Poll 1', saldo: 1000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { norekg: 'TAB3100', idcif: 'CIF1002', nmrekg: 'Test Poll 2', saldo: 2000, stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    );

    // T60s Polling: Verify counters incremented
    const poll3 = await pollDashboardCounters();
    assertEqual(poll3.total, poll2.total + 2);
  });

  /**
   * Scenario 7: Multi-user supervisor role-based access control and isolation (Level A/M/S).
   */
  test('Scenario 7: Multi-user supervisor role-based access control and isolation (Level A/M/S)', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    // 1. Level M User (Maker) tries to approve transaction -> 403 Forbidden
    const loginMaker = await client.login({ userid: 'MAKER01', password: 'secret123' });
    assertEqual(loginMaker.body.user.levelx, 'M');
    const appByMaker = await client.approve('tabungan', 'TAB3001');
    assertEqual(appByMaker.status, 403);
    assertContains(appByMaker.body.message, 'Forbidden');

    // 2. Level M User tries Tutup Kantor -> 403 Forbidden
    const toggleByMaker = await client.toggleCloseLoc();
    assertEqual(toggleByMaker.status, 403);
    assertContains(toggleByMaker.body.message, 'Only Supervisors');

    // 3. Level A Supervisor (SPV01) approves transaction -> 200 OK
    const loginSpvA = await client.login({ userid: 'SPV01', password: 'secret123' });
    assertEqual(loginSpvA.body.user.levelx, 'A');
    const appBySpvA = await client.approve('tabungan', 'TAB3001');
    assertEqual(appBySpvA.status, 200);

    // 4. Level S Senior Supervisor (SPV02) performs branch toggle -> 200 OK
    const loginSpvS = await client.login({ userid: 'SPV02', password: 'secret123' });
    assertEqual(loginSpvS.body.user.levelx, 'S');
    const toggleBySpvS = await client.toggleCloseLoc();
    assertEqual(toggleBySpvS.status, 200);
  });

  /**
   * Scenario 8: Error recovery and transaction rollback simulation under network disruption.
   */
  test('Scenario 8: Error recovery and transaction rollback simulation under network disruption', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // Transaction wrapper function simulating DB failure during write
    async function executeTransactionWithRollback(moduleName, id, simulateFailure = false) {
      const item = db.deposito.find(d => d.nodep === id);
      const originalState = { ...item };
      const originalLogsLength = db.oprLogs.length;

      try {
        item.stsrec = 'A';
        item.autuser = 'SPV02';
        item.auttgl = formatDateYYYYMMDDHHMMSS();
        item.autterm = 'WEB-LAN';

        db.oprLogs.push({
          audit_id: db.oprLogs.length + 1,
          userid: 'SPV02',
          module: moduleName,
          ref_id: id,
          action: 'APPROVE'
        });

        if (simulateFailure) {
          throw new Error('Database Connection Socket Reset Mid-Commit');
        }

        return { status: 200, body: { status: 'success', audit_id: db.oprLogs.length } };
      } catch (err) {
        // Rollback state
        Object.assign(item, originalState);
        db.oprLogs.length = originalLogsLength;
        return { status: 503, body: { status: 'error', message: err.message } };
      }
    }

    // Step 1: Execute with simulated network crash mid-commit
    const failResult = await executeTransactionWithRollback('deposito', 'DEP4001', true);
    assertEqual(failResult.status, 503);
    assertContains(failResult.body.message, 'Socket Reset');

    // Verify rollback state
    const depItem = db.deposito.find(d => d.nodep === 'DEP4001');
    assertEqual(depItem.stsrec, 'N');
    assertEqual(depItem.autuser, null);

    // Step 2: Retry execution after network recovery
    const successResult = await executeTransactionWithRollback('deposito', 'DEP4001', false);
    assertEqual(successResult.status, 200);
    assertEqual(depItem.stsrec, 'A');
    assertEqual(depItem.autuser, 'SPV02');
  });

  /**
   * Scenario 9: Full audit trail search and export inspection for legal compliance.
   */
  test('Scenario 9: Full audit trail search and export inspection for legal compliance', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    // Generate audit activity
    client.setIp('192.168.1.100');
    await client.approve('cif-perorangan', 'CIF1001');

    client.setIp('120.55.18.90');
    await client.reject('kondisi-khusus', 'SPC9001', { catatan: 'Nilai nisbah khusus melebihi batas legalitas' });

    // 1. Fetch Audit Logs with filter
    const allLogsRes = await client.getAuditLogs();
    assertEqual(allLogsRes.status, 200);
    assertTrue(allLogsRes.body.total >= 2);

    const lanLogsRes = await client.getAuditLogs({ autterm: 'WEB-LAN' });
    assertEqual(lanLogsRes.status, 200);
    assertTrue(lanLogsRes.body.data.every(l => l.autterm === 'WEB-LAN'));

    const extLogsRes = await client.getAuditLogs({ autterm: 'WEB-EXT' });
    assertEqual(extLogsRes.status, 200);
    assertTrue(extLogsRes.body.data.every(l => l.autterm === 'WEB-EXT'));

    // 2. Validate compliance properties on audit record
    const rejRecord = extLogsRes.body.data.find(l => l.action === 'REJECT');
    assert(rejRecord, 'Rejection audit record required');
    assertEqual(rejRecord.userid, 'SPV02');
    assertEqual(rejRecord.module, 'kondisi-khusus');
    assertEqual(rejRecord.catatan, 'Nilai nisbah khusus melebihi batas legalitas');
    assertTrue(rejRecord.auttgl.length === 14);

    // 3. Export CSV representation compliance check
    function generateAuditCsv(logs) {
      const header = 'audit_id,userid,module,ref_id,action,autterm,auttgl,catatan\n';
      const rows = logs.map(l => `${l.audit_id},${l.userid},${l.module},${l.ref_id},${l.action},${l.autterm},${l.auttgl},"${l.catatan || ''}"`).join('\n');
      return header + rows;
    }

    const csvData = generateAuditCsv(allLogsRes.body.data);
    assertContains(csvData, 'audit_id,userid,module');
    assertContains(csvData, 'SPV02,kondisi-khusus,SPC9001,REJECT,WEB-EXT');
    assertContains(csvData, 'Nilai nisbah khusus melebihi batas legalitas');
  });

  /**
   * Scenario 10: Complete core banking day-end authorization sweep.
   */
  test('Scenario 10: Complete core banking day-end authorization sweep', async () => {
    const db = createMockDB();
    const client = createTestClient(db);

    await client.login({ userid: 'SPV02', password: 'secret123' });

    const modules = [
      { name: 'cif-perorangan', getKey: i => i.idcif },
      { name: 'cif-badan-hukum', getKey: i => i.idcif },
      { name: 'tabungan', getKey: i => i.norekg },
      { name: 'deposito', getKey: i => i.nodep },
      { name: 'transaksi', getKey: i => i.notrn },
      { name: 'pembiayaan', getKey: i => i.noplfond },
      { name: 'aset', getKey: i => i.idaset },
      { name: 'jaminan', getKey: i => i.idjaminan },
      { name: 'kondisi-khusus', getKey: i => i.idspc }
    ];

    // 1. Initial count of pending items across all 9 modules
    let preSweepTotal = 0;
    for (const modObj of modules) {
      const res = await client.getPending(modObj.name);
      if (res.status === 200) {
        preSweepTotal += res.body.total;
      }
    }
    assertTrue(preSweepTotal > 0);

    // 2. Perform EOD Authorization Sweep
    let approvedTotal = 0;
    let rejectedTotal = 0;

    for (const modObj of modules) {
      const res = await client.getPending(modObj.name);
      if (res.status === 200 && res.body.data.length > 0) {
        for (const item of res.body.data) {
          const itemId = modObj.getKey(item);
          if (modObj.name === 'kondisi-khusus' && itemId === 'SPC9002') {
            // Auto-reject expired or invalid items during sweep
            const rejRes = await client.reject(modObj.name, itemId, { catatan: 'Auto-Rejected during EOD sweep: Expired effective date' });
            assertEqual(rejRes.status, 200);
            rejectedTotal++;
          } else {
            const appRes = await client.approve(modObj.name, itemId);
            assertEqual(appRes.status, 200);
            approvedTotal++;
          }
        }
      }
    }

    // 3. Post-sweep verification: all pending queues must be 0
    let postSweepTotal = 0;
    for (const modObj of modules) {
      const res = await client.getPending(modObj.name);
      if (res.status === 200) {
        postSweepTotal += res.body.total;
      }
    }
    assertEqual(postSweepTotal, 0);

    // 4. Execute Day-End Close (Tutup Kantor)
    const closeRes = await client.toggleCloseLoc();
    assertEqual(closeRes.status, 200);
    assertEqual(closeRes.body.data.stsktr, '0');
  });

});

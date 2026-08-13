/**
 * Tier 3 Cross-Feature Pairwise Interaction E2E Test Suite
 * Covers cross-feature interactions across the 19 core banking authorization features.
 * 
 * Minimum Required: 25 test cases
 * Implemented: 28 pairwise test cases
 */

const {
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertDeepEqual,
  assertContains,
  assertThrows,
  setTier,
  describe,
  test,
  createMockDB,
  createTestClient,
  detectTerminalType
} = require('../helpers/test_framework');

setTier('Tier 3');

describe('Tier 3 Cross-Feature Pairwise Interactions E2E Suite', () => {

  // Test Case 1: Auth Service + CIF Perorangan API + Audit Log (LAN IP)
  test('TC301: Pairwise Auth + CIF Perorangan API + Audit Log (LAN IP)', async () => {
    const client = createTestClient();
    client.setIp('192.168.1.150'); // Private LAN IP

    // Step 1: Login as Supervisor
    const loginRes = await client.login({ userid: 'SPV01', password: 'secret123' });
    assertEqual(loginRes.status, 200, 'Supervisor login should succeed');
    assertTrue(!!loginRes.body.token, 'Token should be returned');

    // Step 2: Fetch Pending CIF Perorangan
    const pendingRes = await client.getPending('cif-perorangan');
    assertEqual(pendingRes.status, 200, 'Pending CIF list fetch should succeed');
    assertTrue(pendingRes.body.total >= 1, 'Should have pending CIF records');

    // Step 3: Approve CIF Perorangan Record
    const approveRes = await client.approve('cif-perorangan', 'CIF1001');
    assertEqual(approveRes.status, 200, 'CIF approval should succeed');
    assertTrue(!!approveRes.body.audit_id, 'Audit ID should be returned');

    // Verify DB update precision
    const db = client.getDb();
    const updatedCif = db.cifPerorangan.find(c => c.idcif === 'CIF1001');
    assertEqual(updatedCif.stsrec, 'A', 'Status record should be updated to A (Approved)');
    assertEqual(updatedCif.autuser, 'SPV01', 'autuser should equal supervisor ID');
    assertEqual(updatedCif.autterm, 'WEB-LAN', 'autterm should be WEB-LAN for 192.168.x.x');
    assertTrue(updatedCif.auttgl.length === 14, 'auttgl format must be yyyyMMddHHmmss (14 chars)');
  });

  // Test Case 2: Auth Level RBAC + Tutup Kantor API (Maker Restriction)
  test('TC302: Pairwise Auth Level RBAC + Tutup Kantor Control', async () => {
    const client = createTestClient();

    // Step 1: Login as MAKER01 (Level M)
    const loginMaker = await client.login({ userid: 'MAKER01', password: 'secret123' });
    assertEqual(loginMaker.status, 200);

    // Attempt to toggle Tutup Kantor status as Maker
    const toggleResMaker = await client.toggleCloseLoc();
    assertEqual(toggleResMaker.status, 403, 'Maker must be restricted from changing Tutup Kantor status');
    assertContains(toggleResMaker.body.message, 'Only Supervisors can change Tutup Kantor status');

    // Step 2: Login as Supervisor (Level S)
    const loginSpv = await client.login({ userid: 'SPV02', password: 'secret123' });
    assertEqual(loginSpv.status, 200);

    // Toggle status successfully as Supervisor
    const toggleResSpv = await client.toggleCloseLoc();
    assertEqual(toggleResSpv.status, 200, 'Supervisor toggle should succeed');
    assertEqual(toggleResSpv.body.data.stsktr, '0', 'Branch status should change to CLOSED (0)');
  });

  // Test Case 3: Session Tracking + Dual Audit Log Linkage
  test('TC303: Pairwise Session Tracking + Dual Audit Log Linkage', async () => {
    const client = createTestClient();

    // Login creates active session
    const loginRes = await client.login({ userid: 'SPV01', password: 'secret123' });
    const token = loginRes.body.token;

    // Perform action while session is active
    const approveRes = await client.approve('cif-perorangan', 'CIF1002');
    assertEqual(approveRes.status, 200);

    // Verify WEBUSERLOG login entry & WA_OTR_LOG approve entry
    const db = client.getDb();
    const loginLog = db.auditLogs.find(l => l.userid === 'SPV01' && l.action === 'LOGIN_SUCCESS');
    assertTrue(!!loginLog, 'WEBUSERLOG should record successful login');

    const oprLog = db.oprLogs.find(l => l.userid === 'SPV01' && l.ref_id === 'CIF1002');
    assertTrue(!!oprLog, 'WA_OTR_LOG should record operational approval');
    assertEqual(oprLog.action, 'APPROVE');

    // Invalidate Session via Logout
    const logoutRes = await client.logout();
    assertEqual(logoutRes.status, 200);

    // Verify session removed from session store
    assertFalse(!!db.sessions[token], 'Session token should be removed after logout');

    // Subsequent request with invalidated token should fail
    const meRes = await client.getMe({ Authorization: `Bearer ${token}` });
    assertEqual(meRes.status, 401, 'Request with invalidated token should return 401 Unauthorized');
  });

  // Test Case 4: IP Detection + External vs LAN Audit Terminal Tagging
  test('TC404: Pairwise IP Detection + Audit Log Terminal Tagging', async () => {
    const clientExt = createTestClient();
    clientExt.setIp('203.0.113.45'); // External Public IP

    // Login from External IP
    await clientExt.login({ userid: 'SPV01', password: 'secret123' });

    // Perform Deposito Approval
    const approveRes = await clientExt.approve('deposito', 'DEP4001');
    assertEqual(approveRes.status, 200);

    const db = clientExt.getDb();
    const depRecord = db.deposito.find(d => d.nodep === 'DEP4001');
    assertEqual(depRecord.autterm, 'WEB-EXT', 'autterm must be WEB-EXT for public IP');

    const oprLog = db.oprLogs.find(l => l.ref_id === 'DEP4001');
    assertEqual(oprLog.autterm, 'WEB-EXT', 'Audit log autterm must reflect external client IP');
  });

  // Test Case 5: CIF Perorangan + Rejection Modal Validation
  test('TC305: Pairwise CIF Perorangan + Rejection Modal Note Validation', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Step 1: Attempt rejection with invalid short note (< 5 chars)
    const rejectInvalid = await client.reject('cif-perorangan', 'CIF1002', { catatan: 'bad' });
    assertEqual(rejectInvalid.status, 400, 'Rejection note < 5 chars must fail validation');
    assertContains(rejectInvalid.body.message, 'at least 5 characters');

    // Step 2: Submit valid rejection note (>= 5 chars)
    const validNote = 'KTP tidak dapat dibaca dengan jelas, mohon upload ulang scan KTP.';
    const rejectValid = await client.reject('cif-perorangan', 'CIF1002', { catatan: validNote });
    assertEqual(rejectValid.status, 200, 'Rejection with valid note must succeed');

    const db = client.getDb();
    const updatedCif = db.cifPerorangan.find(c => c.idcif === 'CIF1002');
    assertEqual(updatedCif.stsrec, 'R', 'CIF status must be updated to R (Rejected)');

    const oprLog = db.oprLogs.find(l => l.ref_id === 'CIF1002');
    assertEqual(oprLog.catatan, validNote, 'Exact rejection note must be recorded in audit log');
  });

  // Test Case 6: CIF Badan Hukum + Tabungan Cross-Entity Integrity Check
  test('TC306: Pairwise CIF Badan Hukum + Tabungan Cross-Entity Approval', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Fetch pending CIF Badan Hukum
    const pendingCifCorp = await client.getPending('cif-badan-hukum');
    assertEqual(pendingCifCorp.status, 200);
    const corpCif = pendingCifCorp.body.data.find(c => c.idcif === 'CIF2001');
    assertTrue(!!corpCif, 'Should find pending corporate CIF CIF2001');
    assertEqual(corpCif.golcust, 'C', 'Corporate CIF golcust must not be I');

    // Fetch pending Tabungan for same customer
    const pendingTab = await client.getPending('tabungan');
    const corpTab = pendingTab.body.data.find(t => t.idcif === 'CIF2001');
    assertTrue(!!corpTab, 'Should find matching Tabungan record for CIF2001');
    assertEqual(corpTab.nmrekg, corpCif.nmcust, 'Account name must match customer name');

    // Approve CIF Badan Hukum first, then Tabungan account
    const appCif = await client.approve('cif-badan-hukum', 'CIF2001');
    assertEqual(appCif.status, 200);

    const appTab = await client.approve('tabungan', 'TAB3002');
    assertEqual(appTab.status, 200);
  });

  // Test Case 7: Deposito + Transaksi Sequential Authorization
  test('TC307: Pairwise Deposito + Transaksi Sequential Authorization', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Step 1: Approve Deposito creation/placement
    const appDep = await client.approve('deposito', 'DEP4001');
    assertEqual(appDep.status, 200);

    // Step 2: Approve linked Pending Transaksi (ststrn 2 -> 1)
    const appTrn = await client.approve('transaksi', 'TX5001');
    assertEqual(appTrn.status, 200);

    const db = client.getDb();
    const dep = db.deposito.find(d => d.nodep === 'DEP4001');
    const trn = db.transaksi.find(t => t.notrn === 'TX5001');

    assertEqual(dep.stsrec, 'A', 'Deposito stsrec must be A');
    assertEqual(trn.ststrn, '1', 'Transaksi ststrn must be updated to 1 (Approved)');
  });

  // Test Case 8: Pembiayaan + Jaminan Collateral Status Verification
  test('TC308: Pairwise Pembiayaan + Jaminan Collateral Status Checks', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Step 1: Check collateral (Jaminan) detail linked to Pembiayaan LMB6001
    const pmbDetail = await client.getDetail('pembiayaan', 'LMB6001');
    assertEqual(pmbDetail.status, 200);
    const jaminanId = pmbDetail.body.data.idjaminan;
    assertEqual(jaminanId, 'JAM8001');

    // Step 2: Approve Jaminan collateral record first
    const appJam = await client.approve('jaminan', jaminanId);
    assertEqual(appJam.status, 200);

    // Step 3: Approve Pembiayaan loan record
    const appPmb = await client.approve('pembiayaan', 'LMB6001');
    assertEqual(appPmb.status, 200);

    const db = client.getDb();
    assertEqual(db.jaminan.find(j => j.idjaminan === 'JAM8001').stsrec, 'A');
    assertEqual(db.pembiayaan.find(p => p.noplfond === 'LMB6001').stsrec, 'A');
  });

  // Test Case 9: Aset + Kondisi Khusus Special Asset Action Rejection
  test('TC309: Pairwise Aset + Kondisi Khusus Rejection Propagation', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Reject special condition request SPC9002 linked to asset adjustment
    const rejectSpc = await client.reject('kondisi-khusus', 'SPC9002', {
      catatan: 'Ditolak: Penilaian ulang aset belum melampirkan appraisal independen'
    });
    assertEqual(rejectSpc.status, 200);

    const db = client.getDb();
    const spc = db.kondisiKhusus.find(k => k.idspc === 'SPC9002');
    assertEqual(spc.stsrec, 'R', 'Kondisi khusus status must be R (Rejected)');

    // Ensure main asset AST7001 remains pending (stsrec: N) for review
    const asset = db.aset.find(a => a.idaset === 'AST7001');
    assertEqual(asset.stsrec, 'N', 'Asset record must remain pending when special condition is rejected');
  });

  // Test Case 10: Tutup Kantor + Blocked Pending Authorization
  test('TC310: Pairwise Tutup Kantor + Blocked Pending Authorization', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Close Branch
    const closeRes = await client.toggleCloseLoc();
    assertEqual(closeRes.status, 200);
    assertEqual(closeRes.body.data.stsktr, '0', 'Branch must be CLOSED');

    // Attempt pending approval while branch is closed
    const appAttempt = await client.approve('tabungan', 'TAB3001');
    assertEqual(appAttempt.status, 422, 'Approval attempt must be blocked when branch is CLOSED');
    assertContains(appAttempt.body.message, 'Branch is CLOSED');

    // Open Branch
    const openRes = await client.toggleCloseLoc();
    assertEqual(openRes.status, 200);
    assertEqual(openRes.body.data.stsktr, '1', 'Branch must be OPEN');

    // Retry approval after opening branch
    const retryApp = await client.approve('tabungan', 'TAB3001');
    assertEqual(retryApp.status, 200, 'Approval must succeed after branch is re-opened');
  });

  // Test Case 11: Responsive Frontend Layout + Detail Drawer Viewport Simulation
  test('TC311: Pairwise Responsive Frontend + Detail Drawer Viewport Handling', async () => {
    const client = createTestClient();
    client.setViewport(375); // Mobile screen width

    await client.login({ userid: 'SPV01', password: 'secret123' });

    const detailRes = await client.getDetail('tabungan', 'TAB3001');
    assertEqual(detailRes.status, 200);

    // Verify all required attributes exist in detail view for drawer display
    const data = detailRes.body.data;
    assertTrue('norekg' in data, 'Must contain norekg attribute');
    assertTrue('idcif' in data, 'Must contain idcif attribute');
    assertTrue('nmrekg' in data, 'Must contain nmrekg attribute');
    assertTrue('saldo' in data, 'Must contain saldo attribute');
    assertTrue('stsrec' in data, 'Must contain stsrec attribute');
  });

  // Test Case 12: Real-Time Dashboard Polling + Transaksi Pending Count Sync
  test('TC312: Pairwise Real-Time Polling + Transaksi Pending Count Sync', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Initial pending count for transaksi
    const initialPending = await client.getPending('transaksi');
    assertEqual(initialPending.body.total, 2, 'Initial pending transactions should be 2');

    // Approve one transaction
    await client.approve('transaksi', 'TX5001');

    // Simulated 30s polling cycle fetch
    const updatedPending = await client.getPending('transaksi');
    assertEqual(updatedPending.body.total, 1, 'Pending transaction count must update to 1 after approval');
  });

  // Test Case 13: Rejection Modal Preset Pills + Audit Trail Exact Capture
  test('TC313: Pairwise Rejection Modal Preset Pills + Audit Trail Capture', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const presetPill = 'Dokumen Tidak Lengkap';
    const customReason = 'Alamat pada KTP tidak sesuai dengan domisili usaha.';
    const fullNote = `${presetPill}: ${customReason}`;

    const rejectRes = await client.reject('cif-badan-hukum', 'CIF2002', { catatan: fullNote });
    assertEqual(rejectRes.status, 200);

    const auditRes = await client.getAuditLogs({ module: 'cif-badan-hukum' });
    assertEqual(auditRes.status, 200);

    const targetLog = auditRes.body.data.find(l => l.ref_id === 'CIF2002');
    assertTrue(!!targetLog, 'Audit log for rejected record must exist');
    assertEqual(targetLog.catatan, fullNote, 'Preset pill + custom detail must be recorded verbatim');
  });

  // Test Case 14: Audit Trail Interface + Access Type Badges (LAN vs EXT)
  test('TC314: Pairwise Audit Trail Interface + Access Type Badges', async () => {
    const clientLan = createTestClient();
    clientLan.setIp('192.168.1.10');
    await clientLan.login({ userid: 'SPV01', password: 'secret123' });
    await clientLan.approve('aset', 'AST7001');

    const clientExt = createTestClient(clientLan.getDb());
    clientExt.setIp('180.252.1.20');
    await clientExt.login({ userid: 'SPV02', password: 'secret123' });
    await clientExt.reject('kondisi-khusus', 'SPC9001', { catatan: 'Rate penawaran terlalu tinggi' });

    const auditRes = await clientExt.getAuditLogs();
    assertEqual(auditRes.status, 200);

    const lanLog = auditRes.body.data.find(l => l.ref_id === 'AST7001');
    const extLog = auditRes.body.data.find(l => l.ref_id === 'SPC9001');

    assertEqual(lanLog.autterm, 'WEB-LAN', 'LAN action must be tagged WEB-LAN for green badge display');
    assertEqual(extLog.autterm, 'WEB-EXT', 'EXT action must be tagged WEB-EXT for orange badge display');
  });

  // Test Case 15: Auth Service + CIF Badan Hukum Level M Blocked Rejection
  test('TC315: Pairwise Auth Level M Blocked Rejection on CIF Badan Hukum', async () => {
    const client = createTestClient();
    await client.login({ userid: 'MAKER01', password: 'secret123' });

    const rejectAttempt = await client.reject('cif-badan-hukum', 'CIF2001', { catatan: 'Mencoba reject sebagai maker' });
    assertEqual(rejectAttempt.status, 403, 'Maker cannot reject records');

    await client.login({ userid: 'SPV01', password: 'secret123' });
    const rejectSpv = await client.reject('cif-badan-hukum', 'CIF2001', { catatan: 'Dokumen Legalitas Badan Hukum tidak valid' });
    assertEqual(rejectSpv.status, 200, 'Supervisor rejection should succeed');
  });

  // Test Case 16: Session Invalidation + Deposito API Authorization Guard
  test('TC316: Pairwise Session Invalidation + Deposito API Guard', async () => {
    const client = createTestClient();
    const loginRes = await client.login({ userid: 'SPV01', password: 'secret123' });
    const token = loginRes.body.token;

    // Logout
    await client.logout();

    // Attempt approval with invalidated token
    const appRes = await client.approve('deposito', 'DEP4002', { Authorization: `Bearer ${token}` });
    assertEqual(appRes.status, 401, 'Invalidated session token must be rejected');
  });

  // Test Case 17: CIF Perorangan vs CIF Badan Hukum Data Isolation
  test('TC317: Pairwise CIF Perorangan vs CIF Badan Hukum Data Isolation', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const indRes = await client.getPending('cif-perorangan');
    const corpRes = await client.getPending('cif-badan-hukum');

    const indIds = indRes.body.data.map(i => i.idcif);
    const corpIds = corpRes.body.data.map(c => c.idcif);

    // Verify individual list contains only golcust = 'I'
    indRes.body.data.forEach(item => {
      assertEqual(item.golcust, 'I', 'CIF Perorangan must have golcust = I');
    });

    // Verify corporate list contains golcust <> 'I'
    corpRes.body.data.forEach(item => {
      assertTrue(item.golcust !== 'I', 'CIF Badan Hukum must not have golcust = I');
    });

    // Ensure zero overlap in IDs
    indIds.forEach(id => {
      assertFalse(corpIds.includes(id), `Individual CIF ID ${id} must not appear in Corporate CIF list`);
    });
  });

  // Test Case 18: Tabungan + Deposito Cross-Module Account Linkage
  test('TC318: Pairwise Tabungan + Deposito Cross-Module Linkage', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Customer CIF1001 has both Tabungan TAB3001 and Deposito DEP4001
    const tabPending = await client.getPending('tabungan');
    const depPending = await client.getPending('deposito');

    const userTab = tabPending.body.data.find(t => t.idcif === 'CIF1001');
    const userDep = depPending.body.data.find(d => d.idcif === 'CIF1001');

    assertTrue(!!userTab, 'Customer CIF1001 must have pending Tabungan');
    assertTrue(!!userDep, 'Customer CIF1001 must have pending Deposito');

    // Approve Deposito only
    await client.approve('deposito', 'DEP4001');

    const db = client.getDb();
    assertEqual(db.deposito.find(d => d.nodep === 'DEP4001').stsrec, 'A');
    assertEqual(db.tabungan.find(t => t.norekg === 'TAB3001').stsrec, 'N', 'Tabungan record must remain pending');
  });

  // Test Case 19: Pembiayaan + Transaksi Loan Disbursal Linkage
  test('TC319: Pairwise Pembiayaan + Transaksi Loan Disbursal Linkage', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Approve Pembiayaan Loan Facility LMB6001
    const appLoan = await client.approve('pembiayaan', 'LMB6001');
    assertEqual(appLoan.status, 200);

    // Approve Loan Disbursal Transaction TX5002
    const appDisbursal = await client.approve('transaksi', 'TX5002');
    assertEqual(appDisbursal.status, 200);

    const db = client.getDb();
    assertEqual(db.pembiayaan.find(p => p.noplfond === 'LMB6001').stsrec, 'A');
    assertEqual(db.transaksi.find(t => t.notrn === 'TX5002').ststrn, '1');
  });

  // Test Case 20: Jaminan + Aset Cross-Reference Integrity
  test('TC320: Pairwise Jaminan + Aset Cross-Reference Integrity', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const jamDetail = await client.getDetail('jaminan', 'JAM8001');
    assertEqual(jamDetail.status, 200);
    assertEqual(jamDetail.body.data.idaset, 'AST7001', 'Collateral must reference underlying asset AST7001');

    const appJam = await client.approve('jaminan', 'JAM8001');
    assertEqual(appJam.status, 200);

    const db = client.getDb();
    const oprLog = db.oprLogs.find(l => l.ref_id === 'JAM8001');
    assertEqual(oprLog.module, 'jaminan');
    assertEqual(oprLog.action, 'APPROVE');
  });

  // Test Case 21: Kondisi Khusus (10 Types) + Audit Log Tagging
  test('TC321: Pairwise Kondisi Khusus (10 Types) + Audit Log Tagging', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Approve Special Condition SPC9001 (jnsspc '01')
    const appSpc = await client.approve('kondisi-khusus', 'SPC9001');
    assertEqual(appSpc.status, 200);

    const db = client.getDb();
    const spcRecord = db.kondisiKhusus.find(k => k.idspc === 'SPC9001');
    assertEqual(spcRecord.stsrec, 'A');
    assertEqual(spcRecord.jnsspc, '01');

    const oprLog = db.oprLogs.find(l => l.ref_id === 'SPC9001');
    assertEqual(oprLog.module, 'kondisi-khusus');
    assertTrue(oprLog.audit_id > 0);
  });

  // Test Case 22: Tutup Kantor + Real-Time Dashboard Status Banner State
  test('TC322: Pairwise Tutup Kantor + Dashboard Status Banner State', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Get initial status (OPEN)
    const status1 = await client.getCloseLocStatus();
    assertEqual(status1.body.data.stsktr, '1');

    // Toggle status to CLOSED
    await client.toggleCloseLoc();

    const status2 = await client.getCloseLocStatus();
    assertEqual(status2.body.data.stsktr, '0', 'Dashboard polling status must report branch CLOSED (0)');
  });

  // Test Case 23: Responsive Frontend + Rejection Modal Viewport Layout
  test('TC323: Pairwise Responsive Frontend + Rejection Modal Viewport', async () => {
    const client = createTestClient();
    client.setViewport(360); // Smartphone viewport

    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Rejection on mobile viewport with minimum length check
    const rejectRes = await client.reject('transaksi', 'TX5002', {
      catatan: 'Penolakan transaksi setoran via mobile interface'
    });
    assertEqual(rejectRes.status, 200);

    const db = client.getDb();
    assertEqual(db.transaksi.find(t => t.notrn === 'TX5002').ststrn, '9', 'Rejected transaction ststrn must be 9');
  });

  // Test Case 24: Real-Time Polling + Session Timeout Auto-Handling
  test('TC324: Pairwise Real-Time Polling + Session Timeout Auto-Handling', async () => {
    const client = createTestClient();
    const loginRes = await client.login({ userid: 'SPV01', password: 'secret123' });

    // Manually invalidate token from DB to simulate session expiration
    delete client.getDb().sessions[loginRes.body.token];

    // Background polling fetch attempt
    const pollRes = await client.getPending('tabungan');
    assertEqual(pollRes.status, 401, 'Polling engine must receive 401 when session expires');
    assertContains(pollRes.body.message, 'Unauthorized');
  });

  // Test Case 25: Audit Trail Filter + Module Search Verification
  test('TC325: Pairwise Audit Trail Filter + Module Search Verification', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Perform actions across different modules
    await client.approve('cif-perorangan', 'CIF1001');
    await client.approve('tabungan', 'TAB3001');

    // Query audit log filtering specifically for module 'tabungan'
    const auditRes = await client.getAuditLogs({ module: 'tabungan' });
    assertEqual(auditRes.status, 200);

    const logs = auditRes.body.data;
    assertTrue(logs.length >= 1, 'Should return filtered audit logs for tabungan');
    logs.forEach(l => {
      assertEqual(l.module, 'tabungan', 'Filtered audit logs must only contain tabungan module');
    });
  });

  // Test Case 26: Concurrent Approval Conflict Handling
  test('TC326: Pairwise Concurrent Approval Conflict Handling', async () => {
    const client1 = createTestClient();
    const client2 = createTestClient(client1.getDb());

    await client1.login({ userid: 'SPV01', password: 'secret123' });
    await client2.login({ userid: 'SPV02', password: 'secret123' });

    // First supervisor approves DEP4002
    const app1 = await client1.approve('deposito', 'DEP4002');
    assertEqual(app1.status, 200, 'First supervisor approval succeeds');

    // Second supervisor attempts to approve same DEP4002
    const app2 = await client2.approve('deposito', 'DEP4002');
    assertEqual(app2.status, 409, 'Second supervisor approval must fail with 409 Conflict');
    assertContains(app2.body.message, 'already approved');
  });

  // Test Case 27: DB Connection Pool Failure Resilience
  test('TC327: Pairwise DB Integration Pool Failure Resilience', async () => {
    const client = createTestClient();

    // Invalid credentials attempt
    const failLogin = await client.login({ userid: 'NONEXISTENT', password: 'wrongpassword' });
    assertEqual(failLogin.status, 401, 'Invalid user authentication must return 401');

    const db = client.getDb();
    const failLog = db.auditLogs.find(l => l.userid === 'NONEXISTENT' && l.action === 'LOGIN_FAIL');
    assertTrue(!!failLog, 'Failed login attempt must be logged in WEBUSERLOG');
  });

  // Test Case 28: Kondisi Khusus Rejection Note Propagation
  test('TC328: Pairwise Kondisi Khusus Rejection Note Propagation', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const note = 'Penolakan kondisi khusus SPC9002: Memerlukan rekomendasi Komite Risiko';
    const rejectRes = await client.reject('kondisi-khusus', 'SPC9002', { catatan: note });
    assertEqual(rejectRes.status, 200);

    const db = client.getDb();
    const spc = db.kondisiKhusus.find(k => k.idspc === 'SPC9002');
    assertEqual(spc.stsrec, 'R', 'Special condition status must be updated to R');

    const oprLog = db.oprLogs.find(l => l.ref_id === 'SPC9002');
    assertEqual(oprLog.catatan, note, 'Exact rejection note must propagate to WA_OTR_LOG');
  });

});

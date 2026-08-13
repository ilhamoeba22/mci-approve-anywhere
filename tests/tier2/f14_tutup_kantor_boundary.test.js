/**
 * Tier 2 Boundary Tests - Feature 14: Status Tutup Kantor
 * Target: Status Monitoring & Control for TOFCLOSELOC boundary conditions.
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F14: Status Tutup Kantor Boundaries', () => {
  test('TC214-01: Status Tutup Kantor state toggle boundary (OPEN 1 -> CLOSED 0 -> OPEN 1)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Initial status
    const initRes = await client.getCloseLocStatus();
    assertEqual(initRes.body.data.stsktr, '1', 'Initial status should be OPEN (1)');

    // Toggle to CLOSED (0)
    const toggle1 = await client.toggleCloseLoc();
    assertEqual(toggle1.body.data.stsktr, '0', 'After first toggle status should be CLOSED (0)');

    // Toggle back to OPEN (1)
    const toggle2 = await client.toggleCloseLoc();
    assertEqual(toggle2.body.data.stsktr, '1', 'After second toggle status should be OPEN (1)');
  });

  test('TC214-02: Non-existent location code boundary (kdloc: 999)', async () => {
    const db = createMockDB();
    db.closeLoc = { kdloc: '999', stsktr: '1', updated: '20260812' };

    const client = createTestClient(db);
    const res = await client.getCloseLocStatus();
    assertEqual(res.status, 200);
    assertEqual(res.body.data.kdloc, '999', 'Non-existent location code status should be reported gracefully');
  });

  test('TC214-03: Non-numeric location code boundary (kdloc: ABC)', async () => {
    const db = createMockDB();
    db.closeLoc = { kdloc: 'ABC', stsktr: '1', updated: '20260812' };

    const client = createTestClient(db);
    const res = await client.getCloseLocStatus();
    assertEqual(res.status, 200);
    assertEqual(res.body.data.kdloc, 'ABC', 'Alpha location code boundary should not throw runtime error');
  });

  test('TC214-04: Block pending approval operations when Tutup Kantor active (stsktr=0)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Close branch
    await client.toggleCloseLoc();

    // Attempt approval while branch is closed
    const appRes = await client.approve('cif_perorangan', 'CIF1001');
    assertEqual(appRes.status, 422, 'Approval attempt when branch is CLOSED must be blocked with HTTP 422');
  });

  test('TC214-05: Headquarters location code 000 boundary condition', async () => {
    const db = createMockDB();
    db.closeLoc = { kdloc: '000', stsktr: '1', updated: '20260812' };

    const client = createTestClient(db);
    const res = await client.getCloseLocStatus();
    assertEqual(res.status, 200);
    assertEqual(res.body.data.kdloc, '000', 'Headquarters location code 000 should be valid');
  });
});

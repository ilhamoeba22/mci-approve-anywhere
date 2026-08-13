/**
 * Tier 2 Boundary Tests - Feature 06: CIF Badan Hukum API
 * Target: Pending list, Detail, Approve & Reject boundary conditions for mCIF (golcust<>'I').
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F06: CIF Badan Hukum Otorisasi Boundaries', () => {
  test('TC206-01: Empty pending list boundary for Corporate CIF', async () => {
    const db = createMockDB();
    db.cifBadanHukum.forEach(c => { c.stsrec = 'A'; });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getPending('cif_badan_hukum');
    assertEqual(res.status, 200);
    assertEqual(res.body.total, 0, 'Total pending corporate CIF items should be 0');
  });

  test('TC206-02: Non-existent corporate CIF record lookup boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getDetail('cif_badan_hukum', 'CIF2999_NONEXISTENT');
    assertEqual(res.status, 404, 'Non-existent corporate CIF should return 404');
  });

  test('TC206-03: Rejection note 4-char error vs 5-char success boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // 4-char fail
    const resFail = await client.reject('cif_badan_hukum', 'CIF2001', { catatan: 'NOTE' });
    assertEqual(resFail.status, 400, '4-char note should fail');

    // 5-char success
    const resPass = await client.reject('cif_badan_hukum', 'CIF2001', { catatan: 'NOTES' });
    assertEqual(resPass.status, 200, '5-char note should pass');
  });

  test('TC206-04: Rejection note max string length boundary (500 chars)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const maxNote = 'B'.repeat(500);
    const res = await client.reject('cif_badan_hukum', 'CIF2002', { catatan: maxNote });
    assertEqual(res.status, 200, '500-char note for corporate CIF should succeed');
  });

  test('TC206-05: Double approval / state conflict boundary on already approved record', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // First approval
    const app1 = await client.approve('cif_badan_hukum', 'CIF2001');
    assertEqual(app1.status, 200);

    // Second approval attempt on same record
    const app2 = await client.approve('cif_badan_hukum', 'CIF2001');
    assertEqual(app2.status, 409, 'Re-approving an already approved record must return 409 Conflict');
  });
});

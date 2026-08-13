/**
 * Tier 2 Boundary Tests - Feature 12: Jaminan API
 * Target: Pending list, Detail, Approve & Reject boundary conditions for TOFJAMIN.
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F12: Jaminan Otorisasi Boundaries', () => {
  test('TC212-01: Empty pending list boundary for Jaminan', async () => {
    const db = createMockDB();
    db.jaminan.forEach(j => { j.stsrec = 'A'; });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getPending('jaminan');
    assertEqual(res.status, 200);
    assertEqual(res.body.total, 0, 'Pending collateral count should be 0');
  });

  test('TC212-02: Non-existent collateral ID lookup boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getDetail('jaminan', 'JAM9999_NONEXISTENT');
    assertEqual(res.status, 404, 'Non-existent collateral should return 404');
  });

  test('TC212-03: Rejection note 4-char error vs 5-char success boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res4 = await client.reject('jaminan', 'JAM8001', { catatan: 'JAM' });
    assertEqual(res4.status, 400, 'Rejection note <5 chars should fail');

    const res5 = await client.reject('jaminan', 'JAM8001', { catatan: 'JAMIN' });
    assertEqual(res5.status, 200, 'Rejection note >=5 chars should succeed');
  });

  test('TC212-04: Rejection note max string length boundary (500 chars)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const maxNote = 'J'.repeat(500);
    const res = await client.reject('jaminan', 'JAM8001', { catatan: maxNote });
    assertEqual(res.status, 200, '500-char note for Jaminan should succeed');
  });

  test('TC212-05: Invalid collateral classification type code boundary', async () => {
    const db = createMockDB();
    db.jaminan.push({
      idjaminan: 'JAM8002_INVALID_TYPE',
      idaset: 'AST7001',
      nmjaminan: 'Invalid Type Test',
      jnsjamin: 'INVALID_99',
      nilai: 50000000,
      stsrec: 'N'
    });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const detailRes = await client.getDetail('jaminan', 'JAM8002_INVALID_TYPE');
    assertEqual(detailRes.status, 200);
    assertEqual(detailRes.body.data.jnsjamin, 'INVALID_99', 'Collateral type boundary value should be stored safely');
  });
});

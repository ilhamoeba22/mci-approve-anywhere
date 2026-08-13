/**
 * Tier 2 Boundary Tests - Feature 11: Aset API
 * Target: Pending list, Detail, Approve & Reject boundary conditions for TOFASET.
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F11: Aset Otorisasi Boundaries', () => {
  test('TC211-01: Empty pending list boundary for Aset', async () => {
    const db = createMockDB();
    db.aset.forEach(a => { a.stsrec = 'A'; });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getPending('aset');
    assertEqual(res.status, 200);
    assertEqual(res.body.total, 0, 'Pending asset count should be 0');
  });

  test('TC211-02: Non-existent asset ID lookup boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getDetail('aset', 'AST9999_NONEXISTENT');
    assertEqual(res.status, 404, 'Non-existent asset should return 404');
  });

  test('TC211-03: Rejection note 4-char error vs 5-char success boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res4 = await client.reject('aset', 'AST7001', { catatan: 'ASET' });
    assertEqual(res4.status, 400, 'Rejection note <5 chars should fail');

    const res5 = await client.reject('aset', 'AST7001', { catatan: 'ASETS' });
    assertEqual(res5.status, 200, 'Rejection note >=5 chars should succeed');
  });

  test('TC211-04: Rejection note max string length boundary (500 chars)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const maxNote = 'A'.repeat(500);
    const res = await client.reject('aset', 'AST7001', { catatan: maxNote });
    assertEqual(res.status, 200, '500-char note for Aset should succeed');
  });

  test('TC211-05: Zero asset value boundary handling', async () => {
    const db = createMockDB();
    db.aset.push({
      idaset: 'AST7002_ZERO',
      nmaset: 'Zero Value Asset Test',
      nilai: 0,
      stsrec: 'N'
    });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const detailRes = await client.getDetail('aset', 'AST7002_ZERO');
    assertEqual(detailRes.status, 200);
    assertEqual(detailRes.body.data.nilai, 0, 'Asset with zero value should be handled safely');
  });
});

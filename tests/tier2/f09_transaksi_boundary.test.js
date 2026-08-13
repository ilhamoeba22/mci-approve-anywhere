/**
 * Tier 2 Boundary Tests - Feature 09: Transaksi API
 * Target: Pending list, Detail, Approve & Reject boundary conditions for TOFTRNC (ststrn 2/6 -> 1/9).
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F09: Transaksi Otorisasi Boundaries', () => {
  test('TC209-01: Empty pending list boundary for Transaksi', async () => {
    const db = createMockDB();
    // Mark all transactions approved ('1') or rejected ('9')
    db.transaksi.forEach(t => { t.ststrn = '1'; });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getPending('transaksi');
    assertEqual(res.status, 200);
    assertEqual(res.body.total, 0, 'Pending transactions count should be 0');
  });

  test('TC209-02: Non-existent transaction ID lookup boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getDetail('transaksi', 'TX9999_NONEXISTENT');
    assertEqual(res.status, 404, 'Non-existent transaction should return 404');
  });

  test('TC209-03: Rejection note 4-char error vs 5-char success boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res4 = await client.reject('transaksi', 'TX5001', { catatan: 'TX1' });
    assertEqual(res4.status, 400, 'Rejection note <5 chars should fail');

    const res5 = await client.reject('transaksi', 'TX5001', { catatan: 'REJ55' });
    assertEqual(res5.status, 200, 'Rejection note >=5 chars should succeed');
  });

  test('TC209-04: Rejection note max string length boundary (500 chars)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const maxNote = 'X'.repeat(500);
    const res = await client.reject('transaksi', 'TX5002', { catatan: maxNote });
    assertEqual(res.status, 200, '500-char note for Transaksi should succeed');
  });

  test('TC209-05: Transaction status code transition boundary (ststrn 2/6 -> 1/9)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    // Approve TX5001 (ststrn 2 -> 1)
    const appRes = await client.approve('transaksi', 'TX5001');
    assertEqual(appRes.status, 200);

    const detailApp = await client.getDetail('transaksi', 'TX5001');
    assertEqual(detailApp.body.data.ststrn, '1', 'Transaction ststrn should transition to "1" on approve');

    // Reject TX5002 (ststrn 6 -> 9)
    const rejRes = await client.reject('transaksi', 'TX5002', { catatan: 'Rejection reason' });
    assertEqual(rejRes.status, 200);

    const detailRej = await client.getDetail('transaksi', 'TX5002');
    assertEqual(detailRej.body.data.ststrn, '9', 'Transaction ststrn should transition to "9" on reject');
  });
});

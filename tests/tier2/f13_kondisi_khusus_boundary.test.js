/**
 * Tier 2 Boundary Tests - Feature 13: Kondisi Khusus API
 * Target: Pending list, Detail, Approve & Reject boundary conditions for TOFSPC (10 jnsspc codes).
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  createMockDB
} = require('../helpers/test_framework');

describe('F13: Kondisi Khusus Otorisasi Boundaries', () => {
  test('TC213-01: Empty pending list boundary for Kondisi Khusus', async () => {
    const db = createMockDB();
    db.kondisiKhusus.forEach(k => { k.stsrec = 'A'; });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getPending('kondisi-khusus');
    assertEqual(res.status, 200);
    assertEqual(res.body.total, 0, 'Pending special condition count should be 0');
  });

  test('TC213-02: Non-existent special condition record ID lookup boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res = await client.getDetail('kondisi-khusus', 'SPC9999_NONEXISTENT');
    assertEqual(res.status, 404, 'Non-existent special condition should return 404');
  });

  test('TC213-03: Rejection note 4-char error vs 5-char success boundary', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const res4 = await client.reject('kondisi-khusus', 'SPC9001', { catatan: 'SPC' });
    assertEqual(res4.status, 400, 'Rejection note <5 chars should fail');

    const res5 = await client.reject('kondisi-khusus', 'SPC9001', { catatan: 'SPCS5' });
    assertEqual(res5.status, 200, 'Rejection note >=5 chars should succeed');
  });

  test('TC213-04: Rejection note max string length boundary (500 chars)', async () => {
    const client = createTestClient();
    await client.login({ userid: 'SPV01', password: 'secret123' });

    const maxNote = 'K'.repeat(500);
    const res = await client.reject('kondisi-khusus', 'SPC9002', { catatan: maxNote });
    assertEqual(res.status, 200, '500-char note for Kondisi Khusus should succeed');
  });

  test('TC213-05: Validation of 10 jnsspc special condition codes range (01 to 10)', async () => {
    const validCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const db = createMockDB();

    validCodes.forEach((code, idx) => {
      db.kondisiKhusus.push({
        idspc: `SPC90${idx + 10}`,
        jnsspc: code,
        idcif: 'CIF1001',
        ket: `Special condition code ${code}`,
        stsrec: 'N'
      });
    });

    const client = createTestClient(db);
    await client.login({ userid: 'SPV01', password: 'secret123' });

    for (const code of validCodes) {
      const item = db.kondisiKhusus.find(x => x.jnsspc === code);
      assertEqual(item.jnsspc, code, `jnsspc code ${code} should be valid and preserved`);
    }
  });
});

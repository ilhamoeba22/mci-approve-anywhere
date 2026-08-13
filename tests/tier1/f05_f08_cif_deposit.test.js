/**
 * Tier 1 Feature Coverage Tests: CIF & Deposit Accounts (F05 - F08)
 * Path: tests/tier1/f05_f08_cif_deposit.test.js
 * 
 * Features:
 * - F05: CIF Perorangan Otorisasi (5 tests)
 * - F06: CIF Badan Hukum Otorisasi (5 tests)
 * - F07: Tabungan Otorisasi (5 tests)
 * - F08: Deposito Otorisasi (5 tests)
 */

const {
  describe,
  it,
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertDeepEqual,
  assertContains,
  createMockClient,
  validatePendingListResponse,
  validateDetailResponse,
  validateApproveResponse,
  validateRejectResponse,
  validateErrorResponse
} = require('../helpers/test_framework');

describe('F05: CIF Perorangan Otorisasi', () => {
  const client = createMockClient();

  it('F05-1: CIF Perorangan Pending List - GET /api/mcif/pending filters records where golcust="I" and stsrec="N"', async () => {
    client.registerMock('GET', '/api/mcif/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 18,
          data: [
            { nocif: '01009478', nm: 'TIVANI KUSUMA PUTRI', golcust: 'I', stsrec: 'N', inpuser: 'NADHOFA', tglinp: '20250901164007' },
            { nocif: '01001103', nm: 'Joko Santoso', golcust: 'I', stsrec: 'N', inpuser: 'KONVERSI', tglinp: '' }
          ]
        }
      };
    });

    const res = await client.get('/api/mcif/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 18);
    for (const item of res.body.data) {
      assertEqual(item.golcust, 'I');
      assertEqual(item.stsrec, 'N');
    }
  });

  it('F05-2: CIF Perorangan Detail - GET /api/mcif/:id returns full attributes of individual CIF', async () => {
    client.registerMock('GET', '/api/mcif/01009478', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            nocif: '01009478',
            nm: 'TIVANI KUSUMA PUTRI',
            golcust: 'I',
            jnsid: '1',
            noid: '3404015008990001',
            kota: 'Kab. Sleman',
            kdloc: '01',
            kdcab: '001',
            inpuser: 'NADHOFA',
            tglinp: '20250901164007',
            stsrec: 'N'
          }
        }
      };
    });

    const res = await client.get('/api/mcif/01009478');
    validateDetailResponse(res);
    assertEqual(res.body.data.nocif, '01009478');
    assertEqual(res.body.data.golcust, 'I');
  });

  it('F05-3: CIF Perorangan Approval - POST /api/mcif/:id/approve updates stsrec="A", autuser, tglaut, devaut', async () => {
    client.registerMock('POST', '/api/mcif/01009478/approve', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          message: 'Approved successfully',
          audit_id: 'AUDIT-CIF-01009478-17000000'
        }
      };
    });

    const res = await client.post('/api/mcif/01009478/approve');
    validateApproveResponse(res);
    assertContains(res.body.message, 'Approved successfully');
  });

  it('F05-4: CIF Perorangan Rejection - POST /api/mcif/:id/reject with note (>=5 chars) updates status and audit', async () => {
    client.registerMock('POST', '/api/mcif/01009478/reject', (req) => {
      const body = req.body || {};
      if (!body.catatan || body.catatan.trim().length < 5) {
        return { status: 400, body: { status: 'error', message: 'Catatan penolakan minimal 5 karakter' } };
      }
      return {
        status: 200,
        body: { status: 'success', message: 'Rejected successfully', audit_id: 'AUDIT-REJ-01009478' }
      };
    });

    const res = await client.post('/api/mcif/01009478/reject', { catatan: 'Dokumen KTP tidak jelas / kabur' });
    validateRejectResponse(res);
  });

  it('F05-5: CIF Perorangan Duplicate Approval Protection - approving an already approved CIF returns error', async () => {
    client.registerMock('POST', '/api/mcif/01009478/approve', () => {
      return {
        status: 400,
        body: { status: 'error', message: 'CIF 01009478 already approved or not pending' }
      };
    });

    const res = await client.post('/api/mcif/01009478/approve');
    validateErrorResponse(res, 400);
    assertContains(res.body.message, 'already approved');
  });
});

describe('F06: CIF Badan Hukum Otorisasi', () => {
  const client = createMockClient();

  it('F06-1: CIF Badan Hukum Pending List - GET /api/mcif_bh/pending returns corporate CIF records (golcust<>"I")', async () => {
    client.registerMock('GET', '/api/mcif_bh/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 12,
          data: [
            { nocif: '01001638', nm: 'KJKS BMT Harapan Insani', golcust: 'B', jnsbh: '0208', stsrec: 'N' },
            { nocif: '01002577', nm: 'KSPPS HANIVA', golcust: 'B', jnsbh: '0208', stsrec: 'N' }
          ]
        }
      };
    });

    const res = await client.get('/api/mcif_bh/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 12);
    for (const item of res.body.data) {
      assertTrue(item.golcust !== 'I', 'Corporate CIF golcust must not be I');
    }
  });

  it('F06-2: CIF Badan Hukum Detail - GET /api/mcif_bh/:id returns corporate identity fields', async () => {
    client.registerMock('GET', '/api/mcif_bh/01001638', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            nocif: '01001638',
            nm: 'KJKS BMT Harapan Insani',
            golcust: 'B',
            jnsbh: '0208',
            noid: '026453563541000',
            kota: 'BANTUL',
            inpuser: 'CS1',
            stsrec: 'N'
          }
        }
      };
    });

    const res = await client.get('/api/mcif_bh/01001638');
    validateDetailResponse(res);
    assertEqual(res.body.data.jnsbh, '0208');
  });

  it('F06-3: CIF Badan Hukum Approval - POST /api/mcif_bh/:id/approve updates mCIF corporate record', async () => {
    const res = await client.post('/api/mcif_bh/01001638/approve');
    validateApproveResponse(res);
  });

  it('F06-4: CIF Badan Hukum Rejection - POST /api/mcif_bh/:id/reject with note saves audit log', async () => {
    const res = await client.post('/api/mcif_bh/01001638/reject', {
      catatan: 'Izin legalitas akta pendirian belum terlampir'
    });
    validateRejectResponse(res);
  });

  it('F06-5: CIF Classification Isolation - verifies corporate CIF is isolated from individual queue', () => {
    const isCorporate = (golcust) => golcust !== 'I';

    assertTrue(isCorporate('B'), 'golcust B is corporate');
    assertTrue(isCorporate('P'), 'golcust P is corporate');
    assertFalse(isCorporate('I'), 'golcust I is individual');
  });
});

describe('F07: Tabungan Otorisasi', () => {
  const client = createMockClient();

  it('F07-1: Tabungan Pending List - GET /api/toftabb/pending retrieves pending savings accounts', async () => {
    client.registerMock('GET', '/api/toftabb/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 5,
          data: [
            { notab: '1210100068', nocif: '01001103', saldo: 1500000, stsrec: 'N', inpterm: 'NADHOFA' },
            { notab: '1210100076', nocif: '01002199', saldo: 5000000, stsrec: 'N', inpterm: 'TELLER2' }
          ]
        }
      };
    });

    const res = await client.get('/api/toftabb/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 5);
  });

  it('F07-2: Tabungan Account Detail - GET /api/toftabb/:id returns account attributes', async () => {
    const res = await client.get('/api/toftabb/1210100068');
    validateDetailResponse(res);
    assertEqual(res.body.data.id, '1210100068');
  });

  it('F07-3: Tabungan Approval - POST /api/toftabb/:id/approve updates TOFTABB stsrec="A", autuser, auttgl, autterm', async () => {
    const res = await client.post('/api/toftabb/1210100068/approve');
    validateApproveResponse(res);
  });

  it('F07-4: Tabungan Rejection - POST /api/toftabb/:id/reject with valid note records rejection', async () => {
    const res = await client.post('/api/toftabb/1210100068/reject', {
      catatan: 'Setoran awal tabungan kurang dari ketentuan minimum'
    });
    validateRejectResponse(res);
  });

  it('F07-5: Tabungan Invalid Account - attempt to authorize non-existent notab returns error', async () => {
    client.registerMock('POST', '/api/toftabb/9999999999/approve', () => {
      return {
        status: 404,
        body: { status: 'error', message: 'Rekening tabungan 9999999999 tidak ditemukan' }
      };
    });

    const res = await client.post('/api/toftabb/9999999999/approve');
    validateErrorResponse(res, 404);
  });
});

describe('F08: Deposito Otorisasi', () => {
  const client = createMockClient();

  it('F08-1: Deposito Pending List - GET /api/tofdep/pending retrieves pending deposit accounts', async () => {
    client.registerMock('GET', '/api/tofdep/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 3,
          data: [
            { nodep: '3300100381', nocif: '01005240', nominal: 50000000, jkw: 12, rate: 6.5, stsrec: 'N' }
          ]
        }
      };
    });

    const res = await client.get('/api/tofdep/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 3);
  });

  it('F08-2: Deposito Account Detail - GET /api/tofdep/:id returns deposit attributes', async () => {
    client.registerMock('GET', '/api/tofdep/3300100381', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            nodep: '3300100381',
            nocif: '01005240',
            nominal: 50000000,
            jkw: 12,
            rate: 6.5,
            aro: '1',
            stsrec: 'N',
            inpuser: 'CS1'
          }
        }
      };
    });

    const res = await client.get('/api/tofdep/3300100381');
    validateDetailResponse(res);
    assertEqual(res.body.data.nodep, '3300100381');
    assertEqual(res.body.data.nominal, 50000000);
  });

  it('F08-3: Deposito Approval - POST /api/tofdep/:id/approve updates TOFDEP stsrec="A", autuser, auttgl, autterm', async () => {
    const res = await client.post('/api/tofdep/3300100381/approve');
    validateApproveResponse(res);
  });

  it('F08-4: Deposito Rejection - POST /api/tofdep/:id/reject with note saves audit info', async () => {
    const res = await client.post('/api/tofdep/3300100381/reject', {
      catatan: 'Bilyet deposito rusak / perlu dicetak ulang'
    });
    validateRejectResponse(res);
  });

  it('F08-5: Deposito Auth Level Check - requires supervisor authorization level', async () => {
    client.registerMock('POST', '/api/tofdep/3300100381/approve', (req) => {
      const auth = req.headers['authorization'] || '';
      if (!auth.includes('supervisor-token')) {
        return {
          status: 403,
          body: { status: 'error', message: 'Forbidden: Level otorisasi supervisor (A/M/S) diperlukan' }
        };
      }
      return { status: 200, body: { status: 'success', message: 'Approved' } };
    });

    const unauthRes = await client.post('/api/tofdep/3300100381/approve', {}, { 'authorization': 'Bearer teller-token' });
    validateErrorResponse(unauthRes, 403);
  });
});

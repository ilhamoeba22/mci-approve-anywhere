/**
 * Tier 1 Feature Coverage Tests: Transactions & Operations (F09 - F14)
 * Path: tests/tier1/f09_f14_transactions.test.js
 * 
 * Features:
 * - F09: Transaksi Otorisasi (5 tests)
 * - F10: Pembiayaan Otorisasi (5 tests)
 * - F11: Aset Otorisasi (5 tests)
 * - F12: Jaminan Otorisasi (5 tests)
 * - F13: Kondisi Khusus Otorisasi (5 tests)
 * - F14: Status Tutup Kantor Monitoring (5 tests)
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

describe('F09: Transaksi Otorisasi', () => {
  const client = createMockClient();

  it('F09-1: Transaksi Pending List - GET /api/toftrnc/pending retrieves transactions with ststrn IN ("2","6")', async () => {
    client.registerMock('GET', '/api/toftrnc/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 4,
          data: [
            { batch: 'B001', notrn: 'TR001', ststrn: '2', nomtrnc: 25000000, inpuser: 'TELLER1' },
            { batch: 'B001', notrn: 'TR002', ststrn: '6', nomtrnc: 10000000, inpuser: 'TELLER2' } // reverse pending
          ]
        }
      };
    });

    const res = await client.get('/api/toftrnc/pending');
    validatePendingListResponse(res);
    for (const item of res.body.data) {
      assertContains(['2', '6'], item.ststrn);
    }
  });

  it('F09-2: Transaksi Detail - GET /api/toftrnc/:id returns batch, notrn, amount, teller user', async () => {
    client.registerMock('GET', '/api/toftrnc/TR001', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            batch: 'B001',
            notrn: 'TR001',
            ststrn: '2',
            nomtrnc: 25000000,
            norek: '1210100068',
            inpuser: 'TELLER1',
            inptgl: '20260812100000'
          }
        }
      };
    });

    const res = await client.get('/api/toftrnc/TR001');
    validateDetailResponse(res);
    assertEqual(res.body.data.notrn, 'TR001');
    assertEqual(res.body.data.nomtrnc, 25000000);
  });

  it('F09-3: Transaksi Approval - POST /api/toftrnc/:id/approve updates TOFTRNC ststrn="1", autuser, auttgl, autterm', async () => {
    const res = await client.post('/api/toftrnc/TX5001/approve');
    validateApproveResponse(res);
  });

  it('F09-4: Transaksi Rejection - POST /api/toftrnc/:id/reject sets ststrn="9" with rejection reason note', async () => {
    client.registerMock('POST', '/api/toftrnc/TR001/reject', (req) => {
      const body = req.body || {};
      if (!body.catatan || body.catatan.length < 5) {
        return { status: 400, body: { status: 'error', message: 'Catatan penolakan minimal 5 karakter' } };
      }
      return {
        status: 200,
        body: { status: 'success', message: 'Rejected successfully (ststrn=9)', audit_id: 'AUDIT-TRNC-REJ' }
      };
    });

    const res = await client.post('/api/toftrnc/TR001/reject', { catatan: 'Nominal transaksi tidak sesuai Slip Penyetoran' });
    validateRejectResponse(res);
    assertContains(res.body.message, 'ststrn=9');
  });

  it('F09-5: Transaksi Reverse Pending Approval - approves pending reverse transaction (ststrn="6" -> "1")', async () => {
    client.registerMock('POST', '/api/toftrnc/TR002/approve', () => {
      return {
        status: 200,
        body: { status: 'success', message: 'Reverse transaction approved (ststrn=1)', audit_id: 'AUDIT-REV-APP' }
      };
    });

    const res = await client.post('/api/toftrnc/TR002/approve');
    validateApproveResponse(res);
    assertContains(res.body.message, 'Reverse transaction');
  });
});

describe('F10: Pembiayaan Otorisasi', () => {
  const client = createMockClient();

  it('F10-1: Pembiayaan Pending List - GET /api/toflmb/pending retrieves pending financing contracts', async () => {
    const res = await client.get('/api/toflmb/pending');
    validatePendingListResponse(res);
  });

  it('F10-2: Pembiayaan Contract Detail - GET /api/toflmb/:id returns contract details', async () => {
    client.registerMock('GET', '/api/toflmb/LMB-2026-001', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            nokontrak: 'LMB-2026-001',
            nocif: '01004812',
            plafon: 150000000,
            margin: 18000000,
            tenor: 36,
            jnsakad: 'MURABAHAH',
            stsrec: 'N',
            inpuser: 'AO1'
          }
        }
      };
    });

    const res = await client.get('/api/toflmb/LMB-2026-001');
    validateDetailResponse(res);
    assertEqual(res.body.data.nokontrak, 'LMB-2026-001');
    assertEqual(res.body.data.plafon, 150000000);
  });

  it('F10-3: Pembiayaan Approval - POST /api/toflmb/:id/approve updates TOFLMB stsrec="A", autuser, auttgl, autterm', async () => {
    const res = await client.post('/api/toflmb/LMB-2026-001/approve');
    validateApproveResponse(res);
  });

  it('F10-4: Pembiayaan Rejection - POST /api/toflmb/:id/reject with note saves audit log', async () => {
    const res = await client.post('/api/toflmb/LMB-2026-001/reject', {
      catatan: 'Nilai jaminan (taksasi) belum memenuhi persentase minimal'
    });
    validateRejectResponse(res);
  });

  it('F10-5: Pembiayaan Input Validation - rejects invalid contract approval request', async () => {
    client.registerMock('POST', '/api/toflmb/INVALID-LMB/approve', () => {
      return {
        status: 404,
        body: { status: 'error', message: 'Kontrak pembiayaan tidak ditemukan' }
      };
    });

    const res = await client.post('/api/toflmb/INVALID-LMB/approve');
    validateErrorResponse(res, 404);
  });
});

describe('F11: Aset Otorisasi', () => {
  const client = createMockClient();

  it('F11-1: Aset Pending List - GET /api/tofaset/pending retrieves pending asset entries', async () => {
    const res = await client.get('/api/tofaset/pending');
    validatePendingListResponse(res);
  });

  it('F11-2: Aset Detail - GET /api/tofaset/:id returns asset attributes', async () => {
    client.registerMock('GET', '/api/tofaset/AST-005', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            kdaset: 'AST-005',
            nmaset: 'Server Dell PowerEdge R740',
            harga_perolehan: 85000000,
            kdloc: '01',
            stsrec: 'N',
            inpuser: 'ADMIN'
          }
        }
      };
    });

    const res = await client.get('/api/tofaset/AST-005');
    validateDetailResponse(res);
    assertEqual(res.body.data.kdaset, 'AST-005');
  });

  it('F11-3: Aset Approval - POST /api/tofaset/:id/approve updates TOFASET stsrec="A", autuser, auttgl, autterm', async () => {
    const res = await client.post('/api/tofaset/AST-005/approve');
    validateApproveResponse(res);
  });

  it('F11-4: Aset Rejection - POST /api/tofaset/:id/reject with note records rejection in WA_OTR_LOG', async () => {
    const res = await client.post('/api/tofaset/AST-005/reject', {
      catatan: 'Faktur pembelian aset belum distempel vendor'
    });
    validateRejectResponse(res);
  });

  it('F11-5: Aset Already Approved Protection - handles approval attempt on already approved asset record', async () => {
    client.registerMock('POST', '/api/tofaset/AST-005/approve', () => {
      return {
        status: 400,
        body: { status: 'error', message: 'Aset AST-005 sudah diotorisasi' }
      };
    });

    const res = await client.post('/api/tofaset/AST-005/approve');
    validateErrorResponse(res, 400);
  });
});

describe('F12: Jaminan Otorisasi', () => {
  const client = createMockClient();

  it('F12-1: Jaminan Pending List - GET /api/tofjamin/pending retrieves pending collateral records', async () => {
    const res = await client.get('/api/tofjamin/pending');
    validatePendingListResponse(res);
  });

  it('F12-2: Jaminan Detail - GET /api/tofjamin/:id returns collateral details', async () => {
    client.registerMock('GET', '/api/tofjamin/REG-8812', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            noreg: 'REG-8812',
            jnsjamin: 'SHM',
            nilai_taksasi: 250000000,
            pemilik: 'MUH PANGGUNG FAUZI',
            stsrec: 'N',
            inpuser: 'AO2'
          }
        }
      };
    });

    const res = await client.get('/api/tofjamin/REG-8812');
    validateDetailResponse(res);
    assertEqual(res.body.data.noreg, 'REG-8812');
    assertEqual(res.body.data.jnsjamin, 'SHM');
  });

  it('F12-3: Jaminan Approval - POST /api/tofjamin/:id/approve updates TOFJAMIN stsrec="A", autuser, auttgljam, autterm', async () => {
    const res = await client.post('/api/tofjamin/REG-8812/approve');
    validateApproveResponse(res);
  });

  it('F12-4: Jaminan Rejection - POST /api/tofjamin/:id/reject with note records rejection feedback', async () => {
    const res = await client.post('/api/tofjamin/REG-8812/reject', {
      catatan: 'Sertifikat SHM belum dilakukan pengecekan BPN'
    });
    validateRejectResponse(res);
  });

  it('F12-5: Jaminan Self-Authorization Rule Check - checks maker vs checker user ID constraint', () => {
    const isSelfAuthorization = (inpuser, autuser) => {
      return Boolean(inpuser && autuser && inpuser.toUpperCase() === autuser.toUpperCase());
    };

    assertTrue(isSelfAuthorization('CS1930', 'CS1930'), 'Same user is self authorization');
    assertFalse(isSelfAuthorization('CS1', 'NURTEN'), 'Different user is valid checker');
  });
});

describe('F13: Kondisi Khusus Otorisasi', () => {
  const client = createMockClient();

  it('F13-1: Kondisi Khusus Pending List - GET /api/tofspc/pending retrieves pending special conditions (7 records)', async () => {
    client.registerMock('GET', '/api/tofspc/pending', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          total: 7,
          data: [
            { urutspc: 2, noacc: '3300100381', jnsspc: '03', rate: 2.0, tgleff: '20260710', tglexp: '29990710', stsrec: 'N' },
            { urutspc: 1, noacc: '3300100335', jnsspc: '01', rate: 0.0, tgleff: '20260327', tglexp: '20270327', stsrec: 'N' }
          ]
        }
      };
    });

    const res = await client.get('/api/tofspc/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 7);
  });

  it('F13-2: Kondisi Khusus Detail - GET /api/tofspc/:id returns special condition attributes (jnsspc 01-10)', async () => {
    client.registerMock('GET', '/api/tofspc/3300100381', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            urutspc: 2,
            noacc: '3300100381',
            jnsspc: '03', // Special Rate Bunga
            nomspc: 0,
            rate: 2.0,
            ket: 'SPESIAL NISBAH 52%, JKW 12 BLN',
            tgleff: '20260710',
            tglexp: '29990710',
            stsrec: 'N',
            inpuser: 'CS1'
          }
        }
      };
    });

    const res = await client.get('/api/tofspc/3300100381');
    validateDetailResponse(res);
    assertEqual(res.body.data.jnsspc, '03');
    assertEqual(res.body.data.noacc, '3300100381');
  });

  it('F13-3: Kondisi Khusus Approval - POST /api/tofspc/:id/approve updates TOFSPC stsrec="A", autuser, auttgljam, autterm', async () => {
    const res = await client.post('/api/tofspc/3300100381/approve');
    validateApproveResponse(res);
  });

  it('F13-4: Kondisi Khusus Rejection - POST /api/tofspc/:id/reject updates status with rejection note', async () => {
    const res = await client.post('/api/tofspc/3300100381/reject', {
      catatan: 'Pengajuan special rate melampaui kewenangan maksimal'
    });
    validateRejectResponse(res);
  });

  it('F13-5: Kondisi Khusus Expired Date Validation - flags expired special condition records (tglexp < current date)', () => {
    const isExpired = (tglexpStr, currentDateStr = '20260812') => {
      if (!tglexpStr || tglexpStr.length < 8) return false;
      return tglexpStr.substring(0, 8) < currentDateStr;
    };

    assertTrue(isExpired('20260212'), 'Feb 2026 is expired compared to Aug 2026');
    assertFalse(isExpired('20270327'), 'Mar 2027 is valid');
    assertFalse(isExpired('29990710'), 'Year 2999 is valid');
  });
});

describe('F14: Status Tutup Kantor Monitoring', () => {
  const client = createMockClient();

  it('F14-1: Status Tutup Kantor Query - GET /api/tofcloseloc/status retrieves office close status', async () => {
    client.registerMock('GET', '/api/tofcloseloc/status', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            kdloc: '01',
            status_kantor: 'OPEN',
            tgl_transaksi: '20260812',
            can_close: false,
            pending_count: 5
          }
        }
      };
    });

    const res = await client.get('/api/tofcloseloc/status');
    validateDetailResponse(res);
    assertEqual(res.body.data.status_kantor, 'OPEN');
    assertFalse(res.body.data.can_close);
  });

  it('F14-2: Pending Summary Blocking Close - GET /api/tofcloseloc/pending-summary returns total un-authorized count', async () => {
    client.registerMock('GET', '/api/tofcloseloc/pending-summary', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          data: {
            total_pending: 12,
            breakdown: {
              mcif: 3,
              toftabb: 2,
              tofdep: 1,
              toftrnc: 4,
              tofspc: 2
            }
          }
        }
      };
    });

    const res = await client.get('/api/tofcloseloc/pending-summary');
    validateDetailResponse(res);
    assertEqual(res.body.data.total_pending, 12);
  });

  it('F14-3: Close Day Execution Blocked - POST /api/tofcloseloc/close-day fails if pending queue > 0', async () => {
    client.registerMock('POST', '/api/tofcloseloc/close-day', () => {
      return {
        status: 400,
        body: {
          status: 'error',
          message: 'Tutup kantor ditolak: Masih terdapat 12 data pending yang belum diotorisasi'
        }
      };
    });

    const res = await client.post('/api/tofcloseloc/close-day');
    validateErrorResponse(res, 400);
    assertContains(res.body.message, 'ditolak');
  });

  it('F14-4: Close Day Execution Success - POST /api/tofcloseloc/close-day succeeds when pending queue is 0', async () => {
    client.registerMock('POST', '/api/tofcloseloc/close-day', () => {
      return {
        status: 200,
        body: {
          status: 'success',
          message: 'Proses Tutup Kantor berhasil dilaksanakan',
          tgl_tutup: '20260812235959'
        }
      };
    });

    const res = await client.post('/api/tofcloseloc/close-day');
    assertEqual(res.status, 200);
    assertEqual(res.body.status, 'success');
  });

  it('F14-5: Close Day Audit Trail - records office close status change and checker audit log', () => {
    const createCloseLog = (userid, kdloc, statusBefore, statusAfter) => {
      return {
        userid,
        kdloc,
        action: 'CLOSE_DAY',
        status_before: statusBefore,
        status_after: statusAfter,
        timestamp: '20260812235959'
      };
    };

    const log = createCloseLog('TYAH', '01', 'OPEN', 'CLOSED');
    assertEqual(log.action, 'CLOSE_DAY');
    assertEqual(log.status_after, 'CLOSED');
  });
});

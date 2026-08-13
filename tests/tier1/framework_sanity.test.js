/**
 * Tier 1 Framework Sanity Tests
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertThrows,
  createMockClient,
  validateAuthResponse,
  validatePendingListResponse,
  validateDetailResponse,
  validateApproveResponse,
  validateRejectResponse
} = require('../helpers/test_framework');

describe('Framework Core Assertions', () => {
  test('assert and primitive equality', () => {
    assert(1 === 1, '1 should equal 1');
    assertTrue(true);
    assertFalse(false);
    assertEqual('hello', 'hello');
    assertEqual(100, 100);
  });

  test('assertDeepEqual with objects and arrays', () => {
    assertDeepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] });
    assertDeepEqual([1, 2, { c: 3 }], [1, 2, { c: 3 }]);
  });

  test('assertContains with string, array, and object', () => {
    assertContains('MitraSoft Core Banking', 'MitraSoft');
    assertContains([1, 2, 3], 2);
    assertContains({ status: 'success', code: 200 }, 'status');
    assertContains({ status: 'success', code: 200 }, { status: 'success' });
  });

  test('assertThrows sync and async', async () => {
    assertThrows(() => {
      throw new Error('Test error message');
    }, 'Test error');

    await assertThrows(async () => {
      throw new Error('Async error message');
    }, 'Async error');
  });
});

describe('Framework Mock REST API Client & Contracts', () => {
  const client = createMockClient();

  test('POST /api/auth/login contract validation', async () => {
    const res = await client.post('/api/auth/login', { userid: 'SUPER1', password: 'password123' });
    validateAuthResponse(res);
    assertEqual(res.body.user.userid, 'SUPER1');
  });

  test('GET /api/auth/me contract validation', async () => {
    client.setToken('mock-jwt-token-xyz123');
    const res = await client.get('/api/auth/me');
    assertEqual(res.status, 200);
    assertEqual(res.body.user.levelx, 'S');
  });

  test('GET /api/:module/pending contract validation', async () => {
    const res = await client.get('/api/mcif/pending');
    validatePendingListResponse(res);
    assertEqual(res.body.total, 2);
  });

  test('GET /api/:module/:id contract validation', async () => {
    const res = await client.get('/api/toftabb/1001');
    validateDetailResponse(res);
    assertEqual(res.body.data.id, '1001');
  });

  test('POST /api/:module/:id/approve contract validation', async () => {
    const res = await client.post('/api/tofdep/1001/approve');
    validateApproveResponse(res);
  });

  test('POST /api/:module/:id/reject contract validation', async () => {
    const res = await client.post('/api/toftrnc/1001/reject', { catatan: 'Data rekening tidak sesuai' });
    validateRejectResponse(res);
  });
});

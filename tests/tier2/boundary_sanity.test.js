/**
 * Tier 2 Boundary & Corner Case Sanity Tests
 */

const {
  describe,
  test,
  assertEqual,
  createMockClient,
  validateErrorResponse
} = require('../helpers/test_framework');

describe('Tier 2 Boundary Case Sanity Validations', () => {
  const client = createMockClient();

  test('Sanity 01: Reject with short catatan (< 5 chars) returns 400 error', async () => {
    await client.post('/api/auth/login', { userid: 'SPV01', password: 'secret123' });
    const res = await client.post('/api/cif_perorangan/CIF1001/reject', { catatan: '123' });
    assertEqual(res.status, 400);
    validateErrorResponse(res, 400);
  });

  test('Sanity 02: Login with invalid credentials returns 401', async () => {
    const res = await client.post('/api/auth/login', { userid: 'SUPER1', password: 'invalid' });
    assertEqual(res.status, 401);
    validateErrorResponse(res, 401);
  });
});

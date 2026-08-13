/**
 * Tier 4 Real-World Scenario Sanity Tests
 */

const {
  describe,
  test,
  assertEqual,
  createMockClient,
  validateAuthResponse,
  validatePendingListResponse,
  validateApproveResponse
} = require('../helpers/test_framework');

describe('Tier 4 End-to-End Workload Scenario', () => {
  const client = createMockClient();

  test('Full approval workflow: Login -> Fetch Pending -> Approve item', async () => {
    // Step 1: Login
    const loginRes = await client.post('/api/auth/login', { userid: 'CHECKER_USER', password: 'secretpassword' });
    validateAuthResponse(loginRes);
    client.setToken(loginRes.body.token);

    // Step 2: Fetch pending list
    const listRes = await client.get('/api/toftabb/pending');
    validatePendingListResponse(listRes);
    const targetItem = listRes.body.data[0];

    // Step 3: Approve item
    const approveRes = await client.post(`/api/toftabb/${targetItem.id}/approve`);
    validateApproveResponse(approveRes);
    assertEqual(approveRes.status, 200);
  });
});

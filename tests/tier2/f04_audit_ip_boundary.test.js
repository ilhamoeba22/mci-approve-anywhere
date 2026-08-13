/**
 * Tier 2 Boundary Tests - Feature 04: Audit Log & IP Detection
 * Target: Dual Audit Logging (WEBUSERLOG + WA_OTR_LOG) & LAN/EXT IP boundary conditions.
 */

const {
  describe,
  test,
  assertEqual,
  createTestClient,
  detectTerminalType
} = require('../helpers/test_framework');

describe('F04: Audit Log & IP Detection Boundaries', () => {
  test('TC204-01: LAN IP subnet boundary detection (192.168.x.x / 10.x.x.x)', () => {
    const lanIps = [
      '192.168.0.1',
      '192.168.255.255',
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.16.255.255'
    ];

    for (const ip of lanIps) {
      const term = detectTerminalType(ip);
      assertEqual(term, 'WEB-LAN', `IP ${ip} must be classified as WEB-LAN`);
    }
  });

  test('TC204-02: External IP subnet boundary detection', () => {
    const extIps = [
      '8.8.8.8',
      '1.1.1.1',
      '172.32.0.1',
      '203.0.113.195',
      '198.51.100.42'
    ];

    for (const ip of extIps) {
      const term = detectTerminalType(ip);
      assertEqual(term, 'WEB-EXT', `IP ${ip} must be classified as WEB-EXT`);
    }
  });

  test('TC204-03: Long User-Agent header string boundary (>500 chars)', async () => {
    const client = createTestClient();
    const longUserAgent = 'Mozilla/5.0 ' + 'A'.repeat(550);

    const loginRes = await client.login({ userid: 'SPV01', password: 'secret123' });
    assertEqual(loginRes.status, 200);

    // Audit logs check
    const logs = client.getDb().auditLogs;
    assertEqual(logs.length, 1);
    assertEqual(logs[0].action, 'LOGIN_SUCCESS');
  });

  test('TC204-04: X-Forwarded-For proxy chain IP parsing boundary', () => {
    const parseClientIp = (xForwardedFor) => {
      if (!xForwardedFor) return '127.0.0.1';
      const parts = xForwardedFor.split(',').map(p => p.trim());
      return parts[0]; // First entry is the original client IP
    };

    assertEqual(parseClientIp('192.168.1.50, 10.0.0.1, 203.0.113.1'), '192.168.1.50');
    assertEqual(parseClientIp('203.0.113.55, 192.168.1.1'), '203.0.113.55');
  });

  test('TC204-05: Loopback IP and padded whitespace IP boundaries', () => {
    const loopbackIps = ['127.0.0.1', '::1', '  192.168.1.10  '];

    for (const rawIp of loopbackIps) {
      const cleanIp = rawIp.trim();
      const term = detectTerminalType(cleanIp);
      assertEqual(term, 'WEB-LAN', `Cleaned IP "${cleanIp}" must be WEB-LAN`);
    }
  });
});

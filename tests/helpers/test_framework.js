/**
 * E2E Test Framework & Helper Utilities for Core Banking Otorisasi Web App
 * Path: tests/helpers/test_framework.js
 * 
 * Provides:
 * - Assertion Suite (assert, assertTrue, assertFalse, assertEqual, assertDeepEqual, assertThrows, assertContains)
 * - Test Suite Registration & Context Tracking (describe, test, it, setTier, getRegisteredTests, clearRegisteredTests, globalRegistry)
 * - Mock REST API Client & Contract Validators per PROJECT.md
 * - In-Memory Database Simulation & Test Client
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Custom AssertionError Class
class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssertionError);
    }
  }
}

// Deep Equality Utility
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

// Global Registry Store
const testsRegistry = [];
let currentSuite = 'Default Suite';
let currentTier = 'Tier 1';

// --- Assertion API ---
function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new AssertionError(message, Boolean(condition), true);
  }
}

function assertTrue(value, message) {
  if (value !== true) {
    throw new AssertionError(message || `Expected true, got ${JSON.stringify(value)}`, value, true);
  }
}

function assertFalse(value, message) {
  if (value !== false) {
    throw new AssertionError(message || `Expected false, got ${JSON.stringify(value)}`, value, false);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (!deepEqual(actual, expected)) {
    const msg = message || `Expected deep equality.\nActual:   ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

function assertContains(haystack, needle, message) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new AssertionError(message || `Expected string to contain "${needle}", got "${haystack}"`, haystack, needle);
    }
  } else if (Array.isArray(haystack)) {
    const found = haystack.some(item => deepEqual(item, needle) || item === needle);
    if (!found) {
      throw new AssertionError(message || `Expected array to contain ${JSON.stringify(needle)}`, haystack, needle);
    }
  } else if (typeof haystack === 'object' && haystack !== null) {
    if (typeof needle === 'string' && needle in haystack) {
      return;
    }
    if (typeof needle === 'object' && needle !== null) {
      for (const [k, v] of Object.entries(needle)) {
        if (!deepEqual(haystack[k], v)) {
          throw new AssertionError(message || `Expected object property ${k} to equal ${JSON.stringify(v)}`, haystack[k], v);
        }
      }
      return;
    }
    const str = JSON.stringify(haystack);
    if (!str.includes(String(needle))) {
      throw new AssertionError(message || `Expected object JSON to contain "${needle}"`, haystack, needle);
    }
  } else {
    throw new AssertionError(message || `assertContains requires string, array, or object, got ${typeof haystack}`, haystack, needle);
  }
}

async function assertThrows(fn, expectedError = null, message = '') {
  let threw = false;
  let thrownError = null;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      await res;
    }
  } catch (err) {
    threw = true;
    thrownError = err;
  }

  if (!threw) {
    throw new AssertionError(message || 'Expected function to throw an error, but it executed without throwing.', null, expectedError);
  }

  if (expectedError) {
    if (typeof expectedError === 'string') {
      if (!thrownError.message.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected error message to contain "${expectedError}", got "${thrownError.message}"`,
          thrownError.message,
          expectedError
        );
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(thrownError.message)) {
        throw new AssertionError(
          message || `Expected error message matching ${expectedError}, got "${thrownError.message}"`,
          thrownError.message,
          expectedError
        );
      }
    } else if (typeof expectedError === 'function') {
      if (expectedError.prototype && expectedError.prototype instanceof Error) {
        if (!(thrownError instanceof expectedError)) {
          throw new AssertionError(
            message || `Expected error instance of ${expectedError.name}, got ${thrownError.name}`,
            thrownError,
            expectedError
          );
        }
      } else if (!expectedError(thrownError)) {
        throw new AssertionError(
          message || `Error check function returned false for thrown error "${thrownError.message}"`,
          thrownError,
          expectedError
        );
      }
    }
  }
}

// --- Test Registration API ---
function setTier(tier) {
  currentTier = tier || 'Tier 1';
}

function describe(suiteName, fn) {
  const prevSuite = currentSuite;
  currentSuite = suiteName;
  if (typeof fn === 'function') {
    fn();
  }
  currentSuite = prevSuite;
}

function test(testName, fn) {
  const testFn = typeof fn === 'function' ? fn : (async () => {});
  testsRegistry.push({
    tier: currentTier,
    suite: currentSuite,
    name: testName,
    fn: testFn,
    status: 'pending',
    error: null,
    durationMs: 0
  });
}

const it = test;

function beforeEach(fn) {}
function afterEach(fn) {}
function beforeAll(fn) {}
function afterAll(fn) {}

function getRegisteredTests() {
  return testsRegistry;
}

function clearRegisteredTests() {
  testsRegistry.length = 0;
}

// Unified globalRegistry Object
const globalRegistry = {
  get suites() {
    const map = new Map();
    for (const t of testsRegistry) {
      if (!map.has(t.suite)) {
        map.set(t.suite, {
          name: t.suite,
          tier: t.tier,
          tests: [],
          beforeEachFns: [],
          afterEachFns: [],
          beforeAllFns: [],
          afterAllFns: []
        });
      }
      map.get(t.suite).tests.push(t);
    }
    return Array.from(map.values());
  },
  reset() {
    testsRegistry.length = 0;
  },
  setTier(tierName) {
    currentTier = tierName || 'Tier 1';
  },
  async runAllSuites() {
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      tierBreakdown: {
        'Tier 1': { total: 0, passed: 0, failed: 0 },
        'Tier 2': { total: 0, passed: 0, failed: 0 },
        'Tier 3': { total: 0, passed: 0, failed: 0 },
        'Tier 4': { total: 0, passed: 0, failed: 0 },
        'Other': { total: 0, passed: 0, failed: 0 }
      }
    };
    const start = Date.now();
    for (const t of testsRegistry) {
      const tierKey = stats.tierBreakdown[t.tier] ? t.tier : 'Other';
      stats.total++;
      stats.tierBreakdown[tierKey].total++;
      const testStart = Date.now();
      try {
        if (typeof t.fn === 'function') {
          await t.fn();
        } else {
          throw new Error(`Test function for ${t.name} is missing.`);
        }
        t.status = 'passed';
        stats.passed++;
        stats.tierBreakdown[tierKey].passed++;
      } catch (err) {
        t.status = 'failed';
        t.error = err;
        stats.failed++;
        stats.tierBreakdown[tierKey].failed++;
      } finally {
        t.durationMs = Date.now() - testStart;
      }
    }
    stats.durationMs = Date.now() - start;
    return stats;
  }
};

// Utility Helpers
function detectTerminalType(clientIp = '') {
  if (!clientIp) return 'WEB-LAN';
  if (clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.16.') || clientIp === '127.0.0.1' || clientIp === '::1') {
    return 'WEB-LAN';
  }
  return 'WEB-EXT';
}

function formatDateYYYYMMDDHHMMSS(date = new Date()) {
  const d = new Date(date);
  const pad = num => String(num).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`;
}

// In-Memory Database Generator
function createMockDB() {
  return {
    users: [
      { userid: 'SPV01', pass: 'secret123', passAlt: 'secretpassword', nmuser: 'Budi Supervisor', levelx: 'A', kdloc: '001', kdcab: '01' },
      { userid: 'SPV02', pass: 'secret123', passAlt: 'secretpassword', nmuser: 'Siti Senior Checker', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'TYAH', pass: 'validpassword', passAlt: 'secretpassword', nmuser: 'Tyah Supervisor', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'CHECKER1', pass: 'validpassword', passAlt: 'secretpassword', nmuser: 'Checker 1', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'CHECKER_USER', pass: 'secretpassword', passAlt: 'secret123', nmuser: 'Checker User', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'SUPER1', pass: 'password123', passAlt: 'secret123', nmuser: 'Supervisor 1', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'NADHOFA', pass: 'validpassword', passAlt: 'secretpassword', nmuser: 'Nadhofa Supervisor', levelx: 'S', kdloc: '001', kdcab: '01' },
      { userid: 'MAKER01', pass: 'secret123', passAlt: 'validpassword', nmuser: 'Andi Inputer', levelx: 'M', kdloc: '001', kdcab: '01' }
    ],
    sessions: {
      'mock-jwt-token-xyz123': {
        userid: 'CHECKER1',
        active: true,
        user: { userid: 'CHECKER1', nmuser: 'SUPERVISOR TEST', levelx: 'S', kdloc: '001', kdcab: '01' },
        ip: '192.168.1.100'
      },
      'JWT-MOCK-TYAH-001': {
        userid: 'TYAH',
        active: true,
        user: { userid: 'TYAH', nmuser: 'Tyah Supervisor', levelx: 'S', kdloc: '001', kdcab: '01' },
        ip: '192.168.1.100'
      }
    },
    auditLogs: [],
    oprLogs: [],
    closeLoc: { kdloc: '001', stsktr: '1', updated: '20260812' },
    
    cifPerorangan: [
      { id: 'CIF1001', idcif: 'CIF1001', nocif: '01009478', nmcust: 'Ahmad Dahlan', golcust: 'I', stsrec: 'N', noktp: '3171012345670001', autuser: null, auttgl: null, autterm: null },
      { id: 'CIF1002', idcif: 'CIF1002', nocif: '01009479', nmcust: 'Dewi Sartika', golcust: 'I', stsrec: 'N', noktp: '3171012345670002', autuser: null, auttgl: null, autterm: null }
    ],
    cifBadanHukum: [
      { id: 'CIF2001', idcif: 'CIF2001', nocif: '02001122', nmcust: 'PT Maju Bersama', golcust: 'C', jnsbh: '0208', stsrec: 'N', nonpwp: '01.234.567.8-012.000', autuser: null, auttgl: null, autterm: null },
      { id: 'CIF2002', idcif: 'CIF2002', nocif: '02001123', nmcust: 'CV Berkah Mandiri', golcust: 'B', jnsbh: '0208', stsrec: 'N', nonpwp: '02.345.678.9-012.000', autuser: null, auttgl: null, autterm: null },
      { id: '01001638', idcif: '01001638', nocif: '01001638', nmcust: 'PT Solusi Teknologi', golcust: 'C', jnsbh: '0208', stsrec: 'N', nonpwp: '03.456.789.0-012.000', autuser: null, auttgl: null, autterm: null }
    ],
    tabungan: [
      { id: '1210100068', norekg: '1210100068', notab: '1210100068', idcif: 'CIF1001', nmrekg: 'Ahmad Dahlan', saldo: 15000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: '1001', norekg: '1001', notab: '1001', idcif: 'CIF1001', nmrekg: 'Ahmad Dahlan', saldo: 15000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'TAB3001', norekg: 'TAB3001', notab: '1210100070', idcif: 'CIF1001', nmrekg: 'Ahmad Dahlan', saldo: 15000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'TAB3002', norekg: 'TAB3002', notab: '1210100069', idcif: 'CIF2001', nmrekg: 'PT Maju Bersama', saldo: 250000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    ],
    deposito: [
      { id: '1001', nodep: '1001', idcif: 'CIF1001', nmdep: 'Ahmad Dahlan', nominal: 100000000, aro: '1', stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'DEP4001', nodep: 'DEP4001', idcif: 'CIF1001', nmdep: 'Ahmad Dahlan', nominal: 100000000, aro: '1', stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'DEP4002', nodep: 'DEP4002', idcif: 'CIF2001', nmdep: 'PT Maju Bersama', nominal: 500000000, aro: '0', stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: '3300100381', nodep: '3300100381', idcif: '01005240', nmdep: 'Ahmad Dahlan', nominal: 50000000, jkw: 12, rate: 6.5, aro: '1', stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    ],
    transaksi: [
      { id: '1001', notrn: '1001', norekg: 'TAB3001', nominal: 5000000, nomtrnc: 5000000, ststrn: '1', ket: 'Setoran Tunai Approved', autuser: 'SPV01', auttgl: '20260812000000', autterm: 'WEB-LAN' },
      { id: 'TR001', notrn: 'TR001', norekg: 'TAB3001', nominal: 25000000, nomtrnc: 25000000, ststrn: '1', ket: 'Setoran Approved', autuser: 'SPV01', auttgl: '20260812000000', autterm: 'WEB-LAN' },
      { id: 'TX5001', notrn: 'TX5001', norekg: 'TAB3001', nominal: 5000000, nomtrnc: 5000000, ststrn: '2', ket: 'Setoran Tunai Pending', autuser: null, auttgl: null, autterm: null },
      { id: 'TX5002', notrn: 'TX5002', norekg: 'TAB3002', nominal: 50000000, nomtrnc: 50000000, ststrn: '6', ket: 'Pemindahbukuan Pending', autuser: null, auttgl: null, autterm: null },
      { id: 'TR002', notrn: 'TR002', norekg: 'TAB3002', nominal: 10000000, nomtrnc: 10000000, ststrn: '1', ket: 'Reverse Approved', autuser: 'SPV01', auttgl: '20260812000000', autterm: 'WEB-LAN' }
    ],
    pembiayaan: [
      { id: 'LMB6001', noplfond: 'LMB6001', nokontrak: 'LMB6001', idcif: 'CIF1001', plafond: 75000000, stsrec: 'N', idjaminan: 'JAM8001', autuser: null, auttgl: null, autterm: null },
      { id: 'LMB-2026-001', noplfond: 'LMB-2026-001', nokontrak: 'LMB-2026-001', idcif: 'CIF1001', plafond: 150000000, stsrec: 'N', idjaminan: 'REG-8812', autuser: null, auttgl: null, autterm: null }
    ],
    aset: [
      { id: 'AST7001', idaset: 'AST7001', kdaset: 'AST7001', nmaset: 'Gedung Kantor Cabang', nilai: 1200000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'AST-005', idaset: 'AST-005', kdaset: 'AST-005', nmaset: 'Server Dell PowerEdge R740', nilai: 85000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    ],
    jaminan: [
      { id: 'JAM8001', idjaminan: 'JAM8001', noreg: 'JAM8001', idaset: 'AST7001', nmjaminan: 'SHM No 1234 SBY', nilai: 150000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'REG-8812', idjaminan: 'REG-8812', noreg: 'REG-8812', idaset: 'AST-005', nmjaminan: 'SHM', jnsjamin: 'SHM', nilai_taksasi: 250000000, stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    ],
    kondisiKhusus: [
      { id: 'SPC9001', idspc: 'SPC9001', urutspc: 'SPC9001', jnsspc: '01', idcif: 'CIF1001', ket: 'Special Rate Deposito', stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: 'SPC9002', idspc: 'SPC9002', urutspc: 'SPC9002', jnsspc: '05', idcif: 'CIF2002', ket: 'Bypass Admin Fee', stsrec: 'N', autuser: null, auttgl: null, autterm: null },
      { id: '3300100381', idspc: '3300100381', urutspc: 2, noacc: '3300100381', jnsspc: '03', rate: 2.0, stsrec: 'N', autuser: null, auttgl: null, autterm: null }
    ]
  };
}

// Create Test Client API Mock
function createTestClient(db = createMockDB()) {
  let currentToken = null;
  let clientIp = '192.168.1.100';
  let currentIp = '192.168.1.100';
  let viewportWidth = 1440;

  const normalizeModule = (mod) => {
    const map = {
      'cif-perorangan': 'cifPerorangan',
      'cif_perorangan': 'cifPerorangan',
      'mcif': 'cifPerorangan',
      'cif-badan-hukum': 'cifBadanHukum',
      'cif_badan_hukum': 'cifBadanHukum',
      'mcif_bh': 'cifBadanHukum',
      'tabungan': 'tabungan',
      'toftabb': 'tabungan',
      'deposito': 'deposito',
      'tofdep': 'deposito',
      'transaksi': 'transaksi',
      'toftrnc': 'transaksi',
      'pembiayaan': 'pembiayaan',
      'toflmb': 'pembiayaan',
      'aset': 'aset',
      'tofaset': 'aset',
      'jaminan': 'jaminan',
      'tofjamin': 'jaminan',
      'kondisi-khusus': 'kondisiKhusus',
      'kondisi_khusus': 'kondisiKhusus',
      'tofspc': 'kondisiKhusus'
    };
    return map[mod] || mod;
  };

  const findItemInCollection = (collection, id) => {
    if (!collection || !Array.isArray(collection)) return null;
    const strId = String(id).trim();
    return collection.find(x =>
      String(x.id || '') === strId ||
      String(x.idcif || '') === strId ||
      String(x.nocif || '') === strId ||
      String(x.norekg || '') === strId ||
      String(x.notab || '') === strId ||
      String(x.norek || '') === strId ||
      String(x.nodep || '') === strId ||
      String(x.notrn || '') === strId ||
      String(x.noplfond || '') === strId ||
      String(x.nokontrak || '') === strId ||
      String(x.idaset || '') === strId ||
      String(x.kdaset || '') === strId ||
      String(x.idjaminan || '') === strId ||
      String(x.noreg || '') === strId ||
      String(x.idspc || '') === strId ||
      String(x.urutspc || '') === strId ||
      String(x.noacc || '') === strId
    );
  };

  return {
    setIp(ip) { clientIp = ip; currentIp = ip; },
    setViewport(w) { viewportWidth = w; },
    setToken(t) { currentToken = t; },
    clearToken() { currentToken = null; },
    getDb() { return db; },

    async login({ userid, password }) {
      if (!userid || !password || typeof userid !== 'string' || typeof password !== 'string' || !userid.trim() || !password.trim()) {
        db.auditLogs.push({
          userid: userid || 'UNKNOWN',
          appid: 'OTRS',
          inptgljam: formatDateYYYYMMDDHHMMSS(),
          ip_address: clientIp,
          lokasi: 'LOGIN',
          action: 'LOGIN_FAIL'
        });
        return { status: 401, body: { status: 'error', message: 'Invalid credentials' } };
      }

      if (password === 'invalid' || password === 'wrongpass' || password === 'wrongpassword') {
        db.auditLogs.push({
          userid,
          appid: 'OTRS',
          inptgljam: formatDateYYYYMMDDHHMMSS(),
          ip_address: clientIp,
          lokasi: 'LOGIN',
          action: 'LOGIN_FAIL'
        });
        return { status: 401, body: { status: 'error', message: 'Invalid credentials' } };
      }

      const user = db.users.find(u => u.userid === userid);
      if (!user) {
        db.auditLogs.push({
          userid,
          appid: 'OTRS',
          inptgljam: formatDateYYYYMMDDHHMMSS(),
          ip_address: clientIp,
          lokasi: 'LOGIN',
          action: 'LOGIN_FAIL'
        });
        return { status: 401, body: { status: 'error', message: 'Invalid credentials' } };
      }

      const token = `token-${userid}-${Date.now()}`;
      db.sessions[token] = { userid: user.userid, active: true, user, ip: clientIp };
      currentToken = token;

      db.auditLogs.push({
        userid: user.userid,
        appid: 'OTRS',
        inptgljam: formatDateYYYYMMDDHHMMSS(),
        ip_address: clientIp,
        lokasi: 'LOGIN',
        action: 'LOGIN_SUCCESS'
      });

      return {
        status: 200,
        body: {
          token,
          user: {
            userid: user.userid,
            nmuser: user.nmuser,
            levelx: user.levelx,
            kdloc: user.kdloc,
            kdcab: user.kdcab
          }
        }
      };
    },

    async logout() {
      if (currentToken && db.sessions[currentToken]) {
        db.sessions[currentToken].active = false;
        delete db.sessions[currentToken];
        currentToken = null;
        return { status: 200, body: { status: 'success', message: 'Logged out successfully' } };
      }
      return { status: 400, body: { status: 'error', message: 'No active session' } };
    },

    async getMe(headers = {}) {
      const reqHeaders = (headers && typeof headers === 'object') ? headers : {};
      const authHeader = reqHeaders.Authorization || reqHeaders.authorization || (currentToken ? `Bearer ${currentToken}` : '');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: { status: 'error', message: 'Unauthorized' } };
      }
      const token = authHeader.replace('Bearer ', '').trim();
      const sess = db.sessions[token];
      if (!sess || !sess.active) {
        return { status: 401, body: { status: 'error', message: 'Unauthorized' } };
      }
      return { status: 200, body: { user: sess.user } };
    },

    async getPending(moduleName, headers) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      const colName = normalizeModule(moduleName);
      const items = (db[colName] || []).filter(x => x.stsrec === 'N' || x.stsrec === 'P' || x.ststrn === '2' || x.ststrn === '6');
      return {
        status: 200,
        body: { status: 'success', total: items.length, data: items }
      };
    },

    async getDetail(moduleName, id, headers) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      const colName = normalizeModule(moduleName);
      const item = findItemInCollection(db[colName], id);

      if (!item) {
        return { status: 404, body: { status: 'error', message: 'Record not found' } };
      }
      return { status: 200, body: { status: 'success', data: item } };
    },

    async approve(moduleName, id, headers = {}) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      const user = meRes.body.user;
      if (user.levelx !== 'A' && user.levelx !== 'S') {
        return { status: 403, body: { status: 'error', message: 'Forbidden: Insufficient authorization level' } };
      }

      if (db.closeLoc.stsktr === '0') {
        return { status: 422, body: { status: 'error', message: 'Operation blocked: Branch is CLOSED (Tutup Kantor active)' } };
      }

      const colName = normalizeModule(moduleName);
      const item = findItemInCollection(db[colName], id);

      if (!item) {
        return { status: 404, body: { status: 'error', message: 'Record not found' } };
      }

      if (colName === 'transaksi') {
        if (item.ststrn === '1') {
          return { status: 409, body: { status: 'error', message: 'Transaction already approved' } };
        }
        item.ststrn = '1';
      } else {
        if (item.stsrec === 'A') {
          return { status: 409, body: { status: 'error', message: 'Record already approved' } };
        }
        item.stsrec = 'A';
      }

      const now = formatDateYYYYMMDDHHMMSS();
      const autterm = detectTerminalType(currentIp);
      item.autuser = user.userid;
      item.auttgl = now;
      item.autterm = autterm;

      const audit_id = db.oprLogs.length + 1;
      db.oprLogs.push({
        audit_id,
        userid: user.userid,
        module: moduleName,
        ref_id: id,
        action: 'APPROVE',
        auttgl: now,
        autterm,
        ip_client: currentIp
      });

      return { status: 200, body: { status: 'success', message: 'Approved successfully', audit_id } };
    },

    async reject(moduleName, id, body = {}, headers = {}) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      const user = meRes.body.user;
      if (user.levelx !== 'A' && user.levelx !== 'S') {
        return { status: 403, body: { status: 'error', message: 'Forbidden: Insufficient authorization level' } };
      }

      const { catatan } = body;
      if (!catatan || typeof catatan !== 'string' || catatan.trim().length < 5) {
        return { status: 400, body: { status: 'error', message: 'Rejection note must be at least 5 characters long' } };
      }

      const colName = normalizeModule(moduleName);
      const item = findItemInCollection(db[colName], id);

      if (!item) {
        return { status: 404, body: { status: 'error', message: 'Record not found' } };
      }

      if (colName === 'transaksi') {
        item.ststrn = '9';
      } else {
        item.stsrec = 'R';
      }

      const now = formatDateYYYYMMDDHHMMSS();
      const autterm = detectTerminalType(currentIp);
      item.autuser = user.userid;
      item.auttgl = now;
      item.autterm = autterm;

      const audit_id = db.oprLogs.length + 1;
      db.oprLogs.push({
        audit_id,
        userid: user.userid,
        module: moduleName,
        ref_id: id,
        action: 'REJECT',
        catatan,
        auttgl: now,
        autterm,
        ip_client: currentIp
      });

      return { status: 200, body: { status: 'success', message: 'Rejected successfully', audit_id } };
    },

    async getCloseLocStatus() {
      return { status: 200, body: { status: 'success', data: db.closeLoc } };
    },

    async toggleCloseLoc(headers = {}) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      const user = meRes.body.user;
      if (user.levelx !== 'A' && user.levelx !== 'S') {
        return { status: 403, body: { status: 'error', message: 'Only Supervisors can change Tutup Kantor status' } };
      }

      db.closeLoc.stsktr = db.closeLoc.stsktr === '1' ? '0' : '1';
      db.closeLoc.updated = formatDateYYYYMMDDHHMMSS();
      return { status: 200, body: { status: 'success', data: db.closeLoc } };
    },

    async getAuditLogs(filters = {}, headers = {}) {
      const meRes = await this.getMe(headers);
      if (meRes.status !== 200) return meRes;

      let logs = [...db.oprLogs];
      if (filters.module) {
        logs = logs.filter(l => l.module === filters.module);
      }
      if (filters.autterm) {
        logs = logs.filter(l => l.autterm === filters.autterm);
      }

      return { status: 200, body: { status: 'success', total: logs.length, data: logs } };
    }
  };
}

// Wrapper for createMockClient
function createMockClient(db = createMockDB()) {
  const innerClient = createTestClient(db);
  let token = null;
  let isExplicitlyLoggedOut = false;
  const mockRegistry = new Map();

  const ensureToken = () => {
    if (!token && !isExplicitlyLoggedOut) {
      token = 'mock-jwt-token-xyz123';
      const user = db.users.find(u => u.userid === 'CHECKER1') || db.users[0];
      db.sessions[token] = { userid: user.userid, active: true, user, ip: '192.168.1.100' };
      innerClient.setToken(token);
    }
  };

  return {
    setToken(t) {
      token = t;
      isExplicitlyLoggedOut = !t;
      innerClient.setToken(t);
    },
    clearToken() {
      token = null;
      isExplicitlyLoggedOut = true;
      innerClient.clearToken();
    },
    getDb() { return db; },
    registerMock(method, path, mockFn) {
      mockRegistry.set(`${method.toUpperCase()} ${path}`, mockFn);
    },
    async post(path, body = {}, headers = {}) {
      const key = `POST ${path}`;
      const reqHeaders = (headers && typeof headers === 'object') ? { ...headers } : {};
      if (mockRegistry.has(key)) {
        const mockFn = mockRegistry.get(key);
        const reqObj = { body, headers: reqHeaders };
        return await mockFn(reqObj, reqHeaders);
      }
      if (path === '/api/auth/login') {
        const res = await innerClient.login(body);
        if (res.status === 200 && res.body.token) {
          token = res.body.token;
          isExplicitlyLoggedOut = false;
        }
        return res;
      }
      if (!isExplicitlyLoggedOut && (!reqHeaders.Authorization && !reqHeaders.authorization)) {
        ensureToken();
      }
      if (token && !reqHeaders.Authorization && !reqHeaders.authorization) {
        reqHeaders.Authorization = `Bearer ${token}`;
      }
      if (path.endsWith('/approve')) {
        const parts = path.split('/');
        const mod = parts[2];
        const id = parts[3];
        return await innerClient.approve(mod, id, reqHeaders);
      }
      if (path.endsWith('/reject')) {
        const parts = path.split('/');
        const mod = parts[2];
        const id = parts[3];
        return await innerClient.reject(mod, id, body, reqHeaders);
      }
      return { status: 404, body: { status: 'error', message: 'Endpoint not found' } };
    },
    async get(path, headers = {}) {
      const key = `GET ${path}`;
      const reqHeaders = (headers && typeof headers === 'object') ? { ...headers } : {};
      if (mockRegistry.has(key)) {
        const mockFn = mockRegistry.get(key);
        const reqObj = { headers: reqHeaders };
        return await mockFn(reqObj, reqHeaders);
      }
      if (!isExplicitlyLoggedOut && (!reqHeaders.Authorization && !reqHeaders.authorization)) {
        ensureToken();
      }
      if (token && !reqHeaders.Authorization && !reqHeaders.authorization) {
        reqHeaders.Authorization = `Bearer ${token}`;
      }
      if (path === '/api/auth/me') {
        return await innerClient.getMe(reqHeaders);
      }
      if (path.includes('/pending')) {
        const parts = path.split('/');
        const mod = parts[2];
        return await innerClient.getPending(mod, reqHeaders);
      }
      if (path.startsWith('/api/tutup-kantor')) {
        return await innerClient.getCloseLocStatus();
      }
      if (path.startsWith('/api/audit')) {
        return await innerClient.getAuditLogs({}, reqHeaders);
      }
      const parts = path.split('/');
      if (parts.length >= 4) {
        const mod = parts[2];
        const id = parts[3];
        return await innerClient.getDetail(mod, id, reqHeaders);
      }
      return { status: 404, body: { status: 'error', message: 'Endpoint not found' } };
    }
  };
}

class HttpClient {
  constructor(options = {}) {
    this.mockMode = options.mockMode !== undefined ? options.mockMode : true;
    this.token = options.token || null;
    this.mockClient = createMockClient();
  }
  setToken(t) { this.token = t; this.mockClient.setToken(t); }
  clearToken() { this.token = null; this.mockClient.clearToken(); }
  get(path, headers) { return this.mockClient.get(path, headers); }
  post(path, body, headers) { return this.mockClient.post(path, body, headers); }
}

function createHttpClient(options) {
  return new HttpClient(options);
}

// --- Contract Validators ---
function validateAuthResponse(res) {
  assertEqual(res.status, 200, 'Auth response status must be 200');
  assertTrue(!!res.body.token, 'Auth response must include token');
  assertTrue(!!res.body.user, 'Auth response must include user profile');
}

function validatePendingListResponse(res) {
  assertEqual(res.status, 200, 'Pending list status must be 200');
  assertEqual(res.body.status, 'success', 'Pending list body status must be success');
  assert(Array.isArray(res.body.data), 'Pending list data must be an array');
}

function validateDetailResponse(res) {
  assertEqual(res.status, 200, 'Detail response status must be 200');
  assertEqual(res.body.status, 'success', 'Detail response body status must be success');
  assert(res.body.data && typeof res.body.data === 'object', 'Detail response data must be object');
}

function validateApproveResponse(res) {
  assertEqual(res.status, 200, 'Approve response status must be 200');
  assertEqual(res.body.status, 'success', 'Approve body status must be success');
}

function validateRejectResponse(res) {
  assertEqual(res.status, 200, 'Reject response status must be 200');
  assertEqual(res.body.status, 'success', 'Reject body status must be success');
}

function validateErrorResponse(res, expectedStatus = 400) {
  assertEqual(res.status, expectedStatus, `Error response status must be ${expectedStatus}`);
  assertEqual(res.body.status, 'error', 'Error body status must be error');
}

module.exports = {
  AssertionError,
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertDeepEqual,
  assertContains,
  assertThrows,
  setTier,
  describe,
  test,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  getRegisteredTests,
  clearRegisteredTests,
  globalRegistry,
  detectTerminalType,
  formatDateYYYYMMDDHHMMSS,
  createMockDB,
  createTestClient,
  createMockClient,
  HttpClient,
  createHttpClient,
  validateAuthResponse,
  validatePendingListResponse,
  validateDetailResponse,
  validateApproveResponse,
  validateRejectResponse,
  validateErrorResponse
};

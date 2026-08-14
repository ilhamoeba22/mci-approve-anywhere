/**
 * Real-Time DB Polling Worker
 * Periodically monitors SQL Server pending tables and triggers Web Push Notifications
 */

const { getPool } = require('../config/db');
const { sendNotificationToAll } = require('../controllers/pushController');

let lastPendingCount = 0;

async function checkPendingDataAndPush() {
  try {
    const pool = await getPool('BPRS_MCI_LIVE');
    if (!pool) return;

    // Query pending counts across modules
    const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(1) FROM mCIF WHERE stsrec = 'N') AS cif_perorangan,
        (SELECT COUNT(1) FROM TOFTABB WHERE stsrec = 'N') AS tabungan,
        (SELECT COUNT(1) FROM TOFDEP WHERE stsrec = 'N') AS deposito,
        (SELECT COUNT(1) FROM TOFJAMIN WHERE stsrec = 'N') AS jaminan
    `);

    if (result && result.recordset && result.recordset[0]) {
      const counts = result.recordset[0];
      const totalPending = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);

      // If pending data increased, broadcast Push Notification alert to Supervisors
      if (totalPending > lastPendingCount && lastPendingCount !== 0) {
        const diff = totalPending - lastPendingCount;
        console.log(`[PushWorker] Detected ${diff} new pending requests! Total: ${totalPending}. Sending Web Push Alert...`);

        sendNotificationToAll({
          title: '🔔 Alert Otorisasi BPRS HIK MCI',
          body: `Terdapat ${diff} permohonan otorisasi baru (Total: ${totalPending} data pending) membutuhkan persetujuan Anda.`,
          icon: 'icons/icon-192.png',
          url: './index.html'
        });
      }

      lastPendingCount = totalPending;
    }
  } catch (err) {
    // Non-blocking worker error log
    console.warn('[PushWorker] Polling check warning:', err.message);
  }
}

function startPushWorker(intervalMs = 30000) {
  console.log(`[PushWorker] Real-Time DB Push Notification Worker started (Interval: ${intervalMs / 1000}s)`);
  checkPendingDataAndPush();
  setInterval(checkPendingDataAndPush, intervalMs);
}

module.exports = {
  startPushWorker
};

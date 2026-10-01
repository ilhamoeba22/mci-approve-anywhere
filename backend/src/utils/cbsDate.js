/**
 * cbsDate.js
 * Utility to resolve CBS Business Date and SQL Server Time.
 * In MitraSoft CBS, the operational/accounting date (tgltrn) may differ from calendar date
 * during delayed EOM (End of Month) or weekend processing.
 */

function getLocalTimePart() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getLocalFullFormatted() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Returns CBS Business Date (YYYYMMDD)
 * @param {import('mssql').ConnectionPool} pool 
 * @returns {Promise<string>} 8-digit date string e.g. '20260930'
 */
async function getCbsDate(pool) {
  try {
    if (pool) {
      const res = await pool.request().query(`
        SELECT COALESCE(
          (SELECT TOP 1 REPLACE(SUBSTRING(opentgljam, 1, 10), '-', '') FROM TOFCLOSELOC WHERE kdloc = '01' ORDER BY opentgljam DESC),
          (SELECT MAX(tgltrn) FROM TOFTRNC)
        ) AS cbs_date
      `);
      const cbsDate = res.recordset[0]?.cbs_date;
      if (cbsDate && String(cbsDate).trim().length === 8) {
        return String(cbsDate).trim();
      }
    }
  } catch (err) {
    console.error('[cbsDate] Error getting CBS date from database:', err.message);
  }

  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Returns full 14-digit CBS Timestamp (YYYYMMDDHHmmss)
 * Uses CBS Business Date + SQL Server current time (or local time)
 * @param {import('mssql').ConnectionPool} pool 
 * @param {string} [explicitDate] Optional 8-digit date (e.g. tgltrn from transaction)
 * @returns {Promise<string>} 14-digit timestamp e.g. '20260930140523'
 */
async function getCbsTimestamp(pool, explicitDate = null) {
  try {
    if (pool) {
      if (explicitDate && String(explicitDate).trim().length === 8) {
        const timeRes = await pool.request().query("SELECT REPLACE(CONVERT(varchar(8), GETDATE(), 108), ':', '') AS sql_time");
        const sqlTime = timeRes.recordset[0]?.sql_time || getLocalTimePart();
        return `${String(explicitDate).trim()}${sqlTime}`;
      }

      const res = await pool.request().query(`
        SELECT 
          COALESCE(
            (SELECT TOP 1 REPLACE(SUBSTRING(opentgljam, 1, 10), '-', '') FROM TOFCLOSELOC WHERE kdloc = '01' ORDER BY opentgljam DESC),
            (SELECT MAX(tgltrn) FROM TOFTRNC)
          ) AS cbs_date,
          REPLACE(CONVERT(varchar(8), GETDATE(), 108), ':', '') AS sql_time
      `);
      const cbsDate = res.recordset[0]?.cbs_date;
      const sqlTime = res.recordset[0]?.sql_time;
      if (cbsDate && String(cbsDate).trim().length === 8 && sqlTime && String(sqlTime).trim().length === 6) {
        return `${String(cbsDate).trim()}${String(sqlTime).trim()}`;
      }
    }
  } catch (err) {
    console.error('[cbsDate] Error getting CBS timestamp from database:', err.message);
  }

  return getLocalFullFormatted();
}

module.exports = {
  getCbsDate,
  getCbsTimestamp
};

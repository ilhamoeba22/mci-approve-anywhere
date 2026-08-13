const { getPool, mssql } = require('../config/db');

async function getStatusTutupKantor(req, res, next) {
  try {
    const pool = await getPool(req.user ? req.user.target_db : null);
    const result = await pool.request().query(`
      SELECT TOP 50 * FROM TOFCLOSELOC ORDER BY kdloc ASC
    `);
    return res.json({ status: 'success', total: result.recordset.length, data: result.recordset });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatusTutupKantor
};


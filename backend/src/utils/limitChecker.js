const { getPool, mssql } = require('../config/db');

/**
 * Validasi Limit Nominal Otorisasi Supervisor / Pejabat
 * @param {Object} user - User payload dari JWT (userid, levelx, target_db)
 * @param {number} nominalrp - Nominal transaksi yang akan di-approve
 * @param {string} limitType - Tipe limit ('CDR' | 'CCR' | 'LDR' | 'TARIK' | 'SETOR' | 'BIAYA')
 * @returns {Promise<{allowed: boolean, userLimit: number, message: string}>}
 */
async function verifySupervisorLimit(user, nominalrp, limitType = 'CDR') {
  const level = (user.levelx || '').toUpperCase();

  // 1. Level A (Superadmin / Administrator Global) memilki wewenang UNLIMITED tanpa batas nominal
  if (level === 'A') {
    return { allowed: true, userLimit: Infinity, message: 'Superadmin Level A Memiliki Wewenang Unlimited' };
  }

  const pool = await getPool(user.target_db || null);
  const result = await pool.request()
    .input('userid', mssql.VarChar(10), user.userid)
    .query(`
      SELECT userid, levelx, limitccr, limitcdr, limitldr, limitlcr, limittarik, limitsetor, limitbiaya 
      FROM USERPROFILE 
      WHERE UPPER(userid) = UPPER(@userid)
    `);

  if (result.recordset.length === 0) {
    return { allowed: false, userLimit: 0, message: 'Profil user tidak ditemukan di database' };
  }

  const profile = result.recordset[0];
  let userLimit = 0;

  switch (limitType.toUpperCase()) {
    case 'CCR':
    case 'SETOR':
      userLimit = Number(profile.limitccr || profile.limitsetor || 0);
      break;
    case 'CDR':
    case 'TARIK':
      userLimit = Number(profile.limitcdr || profile.limittarik || 0);
      break;
    case 'LDR':
    case 'LOAN':
      userLimit = Number(profile.limitldr || profile.limitlcr || 0);
      break;
    case 'BIAYA':
      userLimit = Number(profile.limitbiaya || 0);
      break;
    default:
      userLimit = Number(profile.limitcdr || profile.limitccr || 0);
  }

  // Jika limit di DB diset 0 atau 999999999999, perlakukan sebagai unlimited
  if (userLimit === 0 || userLimit >= 999999999999) {
    return { allowed: true, userLimit: userLimit || 999999999999, message: 'Limit Wewenang Mencukupi (Unlimited / Zero Default)' };
  }

  const numNominal = Number(nominalrp || 0);
  if (numNominal > userLimit) {
    const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    return {
      allowed: false,
      userLimit: userLimit,
      message: `Nominal transaksi ${formatRp(numNominal)} melebihi Limit Wewenang Otorisasi Anda (${formatRp(userLimit)}). Silakan minta Otorisasi Pejabat Senior / Level A.`
    };
  }

  return { allowed: true, userLimit: userLimit, message: 'Limit Wewenang Mencukupi' };
}

module.exports = {
  verifySupervisorLimit
};

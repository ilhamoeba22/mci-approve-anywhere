const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'mitrasoft_cif_otorisasi_secret_key_2026_prod';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'mitrasoft_cif_otorisasi_refresh_secret_key_2026_prod';
const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '24h';

function generateToken(payload) {
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn, algorithm: 'HS256' });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}

module.exports = {
  secret,
  refreshSecret,
  expiresIn,
  refreshExpiresIn,
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken
};

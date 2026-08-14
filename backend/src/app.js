const express = require('express');
const cors = require('cors');
const path = require('path');
const { getPool } = require('./config/db');
const { auditLoggerMiddleware } = require('./middleware/auditLogger');

// Routes
const authRoutes = require('./routes/authRoutes');
const cifRoutes = require('./routes/cifRoutes');
const tabunganRoutes = require('./routes/tabunganRoutes');
const depositoRoutes = require('./routes/depositoRoutes');
const transaksiRoutes = require('./routes/transaksiRoutes');
const pembiayaanRoutes = require('./routes/pembiayaanRoutes');
const asetRoutes = require('./routes/asetRoutes');
const jaminanRoutes = require('./routes/jaminanRoutes');
const kondisiKhususRoutes = require('./routes/kondisiKhususRoutes');
const tutupKantorRoutes = require('./routes/tutupKantorRoutes');
const auditRoutes = require('./routes/auditRoutes');
const pushRoutes = require('./routes/pushRoutes');

const cookieParser = require('cookie-parser');

const app = express();

app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Attach audit info (IP, network classification) to req
app.use(auditLoggerMiddleware);

// Serve static frontend
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const targetDb = req.query.db || 'BPRS_MCI_LIVE';
    const pool = await getPool(targetDb);
    const result = await pool.request().query('SELECT GETDATE() AS server_time, DB_NAME() AS db_name');
    return res.json({
      status: 'success',
      message: 'Backend API and Database Connection operational',
      db_time: result.recordset[0].server_time,
      db_name: result.recordset[0].db_name,
      client_ip: req.auditInfo ? req.auditInfo.ip : 'unknown',
      network_type: req.auditInfo ? req.auditInfo.networkType : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection check failed',
      error: err.message
    });
  }
});

// Route Mounting
app.use('/api/auth', authRoutes);
app.use('/api/cif', cifRoutes);
app.use('/api/tabungan', tabunganRoutes);
app.use('/api/deposito', depositoRoutes);
app.use('/api/transaksi', transaksiRoutes);
app.use('/api/pembiayaan', pembiayaanRoutes);
app.use('/api/aset', asetRoutes);
app.use('/api/jaminan', jaminanRoutes);
app.use('/api/kondisi-khusus', kondisiKhususRoutes);
app.use('/api/tutup-kantor', tutupKantorRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/push', pushRoutes);

// Fallback to frontend SPA index.html for non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 Route Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`
  });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Terjadi kesalahan internal server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;

require('dotenv').config();
const app = require('./app');
const { getPool, closePool } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const HOST = process.env.HOST || '0.0.0.0';
    const server = app.listen(PORT, HOST, () => {
      console.log(`=======================================================`);
      console.log(` MitraSoft Core Banking Otorisasi CIF Web Backend API `);
      console.log(` Local Access : http://localhost:${PORT}`);
      console.log(` Environment  : ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    // Background non-blocking DB connection initialization
    getPool('BPRS_MCI_LIVE').catch(err => {
      console.warn('[Server] Initial DB pre-connect warning:', err.message);
    });

    // Start Real-Time DB Polling Push Worker
    const { startPushWorker } = require('./services/pushWorker');
    startPushWorker(30000);

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        console.log('[Server] Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('[Server] Critical startup failure:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

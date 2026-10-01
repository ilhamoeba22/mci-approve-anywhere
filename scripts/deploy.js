/**
 * MCI ApproveAnywhere - Automated Production Deployment Script
 * Protocol: SSH2 / SFTP
 * Server: approveanywhere.bprshikmciyk.co.id (202.10.43.50:2223)
 */

const { Client } = require('../backend/node_modules/ssh2');
const fs = require('fs');
const path = require('path');

// 1. DATA KONEKSI SSH HOSTING / VPS
const SSH_CONFIG = {
  host: process.env.VPS_HOST || '202.10.43.50',
  port: parseInt(process.env.VPS_PORT || '2223', 10),
  username: process.env.VPS_USER || 'bprw7255',
  password: process.env.VPS_PASSWORD || 'Muhammad@060101'
};

const REMOTE_BASE = '/home/bprw7255/public_html/approveanywhere.bprshikmciyk.co.id';
const LOCAL_BASE = path.resolve(__dirname, '..');

// 2. DAFTAR FILE YANG DI-DEPLOY KE HOSTING
const DEPLOY_FILES = [
  // Backend Utils & Config
  { local: 'backend/src/app.js', remote: 'backend/src/app.js' },
  { local: 'backend/src/config/db.js', remote: 'backend/src/config/db.js' },
  { local: 'backend/src/utils/cbsDate.js', remote: 'backend/src/utils/cbsDate.js' },
  
  // Backend Controllers
  { local: 'backend/src/controllers/transaksiController.js', remote: 'backend/src/controllers/transaksiController.js' },
  { local: 'backend/src/controllers/cifController.js', remote: 'backend/src/controllers/cifController.js' },
  { local: 'backend/src/controllers/tabunganController.js', remote: 'backend/src/controllers/tabunganController.js' },
  { local: 'backend/src/controllers/depositoController.js', remote: 'backend/src/controllers/depositoController.js' },
  { local: 'backend/src/controllers/pembiayaanController.js', remote: 'backend/src/controllers/pembiayaanController.js' },
  { local: 'backend/src/controllers/asetController.js', remote: 'backend/src/controllers/asetController.js' },
  { local: 'backend/src/controllers/jaminanController.js', remote: 'backend/src/controllers/jaminanController.js' },
  { local: 'backend/src/controllers/kondisiKhususController.js', remote: 'backend/src/controllers/kondisiKhususController.js' },
  { local: 'backend/src/controllers/cmsController.js', remote: 'backend/src/controllers/cmsController.js' },
  { local: 'backend/src/routes/cmsRoutes.js', remote: 'backend/src/routes/cmsRoutes.js' },
  
  // Frontend
  { local: 'frontend/index.html', remote: 'index.html' },
  { local: 'frontend/index.html', remote: 'frontend/index.html' },
  { local: 'frontend/css/style.css', remote: 'css/style.css' },
  { local: 'frontend/css/cms-matcher.css', remote: 'css/cms-matcher.css' },
  { local: 'frontend/js/app.js', remote: 'js/app.js' },
  { local: 'frontend/js/cms-matcher.js', remote: 'js/cms-matcher.js' },
  { local: 'frontend/js/xlsx.full.min.js', remote: 'js/xlsx.full.min.js' }
];

console.log('========================================================');
console.log('  MCI ApproveAnywhere — Automated Deployment Tool');
console.log(`  Target Server : ${SSH_CONFIG.host}:${SSH_CONFIG.port}`);
console.log(`  User cPanel   : ${SSH_CONFIG.username}`);
console.log(`  Remote Path   : ${REMOTE_BASE}`);
console.log('========================================================\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('[SSH] Koneksi SSH berhasil terhubung!');
  console.log('[SFTP] Memulai proses upload file...');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('[SFTP Error]', err.message);
      conn.end();
      process.exit(1);
    }

    try {
      for (const item of DEPLOY_FILES) {
        const localPath = path.join(LOCAL_BASE, item.local);
        const remotePath = `${REMOTE_BASE}/${item.remote}`;

        if (!fs.existsSync(localPath)) {
          console.warn(`[SKIP] File lokal tidak ditemukan: ${item.local}`);
          continue;
        }

        await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(localPath);
          const writeStream = sftp.createWriteStream(remotePath);

          writeStream.on('close', () => {
            console.log(`  ✓ Upload: ${item.local} -> ${item.remote}`);
            resolve();
          });

          writeStream.on('error', (uploadErr) => {
            console.error(`  ✗ Gagal upload ${item.local}:`, uploadErr.message);
            reject(uploadErr);
          });

          readStream.pipe(writeStream);
        });
      }

      console.log('\n[PM2] Memuat ulang service backend di server hosting...');
      const pm2Command = `
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        pm2 reload mci-approve-backend || pm2 restart mci-approve-backend
        sleep 2
        pm2 status
      `;

      conn.exec(pm2Command, (execErr, stream) => {
        if (execErr) {
          console.error('[PM2 Error]', execErr.message);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code) => {
          console.log(`\n[SELESAI] Deployment selesai dengan kode status ${code}!`);
          console.log('Silakan akses: https://approveanywhere.bprshikmciyk.co.id\n');
          conn.end();
          process.exit(0);
        });

        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
      });

    } catch (deployErr) {
      console.error('[Deployment Error]', deployErr.message);
      conn.end();
      process.exit(1);
    }
  });
});

conn.on('error', (err) => {
  console.error('[SSH Connection Error]', err.message);
  process.exit(1);
});

conn.connect(SSH_CONFIG);

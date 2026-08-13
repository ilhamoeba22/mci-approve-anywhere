const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Connected! Checking process count and killing stale processes...');
  
  const cmd = `
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
    
    echo "=== CURRENT PROCESS LIST ==="
    ps aux | grep bprw7255 || true
    
    echo "=== PM2 RESTART & CLEANUP ==="
    pm2 kill || true
    sleep 1
    PORT=3000 pm2 start src/server.js --name "mci-approve-backend"
    pm2 save
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\n[SSH] Process cleanup completed with code ${code}`);
      conn.end();
    })
    .on('data', (data) => console.log(data.toString()))
    .stderr.on('data', (data) => console.log('[STDERR]: ' + data.toString()));
  });
}).connect({
  host: '202.10.43.50',
  port: 2223,
  username: 'bprw7255',
  password: 'Muhammad@060101'
});

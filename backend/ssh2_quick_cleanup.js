const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Cleaning up background processes for bprw7255...');
  
  const cmd = `
    pkill -f node || true
    pkill -f sleep || true
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
    cd ~/public_html/approveanywhere.bprshikmci.co.id/backend
    PORT=3000 pm2 start src/server.js --name "mci-approve-backend"
    pm2 save
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\n[SSH] Cleanup finished with status code ${code}`);
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

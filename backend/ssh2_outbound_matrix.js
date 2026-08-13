const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Outbound Port Diagnostic Matrix...');
  
  const cmd = `
    node -e "
      const net = require('net');
      
      function check(host, port) {
        return new Promise(r => {
          const s = net.connect({ host, port, timeout: 2000 }, () => {
            console.log(host + ':' + port, '=> CONNECTED (OPEN)');
            s.destroy();
            r();
          });
          s.on('error', err => {
            console.log(host + ':' + port, '=> ERROR:', err.message);
            r();
          });
          s.on('timeout', () => {
            console.log(host + ':' + port, '=> TIMEOUT (BLOCKED OUTBOUND)');
            s.destroy();
            r();
          });
        });
      }

      async function main() {
        console.log('--- TESTING STANDARD OUTBOUND PORTS ---');
        await check('google.com', 80);
        await check('google.com', 443);
        console.log('--- TESTING MITRASOFT PORTS ---');
        await check('103.179.255.24', 80);
        await check('103.179.255.24', 443);
        await check('103.179.255.24', 20133);
      }
      main();
    "
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
    .on('data', (data) => console.log(data.toString()))
    .stderr.on('data', (data) => console.log('[STDERR]: ' + data.toString()));
  });
}).connect({
  host: '202.10.43.50',
  port: 2223,
  username: 'bprw7255',
  password: 'Muhammad@060101'
});

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Testing port 44333 on iba-net.02.mglobalperdana.com...');
  
  const cmd = `
    node -e "
      const net = require('net');
      const s = net.connect({ host: '103.179.255.24', port: 44333, timeout: 3000 }, () => {
        console.log('PORT 44333 IS OPEN & CONNECTED!');
        s.destroy();
      });
      s.on('error', err => console.log('Port 44333 Response:', err.message));
      s.on('timeout', () => console.log('Port 44333 Timed Out'));
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

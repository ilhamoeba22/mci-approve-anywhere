const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Testing individual port connectivity via curl...');
  
  const cmd = `
    echo "=== 1. TEST OUTBOUND Google Port 80 ==="
    curl -v --connect-timeout 4 telnet://google.com:80 2>&1 | head -n 8 || true
    
    echo "=== 2. TEST OUTBOUND MitraSoft Port 80 ==="
    curl -v --connect-timeout 4 telnet://103.179.255.24:80 2>&1 | head -n 8 || true
    
    echo "=== 3. TEST OUTBOUND MitraSoft Port 443 ==="
    curl -v --connect-timeout 4 telnet://103.179.255.24:443 2>&1 | head -n 8 || true
    
    echo "=== 4. TEST OUTBOUND MitraSoft Port 20133 ==="
    curl -v --connect-timeout 4 telnet://103.179.255.24:20133 2>&1 | head -n 8 || true
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

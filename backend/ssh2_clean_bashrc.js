const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('[SSH] Cleaning up .bashrc to make SSH logins instant & lightweight...');
  
  const script = `
    sed -i '/nvm/d' ~/.bashrc
    echo 'export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"' >> ~/.bashrc
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    cat ~/.bashrc
  `;
  
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\n[SSH] .bashrc optimization completed with code ${code}`);
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

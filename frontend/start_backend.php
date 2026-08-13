<?php
header('Content-Type: text/plain');
$cmd = 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; cd /home/bprw7255/public_html/approveanywhere.bprshikmciyk.co.id/backend && PORT=3000 pm2 restart mci-approve-backend 2>&1 || PORT=3000 pm2 start src/server.js --name "mci-approve-backend" 2>&1';
$output = shell_exec($cmd);
echo "=== PM2 BACKEND STARTUP LOG ===\n";
echo $output;

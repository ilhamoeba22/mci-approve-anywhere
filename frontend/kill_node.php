<?php
header('Content-Type: text/plain');
echo "=== KILLING BACKGROUND NODE PROCESSES ===\n";
$out = shell_exec("pkill -9 -f node; pkill -9 -f pm2 2>&1");
echo $out;
echo "\nDONE! Memory and Process Limit Freely Cleared.\n";

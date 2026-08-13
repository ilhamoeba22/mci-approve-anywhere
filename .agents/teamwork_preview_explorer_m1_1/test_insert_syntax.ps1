$connStr = "Server=192.168.1.130,44333;Database=MCI_JULI_31072026;User Id=sa;Password=bon;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SET PARSEONLY ON;

-- WEBUSERLOG Insert Test
INSERT INTO WEBUSERLOG (
    userid, kdid, traceid, appid, inptgljam, web_version, server_version, ip_address, lokasi, rc, rcdesc, description
) VALUES (
    'BONBON', 'AUTH_LOGIN', 'TRC12345', 'OTRS', '20260812113000', '1.1.0', '1.0.0', '192.168.1.83', 'WEB-LAN', '00', 'Success', 'User login successful'
);

-- WA_OTR_LOG Insert Test
INSERT INTO WA_OTR_LOG (
    modul, aksi, ref_id, userid, catatan, tgl_aksi, ip_client, akses_type, user_agent
) VALUES (
    'CIF_PERORANGAN', 'APPROVE', '123456789', 'BONBON', NULL, '20260812113000', '192.168.1.83', 'WEB-LAN', 'Mozilla/5.0'
);

SET PARSEONLY OFF;
"@
    $cmd.ExecuteNonQuery()
    Write-Host "Insert Queries SQL Syntax parsing SUCCESSFUL!"
} catch {
    Write-Host "Insert Queries Syntax Error: $_"
} finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) {
        $conn.Close()
    }
}

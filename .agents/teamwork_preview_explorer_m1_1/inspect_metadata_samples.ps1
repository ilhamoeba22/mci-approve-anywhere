$connStr = "Server=192.168.1.130,44333;Database=MCI_JULI_31072026;User Id=sa;Password=bon;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    
    $tables = @('USERPROFILE', 'WEBUSERSESSION', 'WEBUSERLOG')
    
    foreach ($table in $tables) {
        Write-Host "=========================================="
        Write-Host "DETAILED METADATA: $table"
        Write-Host "=========================================="
        
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = @"
SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    COLUMNPROPERTY(OBJECT_ID(c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME = '$table'
ORDER BY c.ORDINAL_POSITION
"@
        $reader = $cmd.ExecuteReader()
        
        while ($reader.Read()) {
            $col = $reader["COLUMN_NAME"]
            $type = $reader["DATA_TYPE"]
            $len = $reader["CHARACTER_MAXIMUM_LENGTH"]
            $prec = $reader["NUMERIC_PRECISION"]
            $scale = $reader["NUMERIC_SCALE"]
            $null = $reader["IS_NULLABLE"]
            $def = $reader["COLUMN_DEFAULT"]
            $isId = $reader["IS_IDENTITY"]
            
            $detail = "$type"
            if ($type -in ('varchar','nvarchar','char','nchar')) {
                if ($len -eq -1) { $detail += "(max)" } else { $detail += "($len)" }
            } elseif ($type -in ('numeric','decimal')) {
                $detail += "($prec,$scale)"
            }
            
            $flags = ""
            if ($null -eq "NO") { $flags += "NOT NULL " } else { $flags += "NULL " }
            if ($isId -eq 1) { $flags += "IDENTITY " }
            if ($def -ne [DBNull]::Value) { $flags += "DEFAULT $def" }
            
            Write-Host ("{0,-20} | {1,-18} | {2}" -f $col, $detail, $flags)
        }
        $reader.Close()
        
        # Primary key
        $cmdPK = $conn.CreateCommand()
        $cmdPK.CommandText = "SELECT k.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME WHERE t.TABLE_NAME = '$table' AND t.CONSTRAINT_TYPE = 'PRIMARY KEY'"
        $readerPK = $cmdPK.ExecuteReader()
        $pks = @()
        while ($readerPK.Read()) {
            $pks += $readerPK["COLUMN_NAME"]
        }
        $readerPK.Close()
        Write-Host "PRIMARY KEY: $(if ($pks.Count -gt 0) { $pks -join ', ' } else { 'NONE' })"
        Write-Host ""
    }
    
    # Sample queries
    Write-Host "=========================================="
    Write-Host "SAMPLE DATA FROM USERPROFILE (TOP 5 active users with levelx A/M/S/U)"
    Write-Host "=========================================="
    $cmdSample = $conn.CreateCommand()
    $cmdSample.CommandText = "SELECT TOP 10 userid, nmuser, pass, levelx, stsaktiv, kdloc, kdcab FROM USERPROFILE WHERE stsaktiv = '1' OR stsaktiv IS NOT NULL"
    $rSample = $cmdSample.ExecuteReader()
    while ($rSample.Read()) {
        Write-Host ("userid: {0,-10} | nmuser: {1,-20} | pass: {2,-15} | levelx: {3,-2} | stsaktiv: {4,-2} | kdloc: {5,-3} | kdcab: {6,-3}" -f $rSample["userid"], $rSample["nmuser"], $rSample["pass"], $rSample["levelx"], $rSample["stsaktiv"], $rSample["kdloc"], $rSample["kdcab"])
    }
    $rSample.Close()

    Write-Host "`n=========================================="
    Write-Host "SAMPLE DATA FROM WEBUSERSESSION (TOP 5)"
    Write-Host "=========================================="
    $cmdSess = $conn.CreateCommand()
    $cmdSess.CommandText = "SELECT TOP 5 userid, appid, sessionid FROM WEBUSERSESSION"
    $rSess = $cmdSess.ExecuteReader()
    while ($rSess.Read()) {
        Write-Host ("userid: {0} | appid: {1} | sessionid: {2}" -f $rSess["userid"], $rSess["appid"], $rSess["sessionid"])
    }
    $rSess.Close()

    Write-Host "`n=========================================="
    Write-Host "SAMPLE DATA FROM WEBUSERLOG (TOP 5)"
    Write-Host "=========================================="
    $cmdLog = $conn.CreateCommand()
    $cmdLog.CommandText = "SELECT TOP 5 id, userid, appid, inptgljam, ip_address, lokasi, description FROM WEBUSERLOG ORDER BY id DESC"
    $rLog = $cmdLog.ExecuteReader()
    while ($rLog.Read()) {
        Write-Host ("id: {0} | userid: {1} | appid: {2} | inptgljam: {3} | ip: {4} | loc: {5} | desc: {6}" -f $rLog["id"], $rLog["userid"], $rLog["appid"], $rLog["inptgljam"], $rLog["ip_address"], $rLog["lokasi"], $rLog["description"])
    }
    $rLog.Close()

} catch {
    Write-Host "Error: $_"
} finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) {
        $conn.Close()
    }
}

$connStr = "Server=192.168.1.130,44333;Database=MCI_JULI_31072026;User Id=sa;Password=bon;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    Write-Host "Connected successfully to 192.168.1.130:44333!"
    
    $tables = @('USERPROFILE', 'WEBUSERSESSION', 'WEBUSERLOG', 'WA_OTR_LOG', 'WEBUSERPROFILE')
    
    foreach ($table in $tables) {
        Write-Host "=========================================="
        Write-Host "TABLE: $table"
        Write-Host "=========================================="
        
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '$table' ORDER BY ORDINAL_POSITION"
        $reader = $cmd.ExecuteReader()
        
        $found = $false
        while ($reader.Read()) {
            $found = $true
            $col = $reader["COLUMN_NAME"]
            $type = $reader["DATA_TYPE"]
            $len = $reader["CHARACTER_MAXIMUM_LENGTH"]
            $prec = $reader["NUMERIC_PRECISION"]
            $scale = $reader["NUMERIC_SCALE"]
            $null = $reader["IS_NULLABLE"]
            
            $detail = "$type"
            if ($len -ne [DBNull]::Value) { $detail += "($len)" }
            elseif ($prec -ne [DBNull]::Value) { $detail += "($prec,$scale)" }
            
            Write-Host ("{0,-20} | {1,-18} | NULLABLE: {2}" -f $col, $detail, $null)
        }
        $reader.Close()
        
        if (-not $found) {
            Write-Host "Table '$table' NOT FOUND in DB."
        }
        
        # Check Primary Keys
        $cmdPK = $conn.CreateCommand()
        $cmdPK.CommandText = "SELECT k.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS t JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME WHERE t.TABLE_NAME = '$table' AND t.CONSTRAINT_TYPE = 'PRIMARY KEY'"
        $readerPK = $cmdPK.ExecuteReader()
        $pks = @()
        while ($readerPK.Read()) {
            $pks += $readerPK["COLUMN_NAME"]
        }
        $readerPK.Close()
        if ($pks.Count -gt 0) {
            Write-Host "PRIMARY KEY: $($pks -join ', ')"
        }
        
        Write-Host ""
    }

} catch {
    Write-Host "Error: $_"
} finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) {
        $conn.Close()
    }
}

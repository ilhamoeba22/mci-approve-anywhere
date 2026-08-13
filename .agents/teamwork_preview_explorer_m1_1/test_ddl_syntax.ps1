$connStr = "Server=192.168.1.130,44333;Database=MCI_JULI_31072026;User Id=sa;Password=bon;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SET PARSEONLY ON;
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WA_OTR_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WA_OTR_LOG] (
        [id]         BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [modul]      VARCHAR(30) NOT NULL,
        [aksi]       VARCHAR(10) NOT NULL,
        [ref_id]     VARCHAR(100) NOT NULL,
        [userid]     VARCHAR(10) NOT NULL,
        [catatan]    NVARCHAR(500) NULL,
        [tgl_aksi]   VARCHAR(14) NOT NULL,
        [ip_client]  VARCHAR(50) NULL,
        [akses_type] VARCHAR(10) NULL,
        [user_agent] NVARCHAR(255) NULL
    );
END
SET PARSEONLY OFF;
"@
    $cmd.ExecuteNonQuery()
    Write-Host "DDL SQL Syntax parsing SUCCESSFUL!"
} catch {
    Write-Host "DDL Syntax Error: $_"
} finally {
    if ($conn.State -eq [System.Data.ConnectionState]::Open) {
        $conn.Close()
    }
}

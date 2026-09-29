@echo off
title MCI ApproveAnywhere - Deployment ke VPS Hosting
color 0A
echo ===================================================================
echo     MCI APPROVEANYWHERE - DEPLOYMENT OTOMATIS KE HOSTING VPS
echo ===================================================================
echo.
echo Menjalankan proses upload file via SFTP dan reload PM2 di server...
echo Server : approveanywhere.bprshikmciyk.co.id (202.10.43.50:2223)
echo.

node "%~dp0scripts\deploy.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    color 0C
    echo [ERROR] Deployment gagal! Periksa koneksi internet atau data login SSH.
    echo.
) else (
    echo.
    echo [SUKSES] Seluruh file telah ter-deploy dan backend berhasil di-reload!
    echo.
)

pause

# Original User Request

## 2026-08-12T04:33:17Z

Pengembangan Web App Otorisasi Core Banking MitraSoft yang memungkinkan supervisor/checker melakukan otorisasi & penolakan data pending (CIF Perorangan & Badan Hukum, Tabungan, Deposito, Pembiayaan, Transaksi, Aset, Jaminan, Kondisi Khusus) secara real-time dari LAN maupun luar jaringan, meng-update database SQL Server (192.168.1.130:44333) secara 100% identik dengan aplikasi CBS Desktop.

Working directory: D:\Kerjaan\BASE AI\PROSES OTORISASI CIF
Integrity mode: development

## Requirements

### R1. Web Backend & Database Integration
Express.js Node.js REST API yang terhubung ke SQL Server database (192.168.1.130:44333, DB: MCI_JULI_31072026 / test eoy, sa/bon) untuk otorisasi (Approve & Reject dengan catatan) pada 8 modul utama dengan update status (stsrec='A' / ststrn='1'), autuser, auttgl (yyyyMMddHHmmss), dan autterm ('WEB-LAN'/'WEB-EXT').

### R2. Responsive Mobile & Desktop Frontend Interface
Antarmuka Web Dashboard (HTML5, Vanilla CSS, JS) modern, responsif, dan fungsional dengan ringkasan pending data per modul, filter/search, detail view permohonan, aksi Approve/Reject, dan riwayat audit trail.

### R3. Authentication & Security Audit Trail
Sistem login menggunakan tabel USERPROFILE (menguji password dan level otorisasi M/S/A), session management, serta logging audit eksternal ke WEBUSERLOG dan WA_OTR_LOG mencatat IP address, lokasi, dan user-agent.

## Acceptance Criteria

### Verification & Functionality
- [ ] Backend API berhasil terhubung ke SQL Server dan menyediakan endpoint otorisasi untuk 8 modul (mCIF, TOFTABB, TOFDEP, TOFTRNC, TOFLMB, TOFASET, TOFJAMIN, TOFSPC).
- [ ] Approval memperbarui status record (stsrec='A' / ststrn='1') dan kolom audit otorisasi (autuser, auttgl, autterm) secara 100% presisi sesuai spesifikasi DB MitraSoft.
- [ ] Rejection memperbarui status reject dan menyimpan catatan alasan penolakan.
- [ ] Log akses audit mencatat IP client (LAN vs EXTERNAL) secara akurat.
- [ ] Frontend responsif dan dapat diakses dengan nyaman via Smartphone maupun PC Desktop.

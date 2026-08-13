# 🏦 MCI Approve Anywhere — Portal Otorisasi Core Banking System (CSBO MitraSoft)

Portal Web Otorisasi Core Banking System terpadu untuk **PT BPR Syariah Harta Insan Karimah MCI (Grup HIK)**. Portal ini memungkinkan Pejabat dan Supervisor (Level A, M, S) untuk melakukan peninjauan, persetujuan (*approval*), dan penolakan (*rejection*) data transaksi pending secara *real-time* dari jaringan LAN maupun luar kantor (VPN/External) yang terhubung 100% presisi ke Database SQL Server Core Banking MitraSoft.

---

## 🌟 Fitur Utama

- **8 Modul Otorisasi Core Banking**:
  1. 👤 **CIF Perorangan** (Nasabah Individu Sesuai ID & SLIK)
  2. 🏢 **CIF Badan Hukum** (Nasabah PT, CV, Koperasi, BMT)
  3. 💳 **Tabungan** (Pembukaan Rekening Baru & Setoran Awal)
  4. 🏦 **Deposito** (Bilyet Deposito & Nominal Investment)
  5. 📜 **Pembiayaan** (Kontrak Pinjaman & Plafon Debitur)
  6. 💸 **Transaksi Keuangan** (Jurnal Teller & Batch Transfer)
  7. 🖥️ **Aset & Inventaris** (Perolehan Aset Bank)
  8. 🏠 **Jaminan / Agunan** (Pendaftaran Agunan & Appraisal Value)
  9. ⚡ **Dispensasi / Kondisi Khusus** (TOFSPC 10 Tipe Dispensasi)

- **Keamanan & Otorisasi**:
  - Dual-Token Architecture (Short-lived Access Token 15 menit & Refresh Token 24 jam via **HttpOnly Cookies**).
  - Monitoring Inaktivitas Otomatis (Auto-Logout setelah 15 menit tanpa aktivitas).
  - RBAC Dinamis (Sesuai `levelx`, `limitldr`, `limitcdr`, `akses` pada tabel `USERPROFILE`).
  - Audit Trail Ganda (*System Log* `WEBUSERLOG` & `WA_OTR_LOG` yang mencatat IP Address, Tipe Akses WEB-LAN / WEB-EXT, User-Agent, & Ref ID).

- **Antarmuka & Pengalaman Pengguna**:
  - Tema Ganda (**Mode Terang Soft UI** Default & **Mode Gelap**).
  - Drawer Detail Lengkap (Informasi 100-kolom mCIF, Sandi Pelaporan OJK 010, Golcust SLIK 32, PNS flag, & Audit Maker).
  - Responsif di Smartphone, Tablet, & PC Desktop.

---

## 🚀 Panduan Jalankan Aplikasi

### 1. Requirements
- **Node.js**: v18.0.0 atau versi yang lebih baru.
- **SQL Server**: Terhubung ke Database MitraSoft CBS (`BPRS_MCI` / `MCI_JULI_31072026`).

### 2. Instalasi Backend & Frontend
```bash
cd backend
npm install
npm start
```

Aplikasi web dapat diakses melalui browser di:
👉 `http://localhost:3000` atau `http://192.168.1.83:3000`

---

## 🧪 Pengujian Automated E2E Test Suite

Untuk menjalankan pengujian otomatis 242 test case (Tier 1 s/d Tier 4):
```bash
node tests/e2e_runner.js
```

---
© 2026 PT BPR Syariah Harta Insan Karimah MCI — Core Banking System Authorization Portal.

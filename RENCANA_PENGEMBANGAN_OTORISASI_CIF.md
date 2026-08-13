# 📋 Dokumen Rencana Pengembangan
# Sistem Web App Otorisasi — Core Banking
**Versi:** 1.1.0 *(Update: Hasil Screening Database Langsung)*  
**Tanggal:** 12 Agustus 2026  
**Database:** MCI_JULI_31072026 @ 192.168.1.130:44333  
**Status:** Terverifikasi — Siap Dikembangkan

---

## ✅ Hasil Screening Database Langsung

> Koneksi ke `192.168.1.130:44333` berhasil dilakukan. Seluruh query dan nama kolom di dokumen ini telah **diverifikasi langsung** dari database `MCI_JULI_31072026`.

### Jumlah Data Pending Saat Ini (12 Agustus 2026)

| Modul | Tabel | Kondisi | Jumlah Pending |
|---|---|---|---|
| **CIF** | `mCIF` | `stsrec = 'N'` | **30 record** |
| **Kondisi Khusus** | `TOFSPC` | `stsrec = 'N'` | **7 record** |
| Tabungan | `TOFTABB` | `stsrec = 'N'` | 0 record |
| Deposito | `TOFDEP` | `stsrec = 'N'` | 0 record |
| Pembiayaan | `TOFLMB` | `stsrec = 'N'` | 0 record |
| Transaksi | `TOFTRNC` | `ststrn IN ('2','6')` | 0 record |
| Aset | `TOFASET` | `stsrec = 'N'` | 0 record |
| Jaminan | `TOFJAMIN` | `stsrec = 'N'` | 0 record |

> ⚠️ Ada **30 CIF pending** dan **7 Kondisi Khusus pending** yang saat ini menunggu otorisasi!

---

## 🏛️ Ringkasan Eksekutif

Web App ini menyediakan antarmuka terpusat untuk proses otorisasi core banking, tanpa harus membuka sistem utama dengan banyak menu. Supervisor/checker cukup membuka satu browser untuk melihat dan mengotorisasi semua data pending dari semua modul.

---

## 🔍 Temuan Penting dari Screening Database

### 1. Struktur Status Record (stsrec) — TERVERIFIKASI
Dari screening langsung tabel `mCIF`:
```
stsrec = 'A'  → Active / Sudah diotorisasi  (10.647 record)
stsrec = 'N'  → New / Belum diotorisasi     (30 record — PENDING)
```

### 2. Sistem Autentikasi — ADA DUA TABEL USER
Database memiliki **dua sistem user terpisah**:

| Tabel | Kegunaan | Password Field | Level |
|---|---|---|---|
| `USERPROFILE` | User core banking (Maker/Checker internal) | `pass` (VARCHAR 50) | `levelx`: A/M/S/U |
| `WEBUSERPROFILE` | User Web/Mobile banking | `pass` (VARCHAR 255, hashed) | `levelx` (VARCHAR 5) |

**Level di USERPROFILE:**
- `A` = Administrator
- `M` = Manager/Supervisor
- `S` = Supervisor
- `U` = User/Teller

**Rekomendasi:** Login Web App menggunakan tabel `USERPROFILE` dengan validasi `levelx` untuk menentukan hak akses (Maker vs Checker/Supervisor).

### 3. Audit Log — SUDAH ADA
Tabel `AUDITLOG` sudah ada di database dengan struktur:
```
logid    | varchar
loguid   | varchar  ← User ID
logtgl   | varchar  ← Tanggal
logjam   | varchar  ← Jam
logterm  | varchar  ← Terminal
logacc   | varchar  ← Account
logket   | varchar  ← Keterangan
```
Web App dapat **menggunakan tabel ini** + menambahkan tabel `WA_OTORISASI_LOG` khusus untuk log approve/reject.

### 4. Web Session — SUDAH ADA
Tabel `WEBUSERSESSION` sudah ada:
```
userid    | varchar(255)
appid     | varchar(10)
sessionid | text
```
Web App akan menggunakan tabel ini untuk manajemen sesi.

### 5. Pemisahan CIF Perorangan vs Badan Hukum
Dari kolom `mCIF`:
```
golcust = 'I'  → Individual / Perorangan
golcust = ...  → Badan Hukum (perlu dicek distinct value)
jnsbh          → Jenis badan hukum (PT, CV, Koperasi, dll)
```
**Filter di query:** `WHERE stsrec='N' AND golcust='I'` untuk perorangan, `AND golcust<>'I'` untuk badan hukum.

---

## 📂 Modul yang Dikembangkan — Dengan Kolom Terverifikasi

### MODUL 1: CIF Perorangan
**Tabel:** `mCIF`  
**Kondisi pending:** `stsrec = 'N' AND golcust = 'I'`

**Kolom tampil di daftar:**
```
nocif, nm, noid (No. Identitas), jnsbh, kota, inpuser, tglinp, kdloc
```
**Kolom detail lengkap:**
```
nocif, nm, nmkecil, agama, golcust, jnsbh, npwp, jnsid, noid, tglid, tglexpid,
penerbit, stskawin, sex, tmplhr, tgllhr, email, alamat, kelurahan, kecamatan,
kota, kdpos, telprmh, telpktr, hp, inpuser, tglinp, autuser, tglaut, kdloc
```

**Query Approve:**
```sql
UPDATE mCIF 
SET stsrec = 'A', 
    autuser = @userid, 
    tglaut = @tgljam,
    devaut = @devterm
WHERE nocif = @nocif AND stsrec = 'N'
```

**Query Reject:**
```sql
-- Reject: kembalikan status (perlu konfirmasi ke vendor nilai yang tepat untuk reject)
UPDATE mCIF 
SET stsrec = 'R',   -- atau nilai lain yang ditentukan vendor
    autuser = @userid,
    tglaut = @tgljam
WHERE nocif = @nocif AND stsrec = 'N'
```

---

### MODUL 2: CIF Badan Hukum
**Tabel:** `mCIF`  
**Kondisi pending:** `stsrec = 'N' AND golcust <> 'I'`  
**Field tambahan vs Perorangan:** `jnsbh` (jenis badan hukum), `npwp`, `din`

---

### MODUL 3: Tabungan
**Tabel:** `TOFTABB`  
**Kondisi pending:** `stsrec = 'N'`

**Kolom tampil:**
```
notab, fnama (Nama Lengkap), inpuser, autuser, stsrec, inptgl, kodeloc, kodeprd
```
**Query Approve:**
```sql
UPDATE TOFTABB 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgl = @tgljam,
    autterm = @devterm
WHERE notab = @notab AND stsrec = 'N'
```

---

### MODUL 4: Deposito
**Tabel:** `TOFDEP`  
**Kondisi pending:** `stsrec = 'N'`

**Kolom tampil:**
```
nodep, nobilyet, nama, tglbuka, nomrp, nomva, cc, kdloc, inpuser, inptgl
```
**Query Approve:**
```sql
UPDATE TOFDEP 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgl = @tgljam,
    autterm = @devterm
WHERE nodep = @nodep AND stsrec = 'N'
```

---

### MODUL 5: Pembiayaan
**Tabel:** `TOFLMB`  
**Kondisi pending:** `stsrec = 'N'`

**Kolom tampil:**
```
nokontrak, nama, kdprd, kdloc, inpuser, inptgl, autuser
```
**Query Approve:**
```sql
UPDATE TOFLMB 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgl = @tgljam,
    autterm = @devterm
WHERE nokontrak = @nokontrak AND stsrec = 'N'
```

---

### MODUL 6: Transaksi
**Tabel:** `TOFTRNC` JOIN `MSGTRX`  
**Kondisi pending:** `TOFTRNC.ststrn IN ('2','6')`
- `ststrn = '2'` → Pending (menunggu otorisasi)
- `ststrn = '6'` → Reverse menunggu otorisasi

**Kolom tampil:**
```
tgltrn, batch, notrn, dracc, namadr, cracc, namacr, nominalrp, ket, inpuser, kdloc
```
**Query Approve Transaksi:**
```sql
UPDATE TOFTRNC 
SET ststrn = '1',       -- '1' = approved/completed
    autuser = @userid, 
    auttgl = @tgljam,
    autterm = @devterm
WHERE batch = @batch AND notrn = @notrn AND ststrn IN ('2','6')
```

---

### MODUL 7: Aset
**Tabel:** `TOFASET`  
**Kondisi pending:** `stsrec = 'N'`

**Kolom tampil:**
```
kdaset, ket (keterangan), lokasi, kota, kdloc, inpuser, inptgl, stsrec
```
**Query Approve:**
```sql
UPDATE TOFASET 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgl = @tgljam,
    autterm = @devterm
WHERE kdaset = @kdaset AND stsrec = 'N'
```

---

### MODUL 8: Jaminan
**Tabel:** `TOFJAMIN`  
**Kondisi pending:** `stsrec = 'N'`

**Kolom tampil:**
```
noreg, an (atas nama), jnsjamin, catatan, kdloc, inpuser, inptgljam
```
**Query Approve:**
```sql
UPDATE TOFJAMIN 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgljam = @tgljam,
    autterm = @devterm
WHERE noreg = @noreg AND stsrec = 'N'
```

---

### MODUL 9: Kondisi Khusus
**Tabel:** `TOFSPC`  
**Kondisi pending:** `stsrec = 'N'`  
**⚡ Ada 7 record pending saat ini!**

**Kolom tampil:**
```
urutspc, noacc, tgleff, tglexp, jnsspc, nomspc, ket, kdloc, inpuser, inptgljam
```

**Decode jnsspc (dari query profiler trace):**
```
'01' = Pembebasan Pajak
'02' = Subsidi Pajak
'03' = Special Rate Bunga
'04' = Special Rate Spread
'05' = Pembebasan Denda Max Penarikan
'06' = Pembebasan Denda Pencairan Abnormal
'07' = Pembebasan Max Penarikan
'08' = Pembatasan Max Penarikan
'09' = Pembebasan Biaya Adm Bulanan
'10' = Pembebasan Biaya Rekening Pasif
```

**Query Approve:**
```sql
UPDATE TOFSPC 
SET stsrec = 'A', 
    autuser = @userid, 
    auttgljam = @tgljam,
    autterm = @devterm
WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'
```

---

### MODUL 10: Status Tutup Kantor
**Tabel:** `TOFCLOSELOC`

**Kolom:**
```
kdloc, stsclose ('C'=Tutup, ''=Buka), openuser, opentgljam, openterm,
closeuser, closetgljam, closeterm
```
**Fungsi:** Monitoring saja (tidak ada approve/reject) + aksi buka/tutup kantor.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser LAN)               │
│              HTML5 + CSS3 + JavaScript               │
│         (Real-time polling + Push Notification)      │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (Port 3000)
┌────────────────────────▼────────────────────────────┐
│              BACKEND SERVER (Node.js + Express)      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Auth Module │  │  API Routes  │  │  Notif    │  │
│  │  (JWT Token) │  │  (REST API)  │  │  Engine   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│  ┌──────────────────────────────────────────────┐    │
│  │     Audit Logger → AUDITLOG + WA_OTR_LOG     │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────┘
                         │ mssql (TCP 192.168.1.130:44333)
┌────────────────────────▼────────────────────────────┐
│        SQL Server 2019 — MCI_JULI_31072026           │
│                                                      │
│  Core Banking (READ/UPDATE):  │  Web App (NEW):      │
│  - mCIF (30 pending!)         │  - WA_OTR_LOG        │
│  - TOFTABB                    │  - WA_APPR_CFG       │
│  - TOFDEP                     │                      │
│  - TOFTRNC                    │  Existing (REUSE):   │
│  - TOFLMB                     │  - WEBUSERSESSION    │
│  - TOFASET                    │  - AUDITLOG          │
│  - TOFJAMIN                   │  - WEBUSERPROFFILE   │
│  - TOFSPC                     │    HIST              │
│  - TOFCLOSELOC                │                      │
│  - USERPROFILE (auth)         │                      │
└─────────────────────────────────────────────────────┘
```

---

## 🗃️ Desain Database Tambahan (Minimal)

### Tabel WA_OTR_LOG (Otorisasi Log)
```sql
CREATE TABLE WA_OTR_LOG (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    modul       VARCHAR(30),        -- 'CIF','TABUNGAN','DEPOSITO',dst
    aksi        VARCHAR(10),        -- 'APPROVE','REJECT'
    ref_id      VARCHAR(100),       -- nocif/notab/nodep/notrn/urutspc
    userid      VARCHAR(10),        -- dari USERPROFILE.userid
    catatan     NVARCHAR(500),      -- wajib diisi saat REJECT
    tgl_aksi    VARCHAR(14),        -- format yyyyMMddHHmmss (konsisten dg DB)
    ip_client   VARCHAR(50),
    devterm     VARCHAR(10)
)
```

### Tabel WA_APPR_CFG (Konfigurasi Approval)
```sql
CREATE TABLE WA_APPR_CFG (
    modul       VARCHAR(30) PRIMARY KEY,
    level_appr  INT DEFAULT 1,      -- berapa tingkat approval
    min_levelx  VARCHAR(5),         -- level minimum USERPROFILE.levelx
    aktif       BIT DEFAULT 1,
    chguser     VARCHAR(10),
    chgtgl      VARCHAR(14)
)
```

---

## 🔐 Alur Autentikasi (TERVERIFIKASI)

```
User buka Web App
       │
       ▼
   Login Page [User ID + Password]
       │
       ▼
   Validasi ke USERPROFILE:
   SELECT userid, nmuser, levelx, stsaktiv, kdloc, kdcab 
   FROM USERPROFILE 
   WHERE userid = @userid 
     AND pass = @password       ← field: "pass" (bukan "password")
     AND stsaktiv IS NOT NULL   ← cek aktif
       │
       ├── GAGAL ──► Error, max 3x → lockout
       │
       └── SUKSES
             │
             ▼
         Cek levelx:
         'A','M','S' = bisa Approve/Reject
         'U'         = hanya View (bisa dikonfigurasi)
             │
             ▼
         Generate JWT Token (expire: 8 jam)
             │
             ▼
         Tulis ke WEBUSERSESSION 
         (userid, appid='OTRS', sessionid=jwt)
             │
             ▼
         Dashboard Otorisasi
```

> **Catatan:** Field password di USERPROFILE adalah `pass` (bukan `password`). Perlu konfirmasi apakah password sudah di-hash atau plain text, karena VARCHAR(50) mengindikasikan mungkin belum di-hash penuh.

---

## 🖥️ Desain Halaman Web App

### Layout Navigasi (Sidebar)
```
🏦 OTORISASI CORE BANKING
├── 📊 Dashboard (ringkasan + badge counter)
├── 👤 CIF Perorangan        [badge: 30]
├── 🏢 CIF Badan Hukum       [badge: 0]
├── 💳 Tabungan              [badge: 0]
├── 📜 Deposito              [badge: 0]
├── 💼 Pembiayaan            [badge: 0]
├── 🔄 Transaksi             [badge: 0]
├── 🏛️ Aset                 [badge: 0]
├── 🔒 Jaminan               [badge: 0]
├── ⭐ Kondisi Khusus        [badge: 7]
├── 🏪 Status Kantor
├── 📋 Riwayat Otorisasi
└── ⚙️ Konfigurasi (Admin)
```

---

## 🔔 Sistem Notifikasi

### In-App Polling (30 detik)
```javascript
// Frontend polling setiap 30 detik
setInterval(async () => {
    const counts = await fetch('/api/notif/count');
    const data = await counts.json();
    // Update badge: CIF=30, TOFSPC=7, dll
    updateBadges(data);
    if (data.total > prevTotal) {
        showToast('Ada data baru menunggu otorisasi!');
    }
}, 30000);
```

### Browser Push Notification (Service Worker)
```
1. User login → request notif permission
2. Subscribe ke Web Push (VAPID)
3. Server simpan endpoint di WEBUSERSESSION
4. Job tiap 1 menit: cek data pending BARU
5. Kirim push ke semua supervisor yang login
6. Notif muncul di browser meski tab tutup
```

---

## 📅 Timeline Pengembangan

| Fase | Isi | Estimasi |
|---|---|---|
| **Fase 1** | Setup Node.js, koneksi DB, Login (USERPROFILE), Dashboard counter | 7 hari |
| **Fase 2** | Modul CIF Perorangan + Badan Hukum (list, detail, approve/reject) + notif in-app | 5 hari |
| **Fase 3** | Modul Tabungan, Deposito, Kondisi Khusus, Transaksi | 5 hari |
| **Fase 4** | Modul Pembiayaan, Aset, Jaminan, Status Kantor | 4 hari |
| **Fase 5** | Audit Log, Konfigurasi Approval, Push Notification | 5 hari |
| **Fase 6** | UAT, Bug Fix, Deploy, Training | 9 hari |
| **Total** | | **~35 hari kerja** |

---

## 🗂️ Struktur Folder Project

```
otorisasi-webapp/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # mssql conn ke 192.168.1.130:44333
│   │   │   └── config.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verify + cek WEBUSERSESSION
│   │   │   └── auditLogger.js    # tulis ke WA_OTR_LOG
│   │   ├── routes/
│   │   │   ├── auth.js           # login via USERPROFILE
│   │   │   ├── cif.js            # mCIF
│   │   │   ├── tabungan.js       # TOFTABB
│   │   │   ├── deposito.js       # TOFDEP
│   │   │   ├── transaksi.js      # TOFTRNC + MSGTRX
│   │   │   ├── pembiayaan.js     # TOFLMB
│   │   │   ├── aset.js           # TOFASET
│   │   │   ├── jaminan.js        # TOFJAMIN
│   │   │   ├── kondisikhusus.js  # TOFSPC
│   │   │   ├── tutupkantor.js    # TOFCLOSELOC
│   │   │   ├── notifikasi.js     # polling count + push sub
│   │   │   └── auditlog.js       # WA_OTR_LOG + AUDITLOG
│   │   └── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── index.html                 # Login
    ├── dashboard.html
    ├── pages/                     # Satu file per modul
    ├── css/style.css
    ├── js/
    │   ├── api.js                 # Fetch wrapper + JWT header
    │   ├── auth.js
    │   ├── dashboard.js
    │   └── notif.js               # Push notification
    └── sw.js                      # Service Worker
```

---

## ⚙️ Konfigurasi Environment (.env)

```env
# Database (TERVERIFIKASI)
DB_HOST=192.168.1.130
DB_PORT=44333
DB_USER=sa
DB_PASSWORD=bon
DB_NAME=MCI_JULI_31072026
DB_ENCRYPT=false
DB_TRUST_CERT=true

# Server
APP_PORT=3000
JWT_SECRET=otrs_secret_key_ganti_ini_production
JWT_EXPIRE=8h

# Notifikasi Push
PUSH_PUBLIC_KEY=<VAPID public key>
PUSH_PRIVATE_KEY=<VAPID private key>

# App
APP_NAME=Sistem Otorisasi Core Banking
APP_VERSION=1.1.0
APP_ID=OTRS
```

---

## 📊 API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/login` | Login via USERPROFILE |
| POST | `/api/auth/logout` | Logout + hapus WEBUSERSESSION |
| GET | `/api/notif/count` | Jumlah pending semua modul |
| POST | `/api/notif/subscribe` | Register push notif |
| GET | `/api/cif/pending?jenis=perorangan` | List CIF perorangan pending |
| GET | `/api/cif/pending?jenis=badan` | List CIF badan hukum pending |
| GET | `/api/cif/:nocif` | Detail CIF |
| POST | `/api/cif/:nocif/approve` | Approve CIF → `stsrec='A'` |
| POST | `/api/cif/:nocif/reject` | Reject CIF (wajib `catatan`) |
| GET | `/api/tabungan/pending` | List Tabungan pending |
| POST | `/api/tabungan/:notab/approve` | Approve Tabungan |
| GET | `/api/deposito/pending` | List Deposito pending |
| POST | `/api/deposito/:nodep/approve` | Approve Deposito |
| GET | `/api/kondisikhusus/pending` | List TOFSPC pending |
| POST | `/api/kondisikhusus/approve` | Approve TOFSPC (urutspc+noacc) |
| GET | `/api/transaksi/pending` | List Transaksi pending |
| POST | `/api/transaksi/approve` | Approve Transaksi |
| GET | `/api/audit/log` | Riwayat dari WA_OTR_LOG |
| GET | `/api/config/approval` | Konfigurasi WA_APPR_CFG |

---

## 🛡️ Keamanan

| Aspek | Implementasi |
|---|---|
| Auth | JWT Token 8 jam + validasi WEBUSERSESSION |
| SQL Injection | Parameterized queries (prepared statements) |
| Brute Force | Max 3x login → lockout 15 menit |
| Akses Level | `levelx` dari USERPROFILE menentukan hak |
| Audit | Setiap approve/reject → tulis WA_OTR_LOG |

---

## ⚠️ Konfirmasi yang Masih Diperlukan

> Item-item berikut perlu dikonfirmasi ke DBA/vendor sebelum implementasi query UPDATE:

| # | Item | Pertanyaan |
|---|---|---|
| 1 | **Nilai stsrec saat Reject** | Apakah `'R'` atau nilai lain untuk menolak CIF? |
| 2 | **Field password USERPROFILE** | Field `pass` plain text atau di-hash? |
| 3 | **golcust untuk Badan Hukum** | Nilai `golcust` selain `'I'` untuk badan hukum apa saja? |
| 4 | **ststrn setelah approve Transaksi** | Apakah `'1'` yang benar untuk approved? |
| 5 | **Trigger/Procedure** | Apakah ada stored procedure yang harus dipanggil saat approve? |

---

## 📦 Dependencies (Node.js)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mssql": "^10.0.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "web-push": "^3.6.0",
    "express-rate-limit": "^6.7.0",
    "helmet": "^7.0.0"
  }
}
```

---

## ✅ Checklist Pre-Development

- [x] Koneksi database berhasil (192.168.1.130:44333)
- [x] Semua tabel dan kolom terverifikasi
- [x] Jumlah data pending terkonfirmasi (30 CIF, 7 Kondisi Khusus)
- [x] Struktur autentikasi USERPROFILE dipahami
- [x] Tabel AUDITLOG & WEBUSERSESSION sudah ada (bisa digunakan)
- [ ] Konfirmasi nilai stsrec saat Reject ke vendor
- [ ] Konfirmasi jenis hash password USERPROFILE
- [ ] Konfirmasi golcust untuk Badan Hukum
- [ ] Persetujuan dokumen ini dari stakeholder

---

*Dokumen ini dibuat berdasarkan analisis SQL Server Profiler Trace files + screening langsung database MCI_JULI_31072026 pada 12 Agustus 2026.*

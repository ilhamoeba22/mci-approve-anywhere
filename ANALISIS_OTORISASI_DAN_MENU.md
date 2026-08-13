# 🔐 Analisis Proses Otorisasi — Sistem CSBO19 MitraSoft
**Tanggal:** 12 Agustus 2026 | **Database:** MCI_JULI_31072026 @ 192.168.1.130:44333

---

## 1️⃣ APA YANG DIUPDATE SAAT PROSES OTORISASI?

### Pola Tiga Set Kolom Tracking (Semua Tabel)

```
MAKER (Input):        PERUBAHAN (Edit):     OTORISASI (Checker):
─────────────────     ─────────────────     ──────────────────────
inpuser               chguser               autuser   ← siapa approve
tglinp/inptgljam      chgtgl/chgtgljam      tglaut/auttgl/auttgljam
inpterm               chgterm               autterm   ← terminal checker
devinp                devchg                devaut    ← device checker
```

### Yang Diupdate Saat APPROVE:

| Kolom | Nilai | Keterangan |
|---|---|---|
| `stsrec` | `'A'` | **Status utama** — dari `'N'` → `'A'` (Approved/Active) |
| `autuser` | userid checker | User ID supervisor yang approve |
| `tglaut` / `auttgl` / `auttgljam` | `yyyyMMddHHmmss` | Timestamp otorisasi |
| `autterm` | nama terminal/login | Terminal workstation checker |
| `devaut` | device id | Device yang digunakan checker |

---

## 2️⃣ CARA MEMBACA `autterm`

**Data real dari TOFTABB (terverifikasi langsung dari DB):**
```
notab=1210100068 | inpterm=NADHOFA | autterm=NADHOFA | autuser=TYAH
notab=1210100076 | inpterm=TELLER2 | autterm=TELLER2 | autuser=NADHOFA
notab=1210100064 | inpterm=NADHOFA | autterm=NADHOFA | autuser=NADHOFA
```

**Kesimpulan:**

| Kolom | Arti | Contoh |
|---|---|---|
| `inpterm` | Nama terminal/login **si Maker** saat input | `NADHOFA` |
| `autterm` | Nama terminal/login **si Checker** saat otorisasi | `TELLER2` |
| `autuser` | **User ID** yang menekan tombol approve | `TYAH` |

> ⚠️ `autterm` diisi dari **nama login session** (Windows/aplikasi), bukan nama komputer. Bisa berbeda dari `autuser` jika checker login dari workstation lain.

**Dari TOFLOGACT:**
```
term = nama terminal/user yang login ke sistem
ip   = IP address (bisa berisi URL: "https://srvall.mitra")
```

---

## 3️⃣ UPDATE PER MODUL SAAT OTORISASI

### CIF (Tabel: `mCIF`)
```sql
UPDATE mCIF SET
    stsrec  = 'A',
    autuser = @userid_checker,
    tglaut  = @tgljam,           -- format: yyyyMMddHHmmss
    devaut  = @device_checker    -- device identifier
WHERE nocif = @nocif AND stsrec = 'N'
```

### Tabungan (Tabel: `TOFTABB`)
```sql
UPDATE TOFTABB SET
    stsrec  = 'A',
    autuser = @userid_checker,
    auttgl  = @tgljam,
    autterm = @term_checker
WHERE notab = @notab AND stsrec = 'N'
```

### Deposito (Tabel: `TOFDEP`)
```sql
UPDATE TOFDEP SET
    stsrec  = 'A',
    autuser = @userid_checker,
    auttgl  = @tgljam,
    autterm = @term_checker
WHERE nodep = @nodep AND stsrec = 'N'
```

### Transaksi (Tabel: `TOFTRNC`)
```sql
-- ststrn: '2'=Pending, '6'=Reverse pending, '1'=Approved
UPDATE TOFTRNC SET
    ststrn  = '1',
    autuser = @userid_checker,
    auttgl  = @tgljam,
    autterm = @term_checker
WHERE batch = @batch AND notrn = @notrn AND ststrn IN ('2','6')
```

### Pembiayaan (Tabel: `TOFLMB`)
```sql
UPDATE TOFLMB SET
    stsrec  = 'A',
    autuser = @userid_checker,
    auttgl  = @tgljam,
    autterm = @term_checker
WHERE nokontrak = @nokontrak AND stsrec = 'N'
```

### Aset (Tabel: `TOFASET`)
```sql
UPDATE TOFASET SET
    stsrec  = 'A',
    autuser = @userid_checker,
    auttgl  = @tgljam,
    autterm = @term_checker
WHERE kdaset = @kdaset AND stsrec = 'N'
```

### Jaminan (Tabel: `TOFJAMIN`)
```sql
UPDATE TOFJAMIN SET
    stsrec    = 'A',
    autuser   = @userid_checker,
    auttgljam = @tgljam,
    autterm   = @term_checker
WHERE noreg = @noreg AND stsrec = 'N'
```

### Kondisi Khusus (Tabel: `TOFSPC`)
```sql
UPDATE TOFSPC SET
    stsrec    = 'A',
    autuser   = @userid_checker,
    auttgljam = @tgljam,
    autterm   = @term_checker
WHERE urutspc = @urutspc AND noacc = @noacc AND stsrec = 'N'
```

---

## 4️⃣ PERBEDAAN NAMA KOLOM TANGGAL PER TABEL

| Tabel | Kolom tgl input | Kolom tgl otorisasi | Kolom tgl ubah | Kolom term |
|---|---|---|---|---|
| `mCIF` | `tglinp` | `tglaut` | `tglchg` | `devaut` |
| `TOFTABB` | `inptgl` | `auttgl` | `chgtgl` | `autterm` |
| `TOFDEP` | `inptgl` | `auttgl` | `chgtgl` | `autterm` |
| `TOFTRNC` | `inptgl` | `auttgl` | — | `autterm` |
| `TOFLMB` | `inptgl` | `auttgl` | `chgtgl` | `autterm` |
| `TOFASET` | `inptgl` | `auttgl` | `chgtgl` | `autterm` |
| `TOFJAMIN` | `inptgljam` | `auttgljam` | `chgtgljam` | `autterm` |
| `TOFSPC` | `inptgljam` | `auttgljam` | `chgtgljam` | `autterm` |

> Format tanggal seragam: `varchar(14)` = `yyyyMMddHHmmss`

---

## 5️⃣ STRUKTUR MENU CSBO19 (dari tabel MMENU — terverifikasi)

### Menu yang mengandung Otorisasi:

```
[MODUL] Transaksi
  +-- Transaksi-Harian
        - Buka Kantor / Tutup Kantor
        - Transaksi Single
        - Otorisasi Transaksi          ← UPDATE TOFTRNC ststrn='1'
        - Otorisasi Reverse Transaksi  ← UPDATE TOFTRNC ststrn lainnya

[MODUL] CIF
  +-- CIF
        - Registrasi CIF              ← INSERT mCIF, stsrec='N'
        - Otorisasi CIF               ← UPDATE mCIF stsrec='A'
        - Otorisasi Ubah CIF          ← UPDATE mCIF (setelah chg)

[MODUL] Tabungan
  +-- Tab-Rekening
        - Registrasi Tabungan         ← INSERT TOFTABB, stsrec='N'
        - Otorisasi Buka Tabungan     ← UPDATE TOFTABB stsrec='A'
        - Kondisi Khusus Tabungan     ← INSERT TOFSPC, stsrec='N'
        - Otorisasi Kondisi Khusus    ← UPDATE TOFSPC stsrec='A'
        - Tutup Tabungan
        - Otorisasi Tutup Tabungan

[MODUL] Deposito
  +-- Dep-Rekening
        - Registrasi Deposito         ← INSERT TOFDEP, stsrec='N'
        - Otorisasi Buka Deposito     ← UPDATE TOFDEP stsrec='A'
        - Otorisasi Pencairan

[MODUL] Pembiayaan
  +-- Pemb-Akad
        - Input Pembiayaan            ← INSERT TOFLMB, stsrec='N'
        - Otorisasi Pembiayaan        ← UPDATE TOFLMB stsrec='A'
        - Droping / Otorisasi Droping

[MODUL] Persediaan/Aset
  +-- Aset
        - Input Aset                  ← INSERT TOFASET, stsrec='N'
        - Otorisasi Aset              ← UPDATE TOFASET stsrec='A'
        - Jaminan / Otorisasi Jaminan ← TOFJAMIN stsrec 'N'→'A'

[MODUL] Laporan (READ ONLY — tidak ada otorisasi)
  Lap-CIF | Lap-Tabungan | Lap-Deposito | Lap-Pembiayaan
  Lap-Transaksi | Lap-Persediaan | Lap-GL | Lap-Manajemen
```

---

## 6️⃣ STRATEGI AUDIT LOG UNTUK AKSES DARI LUAR JARINGAN

### Sistem Log yang Sudah Ada di Database:

| Tabel | Fungsi | Kolom IP |
|---|---|---|
| `TOFLOGACT` | Login activity desktop app | `ip` (ada URL: `https://srvall.mitra`) |
| `AUDITLOG` | Audit umum | — |
| `WEBUSERLOG` | Log akses web/API | `ip_address` ✅ |
| `WEBUSERSESSION` | Session web aktif | — |

### Strategi untuk Web App Otorisasi:

#### Layer 1 — UPDATE ke tabel core banking (sama seperti sistem asli)
```sql
-- autterm diisi dengan identifier yang menunjukkan akses dari Web App
SET autterm = @userid + CASE 
    WHEN @akses_type = 'LAN'      THEN '-WEB-LAN'   -- dari jaringan internal
    WHEN @akses_type = 'EXTERNAL' THEN '-WEB-EXT'   -- dari luar jaringan
    ELSE '-WEB'
END
-- Contoh: 'TYAH-WEB-LAN' atau 'TYAH-WEB-EXT'
```

#### Layer 2 — INSERT ke `WA_OTR_LOG` (tabel baru)
```sql
INSERT INTO WA_OTR_LOG VALUES (
    @modul,        -- 'CIF', 'TABUNGAN', dll
    @aksi,         -- 'APPROVE' atau 'REJECT'
    @ref_id,       -- nocif / notab / nodep / dll
    @userid,       -- checker userid
    @catatan,      -- wajib saat REJECT
    @tgl_aksi,     -- timestamp
    @ip_client,    -- IP real pengguna
    @akses_type,   -- 'LAN' atau 'EXTERNAL'
    @user_agent    -- browser/device info
)
```

#### Layer 3 — INSERT ke `WEBUSERLOG` (sudah ada, reuse)
```sql
INSERT INTO WEBUSERLOG (userid, appid, inptgljam, ip_address, lokasi, description)
VALUES (@userid, 'OTRS', @tgljam, @ip_real,
        'OTORISASI ' + @modul,
        'APPROVE ' + @modul + ' ref=' + @ref_id)
```

#### Deteksi LAN vs External di Node.js:
```javascript
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]
        || req.headers['x-real-ip']
        || req.socket.remoteAddress;
}

function isLANAccess(ip) {
    return ip.startsWith('192.168.') || 
           ip.startsWith('10.')      || 
           ip.startsWith('172.16.')  ||
           ip === '127.0.0.1'        ||
           ip === '::1';
}

// Dalam route handler:
const clientIP   = getClientIP(req);
const aksesType  = isLANAccess(clientIP) ? 'LAN' : 'EXTERNAL';
const autTermVal = `${req.user.userid}-WEB-${aksesType}`;
```

### Contoh Rekap Audit yang Terbaca:

| autterm | autuser | ip_client | Interpretasi |
|---|---|---|---|
| `TYAH-WEB-LAN` | TYAH | 192.168.1.45 | TYAH approve dari LAN via Web App |
| `NADHOFA-WEB-EXT` | NADHOFA | 120.55.x.x | NADHOFA approve dari luar via Web App |
| `TELLER2` | NADHOFA | — | NADHOFA approve dari PC TELLER2 via CSBO19 |
| `bonbon` | bonbon | — | Login dari workstation bonbon (CSBO19 desktop) |

---

## 7️⃣ RINGKASAN CEPAT

| Pertanyaan | Jawaban |
|---|---|
| `autterm` berisi apa? | Nama session/terminal login checker (bukan nama PC fisik) |
| Berbeda dari `autuser`? | Bisa berbeda jika checker login dari workstation lain |
| Nilai `stsrec` saat approve? | `'A'` (terverifikasi: 10.647 record active = 'A') |
| Tabel untuk audit akses luar? | `WEBUSERLOG` (sudah ada) + `WA_OTR_LOG` (baru) |
| Cara bedakan LAN vs External? | Deteksi IP di backend, isi `autterm` dengan suffix `-WEB-LAN`/`-WEB-EXT` |

---
*Dibuat: 12 Agustus 2026 | Source: DB Screening + MMENU Query + Binary Analysis CSBO19.exe*

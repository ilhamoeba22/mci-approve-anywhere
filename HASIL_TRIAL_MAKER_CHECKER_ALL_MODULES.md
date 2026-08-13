# 🧪 Laporan Pengujian Trial & Error Maker-Checker-Approver (Seluruh Modul)
**Tanggal Pengujian:** 12 Agustus 2026  
**Server Target:** `192.168.1.130:44333`  
**Database Target:** `test eoy`  
**Kredensial:** User `sa` / Password `bon`

---

## 📌 Ringkasan Hasil Eksekusi Pengujian

Seluruh **8 Modul** utama pada sistem Core Banking MitraSoft CSBO19 telah berhasil diuji coba secara riil menggunakan mekanisme **Maker** (Insert/Input `stsrec='N'`) dan **Checker/Approver** (Update `stsrec='A'` / `ststrn='1'`).

| No | Modul | Tabel Utama | Primary Key (PK) | Status Pending | Status Approved | Hasil Trial |
|---|---|---|---|---|---|---|
| 1 | **CIF (Nasabah)** | `mCIF` | `nocif` (varchar 9) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 2 | **Tabungan** | `TOFTABB` | `notab` (varchar 11) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 3 | **Deposito** | `TOFDEP` | `nodep` (varchar 11) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 4 | **Transaksi** | `TOFTRNC` | `tgltrn` + `batch` + `notrn` | `ststrn = '2'` | `ststrn = '1'` | **✅ SUKSES** |
| 5 | **Pembiayaan** | `TOFLMB` | `nokontrak` (varchar 11) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 6 | **Aset / Inventaris** | `TOFASET` | `kdaset` (varchar 8+) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 7 | **Jaminan / Agunan** | `TOFJAMIN` | `noreg` (varchar 10) | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |
| 8 | **Kondisi Khusus** | `TOFSPC` | `urutspc` + `noacc` | `stsrec = 'N'` | `stsrec = 'A'` | **✅ SUKSES** |

---

## 🔑 Pola Standar Otorisasi (Universal Pattern)

### 1. Audit Trail Columns

Setiap tabel mempunyai 3 kelompok kolom pengolahan data:
- **Maker (Input)**: `inpuser` (varchar 10), `inptgl` / `inptgljam` / `tglinp` (varchar 14), `inpterm` / `devinp` (varchar 10).
- **Edit (Perubahan)**: `chguser` (varchar 10), `chgtgl` / `chgtgljam` / `tglchg` (varchar 14), `chgterm` / `devchg` (varchar 10).
- **Checker (Otorisasi)**: `autuser` (varchar 10), `auttgl` / `auttgljam` / `tglaut` (varchar 14), `autterm` / `devaut` (varchar 10).

> ⚠️ **Catatan Ukuran Kolom**: 
> - Kolom terminal/device (`devaut`, `autterm`, `inpterm`) bertipe `varchar(10)`. Untuk identifikasi Web App tanpa melanggar panjang batas kolom, gunakan nilai singkat seperti `'WEB-LAN'` atau `'WEB-EXT'` (max 10 karakter).
> - Timestamp otorisasi menggunakan format `yyyyMMddHHmmss` (14 karakter string).

---

## 📋 Detail Pengujian per Modul

---

### 1. Modul CIF (Tabel `mCIF`)

#### A. Identitas Schema & PK
- **PK**: `nocif` (varchar 9)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT CIF Baru - Pending)
```sql
INSERT INTO mCIF (
    nocif, nm, golcust, jnsbh, jnsid, noid, kota, 
    kdloc, kdcab, kdkas, stsrec, inpuser, tglinp, devinp
) VALUES (
    '01010582', 'TEST CIF PERORANGAN WEB', 'I', 'I', '1', '9999999999999999', 'YOGYAKARTA', 
    '01', '01', '01', 'N', 'CS1', '20260812112138', 'WEB-LAN'
);
```

#### C. Query Checker (APPROVE CIF)
```sql
UPDATE mCIF 
SET stsrec = 'A',
    autuser = 'TYAH',
    tglaut  = '20260812112148',
    devaut  = 'WEB-LAN'
WHERE nocif = '01010582' AND stsrec = 'N';
```

---

### 2. Modul Tabungan (Tabel `TOFTABB`)

#### A. Identitas Schema & PK
- **PK**: `notab` (varchar 11)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)
- **Kolom Non-Null Wajib**: `sawalva`, `mutasidr`, `mutasicr`, `sahirva`, `saldobuku`, `saldomin`, `sahireoy`, `sahireom` (diisi 0 jika baru buka).

#### B. Query Maker (INSERT Tabungan Baru - Pending)
```sql
INSERT INTO TOFTABB (
    notab, nocif, fnama, snama, kodeloc, kodecab, kodeprd, tglbuka, 
    stsrec, inpuser, inptgl, inpterm, 
    sawalva, mutasidr, mutasicr, sahirva, saldobuku, saldomin, sahireoy, sahireom
) VALUES (
    '1370100052', '01002617', 'TABUNGAN TEST WEB', 'TAB TEST', '01', '01', '10', '20260812', 
    'N', 'CS1', '20260812112411', 'CS1', 
    0, 0, 0, 0, 0, 0, 0, 0
);
```

#### C. Query Checker (APPROVE Tabungan)
```sql
UPDATE TOFTABB 
SET stsrec  = 'A',
    autuser = 'NURTEN',
    auttgl  = '20260812112411',
    autterm = 'NURTEN'
WHERE notab = '1370100052' AND stsrec = 'N';
```

---

### 3. Modul Deposito (Tabel `TOFDEP`)

#### A. Identitas Schema & PK
- **PK**: `nodep` (varchar 11)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT Deposito Baru - Pending)
```sql
INSERT INTO TOFDEP (
    nodep, nobilyet, nama, nocif, kdprd, kdcab, kdloc, nomawal, nomrp,
    tglbuka, jkwaktu, jnsjkwaktu, tgleff, tgljtempo, aro, stsrec,
    inpuser, inptgl, inpterm, autuser, auttgl, autterm
) VALUES (
    '3380100805', '3800805', 'DEPOSITO TEST FEBRI 1', '01002617', '31', '01', '01', 
    100000000.00, 100000000.00, '20260812', 12, 'B', '20260812', '20270812', 'Y', 'N',
    'FEBRI', '20260812112223', 'FEBRI-PC', '', '', ''
);
```

#### C. Query Checker (APPROVE Deposito)
```sql
UPDATE TOFDEP
SET stsrec  = 'A',
    autuser = 'NURTEN',
    auttgl  = '20260812112226',
    autterm = 'NURTEN'
WHERE nodep = '3380100805' AND stsrec = 'N';
```

---

### 4. Modul Transaksi (Tabel `TOFTRNC`)

#### A. Identitas Schema & PK
- **Composite Key**: `tgltrn` (varchar 8) + `batch` (numeric) + `notrn` (numeric)
- **Status Column**: `ststrn` (`'2'` = Pending, `'1'` = Approved / Success, `'6'` = Reverse Pending)

#### B. Query Maker (INSERT Transaksi - Pending)
```sql
INSERT INTO TOFTRNC (
    tgltrn, batch, notrn, dracc, cracc, nominalrp, ket, kdloc, 
    ststrn, inpuser, inptgl, inpterm, namadr, namacr
) VALUES (
    '20260812', 1, 10, '1210100064', '1210100064', 500000, 'TEST TRANSAKSI WEB APP', '01', 
    '2', 'CS1', '20260812112208', 'CS1', 'TEST NASABAH DR', 'TEST NASABAH CR'
);
```

#### C. Query Checker (APPROVE Transaksi)
```sql
UPDATE TOFTRNC 
SET ststrn  = '1',
    autuser = 'TYAH',
    auttgl  = '20260812112208',
    autterm = 'TYAH'
WHERE tgltrn = '20260812' AND batch = 1 AND notrn = 10 AND ststrn = '2';
```

---

### 5. Modul Pembiayaan (Tabel `TOFLMB`)

#### A. Identitas Schema & PK
- **PK**: `nokontrak` (varchar 11)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT Pembiayaan Baru - Pending)
```sql
INSERT INTO TOFLMB (
    nokontrak, nocif, nama, kdprd, kdcab, kdloc, mdlawal, tglakad, 
    stsrec, inpuser, inptgl, inpterm
) VALUES (
    '4640100011', '01002617', 'PEMBIAYAAN TEST WEB', '51', '01', '01', 50000000.00, '20260812', 
    'N', 'CS1', '20260812112319', 'CS1'
);
```

#### C. Query Checker (APPROVE Pembiayaan)
```sql
UPDATE TOFLMB 
SET stsrec  = 'A',
    autuser = 'TYAH',
    auttgl  = '20260812112319',
    autterm = 'TYAH'
WHERE nokontrak = '4640100011' AND stsrec = 'N';
```

---

### 6. Modul Aset (Tabel `TOFASET`)

#### A. Identitas Schema & PK
- **PK**: `kdaset` (varchar 8+)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT Aset Baru - Pending)
```sql
INSERT INTO TOFASET (
    kdaset, ket, kdloc, kdcab, haper, 
    stsrec, inpuser, inptgl, inpterm
) VALUES (
    '01000590', 'ASET INVENTARIS TEST WEB', '01', '01', 15000000.00, 
    'N', 'CS1', '20260812112350', 'CS1'
);
```

#### C. Query Checker (APPROVE Aset)
```sql
UPDATE TOFASET 
SET stsrec  = 'A',
    autuser = 'TYAH',
    auttgl  = '20260812112350',
    autterm = 'TYAH'
WHERE kdaset = '01000590' AND stsrec = 'N';
```

---

### 7. Modul Jaminan (Tabel `TOFJAMIN`)

#### A. Identitas Schema & PK
- **PK**: `noreg` (varchar 10+)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT Jaminan Baru - Pending)
```sql
INSERT INTO TOFJAMIN (
    noreg, nocif, dokumen, nompasar, nomtaksasi, kdloc, kdcab, 
    stsrec, inpuser, inptgljam, inpterm
) VALUES (
    '1580000478', '01002617', 'SERTIFIKAT SHM TEST WEB', 250000000.00, 200000000.00, '01', '01', 
    'N', 'CS1', '20260812112350', 'CS1'
);
```

#### C. Query Checker (APPROVE Jaminan)
```sql
UPDATE TOFJAMIN 
SET stsrec    = 'A',
    autuser   = 'TYAH',
    auttgljam = '20260812112350',
    autterm   = 'TYAH'
WHERE noreg = '1580000478' AND stsrec = 'N';
```

---

### 8. Modul Kondisi Khusus (Tabel `TOFSPC`)

#### A. Identitas Schema & PK
- **Composite Key**: `urutspc` (numeric) + `noacc` (varchar 11)
- **Status Column**: `stsrec` (`'N'` = Pending, `'A'` = Active/Approved)

#### B. Query Maker (INSERT Kondisi Khusus Baru - Pending)
```sql
INSERT INTO TOFSPC (
    urutspc, noacc, tgleff, tglexp, jnsspc, nomspc, rate, spread, stsacc, 
    ket, kdcab, kdloc, jnsacc, stsrec, inpuser, inptgljam, inpterm
) VALUES (
    3, '3300100145', '20260812', '20270812', '01', 0.00, NULL, 0.00, ' ', 
    'TRIAL INSERT CSBO19', '01', '01', 'D', 'N', 'NADHOFA', '20260812112155', 'NADHOFA'
);
```

#### C. Query Checker (APPROVE Kondisi Khusus)
```sql
UPDATE TOFSPC 
SET stsrec    = 'A',
    autuser   = 'TYAH',
    auttgljam = '20260812112156',
    autterm   = 'TYAH'
WHERE urutspc = 3 AND noacc = '3300100145' AND stsrec = 'N';
```

---

## 🎯 Kesimpulan Penting untuk Pembuatan Web App

1. **Integritas Maker-Checker**:
   - Seluruh tabel core banking secara konsisten menyimpan **siapa yang buat** (`inpuser`) dan **siapa yang approve** (`autuser`).
   - Query approval Web App wajib menyertakan kondisi `WHERE stsrec = 'N'` (atau `ststrn = '2'`) agar tidak terjadi double approval.
2. **Kesesuaian Tipe Data & Max Length**:
   - `autterm` / `devaut` / `inpterm` maksimal **10 karakter**.
   - `autuser` / `inpuser` maksimal **10 karakter**.
   - `tglaut` / `inptgl` maksimal **14 karakter** (`yyyyMMddHHmmss`).
3. **Format Otorisasi Web App**:
   - Saat Web App diakses via LAN/Ext, nilai `autterm` / `devaut` disarankan diisi `'WEB-LAN'` / `'WEB-EXT'` agar supervisor & DBA bisa langsung membedakan mana otorisasi via Web App dan mana via Desktop CSBO19.
4. **Audit Logging Tambahan**:
   - Selain update tabel core banking di atas, backend Web App akan mencatat IP address publik/lokal, browser User-Agent, dan timestamp presisi ke tabel `WEBUSERLOG` atau `WA_OTR_LOG`.

---
*Pengujian diselesaikan secara riil dan terverifikasi pada 12 Agustus 2026*

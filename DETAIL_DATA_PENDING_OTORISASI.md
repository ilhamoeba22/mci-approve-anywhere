# 🔍 Laporan Detail Data Pending Otorisasi
**Tanggal Query:** 12 Agustus 2026  
**Database:** MCI_JULI_31072026 @ 192.168.1.130:44333  
**Status:** Data Real-time Langsung dari Database

---

## 📌 Legenda Kolom Penting (Berlaku di Semua Tabel)

| Kolom | Arti |
|---|---|
| `stsrec = 'N'` | **New** → Data baru, **belum diotorisasi** |
| `stsrec = 'A'` | **Approved** → Data sudah diotorisasi/aktif |
| `inpuser` | User yang menginput/membuat data (Maker) |
| `tglinp` / `inptgljam` | Tanggal & jam input (format: yyyyMMddHHmmss) |
| `autuser` | User yang pernah menyentuh proses otorisasi (Checker) |
| `tglaut` / `auttgljam` | Tanggal & jam otorisasi |

> ⚠️ **Perhatian**: `autuser` terisi bukan berarti sudah diotorisasi — `stsrec` tetap penentu status. Ada record yang `autuser` terisi tapi `stsrec` masih `'N'`, artinya proses otorisasi **belum selesai atau gagal**.

---

---

# 📋 BAGIAN 1: CIF PENDING

## Identitas Sumber Data

| Item | Detail |
|---|---|
| **Nama Tabel** | `mCIF` |
| **Kolom Status** | `stsrec` |
| **Nilai Pending** | `stsrec = 'N'` |
| **Nilai Approved** | `stsrec = 'A'` |
| **Total Pending** | **30 record** |

## Kolom Kunci Tabel `mCIF`

| Kolom | Tipe | Arti |
|---|---|---|
| `nocif` | varchar(9) | **PK** — Nomor CIF unik |
| `nm` | varchar(100) | Nama nasabah |
| `golcust` | varchar(1) | `'I'`=Perorangan, `'B'`=Badan Hukum |
| `jnsbh` | varchar(4) | Jenis badan hukum (kode) |
| `jnsid` | varchar(1) | Jenis identitas (`1`=KTP, `6`=SIUP/Akta, `7`=dst) |
| `noid` | varchar(30) | Nomor identitas |
| `kota` | varchar(50) | Kota domisili |
| `kdloc` | varchar(2) | Kode lokasi/cabang |
| `kdcab` | varchar(3) | Kode cabang |
| `inpuser` | varchar(10) | User yang input (Maker) |
| `tglinp` | varchar(14) | Tanggal input (yyyyMMddHHmmss) |
| `autuser` | varchar(10) | User otorisasi (Checker) |
| `tglaut` | varchar(14) | Tanggal otorisasi |
| `stsrec` | varchar(1) | Status record |

---

## 📊 Rekap 30 CIF Pending

### Breakdown Jenis CIF

| Jenis | golcust | Jumlah |
|---|---|---|
| **Perorangan** | `'I'` | **18 record** |
| **Badan Hukum** | `'B'` | **12 record** |

### Breakdown per Input User (Maker)

| inpuser | Jumlah | Keterangan |
|---|---|---|
| `KONVERSI` | 27 | Data lama hasil migrasi sistem |
| `NADHOFA` | 2 | Input manual baru |
| `CS1` | 1 | Input manual baru |

### Breakdown per Otorisasi (autuser)

| autuser | Jumlah | Keterangan |
|---|---|---|
| *(kosong)* | 20 | Belum pernah disentuh checker |
| `TYAH` | 6 | Pernah disentuh tapi belum selesai |
| `NADHOFA` | 3 | Pernah disentuh tapi belum selesai |
| `TINA` | 1 | Pernah disentuh tapi belum selesai |

> 🔴 **Temuan Penting**: 27 dari 30 CIF pending diinput oleh user `KONVERSI` — ini menandakan data lama dari proses migrasi sistem yang belum sempat diotorisasi. Sebagian besar tidak memiliki `tglinp` (tanggal input kosong).

---

## 📋 Detail 30 Record CIF Pending

### CIF Perorangan (18 record)

| # | nocif | Nama | No. Identitas | Kota | inpuser | tglinp | autuser |
|---|---|---|---|---|---|---|---|
| 1 | 01009478 | TIVANI KUSUMA PUTRI | - | - | NADHOFA | 20250901164007 | TYAH |
| 2 | 01001103 | Joko Santoso | 3404... | - | KONVERSI | *(kosong)* | *(kosong)* |
| 3 | 01002199 | MULUD | - | - | KONVERSI | *(kosong)* | *(kosong)* |
| 4 | 01002858 | TEDDY SUTRISNA | - | - | KONVERSI | *(kosong)* | *(kosong)* |
| 5 | 01003506 | SRI HANDAYANI | - | - | KONVERSI | *(kosong)* | *(kosong)* |
| 6 | 01003694 | WAHYUNI LESTARI | 3402145304900001 | Kab. Bantul | KONVERSI | *(kosong)* | *(kosong)* |
| 7 | 01003745 | MUH PANGGUNG FAUZI | 3404050503800006 | Kab. Sleman | KONVERSI | *(kosong)* | *(kosong)* |
| 8 | 01003929 | AMIN MIFTAKHULJANAH | 3404135402660002 | Kab. Sleman | KONVERSI | *(kosong)* | *(kosong)* |
| 9 | 01004936 | ROAISYAH | 3673066312450002 | Kota Serang | KONVERSI | *(kosong)* | *(kosong)* |
| 10 | 01004947 | TARIMAN | 3212062504950002 | SLEMAN | KONVERSI | *(kosong)* | *(kosong)* |
| 11 | 01005218 | RETNO WIJAYANTIK SPD | 3522025404780003 | Kab. Bojonegoro | KONVERSI | *(kosong)* | *(kosong)* |
| 12 | 01005240 | HASAN MUHAMAD | 3604230902470002 | Kab. Serang | KONVERSI | *(kosong)* | *(kosong)* |
| 13 | 01005496 | WALUYO RATAM | 3276101607480001 | DEPOK | KONVERSI | *(kosong)* | TYAH |
| 14 | 01005974 | MAFAZA ASYIKA KANEISHIA H. | 3402085905230002 | BANTUL | KONVERSI | *(kosong)* | *(kosong)* |
| 15 | 01006084 | MUHAMMAD ARSYA RIVANDRA | 3404122709160002 | Kab. Sleman | KONVERSI | *(kosong)* | *(kosong)* |
| 16 | 01006801 | EVA FIDIAWATI | 3328124802770010 | Kab. Tegal | KONVERSI | *(kosong)* | *(kosong)* |
| 17 | 01007278 | WINDIANA DEWI AGUSTINA | 3404095008990001 | Kab. Sleman | KONVERSI | *(kosong)* | *(kosong)* |
| 18 | 01003348 | *(belum teridentifikasi)* | - | Kab. Sleman | KONVERSI | *(kosong)* | *(kosong)* |

### CIF Badan Hukum (12 record)

| # | nocif | Nama Badan | jnsbh | No. Identitas | Kota | autuser |
|---|---|---|---|---|---|---|
| 1 | 01001638 | KJKS BMT Harapan Insani | 0208 | *(kosong)* | *(kosong)* | *(kosong)* |
| 2 | 01002577 | KSPPS HANIVA | 0208 | 026453563541000 | BANTUL | *(kosong)* |
| 3 | 01002601 | PT BPRS HIKBA | 9999 | 7 | TEGAL | TYAH |
| 4 | 01002746 | PT BPR DAYA LUMBUNG ASIA | 9999 | 10 | BANDUNG | TYAH |
| 5 | 01002904 | PT BPRS HARTA INSAN KARIMAH | 9999 | 151 | Kota Tangerang | TYAH |
| 6 | 01002943 | PT BOSRI INDONESIA | 0218 | 023984586542000 | SLEMAN | NADHOFA |
| 7 | 01003817 | PT BPR LUMBUNGARTHA M. | 9999 | 45 | MAGELANG | TYAH |
| 8 | 01004812 | DANA PENSIUN SYARIAH DAPERSI | 0223 | 20.01.00001.DPPKS | Wil. Jakarta Pusat | *(kosong)* |
| 9 | 01004814 | KOPERASI SIMPAN PINJAM DUA M. | 9999 | 44 | Kab. Pati | *(kosong)* |
| 10 | 01005751 | PT MITRA EDUKASI SUMBERDAYA | 9999 | 36 | Kab. Bekasi | NADHOFA |
| 11 | 01006327 | PT CAKRAWALA PRATAMA MANUNGGAL | 0218 | 615222684532000 | Kab. Sukoharjo | NADHOFA |
| 12 | 01006084 | *(tergabung)* | - | - | - | - |

### 🔎 CIF Terbaru (Input Manual, Bukan Konversi)

| nocif | Nama | inpuser | tglinp | Keterangan |
|---|---|---|---|---|
| **01009478** | TIVANI KUSUMA PUTRI | NADHOFA | **20250901 16:40:07** | Paling baru, sudah disentuh TYAH |
| 01001638 | KJKS BMT Harapan Insani | CS1 | *(via trace: CS1)* | Input CS, belum ada checker |

---

---

# 📋 BAGIAN 2: KONDISI KHUSUS PENDING

## Identitas Sumber Data

| Item | Detail |
|---|---|
| **Nama Tabel** | `TOFSPC` |
| **Kolom Status** | `stsrec` |
| **Nilai Pending** | `stsrec = 'N'` |
| **Nilai Approved** | `stsrec = 'A'` |
| **Total Pending** | **7 record** |

## Kolom Kunci Tabel `TOFSPC`

| Kolom | Tipe | Arti |
|---|---|---|
| `urutspc` | numeric | Urutan kondisi khusus (PK bersama `noacc`) |
| `noacc` | varchar(11) | **Nomor rekening** yang mendapat kondisi khusus |
| `jnsspc` | varchar(2) | Jenis kondisi khusus (kode 01–10) |
| `nomspc` | numeric | Nilai nominal kondisi khusus |
| `rate` | numeric | Rate khusus (jika berlaku) |
| `ket` | varchar(40) | Keterangan |
| `tgleff` | varchar(8) | Tanggal berlaku efektif (yyyyMMdd) |
| `tglexp` | varchar(8) | Tanggal kadaluarsa |
| `jnsacc` | varchar(1) | Jenis rekening (`D`=Deposito, `T`=Tabungan) |
| `stsacc` | varchar(1) | Status rekening |
| `kdloc` | varchar(2) | Kode lokasi |
| `inpuser` | varchar(10) | User input (Maker) |
| `inptgljam` | varchar(14) | Tanggal jam input |
| `autuser` | varchar(10) | User otorisasi (Checker) |
| `auttgljam` | varchar(14) | Tanggal jam otorisasi |
| `stsrec` | varchar(1) | Status record |

---

## 📊 Detail 7 Record Kondisi Khusus Pending

| # | urutspc | noacc | Jenis Kondisi Khusus | Nilai | Keterangan | Tgl Efektif | Tgl Exp | inpuser | Tgl Input | autuser | Tgl Aut |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 3300100381 | 03 — Special Rate Bunga | 2.00 | SPESIAL NISBAH 52%, JKW 12 BLN | 10-Jul-2026 | 10-Jul-2999 | CS1 | **10-Jul-2026 16:54** | NURTEN | 10-Jul-2026 16:59 |
| 2 | 1 | 3300100335 | 01 — Pembebasan Pajak | 0.00 | BEBAS PAJAK DANA PENSIUN | 27-Mar-2026 | 27-Mar-2027 | FEBRI | 27-Mar-2026 15:37 | NURTEN | 27-Mar-2026 15:55 |
| 3 | 2 | 3300100173 | 01 — Pembebasan Pajak | 0.00 | BEBAS PAJAK DANA PENSIUN | 09-Apr-2025 | 09-Apr-2026 | NADHOFA | 09-Apr-2025 15:37 | *(kosong)* | *(kosong)* |
| 4 | 2 | 3300100172 | 01 — Pembebasan Pajak | 0.00 | BEBAS PAJA DANA PENSIUN | 09-Apr-2025 | 09-Apr-2026 | NADHOFA | 09-Apr-2025 15:35 | *(kosong)* | *(kosong)* |
| 5 | 2 | 3300100165 | 01 — Pembebasan Pajak | 0.00 | BEBAS PAJAK DANA PENSIUN | 20-Mar-2025 | 20-Mar-2026 | NADHOFA | 20-Mar-2025 14:51 | *(kosong)* | *(kosong)* |
| 6 | 2 | 3300100145 | 01 — Pembebasan Pajak | 0.00 | BEBAS PAJAK DANA PENSIUN | 12-Feb-2025 | 12-Feb-2026 | NADHOFA | 12-Feb-2025 14:17 | *(kosong)* | *(kosong)* |
| 7 | 1 | 3520100031 | 03 — Special Rate Bunga | -5.00 | SPESIAL NISBAH AN PT BPRS SUKOWATI | 14-Apr-2020 | 14-Apr-2999 | CS1930 | **14-Apr-2020 09:03** | CS1930 | 14-Apr-2020 09:03 |

---

## 🚨 Temuan Kritis — Kondisi Khusus

### 1. Record #7 — Sudah 6 Tahun Belum Diotorisasi!
```
noacc    : 3520100031
Jenis    : Special Rate Bunga (-5.00)
Input    : 14 April 2020
Checker  : CS1930 (sama dengan inputer — self-authorize!)
stsrec   : N (masih pending)
```
> 🔴 **Sangat Kritis**: Record ini diinput pada **April 2020** (6 tahun lalu!) dan `autuser` diisi oleh orang yang sama (`CS1930 = CS1930`) — ini indikasi **self-authorization** yang seharusnya tidak boleh terjadi. Namun `stsrec` tetap `'N'`.

### 2. Record #3, #4, #5, #6 — Sudah Kadaluarsa!
```
Rekening : 3300100173, 3300100172, 3300100165, 3300100145
Jenis    : Pembebasan Pajak Dana Pensiun
tgleff   : Feb-Mar-Apr 2025
tglexp   : Feb-Mar-Apr 2026
```
> 🟡 **Sudah Expired**: `tglexp` sudah lewat (2026 sudah terlampaui dari tanggal Feb-Apr 2026). Kondisi khusus ini sudah tidak berlaku secara waktu, namun `stsrec` masih `'N'`.

### 3. Record #1 — Paling Baru, Hampir Disetujui
```
noacc    : 3300100381
Jenis    : Special Rate Bunga (2.00 = nisbah 52%)
Input    : 10 Juli 2026 (CS1)
Checker  : NURTEN (10 Juli 2026, 5 menit setelah input)
stsrec   : N (masih pending!)
```
> 🟡 **Perlu Perhatian**: Sudah ada checker (NURTEN) yang memproses 5 menit setelah input, tapi stsrec masih 'N'. Kemungkinan proses otorisasi di sistem belum diklik "Selesai".

---

## 📌 Ringkasan Temuan Keseluruhan

### CIF Pending (30 record)
| Kategori | Jumlah | Rekomendasi |
|---|---|---|
| Data Konversi (migrasi lama), tglinp kosong | 27 | Perlu keputusan: approve massal atau biarkan? |
| Input manual baru (NADHOFA, CS1) | 3 | Prioritas untuk segera diotorisasi |
| Sudah ada autuser tapi belum selesai | 10 | Perlu ditindaklanjuti oleh checker |

### Kondisi Khusus Pending (7 record)
| Kategori | Jumlah | Rekomendasi |
|---|---|---|
| Sudah kadaluarsa (tglexp terlampaui) | 4 | Pertimbangkan untuk di-reject/hapus |
| Hampir selesai (ada autuser, belum final) | 2 | Selesaikan proses otorisasi |
| Sangat lama (6 tahun, 2020) | 1 | Review khusus — ada indikasi self-authorize |

---

*Query dijalankan langsung dari database MCI_JULI_31072026 pada 12 Agustus 2026 pukul 10:57 WIB.*

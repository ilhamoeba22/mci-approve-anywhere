# Dispatch Instructions for Spec Miner 1 (CBS Specifications)

- Working Directory: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\spec_miner_1_cbs_specs`
- Read Original Request: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md`

## Objective
Extract precise specification requirements from documentation, code comments, schema files, SQL scripts, or reference artifacts in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF`.

## Tasks
1. Read `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\ORIGINAL_REQUEST.md` thoroughly.
2. Search project directory `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF` for documentation, READMEs, SQL scripts, sample payloads, or existing backend/frontend files.
3. Mine precise details on:
   - Database server parameters: 192.168.1.130:44333, DB MCI_JULI_31072026 / test eoy, sa/bon.
   - 8 Modules: mCIF (CIF Perorangan & Badan Hukum), TOFTABB (Tabungan), TOFDEP (Deposito), TOFTRNC (Transaksi), TOFLMB (Pembiayaan), TOFASET (Aset), TOFJAMIN (Jaminan), TOFSPC (Kondisi Khusus).
   - Record fields for Approve vs Reject (stsrec='A', ststrn='1', reject reasons/notes, autuser, auttgl format yyyyMMddHHmmss, autterm 'WEB-LAN'/'WEB-EXT').
   - USERPROFILE login matching & level otorisasi (M=Maker/S=Supervisor/A=Admin or Maker/Supervisor/Approver).
   - Audit logging tables: WEBUSERLOG & WA_OTR_LOG (storing IP, location, user-agent, timestamp, action).
4. Document all specs and requirements in `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\spec_miner_1_cbs_specs\handoff.md`.

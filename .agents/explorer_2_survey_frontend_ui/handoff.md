# Handoff Report: Frontend UI Architecture & Requirement Survey

**Agent**: `explorer_2_survey_frontend_ui`  
**Target Project**: Web App Otorisasi Core Banking MitraSoft  
**Working Directory**: `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF\.agents\explorer_2_survey_frontend_ui`  
**Date**: 2026-08-12  

---

## 1. Observation

### 1.1 Existing Files & Assets Search
Search performed using `find_by_name` across `D:\Kerjaan\BASE AI\PROSES OTORISASI CIF`:
- Result count: 15 files/directories.
- Extracted PowerBuilder binaries: `pbd_extract/CSBO19.exe`, `pbd_extract/*.pbd`, `pbd_extract/appconfig.json`.
- Technical specs & SQL trace logs: `ANALISIS_OTORISASI_DAN_MENU.md`, `DETAIL_DATA_PENDING_OTORISASI.md`, `HASIL_TRIAL_MAKER_CHECKER_ALL_MODULES.md`, `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`, `proses otorisasi *.xml`.
- **Finding**: **0 existing web frontend files** (HTML/CSS/JS/assets). The repository requires a complete greenfield implementation of the responsive Web App Frontend following **Requirement R2 (HTML5, Vanilla CSS, JS)**.

### 1.2 Identified UI Modules & Data Requirements
Directly observed from database screening and documentation files (`ANALISIS_OTORISASI_DAN_MENU.md`, `DETAIL_DATA_PENDING_OTORISASI.md`, `RENCANA_PENGEMBANGAN_OTORISASI_CIF.md`):

1. **CIF Perorangan** (`mCIF` where `stsrec='N'` and `golcust='I'`):
   - Key attributes: `nocif`, `nm`, `noid` (KTP), `kota`, `inpuser`, `tglinp`, `kdloc`.
   - Current pending count in DB: **30 records**.
2. **CIF Badan Hukum** (`mCIF` where `stsrec='N'` and `golcust<>'I'`):
   - Key attributes: `nocif`, `nm`, `jnsbh` (PT/CV/Koperasi), `npwp`, `noid` (SIUP/Akta), `kota`, `inpuser`, `tglinp`.
3. **Tabungan** (`TOFTABB` where `stsrec='N'`):
   - Key attributes: `notab`, `nocif`, `fnama`, `kodeloc`, `kodeprd`, `tglbuka`, `inpuser`, `inptgl`.
4. **Deposito** (`TOFDEP` where `stsrec='N'`):
   - Key attributes: `nodep`, `nobilyet`, `nama`, `nocif`, `nomrp`, `tglbuka`, `jkwaktu`, `inpuser`, `inptgl`.
5. **Pembiayaan / Akad** (`TOFLMB` where `stsrec='N'`):
   - Key attributes: `nokontrak`, `nocif`, `nama`, `kdprd`, `mdlawal`, `tglakad`, `inpuser`, `inptgl`.
6. **Transaksi** (`TOFTRNC` where `ststrn IN ('2','6')`):
   - Key attributes: `tgltrn`, `batch`, `notrn`, `dracc`, `namadr`, `cracc`, `namacr`, `nominalrp`, `ket`, `inpuser`.
   - Note: `ststrn='2'` = Pending transaction, `ststrn='6'` = Pending reverse transaction.
7. **Aset / Inventaris** (`TOFASET` where `stsrec='N'`):
   - Key attributes: `kdaset`, `ket`, `kdloc`, `haper` (harga perolehan), `inpuser`, `inptgl`.
8. **Jaminan / Agunan** (`TOFJAMIN` where `stsrec='N'`):
   - Key attributes: `noreg`, `nocif`, `dokumen`, `nompasar`, `nomtaksasi`, `kdloc`, `inpuser`, `inptgljam`.
9. **Kondisi Khusus** (`TOFSPC` where `stsrec='N'`):
   - Key attributes: `urutspc`, `noacc`, `jnsspc` (01-10), `nomspc`, `rate`, `ket`, `tgleff`, `tglexp`, `inpuser`, `inptgljam`.
   - Current pending count in DB: **7 records**.
10. **Status Tutup Kantor** (`TOFCLOSELOC`):
    - Key attributes: `kdloc`, `stsclose` ('C'=Closed, ''=Open), `openuser`, `opentgljam`, `closeuser`, `closetgljam`.
11. **Audit Trail** (`WA_OTR_LOG` + `WEBUSERLOG` + `AUDITLOG`):
    - Key attributes: `tgl_aksi`, `modul`, `aksi` (APPROVE/REJECT), `ref_id`, `userid`, `catatan`, `ip_client`, `devterm` (WEB-LAN vs WEB-EXT).

---

## 2. Logic Chain

1. **Requirement R2 Specification**: R2 explicitly demands a modern, responsive Web Dashboard built with standard web tech stack (**HTML5, Vanilla CSS, JS**) without heavy frameworks (React/Vue/Angular), ensuring fast loading speed, native DOM performance, and minimal asset bundle size on both desktop PCs and mobile smartphones.
2. **Component & Viewport Adaptivity**: Supervisor checkers access the system from dual environments:
   - **Desktop (LAN / Office Workstation)**: High resolution (> 1024px width), hover interactions, wide data tables with multi-column sorting, side-by-side drawer panels for detailed view.
   - **Mobile (Smartphone / External Access)**: Compact screen (< 768px width), touch targets (min 44x44px), sticky bottom bar, card list view replacing wide tables, full-height bottom sheet modals for detailed verification and approval actions.
3. **Module Partitioning & Navigation Strategy**: Since 8 primary core banking modules plus Kondisi Khusus and Tutup Kantor exist, the UI must feature:
   - A persistent left sidebar (collapsible into a top hamburger menu on mobile).
   - Top summary count cards providing immediate visual indicators of pending items per module (e.g. CIF: 30 red badge, Kondisi Khusus: 7 yellow badge).
   - Real-time badge counter background updates (polling interval: 30s) to keep checkers informed without manual refresh.
4. **Action & Modal Workflow**:
   - **Approve Workflow**: One-click trigger from table/card row or detail modal, displaying a sleek confirmation modal ("Approve record CIF 01009478?").
   - **Reject Workflow**: Requires mandatory rejection notes input (`catatan` field, min length 5 chars) inside a Rejection Note Modal before submitting `POST /api/:modul/:id/reject`.
   - **Audit Log Viewer**: Dedicated tab/modal showing real-time authorization history, highlighted with LAN (`WEB-LAN`) vs External (`WEB-EXT`) badges based on IP address detection.

---

## 3. Technical UI Architecture & Layout Design

### 3.1 Directory & Asset Structure (Frontend Stack)
```
frontend/
├── index.html                 # Single Page Application entry point (Login & App Wrapper)
├── css/
│   ├── variables.css          # CSS Variables (Color Palette, Typography, Elevation, Breakpoints)
│   ├── base.css               # Reset, Typography, Utility classes
│   ├── components.css         # Buttons, Cards, Badges, Modals, Forms, Tables, Drawers
│   └── responsive.css         # Media queries for Mobile, Tablet, and Desktop viewports
├── js/
│   ├── app.js                 # Main App Controller & Router (State init, View switching)
│   ├── api.js                 # Fetch Wrapper with JWT handling & Error Interceptor
│   ├── auth.js                # Login / Session lifecycle management
│   ├── store.js               # Reactive Centralized UI State Store
│   ├── modules/
│   │   ├── dashboard.js       # Dashboard summary cards controller
│   │   ├── cif.js             # CIF Perorangan & Badan Hukum view controller
│   │   ├── tabungan.js        # Tabungan view controller
│   │   ├── deposito.js        # Deposito view controller
│   │   ├── pembiayaan.js      # Pembiayaan view controller
│   │   ├── transaksi.js       # Transaksi view controller
│   │   ├── aset.js            # Aset view controller
│   │   ├── jaminan.js         # Jaminan view controller
│   │   ├── kondisikhusus.js   # Kondisi Khusus view controller
│   │   ├── tutupkantor.js     # Tutup Kantor status controller
│   │   └── auditlog.js        # Audit trail controller
│   └── components/
│       ├── modal.js           # Reusable Modal & Bottom-sheet renderer
│       ├── toast.js           # Floating Toast Notification system
│       └── polling.js         # Background count refresher (30s interval)
└── assets/
    ├── favicon.ico
    └── logo.svg                # Bank / System Brand Logo
```

### 3.2 Design System & Visual Palette
- **Theme**: Professional Enterprise Banking & Financial Dashboard.
- **Primary Color**: `#0052CC` (MitraSoft Core Blue)
- **Primary Dark**: `#0747A6`
- **Secondary / Accent**: `#FFAB00` (Pending Gold/Amber)
- **Success / Approve**: `#36B37E` (Emerald Green)
- **Danger / Reject**: `#FF5630` (Crimson Red)
- **Neutral Dark**: `#172B4D` (Heading Text)
- **Neutral Light / Surface**: `#F4F5F7` (Background Grey)
- **Surface Elevation**: `#FFFFFF` (Card & Modal Container)
- **Typography**: Inter / System UI Font Stack (`system-ui, -apple-system, sans-serif`).

### 3.3 Layout Wireframe & Responsive Breakpoints

#### A. Desktop Viewport (> 1024px)
- **Layout**: Fixed Left Sidebar (250px) + Header Bar (60px) + Fluid Main Workspace.
- **Header**: User Profile badge, Branch Location code (`kdloc`), Connection status (LAN vs EXT), Polling Status indicator, Refresh Button, Logout.
- **Dashboard Workspace**:
  - Top Section: 10 Grid Summary Count Cards (2 rows of 5 cards) showing Module Icon, Module Name, Pending Count Badge, and Action Link.
  - Middle Section: Filter & Search Bar (Search Input, Date Range Picker, Branch Filter Dropdown, Refresh Button).
  - Main Section: Responsive Data Table with Sticky Header, Sortable Columns, Multi-select checkboxes for batch operations, Action Column (Detail, Approve, Reject).
  - Right Drawer / Side Panel (450px slide-over): Triggered when clicking "Detail" on any record, showing 100% attribute breakdown without leaving page.

#### B. Mobile Viewport (< 768px)
- **Layout**: Sticky Top Header with Hamburger Toggle + Bottom Tab Bar for Quick Access.
- **Navigation**: Sidebar collapses into a slide-out Off-Canvas Drawer.
- **Dashboard Workspace**:
  - Horizontal Scrollable Summary Cards Carousel or 2-column Compact Grid.
  - Data Table automatically morphs into a **Vertical Card List View** with essential fields highlighted.
  - Modals morph into **Full-Height Bottom Sheets** with swipe-down dismissal and thumb-friendly bottom action buttons (Full-width "Approve" and "Reject").

---

## 4. Detailed View Specs per Module

| Module Tab | Visible Columns in List / Table View | Detail Drawer / Modal Attributes | Action Trigger Requirements |
|---|---|---|---|
| **CIF Perorangan** | `nocif`, `nm`, `noid` (KTP), `kota`, `inpuser`, `tglinp`, Status Badge | Complete attributes: `nocif`, `nm`, `nmkecil`, `agama`, `golcust`, `jnsid`, `noid`, `tglid`, `tglexpid`, `stskawin`, `sex`, `tmplhr`, `tgllhr`, `email`, `alamat`, `kelurahan`, `kecamatan`, `kota`, `kdpos`, `hp`, `inpuser`, `tglinp`, `kdloc` | Quick Approve & Reject with Rejection Modal |
| **CIF Badan Hukum** | `nocif`, `nm`, `jnsbh`, `noid` (SIUP/Akta), `npwp`, `kota`, `inpuser` | Complete BH attributes: `nocif`, `nm`, `golcust`, `jnsbh`, `npwp`, `noid`, `tglexpid`, `alamat`, `kota`, `telpktr`, `hp`, `inpuser`, `tglinp`, `kdloc` | Quick Approve & Reject with Rejection Modal |
| **Tabungan** | `notab`, `nocif`, `fnama`, `kodeloc`, `kodeprd`, `tglbuka`, `inpuser` | `notab`, `nocif`, `fnama`, `snama`, `kodeloc`, `kodecab`, `kodeprd`, `tglbuka`, `sawalva`, `mutasidr`, `mutasicr`, `sahirva`, `inpuser`, `inptgl` | Quick Approve & Reject with Rejection Modal |
| **Deposito** | `nodep`, `nobilyet`, `nama`, `nomrp`, `jkwaktu`, `tglbuka`, `inpuser` | `nodep`, `nobilyet`, `nama`, `nocif`, `kdprd`, `kdcab`, `kdloc`, `nomawal`, `nomrp`, `tglbuka`, `jkwaktu`, `jnsjkwaktu`, `tgleff`, `tgljtempo`, `aro`, `inpuser`, `inptgl` | Quick Approve & Reject with Rejection Modal |
| **Pembiayaan** | `nokontrak`, `nocif`, `nama`, `kdprd`, `mdlawal`, `tglakad`, `inpuser` | `nokontrak`, `nocif`, `nama`, `kdprd`, `kdcab`, `kdloc`, `mdlawal`, `tglakad`, `inpuser`, `inptgl` | Quick Approve & Reject with Rejection Modal |
| **Transaksi** | `tgltrn`, `batch`, `notrn`, `dracc` (Deber), `cracc` (Kredit), `nominalrp`, `ket` | `tgltrn`, `batch`, `notrn`, `dracc`, `namadr`, `cracc`, `namacr`, `nominalrp`, `ket`, `kdloc`, `ststrn` ('2'=Pending, '6'=Rev Pending), `inpuser`, `inptgl` | Approve (ststrn='1') & Reject |
| **Aset** | `kdaset`, `ket`, `kdloc`, `haper` (Harga Perolehan), `inpuser`, `inptgl` | `kdaset`, `ket`, `kdloc`, `kdcab`, `haper`, `inpuser`, `inptgl` | Quick Approve & Reject with Rejection Modal |
| **Jaminan** | `noreg`, `nocif`, `dokumen`, `nompasar`, `nomtaksasi`, `kdloc`, `inpuser` | `noreg`, `nocif`, `dokumen`, `nompasar`, `nomtaksasi`, `kdloc`, `kdcab`, `inpuser`, `inptgljam` | Quick Approve & Reject with Rejection Modal |
| **Kondisi Khusus** | `urutspc`, `noacc`, `jnsspc` (Decoded Description), `nomspc`, `rate`, `ket`, `tglexp` | `urutspc`, `noacc`, `jnsspc` (01-10 text), `nomspc`, `rate`, `spread`, `ket`, `tgleff`, `tglexp`, `jnsacc`, `inpuser`, `inptgljam`, Expired Warning Badge (if past date) | Quick Approve & Reject with Rejection Modal |
| **Tutup Kantor** | `kdloc`, Status ('OPEN' / 'CLOSED'), `openuser`, `opentgljam`, `closeuser` | Action buttons: "Buka Kantor" / "Tutup Kantor" status display & control | Confirm Action Trigger Modal |
| **Audit Trail** | `tgl_aksi`, `modul`, `aksi` (APPROVE/REJECT), `ref_id`, `userid`, `catatan`, `ip_client`, Access Type (`WEB-LAN` vs `WEB-EXT`) | Log detail modal showing raw IP, user agent, timestamp, exact SQL impact | Filter by Date, User, Module, Access Type |

---

## 5. Screen Component Specifications

### 5.1 Rejection Note Modal Component
- **Trigger**: Click "Reject" button on any list row or detail drawer.
- **Fields**:
  - Record Reference ID (Read-only label, e.g. `CIF 01009478 - TIVANI KUSUMA PUTRI`).
  - Rejection Reason (`catatan`, Textarea input, required, minimum 5 characters).
  - Pre-set quick reason pills ("Data Tidak Lengkap", "Dokumen Tidak Valid", "Salah Nominal", "Double Input"). Clicking a pill populates the textarea.
- **Validation**: Submit button disabled if textarea is empty or less than 5 characters.
- **API Payload**: `POST /api/:module/:id/reject` with `{ catatan: string }`.

### 5.2 Floating Toast & Notification Engine
- **Success Toast**: Green background banner at top-right (Desktop) or top-center (Mobile) with message: "CIF 01009478 successfully approved."
- **Error Toast**: Red background banner showing backend error or database validation message.
- **Pending Counter Polling Engine**:
  - Frequency: 30 seconds.
  - Action: Fetches `/api/notif/count`. Compares previous count with new count.
  - If new pending items detected: Triggers audio chime / browser push notification banner ("New pending CIF authorization request received!").

---

## 6. Caveats

1. **Greenfield Development**: No legacy HTML/CSS templates exist in the repository; UI will be constructed clean from scratch.
2. **Browser Support**: Vanilla ES6 JavaScript modules require modern browser standard (Chrome 90+, Edge 90+, Safari 14+, Firefox 88+).
3. **Database Constraints**: Password hashes in `USERPROFILE.pass` may vary between environments; authentication frontend must gracefully render error feedback for failed logins or locked accounts.

---

## 7. Conclusion

The technical UI architecture for **R2 Responsive Mobile & Desktop Frontend Interface** is fully specified and ready for implementation. The architecture utilizes standard HTML5, Vanilla CSS3 (with flexbox, grid, and CSS variables), and modular ES6 JavaScript without external heavy dependencies. It provides optimal responsiveness across smartphones and desktop workstations, complete field coverage for all 8 main authorization modules plus Kondisi Khusus and Tutup Kantor, real-time background polling, rejection note dialogs, and a detailed audit trail interface.

---

## 8. Verification Method

To independently verify the frontend UI implementation once constructed:

1. **File Inspection**:
   - Check `frontend/index.html` and `frontend/js/app.js` existence in project root or `frontend/` directory.
   - Verify presence of CSS responsive breakpoints in `frontend/css/responsive.css` (`@media (max-width: 767px)` and `@media (min-width: 1025px)`).

2. **Functional & Layout Verification**:
   - Open browser developer tools and toggle Device Emulation (iPhone 12 / Pixel 5 vs Desktop 1920x1080).
   - Confirm table transforms to Card List view on mobile viewports (< 768px).
   - Confirm Detail Drawer appears as Side Panel on Desktop and Bottom Sheet on Mobile.
   - Test Reject Modal validation: ensure submit is blocked when rejection note is empty.
   - Test Background Polling: verify `/api/notif/count` endpoint is called every 30 seconds.

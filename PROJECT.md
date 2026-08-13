# Project: Web App Otorisasi Core Banking MitraSoft

## Architecture
- **Tech Stack**: Node.js, Express.js REST API, `mssql` (tedious) driver, HTML5, Vanilla CSS3, Vanilla JavaScript (ES6 Modules).
- **Database**: Microsoft SQL Server 2019 (`192.168.1.130:44333`, DB `MCI_JULI_31072026` / `test eoy`, sa/bon).
- **Security & Auth**: `USERPROFILE` table login, JWT tokens, `WEBUSERSESSION` tracking, RBAC (`levelx` A/M/S for supervisors), dual audit logging (`WEBUSERLOG` and `WA_OTR_LOG`).
- **Data Flow**: Frontend HTML5/JS Dashboard <-> Express.js REST API Middleware <-> SQL Server Transactional Database.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Integration | SQL Server Connection Pool to 192.168.1.130:44333 | M1 | Survey / R1 |
| 2 | Auth Service | USERPROFILE Login & Level A/M/S RBAC | M1 | Survey / R3 |
| 3 | Session Tracking | WEBUSERSESSION Active Session Storage | M1 | Survey / R3 |
| 4 | Audit & IP Log | Dual Audit Logging (WEBUSERLOG + WA_OTR_LOG) & LAN/EXT IP Detection | M1 | Survey / R3 |
| 5 | CIF Perorangan API | Pending List, Detail, Approve & Reject for mCIF (golcust='I') | M2 | Survey / R1 |
| 6 | CIF Badan Hukum API | Pending List, Detail, Approve & Reject for mCIF (golcust<>'I') | M2 | Survey / R1 |
| 7 | Tabungan API | Pending List, Detail, Approve & Reject for TOFTABB | M2 | Survey / R1 |
| 8 | Deposito API | Pending List, Detail, Approve & Reject for TOFDEP | M2 | Survey / R1 |
| 9 | Transaksi API | Pending List, Detail, Approve & Reject for TOFTRNC (ststrn 2/6 -> 1/9) | M3 | Survey / R1 |
| 10 | Pembiayaan API | Pending List, Detail, Approve & Reject for TOFLMB | M3 | Survey / R1 |
| 11 | Aset API | Pending List, Detail, Approve & Reject for TOFASET | M3 | Survey / R1 |
| 12 | Jaminan API | Pending List, Detail, Approve & Reject for TOFJAMIN | M3 | Survey / R1 |
| 13 | Kondisi Khusus API | Pending List, Detail, Approve & Reject for TOFSPC (10 jnsspc codes) | M3 | Survey / R1 |
| 14 | Tutup Kantor API | Status Monitoring & Control for TOFCLOSELOC | M3 | Survey / R1 |
| 15 | Responsive Frontend Shell | HTML5 / Vanilla CSS / JS Responsive Dashboard Shell (Desktop & Mobile) | M4 | Survey / R2 |
| 16 | Dashboard Cards Grid | Summary Count Cards & 30s Real-Time Polling Engine | M4 | Survey / R2 |
| 17 | Module Views & Drawers | Responsive Data Tables / Card Lists & Attribute Detail Drawers | M4 | Survey / R2 |
| 18 | Rejection Modal | Rejection Note Dialog with Validation (min 5 chars) & Preset Pills | M4 | Survey / R2 |
| 19 | Audit Trail View | Frontend Audit Log Viewer & Access Type Badges (WEB-LAN vs WEB-EXT) | M4 | Survey / R2 |
| 20 | E2E Testing & Hardening | Opaque-box Tier 1-4 Test Suite & Tier 5 Adversarial Coverage Hardening | M5 | Strategy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Infrastructure & Auth | Database Connection Pool, USERPROFILE Auth, JWT Session, Dual Audit Log (`WEBUSERLOG` & `WA_OTR_LOG`), IP Detection | None | PLANNED |
| M2 | Core Accounts Backend | REST API endpoints for CIF Perorangan, CIF Badan Hukum, Tabungan, Deposito | M1 | PLANNED |
| M3 | Transactions & Operations Backend | REST API endpoints for Transaksi, Pembiayaan, Aset, Jaminan, Kondisi Khusus, Tutup Kantor | M1, M2 | PLANNED |
| M4 | Responsive Frontend UI | Complete HTML5, Vanilla CSS3, JS Frontend Single Page App, Responsive Layout, Polling & Modals | M2, M3 | PLANNED |
| M5 | Final E2E Test & Hardening | Pass 100% E2E test suite (Tiers 1-4) & Tier 5 Adversarial Coverage Hardening | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Auth API Contract
- `POST /api/auth/login`: `{ userid, password }` -> `{ token, user: { userid, nmuser, levelx, kdloc, kdcab } }`
- `GET /api/auth/me`: Headers `Authorization: Bearer <token>` -> `{ user }`

### 2. Authorization API Contract (Modules M2 & M3)
- `GET /api/:module/pending`: Headers `Authorization: Bearer <token>` -> `{ status: 'success', total: N, data: [...] }`
- `GET /api/:module/:id`: Headers `Authorization: Bearer <token>` -> `{ status: 'success', data: { ...all_attributes... } }`
- `POST /api/:module/:id/approve`: Headers `Authorization: Bearer <token>` -> `{ status: 'success', message: 'Approved successfully', audit_id }`
- `POST /api/:module/:id/reject`: Headers `Authorization: Bearer <token>`, Body `{ catatan }` (min 5 chars) -> `{ status: 'success', message: 'Rejected successfully', audit_id }`

### 3. Database Update Audit Standard
- `autuser`: `userid` of checker from JWT token (max 10 chars).
- `auttgl` / `tglaut` / `auttgljam`: Current timestamp formatted as `yyyyMMddHHmmss` (14 chars).
- `autterm` / `devaut`: `'WEB-LAN'` (for private IP range) or `'WEB-EXT'` (for public/other IP) (max 10 chars).

## Code Layout
```
backend/
├── src/
│   ├── app.js                 # Express Application setup & middleware
│   ├── server.js              # Server listener (Port 3000 / process.env.PORT)
│   ├── config/
│   │   ├── db.js              # mssql pool configuration (192.168.1.130:44333)
│   │   └── jwt.js             # JWT secret & options configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT verification & levelx RBAC check
│   │   └── auditLogger.js     # IP detection (LAN/EXT) & WA_OTR_LOG / WEBUSERLOG logger
│   ├── routes/
│   │   ├── authRoutes.js      # Login & Session routes
│   │   ├── cifRoutes.js       # CIF Perorangan & Badan Hukum routes
│   │   ├── tabunganRoutes.js  # Tabungan routes
│   │   ├── depositoRoutes.js  # Deposito routes
│   │   ├── transaksiRoutes.js # Transaksi routes
│   │   ├── pembiayaanRoutes.js# Pembiayaan routes
│   │   ├── asetRoutes.js      # Aset routes
│   │   ├── jaminanRoutes.js   # Jaminan routes
│   │   ├── kondisiKhususRoutes.js # Kondisi Khusus routes
│   │   ├── tutupKantorRoutes.js   # Status Tutup Kantor routes
│   │   └── auditRoutes.js     # Audit trail viewer routes
│   └── controllers/
│       ├── authController.js
│       ├── cifController.js
│       ├── tabunganController.js
│       ├── depositoController.js
│       ├── transaksiController.js
│       ├── pembiayaanController.js
│       ├── asetController.js
│       ├── jaminanController.js
│       ├── kondisiKhususController.js
│       ├── tutupKantorController.js
│       └── auditController.js
frontend/
├── index.html
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   └── responsive.css
└── js/
    ├── app.js
    ├── api.js
    ├── auth.js
    ├── store.js
    └── modules/
        ├── dashboard.js
        ├── cif.js
        ├── tabungan.js
        ├── deposito.js
        ├── transaksi.js
        ├── pembiayaan.js
        ├── aset.js
        ├── jaminan.js
        ├── kondisikhusus.js
        ├── tutupkantor.js
        └── auditlog.js
```

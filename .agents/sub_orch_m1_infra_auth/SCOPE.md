# Scope: Milestone 1 (Infrastructure & Authentication)

## Architecture
- **Tech Stack**: Node.js, Express.js REST API, `mssql` (tedious) driver, `jsonwebtoken`.
- **Database Connection Pool**: SQL Server 2019 at `192.168.1.130:44333`, DB `MCI_JULI_31072026` / `test eoy`, credentials `sa` / `bon`.
- **Authentication**: `USERPROFILE` table credentials validation (`userid`, `pass`) and level permissions (`levelx` IN ('A', 'M', 'S')).
- **Session Management**: Active sessions stored/updated in `WEBUSERSESSION` (`userid`, `appid='OTRS'`, `sessionid`).
- **Network IP Detection & Dual Audit Logging**:
  - Detect IP range (LAN private IPs `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`, `127.0.0.1` vs WAN/EXTERNAL).
  - Log access/actions to `WEBUSERLOG` and `WA_OTR_LOG`.
  - Auto-create table `WA_OTR_LOG` if it does not exist.

## Feature Inventory (M1 Scope)
| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | DB Integration | Express server setup & SQL Server Connection Pool to 192.168.1.130:44333 | IN_PROGRESS |
| 2 | Auth Service | USERPROFILE Login (`/api/auth/login`), Password check, Level A/M/S RBAC, JWT issuance | IN_PROGRESS |
| 3 | Session Tracking | WEBUSERSESSION Active Session Storage & `/api/auth/me` verification | IN_PROGRESS |
| 4 | Audit & IP Log | Dual Audit Logging (`WEBUSERLOG` + `WA_OTR_LOG`) & LAN/EXT IP Detection | IN_PROGRESS |

## Code Layout for M1
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
│   └── routes/
│       └── authRoutes.js      # Login & Session routes
│   └── controllers/
│       └── authController.js  # Login & session handler
├── package.json
```

## Milestone Sub-components
| # | Item | Description | Status |
|---|------|-------------|--------|
| 1.1 | Express & Pool | Express server skeleton and robust `mssql` connection pool handling | IN_PROGRESS |
| 1.2 | Auth & JWT | USERPROFILE login authentication & JWT generation/verification | IN_PROGRESS |
| 1.3 | Session Tracking | WEBUSERSESSION insert/update logic | IN_PROGRESS |
| 1.4 | Dual Audit Log | IP detection middleware & WEBUSERLOG + WA_OTR_LOG database logging | IN_PROGRESS |

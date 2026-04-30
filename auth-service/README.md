# auth-service

Go service (chi router) that handles shop registration, authentication, JWT issuance, staff management, and invite flow.

**Port:** 8081 (default)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8081` | HTTP listen port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `detailsnap` | MySQL user |
| `DB_PASSWORD` | `changeme` | MySQL password |
| `DB_NAME` | `detailsnap` | MySQL database |
| `JWT_SECRET` | — | **Required.** HS256 signing secret (shared with all services) |
| `JWT_TTL_HOURS` | `24` | Token lifetime in hours |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Log level (info/debug) |

## Running

```bash
cp .env.example .env
# edit .env with real values
go run ./cmd/server
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /healthz | — | Liveness check |
| GET | /readyz | — | Readiness check (pings DB) |
| POST | /signup | — | Create shop + owner account |
| POST | /login | — | Returns JWT |
| POST | /invites/accept | — | Accept staff invite, create account |
| GET | /me | JWT | Current user + shop |
| GET | /shop | JWT | Shop details |
| PATCH | /shop | JWT owner | Update shop info |
| GET | /staff | JWT | List staff members |
| POST | /staff/invites | JWT owner | Create staff invite (token logged) |
| GET | /staff/invites | JWT owner | List pending invites |
| DELETE | /staff/invites/:id | JWT owner | Revoke invite |
| DELETE | /staff/:userId | JWT owner | Remove staff member |

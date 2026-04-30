# core-service

Node.js + Express service owning customers, vehicles, services catalog, sessions, quotes, invoices, dashboard, and public booking.

**Port:** 8082 (default)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8082` | HTTP listen port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `detailsnap` | MySQL user |
| `DB_PASSWORD` | `changeme` | MySQL password |
| `DB_NAME` | `detailsnap` | MySQL database |
| `JWT_SECRET` | — | **Required.** Same secret as auth-service |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## Running

```bash
cp .env.example .env
# edit .env
npm install
npm run dev   # uses node --watch for auto-reload
```

## Key Endpoints

| Path | Auth | Description |
|---|---|---|
| GET /healthz | — | Liveness |
| GET /readyz | — | Readiness (pings DB) |
| GET/POST /customers | JWT | Customer CRUD |
| GET/POST /customers/:id/vehicles | JWT | Vehicle management |
| GET/POST /services | JWT | Service catalog |
| GET/POST /sessions | JWT | Job/appointment management |
| POST /sessions/:id/start | JWT | Start a session |
| POST /sessions/:id/complete | JWT | Complete + auto-invoice |
| GET/POST /quotes | JWT | Quote management |
| GET/POST /invoices | JWT | Invoice management |
| POST /invoices/:id/pay | JWT | Fake payment |
| GET /dashboard | JWT | KPI summary |
| GET /calendar | JWT | Calendar events |
| GET /public/shops/:slug | — | Public shop info |
| POST /public/shops/:slug/bookings | — | Public booking |

# DetailSnap

A multi-tenant SaaS CRM for car detailing shops. Manage customers, vehicles, services, sessions (jobs), photos, quotes, and invoices — all from one dashboard.

## Architecture

```
detailsnap-web/
├── auth-service/      Go 1.22+ · chi · port 8081
├── core-service/      Node.js 20+ · Express · port 8082
├── media-service/     Java 21 · Spring Boot 3 · port 8083
├── frontend/          React 18 · Vite · Tailwind · port 5173
└── db/
    └── schema.sql     Single file to bootstrap MySQL
```

All three backend services connect to the **same MySQL database** and validate JWTs using the **same shared secret**. No inter-service HTTP calls.

## Prerequisites

1. MySQL 8 — create a database and user:
   ```sql
   CREATE DATABASE detailsnap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'detailsnap'@'localhost' IDENTIFIED BY 'changeme';
   GRANT ALL PRIVILEGES ON detailsnap.* TO 'detailsnap'@'localhost';
   ```
2. Apply the schema:
   ```bash
   mysql -u detailsnap -p detailsnap < db/schema.sql
   ```
3. (Optional) Load seed data: uncomment the `/* … */` block at the bottom of `schema.sql` and re-run. Seed shop login: `owner@sparkledetail.com` / `password123`.
4. An S3 bucket with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on it (only needed for media-service / photo uploads).
5. Go 1.22+, Node.js 20+, Java 21, Maven 3.9+.

## Running locally

Copy `.env.example` to `.env` in each service and fill in your values. Then run each service in a separate terminal:

```bash
# Terminal 1 — auth-service
cd auth-service
go run ./cmd/server

# Terminal 2 — core-service
cd core-service
npm install
npm run dev

# Terminal 3 — media-service (requires Maven)
cd media-service
export $(cat .env | xargs)
mvn spring-boot:run

# Terminal 4 — frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and sign up for a new shop.

## Service health checks

| Service | Liveness | Readiness |
|---|---|---|
| auth-service | `GET :8081/healthz` | `GET :8081/readyz` |
| core-service | `GET :8082/healthz` | `GET :8082/readyz` |
| media-service | `GET :8083/healthz` | `GET :8083/readyz` |

## Public booking page

Each shop gets a public booking URL based on its slug:
```
http://localhost:5173/book/<shop-slug>
```

No login required. Customers fill in their info, pick services and a time, and the session is created in the database.

## End-to-end walkthrough

1. **Sign up** at `/signup` — creates your shop and owner account.
2. **Add services** at `/app/services` — define what your shop offers and pricing.
3. **Add a customer** at `/app/customers` — or let one arrive via the public booking page.
4. **Create a session** at `/app/sessions/new` — pick customer → vehicle → services → date.
5. On the session detail page, click **Start** then **Mark complete** — an invoice is created automatically.
6. **Pay the invoice** at `/app/invoices` — select payment method and confirm.
7. **Upload photos** on the session detail — before/after/inspection tabs.

## JWT structure

All services validate tokens with HS256 using `JWT_SECRET`. Claims:

```json
{ "user_id": "...", "shop_id": "...", "role": "owner|staff", "iat": ..., "exp": ... }
```

Tokens expire after 24 hours (configurable via `JWT_TTL_HOURS` in auth-service).

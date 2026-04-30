# media-service

Java 21 + Spring Boot 3 service that handles photo uploads to S3 and serves presigned URLs.

## What it does

- Accepts multipart photo uploads (JPEG, PNG, WebP, ≤ 15 MB)
- Stores files in S3 under `shops/{shopId}/sessions/{sessionId}/{uuid}.{ext}`
- Inserts metadata into the shared MySQL `photos` table
- Returns and lists photos with presigned GET URLs (default 1-hour TTL)
- Validates JWTs using the shared `JWT_SECRET` and scopes all operations to `shop_id`

## Environment variables

Copy `.env.example` to `.env` and fill in values. Spring Boot reads them via `${ENV_VAR}` in `application.properties`.

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default 8083) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection |
| `JWT_SECRET` | Shared HS256 secret (must match auth-service and core-service) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `AWS_REGION` | AWS region for S3 |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `S3_BUCKET` | Target S3 bucket name |
| `PRESIGNED_URL_TTL_SECONDS` | How long presigned URLs stay valid (default 3600) |

## Running locally

Requires Java 21 and Maven 3.9+ (or use the Maven wrapper if present).

```bash
# Load environment
export $(cat .env | xargs)

# Run
mvn spring-boot:run
```

Or if you have the Maven wrapper:
```bash
./mvnw spring-boot:run
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness probe — always 200 |
| `GET` | `/readyz` | Readiness probe — checks DB |
| `POST` | `/photos` | Upload photo (multipart) |
| `GET` | `/photos?sessionId=...` | List photos for a session |
| `GET` | `/photos?unassigned=true` | List unassigned photos for shop |
| `GET` | `/photos/:id` | Single photo + presigned URL |
| `PATCH` | `/photos/:id` | Update caption/tag |
| `DELETE` | `/photos/:id` | Delete from S3 and DB |

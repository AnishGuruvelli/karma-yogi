# Karma Yogi Production-Style Local Runbook

This document consolidates architecture, startup, API E2E testing, troubleshooting, and release-oriented local validation for this repository.

## 1) Repository Layout

- `frontend/`: React + Vite SPA (`react-router-dom`)
- `backend/`: Go API service with 3-layer structure
  - `internal/controller`: HTTP handlers
  - `internal/service`: business logic
  - `internal/database`: repositories + DB access
- `deploy/nginx/default.conf`: reverse proxy config
- `docker-compose.yml`: local production-like orchestration
- `scripts/e2e.sh`: one-command E2E API test flow

## 2) Service Topology (Local)

- `frontend` (dev): `http://localhost:8081`
- `nginx`: `http://localhost:80`
- `api`: `http://localhost:8080`
- `postgres`: `localhost:5432`

Typical production-like path:

- Browser -> Nginx -> Go API (`/api/*`)
- Go API -> PostgreSQL

## 3) First-Time Setup

1. Install prerequisites:
   - Docker Desktop (running)
   - Node.js + npm
   - `jq` (required by E2E script)
2. Ensure env file exists:
   - `cp .env.example .env` (if not already present)

## 4) Run Locally

### A. Backend + Postgres + Nginx

```bash
docker compose up --build -d
```

### B. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5) One-Command E2E API Testing

Run from repo root:

```bash
./scripts/e2e.sh
```

What it validates:

- API health endpoint
- Auth-protected route access
- End-to-end CRUD flow for sessions and goals
- Insights endpoint aggregation
- Refresh token rotation and logout
- Nginx proxy path (`/api/*`)
- Google auth invalid-token handling (expects 401)

## 6) Manual Health Checks

- Direct API health:
  - `curl -i http://localhost:8080/healthz`
- Proxied API health:
  - `curl -i http://localhost/api/healthz`
- Compose service status:
  - `docker compose ps`

## 7) Troubleshooting Guide

### Port already in use

- Check listeners:
  - `lsof -nP -iTCP:8080 -sTCP:LISTEN`
  - `lsof -nP -iTCP:8081 -sTCP:LISTEN`
- Kill conflicting process if needed.

### API starts but DB tables are missing

- Confirm migrations are in API image:
  - `docker compose exec -T api ls -la /app/migrations`
- Check relations:
  - `docker compose exec -T postgres psql -U karma -d karma_yogi -c "\\dt"`
- Rebuild stack:
  - `docker compose down`
  - `docker compose up --build -d`

### Nginx `/api/*` returns 404

- Ensure `deploy/nginx/default.conf` uses:
  - `proxy_pass http://api:8080;`
- Recreate nginx container:
  - `docker compose up --build -d nginx`

### E2E script fails with `jq` missing

- Install `jq` and rerun:
  - macOS with Homebrew: `brew install jq`

## 8) Recommended Pre-Deployment Local Gate

Before pushing production release changes:

1. `docker compose up --build -d`
2. `cd backend && go test ./...`
3. `cd frontend && npm run lint && npm run build`
4. `./scripts/e2e.sh`
5. Verify `docker compose ps` healthy state

## 9) Useful Commands Cheat Sheet

- Start stack: `docker compose up --build -d`
- Stop stack: `docker compose down`
- API logs: `docker compose logs -f api`
- DB shell: `docker compose exec -it postgres psql -U karma -d karma_yogi`
- Frontend dev: `cd frontend && npm run dev`
- E2E APIs: `./scripts/e2e.sh`

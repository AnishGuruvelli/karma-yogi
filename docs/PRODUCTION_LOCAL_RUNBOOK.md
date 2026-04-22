# Karma Yogi Production-Style Local Runbook

Architecture, startup, API E2E testing, troubleshooting, and release-oriented local validation.

## 1) Repository layout

- `frontend/`: React + Vite SPA (`react-router-dom`)
- `backend/`: Go API (controller / service / database)
- `deploy/nginx/default.conf`: reverse proxy — forwards `/api/` to the API container
- `docker-compose.yml`: Postgres, API, Nginx
- `scripts/e2e.sh`: one-command API smoke test
- `docs/openapi.yaml`: public HTTP contract

## 2) Service topology (local)

| Service | URL |
|---------|-----|
| Frontend (dev) | `http://localhost:8081` (Vite default in this repo; next free port if busy) |
| API (direct) | `http://localhost:8080` |
| Nginx | `http://localhost:80` |
| Postgres | `localhost:5432` |

Typical path in production: browser → Nginx → Go API (`/api/*`) → PostgreSQL.

**Important:** Nginx is configured with `location /api/` and `proxy_pass http://api:8080;` (URI is passed through). The API serves **`GET /healthz` on the server root**, not under `/api/v1`. So **`curl http://localhost/api/healthz` hits `/api/healthz` on the API and will 404** unless you add a dedicated Nginx `location` rewrite. For local checks, use the direct API URL below.

## 3) First-time setup

1. Docker Desktop (or compatible engine) running
2. Node.js + npm
3. `jq` (required by `scripts/e2e.sh`)
4. Environment file: `cp .env.example .env` and set secrets (especially `JWT_SECRET`, Google keys for real OAuth)

## 4) Run locally

### A) Backend + Postgres + Nginx

```bash
docker compose up --build -d
```

### B) Frontend

```bash
cd frontend
npm install
npm run dev
```

Ensure `CORS_ALLOWED_ORIGINS` in `.env` includes your actual SPA origin (scheme + host + port).

## 5) One-command E2E API testing

From repo root:

```bash
./scripts/e2e.sh
```

What it validates (high level):

- API **`GET /healthz`** on port 8080
- **`POST /api/v1/auth/register`** (email, password, `secretAnswer`)
- **`POST /api/v1/auth/login`**
- **`POST /api/v1/auth/password-reset`** then login with old password fails (`401`) and with new password succeeds
- Authenticated **`GET /api/v1/users/me`**
- Subject create + session create/update/list + goal create/update/list + insights
- Subject delete cascades sessions (assertion)
- Goal delete
- **`POST /api/v1/auth/refresh`** and **`POST /api/v1/auth/logout`**
- **`GET/PUT/DELETE /api/v1/timer-state`** for persisted active timer state across refresh/tab switches
- **Nginx:** `GET http://localhost/api/v1/users/me` with Bearer token (proxied `/api/v1/...`)
- **`POST /api/v1/auth/google`** with invalid token returns `401`

## 6) Manual health checks

- **API health (correct):** `curl -i http://localhost:8080/healthz`
- **Not valid via default Nginx config:** `http://localhost/api/healthz` (no matching route on API without extra Nginx rules)
- Compose status: `docker compose ps`

## 7) Troubleshooting

### Port already in use

- `lsof -nP -iTCP:8080 -sTCP:LISTEN`
- `lsof -nP -iTCP:8081 -sTCP:LISTEN`
- `lsof -nP -iTCP:5432 -sTCP:LISTEN` (Postgres; change host mapping in `docker-compose.yml` if you run another Postgres on 5432)

### API starts but tables are missing

- `docker compose exec -T api ls -la /app/migrations` (paths may vary by image layout)
- `docker compose exec -T postgres psql -U karma -d karma_yogi -c "\dt"`
- Rebuild: `docker compose down && docker compose up --build -d`

### Nginx `/api/v1/...` returns 404

- Confirm `deploy/nginx/default.conf` proxies to `api:8080`
- Recreate: `docker compose up --build -d nginx`

### E2E fails with `jq` missing

- macOS: `brew install jq`

## 8) Recommended pre-deployment local gate

1. `docker compose up --build -d`
2. `cd backend && go test ./...`
3. `cd frontend && npm run lint && npm run build`
4. `./scripts/e2e.sh`
5. `docker compose ps` — all services healthy

## 9) Command cheat sheet

| Action | Command |
|--------|---------|
| Start stack | `docker compose up --build -d` |
| Stop stack | `docker compose down` |
| API logs | `docker compose logs -f api` |
| DB shell | `docker compose exec -it postgres psql -U karma -d karma_yogi` |
| Frontend dev | `cd frontend && npm run dev` |
| E2E | `./scripts/e2e.sh` |

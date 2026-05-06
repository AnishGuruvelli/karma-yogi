# Karma Yogi — Production-Style Local Runbook

Architecture, startup, API E2E testing, troubleshooting, and pre-deployment validation.

---

## 1) Repository layout

```
karma-yogi/
├── frontend/                 React + Vite SPA (Capacitor Android)
├── backend/
│   ├── cmd/api/main.go
│   └── internal/
│       ├── auth/             JWT generation, refresh token hashing
│       ├── config/           Env-driven config (see .env.example)
│       ├── controller/       HTTP handlers
│       ├── database/         Postgres repositories
│       ├── domain/           Domain models (User, Session, Subject, Goal, …)
│       ├── http/router.go    Chi router — all routes declared here
│       ├── middleware/        Auth (JWT), rate-limit, CORS, security headers, request log
│       └── service/          Business logic (AuthService, domain services)
├── deploy/nginx/default.conf Nginx reverse proxy (routes /api/* → API container)
├── docker-compose.yml        Postgres + API + Nginx
├── .env.example              Shared env template
├── docs/
│   ├── openapi.yaml          Full OpenAPI 3.0 spec with schemas
│   ├── PRODUCTION_LOCAL_RUNBOOK.md  ← this file
│   └── ANDROID_APP_RUNBOOK.md
└── scripts/
    └── e2e.sh                One-command API smoke test
```

---

## 2) Service topology (local)

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (Vite dev) | `http://localhost:8081` | Next free port if 8081 is busy |
| API (direct) | `http://localhost:8080` | All `/api/v1/*` routes |
| Nginx | `http://localhost` (port 80) | Proxies `/api/*` → `api:8080` |
| Postgres | `localhost:5432` | |

**Health check:** `GET http://localhost:8080/healthz` (server root, not under `/api/v1`).

> **Nginx caveat:** The default `deploy/nginx/default.conf` uses `location /api/` → `proxy_pass http://api:8080`. The API serves `GET /healthz` at the server root — so `curl http://localhost/api/healthz` hits `/api/healthz` on the API which returns 404. Always health-check via the direct API URL on port 8080.

---

## 3) First-time setup

1. Docker Desktop (or compatible engine) running.
2. Node.js LTS + npm.
3. `jq` — required by `scripts/e2e.sh`.
   - macOS: `brew install jq`
   - Ubuntu: `apt-get install -y jq`
4. `python3` (stdlib) — required by `scripts/e2e.sh` for date arithmetic.
5. Environment file:
   ```bash
   cp .env.example .env
   ```
   At minimum set `JWT_SECRET` (any strong random string), and verify `CORS_ALLOWED_ORIGINS` includes your SPA origin.

---

## 4) Run locally

### A) Backend + Postgres + Nginx

```bash
docker compose up --build -d
```

Services start in the order: postgres → api → nginx. Verify:

```bash
docker compose ps
curl -i http://localhost:8080/healthz
```

### B) Frontend dev server

```bash
cd frontend
npm install
npm run dev
```

The Vite server listens on **port 8081** by default (configured in `frontend/vite.config.ts`). If 8081 is busy, Vite picks the next free port — you will need to add that origin to `CORS_ALLOWED_ORIGINS` in `.env` and restart the API:

```bash
docker compose up -d --no-deps api
```

---

## 5) One-command E2E API test

From repo root:

```bash
./scripts/e2e.sh
```

### What the script validates

| Category | Checks |
|----------|--------|
| **Infrastructure** | `GET /healthz`, Nginx proxy (`http://localhost/api/v1/users/me`) |
| **Auth** | Register, login, password reset (old password fails, new succeeds), dev-login, refresh token rotation, revoked-token 401, logout, Google invalid-token 401 |
| **Users** | `GET /users/me`, `PATCH /users/me` (fullName update assertion) |
| **Subjects** | Create, list, PATCH color, delete |
| **Sessions** | Create, update (durationMin assertion), list, individual `DELETE /sessions/{id}`, subject cascade-delete |
| **Achievements** | `GET /users/me/achievements` — `first_session` earned assertion |
| **Study stats** | `GET /users/me/study-stats?tz=UTC` — totalSessions and totalMinutes positive |
| **Goals** | Create, PATCH, list, delete |
| **Exam goal** | Upsert, GET (name assertion), DELETE (null assertion) |
| **Profile** | `PATCH/GET /users/me/public-profile` (bio round-trip) |
| **Preferences** | `PATCH/GET /users/me/preferences` (defaultSessionMinutes round-trip), `showStrategyPage` field |
| **Privacy** | `PATCH/GET /users/me/privacy` (profilePublic round-trip) |
| **Public profile** | `GET /users/{username}/public-profile` (privacy-aware, targetExam assertion) |
| **Friends — discover** | `GET /friends/users` — friend visible in discover list |
| **Friends — requests** | Send, outgoing list assertion, accept, reject (third user), confirmed friends list |
| **Friends — sessions** | `POST /friends/sessions` with `perFriendPlans` overrides — both self and friend session created |
| **Friend profile details** | `POST /friends/friend-profile` — `canViewDetails=false` for non-friend, `canViewDetails=true` + sessions for confirmed friend |
| **Leaderboard** | `GET /friends/leaderboard`, week offset 0 (current) and -1 (previous) with minute assertions |
| **Timer state** | PUT (solo), GET round-trip, PUT (friend live payload), POST `/start` (startedAtMs assertion), DELETE + null assertion |

---

## 6) Auth internals

### Token model

| Token | Default TTL | Config env |
|-------|-------------|-----------|
| Access (JWT HS256) | 15 min | `JWT_ACCESS_TTL_MINUTES` |
| Refresh (opaque UUID, SHA-256 hash in DB) | 720 h / 30 days | `JWT_REFRESH_TTL_HOURS` |

The refresh token is **rotated on every use** — the old ID is revoked and a new `(refreshId, refreshToken)` pair is issued. Using a revoked token returns 401.

### Concurrent 401 safety

The frontend `src/lib/api.ts` uses a module-level `refreshInFlight: Promise<AuthState> | null` flag. When multiple requests simultaneously receive a 401 (e.g., after the 15-minute access token expires and the app is resumed with several concurrent API calls in-flight), only the first request triggers a real `POST /auth/refresh`. All other parallel requests `await` the same promise. This prevents the rotation race condition that would otherwise burn the refresh token and immediately log the user out.

---

## 7) Manual health checks

```bash
# Direct API health
curl -i http://localhost:8080/healthz

# Authenticated endpoint via Nginx proxy
curl -i http://localhost/api/v1/users/me -H "Authorization: Bearer <token>"

# Compose service status
docker compose ps

# API logs
docker compose logs -f api

# Postgres shell
docker compose exec -it postgres psql -U karma -d karma_yogi
```

---

## 8) Troubleshooting

### Port already in use

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

Change the host-side port in `docker-compose.yml` if another Postgres or service is on 5432/8080.

### API starts but tables are missing

```bash
docker compose exec -T postgres psql -U karma -d karma_yogi -c "\dt"
# If no tables: rebuild
docker compose down && docker compose up --build -d
```

### Nginx `/api/v1/…` returns 404

Confirm `deploy/nginx/default.conf` has `location /api/` and proxies to `api:8080`. Rebuild just Nginx:

```bash
docker compose up --build -d nginx
```

### E2E fails with `shasum` not found

On Linux, `shasum` may not be installed. Replace with `sha256sum`:

```bash
REFRESH_HASH="$(printf "%s" "$RAW_REFRESH" | sha256sum | awk '{print $1}')"
```

### `jq` not installed

```bash
# macOS
brew install jq
# Ubuntu/Debian
sudo apt-get install -y jq
```

### Frontend can't reach API (CORS error)

`CORS_ALLOWED_ORIGINS` in `.env` must include the **exact** SPA origin (`scheme://host:port`). After editing:

```bash
docker compose up -d --no-deps api
```

### Google sign-in fails in the browser

Ensure `VITE_GOOGLE_CLIENT_ID` in `.env` matches the OAuth client configured in Google Cloud Console. The authorized JavaScript origins must include your frontend URL.

### Android emulator can't reach local API

Use `http://10.0.2.2:8080/api/v1` as `VITE_API_BASE_URL` (emulator alias for host loopback). For a physical device on the same Wi-Fi, use the host's LAN IP. See `docs/ANDROID_APP_RUNBOOK.md`.

---

## 9) Pre-deployment gate

Run all checks before merging or deploying:

```bash
# 1. Build and start stack
docker compose up --build -d

# 2. Backend tests + vet
cd backend && go test ./... && go vet ./...

# 3. Frontend type-check, lint, and production build
cd frontend && npx tsc --noEmit && npm run lint && npm run build

# 4. E2E smoke test
./scripts/e2e.sh

# 5. All services healthy
docker compose ps
```

---

## 10) Command cheat sheet

| Action | Command |
|--------|---------|
| Start full stack | `docker compose up --build -d` |
| Stop stack | `docker compose down` |
| API logs | `docker compose logs -f api` |
| DB shell | `docker compose exec -it postgres psql -U karma -d karma_yogi` |
| Frontend dev | `cd frontend && npm run dev` |
| Frontend build | `cd frontend && npm run build` |
| Android build + sync | `cd frontend && npm run android:build:sync` |
| Open Android Studio | `cd frontend && npm run cap:open:android` |
| E2E | `./scripts/e2e.sh` |
| Go tests | `cd backend && go test ./...` |
| Go vet | `cd backend && go vet ./...` |

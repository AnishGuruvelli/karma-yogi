# Karma Yogi Monorepo

Production-ready split frontend (React + Vite) and backend (Go + Chi + Postgres).

## Structure

- `frontend/` — React SPA with `react-router-dom`, Tailwind, Vite
- `backend/` — Go API (`internal/controller`, `internal/service`, `internal/database`)
- `docs/openapi.yaml` — HTTP API contract (keep in sync with `backend/internal/http/router.go`)
- `scripts/e2e.sh` — API smoke test against Docker Compose
- `deploy/nginx/default.conf` — sample reverse proxy (`/api/*` → API)

## Local development

1. Copy environment and adjust secrets:

   ```bash
   cp .env.example .env
   ```

2. Start Postgres + API (+ Nginx on port 80):

   ```bash
   docker compose up --build
   ```

3. In another terminal, install and run the frontend:

   ```bash
   cd frontend && npm install && npm run dev
   ```

Default dev URLs:

- **API:** `http://localhost:8080` (OpenAPI paths are under `/api/v1`, e.g. `POST /api/v1/auth/login`)
- **Frontend:** `http://localhost:8081` (Vite is configured for port `8081`; if that port is busy, Vite may choose the next free port—then add that origin to `CORS_ALLOWED_ORIGINS` in `.env` and restart the API)
- **Nginx (Compose):** `http://localhost` — proxies **`/api/*`** to the API; **`GET /healthz` is not under `/api`**, so use `http://localhost:8080/healthz` for health checks unless you add a dedicated Nginx route

## Authentication

The API supports:

| Flow | Endpoint | Notes |
|------|----------|--------|
| Register (email + password + security answer) | `POST /api/v1/auth/register` | Answer is for password reset without email; client shows a single standard question (see `frontend/src/lib/auth-constants.ts`) |
| Login | `POST /api/v1/auth/login` | |
| Password reset | `POST /api/v1/auth/password-reset` | Email + security answer + new password |
| Google (ID token) | `POST /api/v1/auth/google` | Browser uses Google Identity Services; send the ID token in JSON |
| Refresh | `POST /api/v1/auth/refresh` | Rotates refresh token |
| Logout | `POST /api/v1/auth/logout` | Body: `refreshId` |
| Dev login | `POST /api/v1/auth/dev-login` | Optional `{"email":"..."}`; intended for local convenience—creates or reuses a dev user |

Frontend env (see `.env.example`):

- `VITE_API_BASE_URL` — e.g. `http://localhost:8080/api/v1`
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth Web client ID (must match backend Google config for token verification)
- `VITE_DEV_AUTO_LOGIN` — `true`/`false`; when `true`, dev auto-login behavior in the SPA may apply (see `frontend/src/lib/api.ts`)

Google OAuth: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URL` for server-side verification; align the SPA origin and redirect URL with how you run the frontend.

## Environment

- Shared template: **`.env.example`** → copy to **`.env`** for Compose and local tooling.
- **CORS:** `CORS_ALLOWED_ORIGINS` must include the exact browser origin of the SPA (including scheme and port).

## Production notes

- Store JWT secret, Google credentials, and DB credentials in a managed secret store.
- Run database migrations before or as part of deploying a new API image.
- Terminate TLS at your load balancer or Nginx; restrict `CORS_ALLOWED_ORIGINS` to real app origins.

## End-to-end API check

From the repo root (requires Docker and `jq`):

```bash
./scripts/e2e.sh
```

This exercises register, login, password reset, authenticated CRUD (subjects, sessions, goals), insights, refresh + logout, Nginx `/api/v1` proxying, and invalid Google token handling. Details: `docs/PRODUCTION_LOCAL_RUNBOOK.md`.

## API documentation

- OpenAPI 3: **`docs/openapi.yaml`**

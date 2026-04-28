# Karma Yogi Monorepo

<p align="center">
  <a href="https://karma-yogi-web.onrender.com/">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-karma--yogi--web.onrender.com-4f46e5?logo=render&logoColor=white" />
  </a>
  <a href="https://karma-yogi-api.onrender.com/healthz">
    <img alt="Backend Health" src="https://img.shields.io/badge/Backend%20Health-OK-16a34a?logo=render&logoColor=white" />
  </a>
</p>

<p align="center">
  Production-ready split frontend (React + Vite) and backend (Go + Chi + Postgres).
</p>

## Product gallery

All current UI screenshots:

| | |
|---|---|
| <img width="100%" alt="Karma Yogi screenshot 1" src="https://github.com/user-attachments/assets/40453b4f-4deb-4003-b898-30d7691737cb" /> | <img width="100%" alt="Karma Yogi screenshot 2" src="https://github.com/user-attachments/assets/57188331-3d9e-4cd9-9e0d-202548afdf0b" /> |
| <img width="100%" alt="Karma Yogi screenshot 3" src="https://github.com/user-attachments/assets/d4d56e5b-44e6-4310-b312-671442e50c90" /> | <img width="100%" alt="Karma Yogi screenshot 4" src="https://github.com/user-attachments/assets/6ca7231e-214e-49bd-9eff-e24094eb850a" /> |
| <img width="100%" alt="Karma Yogi screenshot 5" src="https://github.com/user-attachments/assets/98c4d3b1-9cb4-4b8f-98fa-858cb660d69a" /> | <img width="100%" alt="Karma Yogi screenshot 6" src="https://github.com/user-attachments/assets/ca2c93a0-f4ae-4b0b-a188-ee50f321250d" /> |
| <img width="100%" alt="Karma Yogi screenshot 7" src="https://github.com/user-attachments/assets/82f82304-c7ee-4887-a69d-2e10341e5813" /> | <img width="100%" alt="Karma Yogi screenshot 8" src="https://github.com/user-attachments/assets/c8defb99-ff98-4724-9cfb-ab5757d673a6" /> |

## Quick links

- Official web app: [https://karma-yogi-web.onrender.com/](https://karma-yogi-web.onrender.com/)
- Backend health: [https://karma-yogi-api.onrender.com/healthz](https://karma-yogi-api.onrender.com/healthz)
- OpenAPI spec: `docs/openapi.yaml`

## Official deployment

- Frontend (official website): [https://karma-yogi-web.onrender.com/](https://karma-yogi-web.onrender.com/)
- Backend health check: [https://karma-yogi-api.onrender.com/healthz](https://karma-yogi-api.onrender.com/healthz)

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
| Timer state sync | `GET/PUT/DELETE /api/v1/timer-state` | Persists active timer UI state per user so running timers can recover after tab switches or page refresh |
| Profile settings | `GET/PATCH /api/v1/users/me/public-profile` | Public profile metadata (bio, location, education, target exam, etc.) |
| Preferences | `GET/PATCH /api/v1/users/me/preferences` | Study defaults and notification toggles |
| Privacy settings | `GET/PATCH /api/v1/users/me/privacy` | Public profile / stats / leaderboard visibility controls |
| Public profile lookup | `GET /api/v1/users/{username}/public-profile` | Privacy-aware public profile payload for profile pages |
| Friends | `/api/v1/friends/*` | Discover users, send/accept friend requests, create shared friend sessions (same subject/topic or per-friend subject/topic overrides), and view weekly friend leaderboard (`weekOffset` supported) |

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

This exercises register, login, password reset, authenticated CRUD (subjects, sessions, goals), exam goal lifecycle, profile/preferences/privacy read-write flows, privacy-aware public profile retrieval, insights, friend requests + shared sessions + leaderboard week switching, timer-state persistence (including friend live timer payloads), refresh + logout, Nginx `/api/v1` proxying, and invalid Google token handling. Details: `docs/PRODUCTION_LOCAL_RUNBOOK.md`.

## API documentation

- OpenAPI 3: **`docs/openapi.yaml`**

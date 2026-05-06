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
  Production-ready study-tracking platform — React + Vite frontend, Go + Chi + Postgres backend, Capacitor Android packaging.
</p>

## Product gallery

| | |
|---|---|
| <img width="100%" alt="Karma Yogi screenshot 1" src="https://github.com/user-attachments/assets/40453b4f-4deb-4003-b898-30d7691737cb" /> | <img width="100%" alt="Karma Yogi screenshot 2" src="https://github.com/user-attachments/assets/57188331-3d9e-4cd9-9e0d-202548afdf0b" /> |
| <img width="100%" alt="Karma Yogi screenshot 3" src="https://github.com/user-attachments/assets/d4d56e5b-44e6-4310-b312-671442e50c90" /> | <img width="100%" alt="Karma Yogi screenshot 4" src="https://github.com/user-attachments/assets/6ca7231e-214e-49bd-9eff-e24094eb850a" /> |
| <img width="100%" alt="Karma Yogi screenshot 5" src="https://github.com/user-attachments/assets/98c4d3b1-9cb4-4b8f-98fa-858cb660d69a" /> | <img width="100%" alt="Karma Yogi screenshot 6" src="https://github.com/user-attachments/assets/ca2c93a0-f4ae-4b0b-a188-ee50f321250d" /> |
| <img width="100%" alt="Karma Yogi screenshot 7" src="https://github.com/user-attachments/assets/82f82304-c7ee-4887-a69d-2e10341e5813" /> | <img width="100%" alt="Karma Yogi screenshot 8" src="https://github.com/user-attachments/assets/c8defb99-ff98-4724-9cfb-ab5757d673a6" /> |

## Quick links

| Resource | URL |
|----------|-----|
| Web app | https://karma-yogi-web.onrender.com/ |
| API health | https://karma-yogi-api.onrender.com/healthz |
| OpenAPI spec | `docs/openapi.yaml` |
| Android runbook | `docs/ANDROID_APP_RUNBOOK.md` |
| Production runbook | `docs/PRODUCTION_LOCAL_RUNBOOK.md` |

## Repository structure

```
karma-yogi/
├── frontend/                 React + Vite SPA (Capacitor-wrapped for Android)
│   ├── src/
│   │   ├── components/       Shared UI components (TimerModal, LogSessionModal, OverviewTab, StatsPanel, …)
│   │   ├── pages/            Route-level pages (Dashboard, Insights, Friends, Profile, PublicProfile, …)
│   │   ├── lib/              Store (Zustand), API client, types, utilities
│   │   └── App.tsx           Auth shell + route layout
│   ├── android/              Capacitor Android project (generated — do not edit manually)
│   └── capacitor.config.ts
├── backend/
│   ├── cmd/api/main.go       Entrypoint
│   └── internal/
│       ├── auth/             JWT + refresh token utilities
│       ├── config/           Env-driven config
│       ├── controller/       HTTP handlers
│       ├── database/         Postgres repositories
│       ├── domain/           Domain models
│       ├── http/router.go    Chi router (all routes declared here)
│       ├── middleware/        Auth, rate-limit, CORS, logging, security headers
│       └── service/          Business logic (AuthService, domain services)
├── deploy/nginx/default.conf Nginx reverse proxy config
├── docker-compose.yml        Postgres + API + Nginx
├── .env.example              Shared env template
├── docs/
│   ├── openapi.yaml          Full OpenAPI 3.0 spec
│   ├── PRODUCTION_LOCAL_RUNBOOK.md
│   └── ANDROID_APP_RUNBOOK.md
└── scripts/
    └── e2e.sh                One-command API smoke test
```

## Features

### Frontend
- **Dashboard** — daily study time, weekly goal ring, current streak, recent sessions with inline edit/delete
- **Study Timer** — stopwatch and Pomodoro modes, pause/resume, server-synced start timestamp, persisted across tab/page refresh
- **Friend Sessions** — invite friends to a shared session with per-friend subject/topic overrides
- **Log Session** — manual session entry with subject, topic, duration, mood, and date
- **Insights** — heatmap, subject breakdown, weekly/monthly charts, peak hour, best day
- **Library** — manage subjects (color picker) and browse/delete sessions
- **Friends** — discover users, send/accept/reject requests, weekly leaderboard with week-offset navigation, public profile view
- **Profile** — edit name/username/phone, public profile metadata (bio, location, exam, college), preferences, privacy controls, achievement badges
- **Strategy Dashboard** — gated feature, enabled per-account via `showStrategyPage` preference
- **Auth** — email/password register + login, Google OAuth (Web + native Android), password reset via security question, "Remember me" (30-day refresh tokens)

### Backend
- JWT access tokens (15 min default) + rotating refresh tokens (30 days default)
- Concurrent 401 safe: frontend uses a shared in-flight promise so token rotation races are prevented
- Rate limiting: 180 req/min per IP
- Security headers middleware
- Request logging with platform, version, user ID, route, status, latency
- Cascade delete: deleting a subject removes all its sessions
- Achievements derived from session + friend data (no separate table)
- Server-side study stats with timezone-aware week calculation

## Local development

### Prerequisites
- Docker Desktop
- Node.js LTS + npm
- `jq` (for e2e script)

### Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and CORS_ALLOWED_ORIGINS

# 2. Start Postgres + API + Nginx
docker compose up --build -d

# 3. Start the frontend dev server (separate terminal)
cd frontend && npm install && npm run dev
```

Default dev URLs:

| Service | URL |
|---------|-----|
| Frontend (Vite) | `http://localhost:8081` |
| API (direct) | `http://localhost:8080` |
| Nginx proxy | `http://localhost` (proxies `/api/*` → API) |
| Health check | `http://localhost:8080/healthz` |

> **Note:** `GET /healthz` is on the server root, not under `/api/v1`. Do not use `http://localhost/api/healthz` — it will 404 through the default Nginx config.

## Authentication

| Flow | Endpoint | Notes |
|------|----------|-------|
| Register (email + password + security answer) | `POST /api/v1/auth/register` | Security answer enables password reset without email; client shows a single standard question |
| Login | `POST /api/v1/auth/login` | |
| Password reset | `POST /api/v1/auth/password-reset` | Email + security answer + new password; no email required |
| Google (ID token) | `POST /api/v1/auth/google` | Browser: Google Identity Services; Android: native Capacitor Google Auth |
| Refresh | `POST /api/v1/auth/refresh` | Rotates refresh token on every call (one-shot) |
| Logout | `POST /api/v1/auth/logout` | Body: `{ refreshId }` |
| Dev login | `POST /api/v1/auth/dev-login` | Local development only; creates or reuses a dev user |

### Token model
- **Access token:** short-lived JWT signed with HS256 (`JWT_ACCESS_TTL_MINUTES`, default 15 min). Sent as `Authorization: Bearer <token>`.
- **Refresh token:** opaque UUID stored as a SHA-256 hash in Postgres (`JWT_REFRESH_TTL_HOURS`, default 720 h / 30 days). Rotation on every refresh call — using a revoked token returns 401.
- **Concurrent 401 safety:** the API client (`src/lib/api.ts`) uses a single shared in-flight promise so multiple simultaneous expired-token requests only trigger one refresh, preventing rotation race conditions that would otherwise log the user out.

## Environment variables

Copy `.env.example` to `.env`. Variables are shared between Docker Compose services and the Vite build (via `envDir: ".."` in `frontend/vite.config.ts`).

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `8080` | HTTP listen port |
| `DATABASE_URL` | _(empty)_ | Full Postgres DSN (takes precedence over individual Postgres vars) |
| `POSTGRES_HOST` | `postgres` | |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_DB` | `karma_yogi` | |
| `POSTGRES_USER` | `karma` | |
| `POSTGRES_PASSWORD` | `karma` | |
| `POSTGRES_SSLMODE` | `disable` | |
| `JWT_SECRET` | _(required)_ | HMAC-SHA256 signing key |
| `JWT_ACCESS_TTL_MINUTES` | `15` | Access token lifetime |
| `JWT_REFRESH_TTL_HOURS` | `720` | Refresh token lifetime (30 days) |
| `GOOGLE_CLIENT_ID` | | Server-side token verification |
| `GOOGLE_CLIENT_SECRET` | | |
| `GOOGLE_REDIRECT_URL` | | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:8081,...` | Comma-separated exact origins (scheme + host + port) |

### Frontend (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API base, e.g. `http://localhost:8080/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `VITE_DEV_AUTO_LOGIN` | `true` to auto-login with dev credentials in development |
| `VITE_CLIENT_PLATFORM` | `web` / `android` / `ios` — sent as `X-Client-Platform` header |
| `VITE_APP_VERSION` | Optional semver sent as `X-App-Version` header |

## API documentation

Full OpenAPI 3.0 spec with schemas: **`docs/openapi.yaml`**

All routes under `/api/v1`. Authenticated routes require `Authorization: Bearer <accessToken>`.

| Category | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/password-reset`, `/auth/google`, `/auth/dev-login`, `/auth/refresh`, `/auth/logout` |
| Users | `GET/PATCH /users/me`, `GET /users/me/study-stats` |
| Profile | `GET/PATCH /users/me/public-profile`, `GET /users/{username}/public-profile`, `POST /friends/friend-profile` |
| Preferences | `GET/PATCH /users/me/preferences` |
| Privacy | `GET/PATCH /users/me/privacy` |
| Achievements | `GET /users/me/achievements` |
| Subjects | `GET/POST /subjects`, `PATCH/DELETE /subjects/{id}` |
| Sessions | `GET/POST /sessions`, `PATCH/DELETE /sessions/{id}` |
| Goals | `GET/POST /goals`, `PATCH/DELETE /goals/{id}` |
| Exam Goal | `GET/PUT/DELETE /exam-goal` |
| Insights | `GET /insights` |
| Timer | `GET/PUT/DELETE /timer-state`, `POST /timer-state/start` |
| Friends | `GET /friends/users`, `GET /friends`, `GET/POST /friends/requests`, `POST /friends/requests/{id}/accept`, `POST /friends/requests/{id}/reject`, `GET /friends/requests/incoming`, `GET /friends/requests/outgoing`, `GET /friends/leaderboard`, `POST /friends/sessions` |

## End-to-end API test

From repo root (requires Docker + `jq` + `python3`):

```bash
./scripts/e2e.sh
```

Covers: register, login, password reset, dev-login, user profile update, subject CRUD + color update, session CRUD + cascade delete, individual session delete, achievements, study stats, goal CRUD, exam goal lifecycle, profile/preferences/privacy read-write, privacy-aware public profile, friend-profile details (access-gated), discover users, friend request send/accept/reject, outgoing requests, shared friend sessions with per-friend overrides, weekly leaderboard (current + previous week), timer-state persistence (solo + friend live payload), refresh token rotation + revoke assertion, logout, Nginx proxy, and Google invalid-token handling.

## Android (Play Store) build

See **`docs/ANDROID_APP_RUNBOOK.md`** for the full step-by-step guide.

Quick start:

```bash
cd frontend
npm install
npm run android:build:sync   # Vite build → cap sync android
npm run cap:open:android     # Open in Android Studio
```

- App ID: `com.karmayogi.app`
- Targets API 36; Gradle 8.14.3; JDK 21 recommended
- Set `VITE_API_BASE_URL=http://10.0.2.2:8080/api/v1` for emulator, or LAN IP for physical device

## Production notes

- Store `JWT_SECRET`, Google credentials, and DB credentials in a managed secret store — never commit them.
- Run database migrations before or as part of deploying a new API image.
- Terminate TLS at your load balancer or Nginx; restrict `CORS_ALLOWED_ORIGINS` to real app origins.
- The API rate-limits to 180 requests/minute per IP by default.
- `GET /healthz` (server root) is the liveness probe — wire it to your platform's health check, not `/api/v1/healthz`.

## Pre-deployment gate

```bash
docker compose up --build -d
cd backend && go test ./... && go vet ./...
cd frontend && npm run lint && npm run build
./scripts/e2e.sh
docker compose ps   # all services healthy
```

# Karma Yogi Monorepo

Production-ready split frontend/backend setup.

## Structure

- `frontend/` - React + Vite SPA (`react-router-dom`)
- `backend/` - Go API (controller/service/database layers)

## Local Development

1. Start infrastructure and API:
   - `docker compose up --build`
2. In another terminal start frontend:
   - `cd frontend && npm install && npm run dev`

Frontend runs on `http://localhost:8081` (or next free port).
API runs on `http://localhost:8080`.

## Environment

Copy `.env.example` to `.env` and update secrets before running in production.

## Production Notes

- Use managed secrets for JWT and Google OAuth keys.
- Run database migrations before deploying new API versions.
- Use TLS at Nginx/load balancer and strict CORS allowlist.

## End-to-End API Check

- Run production-style local API checks:
  - `./scripts/e2e.sh`
- Full runbook:
  - `docs/PRODUCTION_LOCAL_RUNBOOK.md`

# Karma Yogi — Project Overview

## Purpose
Study tracking app. Users log study sessions, track streaks, set exam goals, view insights, and study with friends.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4 (in `frontend/`)
- **Backend**: Go 1.23 REST API using chi router + pgx (PostgreSQL) (in `backend/`)
- **Mobile**: Capacitor 8 Android wrapper (in `frontend/android/`)
- **Deployment**: Render (backend at `https://karma-yogi-api.onrender.com`)

## Repo Structure
```
karma-yogi/
├── backend/          # Go REST API
│   ├── cmd/api/      # Entrypoint
│   ├── internal/     # auth, config, controller, database, domain, http, middleware, service
│   └── migrations/   # SQL migrations (forward/backward)
├── frontend/         # React/Vite SPA
│   ├── src/
│   │   ├── pages/        # Route-level components (lazy-loaded)
│   │   ├── components/   # Shared UI components
│   │   ├── lib/          # store.tsx, api.ts, types.ts, colors.ts
│   │   └── hooks/        # useBodyScrollLock, useHeatmapData, use-mobile
│   └── android/      # Capacitor Android project
├── docs/             # openapi.yaml and other docs
└── scripts/          # e2e.sh, seed_sample_data.sql
```

## Key Frontend Pages
| File | Route | Purpose |
|------|-------|---------|
| `DashboardPage.tsx` | `/` | Weekly goal ring, heatmap, exam countdown |
| `SessionsPage.tsx` | `/sessions` | Log history, search, filter |
| `InsightsPage.tsx` | `/insights` | Charts |
| `FriendsPage.tsx` | `/friends` | Leaderboard, friend sessions |
| `DataPage.tsx` | `/data` | Manage subjects |
| `ProfilePage.tsx` | `/profile` | Stats, achievements, settings |
| `PublicProfilePage.tsx` | `/friends/:userId` | Another user's public profile |
| `StrategyDashboard.tsx` | `/strategy-dashboard` | Study strategy (feature-gated) |

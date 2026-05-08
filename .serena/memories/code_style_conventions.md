# Code Style & Conventions

## Frontend (TypeScript/React)

### Architecture patterns
- All pages are lazy-loaded via `React.lazy()` in `App.tsx`, wrapped in `<AppErrorBoundary>`
- State lives in a single React Context store — access via `useStore()` from `frontend/src/lib/store.tsx`
- Authenticated API calls always use `apiFetch` from `frontend/src/lib/api.ts` (handles auth headers, 401 refresh)
- New types go in `frontend/src/lib/types.ts` — never inline in component files
- After mutations call `reloadStoreData()` to sync the UI

### CSS / Design system
- Use `glass-card`, `glass-card-elevated`, `glass-modal`, `input-field`, `font-display`, `stat-card` utility classes
- Shadows via inline style: `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-xl)`
- Colors via `accent` map from `frontend/src/lib/colors.ts` — keys: `cyan`, `green`, `orange`, `pink`, `purple`
- Never hardcode colors; use accent map or Tailwind semantic tokens (`text-foreground`, `bg-card`, etc.)
- Five themes: `sky`, `honey`, `forest`, `blossom`, `ember` — defined as CSS vars in `frontend/src/styles.css`

### Mobile rules (enforced everywhere)
- Tap targets: minimum `h-10 w-10` (44px) for all interactive elements
- Modals: `items-end sm:items-center` on overlay (slide up on mobile, center on desktop)
- Every modal calls `useBodyScrollLock(open)` before the early return
- Horizontal scroll: always pair `overflow-x-auto` with `overflow-y-hidden`
- Page roots: `pb-24` bottom padding to clear bottom nav
- Content width: `max-w-2xl mx-auto px-4`

### Page layout template
```tsx
<div className="min-h-screen bg-background pb-24 pt-4 sm:pt-6">
  <div className="mx-auto max-w-2xl px-4">
    {/* content */}
  </div>
</div>
```
Do NOT include `<TopNav>` in pages — it's rendered globally in `App.tsx`.

### Modal template
- Overlay: `fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center`
- Panel: `glass-modal w-full max-w-md rounded-2xl p-4 sm:p-6`
- Popovers/Calendars inside modals: use `z-[70]`

## Backend (Go)

### Structure
- `cmd/api/` — entrypoint only
- `internal/domain/` — types and interfaces
- `internal/service/` — business logic
- `internal/controller/` — HTTP handlers
- `internal/http/` — router setup
- `internal/middleware/` — auth, CORS, etc.
- `internal/database/` — DB connection and queries

### Rules
- Router: chi
- DB: pgx/v5 with PostgreSQL
- Auth: JWT (golang-jwt/jwt/v5), bcrypt for passwords
- SQL migrations: forward + backward, strictly incrementing index, never reuse
- CORS: must include `5173`, `5174`, `8081`, `http://localhost`, `capacitor://localhost`
- When HTTP routes or request/response shapes change, update `docs/openapi.yaml` in the same change

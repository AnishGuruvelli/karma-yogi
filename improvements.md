## Karma Yogi – Production‑grade Improvements

This document tracks the main improvements needed to make the app production‑ready. Items are grouped by severity and deduplicated from the audit output.

---

### Critical — Fix before any production traffic

1. **Revoke exposed credentials and move secrets out of git**
   - `.env` in git contains real Google OAuth keys, weak `JWT_SECRET`, and `POSTGRES_PASSWORD=karma`.
   - Revoke all leaked credentials in Google Cloud / database / JWT signing config.
   - Remove secrets from the repo entirely and use a secrets manager or environment variables instead.
   - Scrub the git history (e.g. BFG or `git filter-repo`) so secrets are not recoverable from old commits.

2. **Lock down `/auth/dev-login`**
   - `/auth/dev-login` is currently reachable from the public internet and can mint JWTs for arbitrary emails.
   - Gate it strictly behind `APP_ENV=development` or remove it from production builds entirely.

3. **Harden JWT secret handling**
   - `config.go` defaults `JWT_SECRET` to `"dev-secret"` and accepts too‑short values.
   - Reject startup if `JWT_SECRET` is missing, equals `"dev-secret"`, or is shorter than 32 random bytes.

4. **Replace the homegrown migration runner**
   - `main.go` currently splits SQL on `;`, runs without a transaction/advisory lock, and has no version table.
   - Two pods racing migrations can corrupt state.
   - Wire in `golang-migrate` (already referenced in the Makefile) and remove the custom runner.

5. **Remove `backend/.tmp_genjwt.go` from the codebase**
   - This file is a JWT‑forging utility with a hard‑coded user ID and can be compiled into binaries.
   - Delete the file and scrub it from git history; never ship it in production images.

6. **Stop storing access/refresh tokens in `localStorage`**
   - `frontend/src/lib/api.ts` keeps long‑lived tokens in `localStorage`, so any XSS can exfiltrate them.
   - Move session state to `httpOnly`, `Secure`, `SameSite=Strict` cookies.
   - Add strong `Content-Security-Policy` and `Strict-Transport-Security` headers.

7. **Fix unsafe type assertions in controllers**
   - `controllers.go` does `r.Context().Value(middleware.UserContextKey).(*auth.Claims)` in many handlers.
   - If auth middleware ever short‑circuits, these will panic the server.
   - Use a helper that safely extracts claims and returns 401/500 instead of panicking.

8. **Stop leaking internal error details to clients**
   - Many handlers do `http.Error(w, err.Error(), status)`, exposing raw DB/implementation details.
   - Replace with a helper that logs the detailed error server‑side and returns generic messages to clients.

9. **Fix health checks to verify dependencies**
   - `GET /healthz` always returns 200 even if Postgres is down.
   - Add a `/readyz` (or strengthen `/healthz`) that pings the DB and returns non‑200 when it is unavailable.

10. **Enforce robust HTTP server limits and body size caps**
   - `main.go` only sets `ReadHeaderTimeout`; `ReadTimeout`, `WriteTimeout`, and `IdleTimeout` are missing.
   - There is no `http.MaxBytesReader` or similar for request bodies; very large bodies can exhaust memory.
   - Add appropriate server timeouts and per‑endpoint/request body limits.

11. **Secure the rate limiter**
   - Current in‑memory rate limiter resets on every deploy and is per‑process.
   - Switch to a shared store (e.g. Redis) and add stricter limits for auth endpoints.

---

### High — Fix before real users

12. **Add pagination to unbounded list endpoints**
   - Endpoints like `ListOthers`, `ListByUser` (sessions), `ListFriends`, and some user listings return unbounded lists.
   - Add `page`/`limit` (or cursor) parameters and enforce sane upper limits to avoid OOM at scale.

13. **Add critical DB indexes**
   - Add indexes on `friend_requests(receiver_id)`, `friend_requests(sender_id)`, and `sessions(started_at)`.
   - Review other high‑cardinality query patterns and index accordingly.

14. **Add context timeouts to DB operations**
   - Repository methods currently use request contexts directly without `context.WithTimeout`.
   - Wrap DB calls in time‑bounded contexts so slow queries cannot hang goroutines indefinitely.

15. **Introduce structured logging and observability**
   - Replace `log.Printf` usage with structured logging (e.g. `slog` or `zap`) and attach request metadata.
   - Add centralized error reporting (e.g. Sentry) wired into Chi’s `Recoverer` and the frontend error boundary.
   - Add a proper `/readyz` probe and metrics hooks.

16. **Avoid email enumeration on auth flows**
   - Login and password‑reset flows return distinct error messages for “wrong password”, “Google‑only account”, and “user not found”.
   - Normalize responses to a single generic error so attackers cannot discover valid emails.

17. **Add CI for tests, linting, and security checks**
   - There is no `.github/workflows/` or equivalent CI pipeline.
   - Add workflows that run `go test ./...`, `go vet`, `govulncheck`, `npm run lint`, front‑end tests, and dependency audits on every PR.

18. **Harden auth/refresh‑token lifecycle**
   - Implement refresh‑token families and revocation for stolen tokens (stolen token replay).
   - Add per‑account/email rate limits for auth endpoints (login, reset, register).

---

### Medium — Code quality / UX

19. **Introduce frontend code splitting**
   - `App.tsx` eagerly imports all pages; bundle size is large for first‑time visitors.
   - Use `React.lazy` + `Suspense` per route to code‑split major pages and heavy libraries (e.g. charts).

20. **Add granular React error boundaries**
   - Currently, one crash in any component tree can white‑screen the app.
   - Wrap high‑risk/large routes and critical sections in their own `ErrorBoundary` components.

21. **Replace `map[string]any` responses with typed structs**
   - Several controllers return `map[string]any`, losing compile‑time safety.
   - Introduce explicit response DTO structs for all endpoints.

22. **Improve backend input validation**
   - Validate ranges and formats for fields like `durationMin`, `weeklyGoalHours`, `targetMinutes`, and email.
   - Reject invalid/negative values at the API boundary instead of letting them reach the DB.

23. **Deduplicate error handling logic**
   - A 6‑line error‑handling snippet is copy‑pasted across many controller methods.
   - Extract helpers like `writeError(w, status, code, message)` and reuse them.

24. **Clean up randomness for non‑security features**
   - `pickStudyIcon()` uses `crypto/rand` to choose an emoji.
   - Switch to `math/rand` (seeded deterministically) for non‑security randomness.

25. **Improve frontend session/error handling**
   - Avoid silently swallowing data‑load failures (e.g. in `store.tsx` with `Promise.allSettled`).
   - Surface clear toasts or UI states when key API calls fail instead of leaving stale or empty views.

26. **Improve accessibility**
   - Add ARIA labels, proper `htmlFor` bindings, and keyboard‑accessible focus management for modals and dialogs.
   - Audit core flows with screen readers and keyboard navigation.

---

### Low — Polish / Longer‑term

27. **Define an API versioning policy**
   - You are on `/api/v1` today with no clear deprecation story.
   - Document how breaking changes will be introduced (e.g. `/api/v2` + sunset headers).

28. **Standardize migration downgrade support**
   - `.down.sql` files exist but there is no runner wired to execute them.
   - Once `golang-migrate` is adopted, ensure both up/down migrations are part of the deployment workflow.

29. **Eliminate duplicate routes and dead config**
   - `/library` and `/data` both render the same `DataPage` route; pick one and redirect or remove the other.
   - Clean up Nginx placeholder config so production serves the real frontend and correct `/api` proxying.

30. **Add load testing and sizing**
   - Introduce basic k6/Vegeta scenarios to understand throughput and latency under realistic load.
   - Use the results to tune DB pool sizes, timeouts, and autoscaling thresholds.

31. **Tune DB connection pooling**
   - Current pool size (`MaxConns: 20`) may be too small for real load and can queue requests.
   - Tune based on load‑test data and database limits.

32. **Clarify environment separation**
   - Introduce a first‑class `APP_ENV` (dev/staging/prod) and guard dev‑only behaviors behind it.
   - Make sure Docker, Render, and any other deploys set `APP_ENV` consistently.

33. **Tighten Docker/Nginx/TLS defaults**
   - Avoid exposing Postgres publicly (remove `5432:5432` from Compose in production profiles).
   - Configure TLS termination (LB or Nginx) and HSTS for all real environments.
   - Normalize and sanitize `X-Forwarded-For` at the edge before Chi’s `RealIP` middleware.

---

### Immediate Priority Checklist

1. Revoke leaked credentials and scrub git history; move all secrets to a secret manager.
2. Disable or strictly gate `/auth/dev-login` in production.
3. Enforce strong `JWT_SECRET` requirements and fail fast on invalid config.
4. Replace the custom migration runner with `golang-migrate`.
5. Remove `backend/.tmp_genjwt.go` and any similar debugging utilities from the repo.
6. Migrate auth to httpOnly cookies and add CSP/HSTS.
7. Add HTTP timeouts, body size limits, and structured logging + `/readyz` with DB checks.
8. Fix unsafe type assertions and error leakage in all controllers.
9. Add pagination and indexes for heavy list endpoints.
10. Set up a minimal CI pipeline (tests, lint, security checks) required for every PR.


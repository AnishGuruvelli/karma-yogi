# Task Completion Checklist

Run these after every change before marking a task done.

## Frontend changes
```bash
cd frontend && npx tsc --noEmit
```
- Fix ALL type errors before reporting done
- If UI changed: start dev server and test the feature in a browser (golden path + edge cases)
- If a new page was added: ensure it's lazy-loaded in `App.tsx` with `React.lazy()` + `<AppErrorBoundary>`
- If a new modal was added: confirm `useBodyScrollLock(open)` is called before the early return
- If API contract changed: update `docs/openapi.yaml` in the same PR

### Playwright e2e (frontend UI flows)
```bash
cd frontend && npm run test:e2e
# or with UI:
cd frontend && npm run test:e2e:ui
```
- If a new page or major UI flow is added: add a new spec in `frontend/e2e/<feature>.spec.ts`
- If auth, form IDs, nav structure, or key selectors change: update `frontend/e2e/helpers.ts` and affected specs
- Follow the spec pattern: `test.describe("Feature", () => { test("behaviour", async ({ page }) => {...}) })`
- Use `loginAs(page)` from helpers.ts for any test that requires an authenticated user
- Use `registerAndLogin(page)` when a fresh account is needed

## Backend changes
```bash
cd backend && go test ./...
cd backend && make lint
```
- If routes/shapes changed: update `docs/openapi.yaml`
- If schema changed: add a new forward+backward migration (never edit existing ones)

### Shell e2e smoke test (backend API flows)
```bash
./scripts/e2e.sh
```
- Runs against a local Docker stack — requires `docker` + `jq` + `python3`
- If a new backend endpoint is added: add a corresponding test block in `scripts/e2e.sh`
- If auth flow changes (register, login, refresh, logout): update the register/login/refresh/logout blocks
- If a new resource type is added (subject, session, goal, etc.): add CRUD + assertion block in `e2e.sh`
- Keep the `[PASS]` summary block at the bottom current with new resource counts/stats

## Both
- Keep `scripts/e2e.sh` current when auth, routes, or key flows change
- Keep `frontend/e2e/` specs current when UI flows, page routes, or form structures change
- No hardcoded secrets, no disabled auth/validation
- Commit only relevant files — no binaries, no `node_modules`, no temp files

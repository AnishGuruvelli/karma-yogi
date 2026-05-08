# Skill: Debug Issue

Systematically trace and fix issues using Serena's code intelligence.

## Governing rules

Before starting:
1. Read `.cursor/rules/ai-model-general-rules.mdc` — "validate outcomes" and "ask when ambiguous" are critical during debugging.
2. Read `.cursor/rules/project-best-practices.mdc` — check if the suspected area has known constraints (auth, migrations, CORS).
3. Read the memory for the affected area (see mapping below) to understand expected behaviour before reading code.

Memory map:
- Store / state bugs → `frontend/architecture-and-patterns`
- Modal / scroll bugs → `frontend/components-modals`
- API / network bugs → `backend/api-contract-and-specs`
- Auth bugs → `backend/domain-service-patterns`
- Style / layout bugs → `frontend/styling-and-theme`
- Hook bugs → `frontend/hooks-utilities`

## Step-by-step process

### Step 1 — Locate the suspect code
`search_for_pattern` with a keyword from the error message or symptom description. Narrow to a specific directory if possible (e.g., `relative_path="frontend/src"`) to keep results focused.

### Step 2 — Read the suspect symbol
`find_symbol` with `name_path_pattern=<function_name>` and `include_body=true` for the specific function that is behaving incorrectly. Read the body — this is one of the few times full body reading is justified.

### Step 3 — Trace call chain
- **Who calls this?** → `find_referencing_symbols` on the suspect function
- **What does this call?** → `search_for_pattern` for any internal calls that could be the root cause

### Step 4 — Check recent changes (if regression)
Run `git log --oneline -10 -- <file>` via `execute_shell_command` to see recent changes to the file. If a recent commit is suspect, run `git show <hash>` to inspect it.

### Step 5 — Reproduce with a test (if possible)
Run existing tests via `execute_shell_command`:
- Frontend: `npx playwright test <spec>` (e2e) or check the relevant spec in `frontend/e2e/`
- Backend: `go test ./... -run <TestName>`

If no test covers the broken path, note it as a gap.

### Step 6 — Apply the fix
Use Serena's editing tools — never built-in Edit/Write on code files:
- Patch a few lines inside a function → `replace_content` with a precise regex
- Replace a full function body → `replace_symbol_body`
- Add a new helper near an existing symbol → `insert_after_symbol`

### Step 7 — Verify the fix
Run `npx tsc --noEmit` (frontend) or `go build ./...` (backend) first. Then run the relevant test or `npx playwright test` to confirm the bug is gone. Update the test if needed.

## Common Karma Yogi bug patterns

| Symptom | First place to look |
|---|---|
| Page scroll permanently locked | Duplicate `overflow` useEffect + `useBodyScrollLock` in same component — check `frontend/components-modals` memory |
| Store re-rendering every second | Dead `setInterval` in `store.tsx` — check for unused timer state |
| Modal not found by `[role="dialog"]` | Modal panel is missing `role="dialog"` attribute — check Framer Motion `motion.div` |
| Auth token lost after navigation | `getAuthState()` reads from localStorage — check if `page.goto()` clears context |
| API call fails with 401 on mobile | Missing `X-Client-Platform: android` header — use `apiFetch`, not raw `fetch` |
| Duplicate session logged | Timer deduplication: check `karma_completed_timer_starts` in localStorage |

## Token efficiency target
Diagnose most bugs in ≤5 Serena tool calls. Read full symbol bodies only for the specific suspect function, not the whole file.

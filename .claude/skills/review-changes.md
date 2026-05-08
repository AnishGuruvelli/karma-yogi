# Skill: Review Changes

Perform a thorough, risk-aware code review using Serena's code intelligence.

## Governing rules

Before anything else:
1. Read `.cursor/rules/ai-model-general-rules.mdc` and `.cursor/rules/project-best-practices.mdc` — these define the hard constraints for all changes in this repo.
2. Read `.serena/memories/task_completion_checklist.md` and `.serena/memories/code_style_conventions.md` — these are the project's definition of "done" and style bar.

## Step-by-step process

### Step 1 — Identify what changed
Run `git diff --name-only HEAD~1` (or the relevant base) via `execute_shell_command` to get the list of changed files.

### Step 2 — Load symbol overview for each changed file
For every changed file, call `get_symbols_overview` to see what functions/classes exist. Do not read full file bodies unless a symbol is flagged as high-risk.

### Step 3 — Read relevant area memories
Map changed files to memory areas and read only the relevant ones:
- `frontend/src/components/` → `frontend/components-modals`
- `frontend/src/pages/` → `frontend/pages-patterns`
- `frontend/src/lib/store.tsx` → `frontend/architecture-and-patterns`
- `frontend/src/lib/api.ts` → `backend/api-contract-and-specs`
- `backend/` → `backend/domain-service-patterns`, `backend/api-contract-and-specs`

### Step 4 — Assess impact for high-risk symbols
For any exported function or type that was modified, call `find_referencing_symbols` to find all callers. A symbol is high-risk if it has >3 references or is in `store.tsx`, `api.ts`, or a shared component.

### Step 5 — Check test coverage
Use `search_for_pattern` in `frontend/e2e/` and `backend/` to verify that changed behaviour has corresponding tests. Flag any changed public API or user-facing flow with no test coverage.

### Step 6 — Verify constraints from .cursor rules
Cross-check findings against:
- No hardcoded secrets or tokens
- Auth remains production-safe (bcrypt, generic error messages)
- API contract changes have matching frontend + `docs/openapi.yaml` updates
- Migration numbering is unique and increasing
- No `node_modules`, binaries, or generated noise committed

## Output format

Group findings by risk level:

**🔴 High** — breaking changes, untested auth paths, missing API contract updates, security issues  
**🟡 Medium** — missing test coverage for changed flows, style violations, dead code introduced  
**🟢 Low** — minor style nits, optional improvements, documentation gaps

For each finding: what changed · why it matters · test coverage status · suggested fix.

End with an overall **merge recommendation**: Ready / Needs fixes / Blocked.

## Token efficiency target
Complete in ≤6 Serena tool calls. Use `detail_level="minimal"` equivalent — read symbol bodies only when a finding requires it.

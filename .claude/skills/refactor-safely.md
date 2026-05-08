# Skill: Refactor Safely

Plan and execute safe refactoring using Serena's dependency analysis.

## Governing rules

Before anything else:
1. Read `.cursor/rules/ai-model-general-rules.mdc` — pay special attention to "keep changes minimal and scoped" and "preserve compatibility".
2. Read `.cursor/rules/project-best-practices.mdc` — check migration rules if the refactor touches the DB layer.
3. Read the most relevant `.serena` memory for the area being refactored (see Step 2).

## Step-by-step process

### Step 1 — Locate the target symbol
Call `find_symbol` with the function/class/type name to confirm its `name_path` and `relative_path`. Use `include_body=false` first to get the signature without reading the whole body.

### Step 2 — Read the relevant memory
Map the target file to a memory and read it:
- `frontend/src/lib/store.tsx` → `frontend/architecture-and-patterns`
- `frontend/src/components/` → `frontend/components-modals`
- `frontend/src/pages/` → `frontend/pages-patterns`
- `frontend/src/lib/api.ts` → `backend/api-contract-and-specs`
- `frontend/src/lib/types.ts` → `frontend/types-and-interfaces`
- `backend/` → `backend/domain-service-patterns`

### Step 3 — Map the blast radius
Call `find_referencing_symbols` on the target symbol. Every reference is a potential breakage point. If references span >5 files, pause and confirm scope with the user before proceeding.

### Step 4 — Choose the right Serena operation

| What you're doing | Tool to use |
|---|---|
| Rename a symbol everywhere | `rename_symbol` — language-server rename, updates all references atomically |
| Replace a function/class body | `replace_symbol_body` — replaces the full definition |
| Insert new code near a symbol | `insert_after_symbol` / `insert_before_symbol` |
| Patch a few lines inside a body | `replace_content` with a precise regex |
| Remove an unused symbol | `safe_delete_symbol` — checks for references first |

**Never use the built-in Edit/Write tools on code files. Always use Serena's editing tools.**

### Step 5 — Update all references
After the primary edit, re-run `find_referencing_symbols` to confirm all call-sites were updated. For renames, `rename_symbol` handles this automatically. For body changes, manually update callers if the signature changed.

### Step 6 — Verify
Run `npx tsc --noEmit` (frontend) or `go build ./...` (backend) via `execute_shell_command` to confirm no type errors were introduced.

## Safety checklist
- [ ] Blast radius confirmed before editing
- [ ] All references updated or verified unchanged
- [ ] TypeScript / Go build passes
- [ ] No public API contract changed without matching `docs/openapi.yaml` update
- [ ] If symbols were deleted, `safe_delete_symbol` confirmed no remaining references

## Token efficiency target
Complete in ≤5 Serena tool calls. Read symbol bodies only when the change requires it.

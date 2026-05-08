# Skill: Explore Codebase

Navigate and understand codebase structure efficiently using Serena.

## Governing rules

Start by reading:
1. `.serena/memories/project_overview.md` — stack, architecture, key files.
2. `.serena/memories/frontend/architecture-and-patterns.md` — store, hooks, routing patterns.
3. `.cursor/rules/ai-model-general-rules.mdc` — general operating constraints.

Only read additional memories if they are clearly relevant to the area being explored.

## Exploration strategies

### "Where does X live?"
1. `find_symbol` with `name_path_pattern=<name>` across the whole project to locate any function, type, component, or hook.
2. Follow up with `get_symbols_overview` on the returned file to see its neighbours.

### "What calls / uses X?"
1. `find_symbol` to confirm the symbol's `name_path` + `relative_path`.
2. `find_referencing_symbols` to list every call-site, import, and usage.

### "What's in this file / directory?"
1. `list_dir` with `recursive=false` to see immediate contents.
2. `get_symbols_overview` on a specific file to list its exports without reading bodies.
3. Only call `find_symbol` with `include_body=true` when you need to understand the implementation.

### "How does this flow work end-to-end?"
1. Read `backend/api-contract-and-specs` memory for the API shape.
2. `search_for_pattern` to find the relevant API call in `frontend/src/lib/api.ts`.
3. `find_referencing_symbols` on that API function to find every page/component that uses it.
4. `find_referencing_symbols` on the store action (if any) to trace state propagation.

### "What patterns does this project use?"
Read the memories directly — they capture conventions so you don't need to grep the whole codebase:
- Components & modals → `frontend/components-modals`
- Pages → `frontend/pages-patterns`
- Hooks & utilities → `frontend/hooks-utilities`
- Types → `frontend/types-and-interfaces`
- Styling & theme → `frontend/styling-and-theme`
- Backend services → `backend/domain-service-patterns`

## Key file map (quick reference)

| Area | Entry point |
|---|---|
| React store / state | `frontend/src/lib/store.tsx` |
| API client | `frontend/src/lib/api.ts` |
| Routes & auth | `frontend/src/App.tsx` |
| Nav + bottom bar | `frontend/src/components/TopNav.tsx` |
| Shared types | `frontend/src/lib/types.ts` |
| Accent colors | `frontend/src/lib/colors.ts` |
| Go REST handlers | `backend/internal/handler/` |
| DB migrations | `backend/migrations/` |

## Token efficiency target
Answer most exploration questions in ≤4 Serena tool calls. Never read a full file if `get_symbols_overview` + targeted `find_symbol` is enough.

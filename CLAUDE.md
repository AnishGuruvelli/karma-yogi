# Karma Yogi — Claude Instructions

## Serena + project rules baseline

**Every task** in this repo is grounded in two sources of truth. Read them before writing any code:

1. **`.cursor/rules/`** — hard project constraints (`ai-model-general-rules.mdc`, `project-best-practices.mdc`). These override default Claude behaviour.
2. **`.serena/memories/`** — living project knowledge (architecture, conventions, API contracts, type patterns, checklist). Read only the memories relevant to the area being touched; the index is in `MEMORY.md` inside `.serena/memories/`.

For any code task: use Serena's symbolic tools (`find_symbol`, `get_symbols_overview`, `find_referencing_symbols`, `replace_symbol_body`, `replace_content`) instead of raw Read/Edit. Raw Read/Edit on code files is forbidden except for non-code files (config, markdown, YAML).

---

## Auto-invoke skills

When the user's prompt matches one of the skills below, invoke it automatically without waiting for a slash command.

| Prompt relates to | Invoke |
|---|---|
| Adding a new page | `/new-page` |
| Adding a modal or bottom sheet | `/new-modal` |
| Calling a new backend endpoint | `/new-api-endpoint` |
| Mobile UI issues, responsiveness, tap targets | `/mobile-checklist` |
| Building APK/AAB, Play Store, cap sync | `/deploy-android` |
| Reviewing code, PR review, checking changes | `/review-changes` |
| Refactoring, renaming, restructuring code | `/refactor-safely` |
| Exploring codebase, "where is X", "how does Y work" | `/explore-codebase` |
| Debugging a bug, tracing an error, "why is X broken" | `/debug-issue` |

Skills live in `.claude/skills/`.

---

## Project overview

Karma Yogi is a study tracking app. Users log study sessions, track streaks, set exam goals, view insights, and study with friends.

**Stack:**
- Frontend: React + Vite + TypeScript + Tailwind CSS (in `frontend/`)
- Backend: Go REST API (in `backend/`)
- Mobile: Capacitor Android wrapper (in `frontend/android/`)
- Deployment: Render (backend at `https://karma-yogi-api.onrender.com`)

---

## Frontend architecture

### Pages (`frontend/src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `DashboardPage.tsx` | `/` | Main home — weekly goal ring, heatmap, exam countdown |
| `SessionsPage.tsx` | `/sessions` | Log history, search, filter |
| `InsightsPage.tsx` | `/insights` | Charts — bar, pie, weekly breakdown |
| `FriendsPage.tsx` | `/friends` | Leaderboard, friend sessions, discover |
| `DataPage.tsx` | `/data` | Manage subjects (add, recolor, delete) |
| `ProfilePage.tsx` | `/profile` | Stats, achievements, account settings |
| `PublicProfilePage.tsx` | `/friends/:userId` | Another user's public profile |
| `StrategyDashboard.tsx` | `/strategy-dashboard` | Study strategy (gated by `preferences.showStrategyPage`) |

Every page is **lazy-loaded** via `React.lazy()` in `App.tsx` and wrapped in `<AppErrorBoundary>`. When adding a new page, always follow this pattern.

### Components (`frontend/src/components/`)

Key components to know:
- `TopNav.tsx` — sticky top nav (desktop) + bottom nav (mobile). Nav items defined in `baseNavLinks`. Strategy tab is conditionally injected based on `preferences.showStrategyPage`.
- `LogSessionModal.tsx` — main session logging bottom sheet
- `TimerModal.tsx` — live countdown timer bottom sheet
- `HeatmapCard.tsx` — GitHub-style activity heatmap (flat CSS grid, portal tooltip, `overflow-x-auto overflow-y-hidden`)
- `StatsPanel.tsx` — exports `Panel`, `HeroMetric`, `CompactStat`, `RingProgress`, `MutedHint`
- `WeeklyStats.tsx` — weekly hours bar chart with week navigation
- `ExamCountdownCard.tsx` — days-to-exam countdown
- `UserAvatar.tsx` — avatar with initials fallback
- `CalendarModal.tsx` — full-page calendar view of sessions
- `ExamGoalModal.tsx` — 2-step modal to set exam name + date
- `GoalEditModal.tsx` — edit weekly hour target

### State management (`frontend/src/lib/store.tsx`)

Single React Context store. Access with `useStore()`.

Available state and actions:
```ts
const {
  // Data
  subjects,         // Subject[] — user's study subjects
  sessions,         // Session[] — all logged sessions
  goal,             // Goal — { targetHours: number }
  user,             // UserProfile — { id, name, username, email, currentStreak, ... }
  examGoal,         // ExamGoal | null — { name, date }
  profileMeta,      // UserPublicProfile — bio, location, education, etc.
  preferences,      // UserPreferences — defaultSessionMinutes, showStrategyPage, etc.
  privacy,          // UserPrivacySettings — profilePublic, showStats, showLeaderboard

  // Theme
  isDark,           // boolean
  toggleTheme,      // () => void
  theme,            // ThemeName: "sky" | "honey" | "forest" | "blossom" | "ember"
  setTheme,         // (theme: ThemeName) => void

  // Actions
  addSubject, updateSubjectColor, deleteSubject,
  addSession, deleteSession, editSession,
  updateGoal,
  setExamGoal, clearExamGoal,
  updateUserProfile,
  saveProfileMeta, savePreferences, savePrivacy,

  // Loading
  reloadStoreData,      // () => Promise<void> — force refresh all data from API
  dataLoading,          // boolean — true during initial load or explicit refresh
  wrapWithDataLoading,  // <T>(fn: () => Promise<T>) => Promise<T> — shows loading splash
} = useStore();
```

After any mutation that affects shared data, call `reloadStoreData()` to keep the UI in sync.

### API layer (`frontend/src/lib/api.ts`)

**Always use `apiFetch` for authenticated requests** — it handles:
- Auth headers (`Authorization: Bearer ...`)
- Token refresh on 401 (with race condition protection)
- Mobile platform headers (`X-Client-Platform: android`)

```ts
const res = await apiFetch("/some/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) throw new Error(await res.text());
return res.json();
```

Never use raw `fetch` for authenticated endpoints.

### Types (`frontend/src/lib/types.ts`)

Core types: `Subject`, `Session`, `Goal`, `ExamGoal`, `UserProfile`, `UserPreferences`, `UserPrivacySettings`, `FriendUser`, `FriendRequest`, `LeaderboardEntry`, `PublicProfileView`

Always add new types here, never inline in component files.

### Hooks (`frontend/src/hooks/`)

- `useBodyScrollLock(isOpen: boolean)` — locks `document.body` scroll when a modal is open. **Must be called in every modal/bottom sheet**, before the early return.
- `useHeatmapData(dailyTotals, numWeeks)` — processes session data into heatmap grid format
- `use-mobile.tsx` — `useIsMobile()` returns true below `768px`

---

## Design system

### CSS classes

| Class | Use |
|-------|-----|
| `glass-card` | Standard content card |
| `glass-card-elevated` | Card that needs more elevation |
| `glass-modal` | Modal/bottom-sheet panel background |
| `input-field` | Text inputs and input-like buttons |
| `font-display` | Fraunces serif font for headings and large numbers |
| `stat-card` | Stats display cards |

### Shadows (via inline style)

```tsx
style={{ boxShadow: "var(--shadow-sm)" }}   // subtle card lift
style={{ boxShadow: "var(--shadow-md)" }}   // buttons, elevated elements
style={{ boxShadow: "var(--shadow-xl)" }}   // modals
```

### Accent colors (`frontend/src/lib/colors.ts`)

Keys: `cyan`, `green`, `orange`, `pink`, `purple`

```tsx
import { accent } from "@/lib/colors";
const c = accent.cyan;
// c.fg   → CSS var for the color (use for icon color)
// c.tint → 12% opacity tint (use for icon background bubble)
// c.ring → 30% opacity (use for ring/border highlights)
```

**Never hardcode colors.** Always use the accent map or Tailwind semantic tokens (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`).

### Themes

Five themes: `sky`, `honey`, `forest`, `blossom`, `ember`. All defined in `frontend/src/styles.css` as CSS variable sets. Theme switching is handled by `StoreProvider` — it sets a `data-theme` attribute on `<html>`. Never reference theme colors directly; always use the semantic CSS variables.

---

## Mobile rules (enforced everywhere)

- **Tap targets:** All interactive elements must be `h-10 w-10` minimum (44px). Icon-only buttons must be wrapped in a `flex items-center justify-center h-10 w-10` container.
- **Modals:** Use `items-end sm:items-center` on the overlay so they slide up from bottom on mobile, center on desktop.
- **Body scroll lock:** Every modal calls `useBodyScrollLock(open)` — background page must not scroll while a sheet is open.
- **Horizontal scroll:** Always pair with `overflow-y-hidden` — never use `overflow-x-auto` alone (it forces `overflow-y: auto` in CSS).
- **Page bottom padding:** `pb-24` on all page roots to clear the bottom nav bar.
- **Content width:** `max-w-2xl mx-auto px-4` on all page content containers.

---

## Page layout template

```tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-4 sm:pt-6">
      <div className="mx-auto max-w-2xl px-4">
        {/* content */}
      </div>
    </div>
  );
}
```

Do NOT include a `<TopNav>` — it is rendered globally in `App.tsx`.

---

## Modal template

```tsx
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { X } from "lucide-react";

export function MyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-md rounded-2xl p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Title</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* body */}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground hover:bg-muted">Cancel</button>
          <button className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90" style={{ boxShadow: "var(--shadow-md)" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
```

If a Popover/Calendar lives inside the modal, its content must use `z-[70]` (one level above the modal's `z-[60]`).

---

## After every change

```bash
cd frontend && npx tsc --noEmit
```

---

## General operating rules

- Follow user intent first — prefer direct execution over long explanations unless the user asks for design discussion.
- Respect existing code and edits — never revert or rewrite unrelated user changes.
- Keep changes minimal and scoped — solve the requested issue without opportunistic refactors.
- Preserve compatibility — avoid breaking public interfaces, API contracts, and expected behavior without explicit approval.
- Validate outcomes — run targeted checks for touched areas before marking work complete.
- Avoid insecure shortcuts — no hardcoded secrets, no disabled auth/validation, no bypassed safety checks.
- Keep artifacts clean — do not add temporary files, generated noise, or irrelevant dependencies.
- Document impactful changes — update docs and examples when behavior or workflows change.
- Ask when ambiguous — if requirements conflict or are unclear, request clarification before risky edits.
- Add comments only when they clarify non-obvious logic; keep comments accurate, brief, and high signal.

---

## Karma Yogi best practices

### Security and auth
- Never commit secrets, `.env`, API keys, or tokens.
- Keep auth production-safe: hash passwords with bcrypt, validate inputs, and return generic auth errors.

### API contracts
- When backend request/response shapes change, update frontend callers in the same change.
- Whenever public HTTP routes, request/response shapes, or auth flows change, update `docs/openapi.yaml` in the same change.

### Testing and validation
- After every feature or fix, run: `go test ./...` (backend), `npx tsc --noEmit` + frontend build (frontend).
- Keep `scripts/e2e.sh` current — update it whenever auth, routes, or key user flows change.
- Run `/ultrareview` on the branch before merging significant features to get a thorough multi-agent review.

### Database
- Use forward/backward SQL migrations for schema changes — never destructive edits.
- Keep migration numbering strictly unique and increasing; never reuse an existing migration index.

### Commits
- Commit identity: `user.email = guruvellianish@gmail.com`, `user.name = Anish Guruvelli`.
- Commit message policy: concise, intent-first messages focused on why the change exists. No trailers like `Made-with: Cursor`.
- Commit only relevant files for the task — no generated binaries, no `node_modules`, no temporary files.

### CORS
- Frontend dev ports (`5173`, `5174`, `8081`) must always be in the backend `CORS_ALLOWED_ORIGINS`.
- Capacitor Android origins (`http://localhost`, `capacitor://localhost`) must stay in `CORS_ALLOWED_ORIGINS` on Render.

### General engineering
- Plan before editing: understand the root cause, affected paths, and rollback/risk profile before writing code.
- Choose robust, maintainable solutions with clear error handling and backward-compatible behavior.
- Think ahead for operations: startup reliability, retries/timeouts, schema compatibility, and failure modes.
- Document notable conventions in `README.md` or `docs/` when introducing new patterns.

Fix all type errors before reporting a task as done.

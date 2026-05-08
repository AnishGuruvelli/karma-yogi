# E2E Testing Patterns

Two separate test suites — keep both up to date when features change.

---

## 1. Playwright — Frontend UI tests (`frontend/e2e/`)

### Files
| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login, register, password reset, validation errors, password toggle |
| `dashboard.spec.ts` | Dashboard load, heatmap, exam countdown, goal ring |
| `sessions.spec.ts` | Log session, edit, delete, search/filter |
| `insights.spec.ts` | Chart render, period switching |
| `friends.spec.ts` | Friend requests, leaderboard, shared sessions |
| `navigation.spec.ts` | Route transitions, nav active state |
| `profile.spec.ts` | Profile edit, achievements, privacy settings |
| `subjects.spec.ts` | Subject CRUD, color picker |
| `helpers.ts` | Shared constants and login utilities |

### Running
```bash
cd frontend
npm run test:e2e            # headless
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:report     # Show last report
```

### Helpers (`frontend/e2e/helpers.ts`)
```ts
export const TEST_EMAIL = "e2e@test.karmayogi.local";
export const TEST_PASSWORD = "e2eTestPass123";
export const TEST_NAME = "E2E Tester";
export const TEST_SECRET_ANSWER = "TestCity";

// Tries login; if it fails (no account), auto-registers
export async function loginAs(page: Page, email?, password?): Promise<void>

// Always registers a fresh unique account
export async function registerAndLogin(page: Page): Promise<void>

// Waits for network idle
export async function waitForNav(page: Page): Promise<void>
```

### Spec structure pattern
```ts
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Feature Name", () => {
  test("description of behaviour", async ({ page }) => {
    await loginAs(page);
    await page.goto("/some-route");
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });
});
```

### Key selector conventions
- Form inputs: `[id="auth-email"]`, `[id="auth-password"]`, `[id="auth-fullname"]`, `[id="auth-confirm-password"]`
- Submit buttons: `button[type="submit"]`
- Nav element: `nav` (used to confirm login success)
- Error messages: `.text-destructive`
- Password toggle: `[aria-label="Show password"]` / `[aria-label="Hide password"]`

### When to add/update specs
- New page added → new `<feature>.spec.ts` covering at least: page loads, main interaction, error state
- Auth form IDs changed → update `helpers.ts` selectors
- Nav links changed → update `navigation.spec.ts`
- New modal/flow → add test cases to the relevant spec file

---

## 2. Shell E2E smoke test — Backend API (`scripts/e2e.sh`)

### What it tests
Full API round-trip against a live local Docker stack:
- Register + login + password reset + dev-login
- Token refresh rotation + logout
- CRUD: subjects, sessions, goals, exam-goal
- Achievements + study-stats
- Public profile, preferences, privacy
- Friends flow: discover, send/accept/reject request, shared sessions, friend-profile
- Leaderboard with week offsets (`?weekOffset=0`, `?weekOffset=-1`)
- Timer state: save, restore, start, delete
- Cascade delete (subject delete cascades to its sessions)
- Nginx proxy + Google invalid token rejection

### Running
```bash
./scripts/e2e.sh   # from repo root or any subdirectory
# Requires: docker, jq, python3
```

### Helper functions in e2e.sh
```bash
api_call METHOD /path [json_body]        # calls as primary user ($ACCESS_TOKEN)
friend_api_call METHOD /path [json_body] # calls as friend user ($FRIEND_TOKEN)
```

### Pattern for adding a new endpoint test
```bash
echo "[INFO] Testing <feature>..."
RESULT="$(api_call POST "/api/v1/<resource>" '{"field":"value"}')"
RESOURCE_ID="$(printf "%s" "$RESULT" | jq -r '.id')"
if [[ -z "$RESOURCE_ID" || "$RESOURCE_ID" == "null" ]]; then
  echo "[ERROR] <Resource> create did not return id."
  exit 1
fi

# Verify GET
GET_RESULT="$(api_call GET "/api/v1/<resource>/$RESOURCE_ID")"
if [[ "$(printf "%s" "$GET_RESULT" | jq -r '.field')" != "value" ]]; then
  echo "[ERROR] <Resource> GET returned wrong value."
  exit 1
fi
```

### Summary block (keep current)
At end of script — add new resources to the `[PASS]` summary:
```bash
echo "[PASS] /sessions count:  $(printf "%s" "$SESSION_LIST" | jq 'length')"
# Add new counts here when new major resources are added
```

### When to update e2e.sh
- New endpoint added → add test block before the cleanup section
- Auth flow changed → update register/login/refresh/logout blocks
- New resource type → add CRUD assertions + include in cleanup
- Response shape changed → update `jq` assertions for that endpoint

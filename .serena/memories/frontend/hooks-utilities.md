# Karma Yogi Frontend Hooks & Utilities

## Hooks

**Location:** `/Users/admin/Code/karma-yogi/frontend/src/hooks/`

### useIsMobile() (use-mobile.tsx)
```tsx
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

const MOBILE_BREAKPOINT = 768
```

**Usage:** Conditional rendering of mobile-specific UI (bottom tab nav vs desktop nav)

### useBodyScrollLock(isOpen: boolean) (useBodyScrollLock.ts)
```tsx
export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}
```

**Usage:** Prevent scroll when modals are open (TimerModal, LogSessionModal, FriendSessionModal)

### useHeatmapData(dailyTotals, year) (useHeatmapData.ts)
```tsx
export type HeatmapDay = {
  date: string;
  minutes: number;
  month: string;
  monthIndex: number;
  year: number;
  dayOfWeek: number;
};

export type HeatmapResult = {
  weeks: (HeatmapDay | undefined)[][];
  maxMinutes: number;
  monthLabels: string[];
};

export function useHeatmapData(dailyTotals: Map<string, number>, year: number): HeatmapResult {
  return useMemo(() => {
    const days: HeatmapDay[] = [];
    const cursor = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Generate all days in year
    while (cursor <= endDate) {
      const dateStr = toLocalDateKey(cursor);
      days.push({
        date: dateStr,
        minutes: dailyTotals.get(dateStr) || 0,
        month: cursor.toLocaleDateString("en-US", { month: "short" }),
        monthIndex: cursor.getMonth(),
        year: cursor.getFullYear(),
        dayOfWeek: (cursor.getDay() + 6) % 7, // Monday = 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    
    // Group into weeks (Monday-Sunday)
    const weekMap = new Map<string, (HeatmapDay | undefined)[]>();
    const weekOrder: string[] = [];
    for (const day of days) {
      const dayDate = fromLocalDateKey(day.date);
      const monday = new Date(dayDate);
      monday.setDate(dayDate.getDate() - day.dayOfWeek);
      const weekKey = toLocalDateKey(monday);
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, Array(7).fill(undefined));
        weekOrder.push(weekKey);
      }
      weekMap.get(weekKey)![day.dayOfWeek] = day;
    }
    
    const weeks = weekOrder.map((wk) => weekMap.get(wk) || []);
    const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
    
    // Generate month labels for weeks
    const monthLabels = weeks.map((week, idx) => {
      const first = week.find((d) => d && d.year === year);
      const prev = idx > 0 ? weeks[idx - 1]?.find((d) => d && d.year === year) : null;
      if (!first) return "";
      if (!prev || prev.monthIndex !== first.monthIndex) return first.month;
      return "";
    });
    
    return { weeks, maxMinutes, monthLabels };
  }, [dailyTotals, year]);
}
```

**Usage:** ProfilePage heatmap display, InsightsPage yearly view

---

## Utility Modules

### Date Utilities (date.ts)
```tsx
export function toLocalDateKey(date: Date): string {
  // Format: YYYY-MM-DD using local time (not UTC)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromLocalDateKey(key: string): Date {
  // Parse YYYY-MM-DD back to Date (local midnight)
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
```

### Stats Utilities (stats.ts)
```tsx
export function currentStreakUntilToday(sessions: Session[]): number {
  // Calculate unbroken streak from today backwards
  // Requires local date tracking
}

export function maxStreak(sessions: Session[]): number {
  // Calculate longest historical streak
}
```

### Subject Icon (subject-icon.ts)
```tsx
export function getSafeSubjectIcon(icon: string | undefined, fallback: string): string {
  if (!icon) return fallback;
  // Validate icon is safe emoji/string
  return icon;
}
```

### Last Studied Subject (last-studied-subject.ts)
```tsx
export function getLastStudiedSubjectId(sessions: Session[], subjects: Subject[]): string {
  // Return most recent subject from sessions, or first subject
  const recent = sessions[0];
  if (recent?.subjectId) {
    const found = subjects.find((s) => s.id === recent.subjectId);
    if (found) return found.id;
  }
  return subjects[0]?.id || '';
}
```

### Utilities (utils.ts)
```tsx
export function cn(...classes: (string | undefined | null | false)[]): string {
  // classnames implementation
  return classes.filter(Boolean).join(' ');
}
```

### Auth Constants (auth-constants.ts)
```tsx
export const STANDARD_SECRET_QUESTION = "What is the name of your favorite childhood city?";
```

### Native Google Auth (nativeGoogleAuth.ts)
Handles native Google Sign-In for Android/iOS Capacitor builds

---

## Development Utilities

### Dev Environment Variables
```tsx
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const CLIENT_PLATFORM = String(import.meta.env.VITE_CLIENT_PLATFORM || 'web').toLowerCase();
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '').trim();
const DEV_AUTO_LOGIN = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
```

### Dev Login Pattern
```tsx
const enabled = (import.meta.env.VITE_DEV_AUTO_LOGIN ?? 'false') === 'true';
if (!enabled) return;

// Auto-login dev user
const res = await fetch(`${API_BASE}/auth/dev-login`, {
  method: 'POST',
  headers: withClientHeaders(),
  body: JSON.stringify({ email: 'dev@karmayogi.local' }),
});
```

---

## E2E Test Helpers

**File:** `/Users/admin/Code/karma-yogi/frontend/e2e/helpers.ts`

### Test Constants
```tsx
export const TEST_EMAIL = "e2e@test.karmayogi.local";
export const TEST_PASSWORD = "e2eTestPass123";
export const TEST_NAME = "E2E Tester";
export const TEST_SECRET_ANSWER = "TestCity";
```

### Login Helper
```tsx
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  await page.fill('[id="auth-email"]', email);
  await page.fill('[id="auth-password"]', password);
  await page.click('button[type="submit"]');

  // Wait for nav (login success + splash ~2.1s)
  const navShown = await page.waitForSelector("nav", { timeout: 8_000 }).then(() => true).catch(() => false);

  if (!navShown) {
    // Login failed — auto-register account
    await page.locator('button[type="button"]:has-text("Create an account")').click();
    await page.waitForSelector('[id="auth-fullname"]', { timeout: 5_000 });
    await page.fill('[id="auth-fullname"]', TEST_NAME);
    await page.fill('[id="auth-email"]', email);
    await page.fill('[id="auth-password"]', password);
    await page.fill('[id="auth-confirm-password"]', password);
    await page.locator('input[placeholder="Your answer"]').fill(TEST_SECRET_ANSWER);
    await page.click('button[type="submit"]');
    await page.waitForSelector("nav", { timeout: 15_000 });
  }
}
```

### Register Helper
```tsx
export async function registerAndLogin(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[id="auth-email"]', { timeout: 10_000 });
  await page.click('button[type="button"]:has-text("Create an account")');
  await page.fill('[id="auth-fullname"]', TEST_NAME);
  await page.fill('[id="auth-email"]', `e2e_${Date.now()}@test.local`); // Unique email
  await page.fill('[id="auth-password"]', TEST_PASSWORD);
  await page.fill('[id="auth-confirm-password"]', TEST_PASSWORD);
  await page.locator('input[placeholder="Your answer"]').fill(TEST_SECRET_ANSWER);
  await page.click('button[type="submit"]');
  await page.waitForSelector("nav", { timeout: 15_000 });
}
```

### Navigation Wait
```tsx
export async function waitForNav(page: Page) {
  await page.waitForLoadState("networkidle");
}
```

---

## Component UI Libraries

### Shadcn UI Components Used
- Alert Dialog
- Popover
- Calendar
- Select
- Tooltip
- Sonner (Toast notifications)

### External Libraries
- Framer Motion (animations)
- Recharts (charts)
- Lucide React (icons)
- React Router (routing)
- React (core)

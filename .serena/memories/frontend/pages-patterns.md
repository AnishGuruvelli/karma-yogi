# Karma Yogi Frontend Pages Patterns

## DashboardPage.tsx (15.5 KB)

**Location:** `/Users/admin/Code/karma-yogi/frontend/src/pages/DashboardPage.tsx`

### Daily Quotes System
```tsx
const DAILY_QUOTES = [
  "The journey of a thousand miles begins with a single step.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Little by little, a little becomes a lot.",
  "Discipline is choosing between what you want now and what you want most.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "Small daily improvements are the key to staggering long-term results.",
  "Consistency compounds louder than intensity.",
] as const;

// Deterministic rotation: Math.floor(now.getTime() / msPerDay) % DAILY_QUOTES.length
```

### State Management
```tsx
const [timerOpen, setTimerOpen] = useState(false);
const [logOpen, setLogOpen] = useState(false);
const [goalOpen, setGoalOpen] = useState(false);
const [editing, setEditing] = useState<null | (typeof sessions)[number]>(null);
```

### Key Calculations
- **Today's minutes:** Filter sessions by today's dateKey, sum duration
- **Week minutes:** Sessions from Monday 00:00 to today
- **Week by subject:** Group week sessions by subject, calculate minutes per subject
- **Streak:** `currentStreakUntilToday(sessions)` helper
- **Goal progress:** `goalProgress = Math.min(weekHours / goal.targetHours, 1)`
- **Missing subjects:** Subjects with zero sessions (prompt user to study them)

### Layout Structure
1. Header with greeting, daily quote, Begin Session & Log Session buttons
2. ExamCountdownCard component
3. 3-column stat cards (Today, This Week, Current Streak)
4. Main grid (lg:col-span-2 + sidebar):
   - **Left column:**
     - "This Week by Subject" progress bar + legend
     - Highlight for missing subjects
     - "Recent Sessions" list (first 10 sessions)
   - **Right sidebar:**
     - Weekly Goal circular SVG progress (circumference = 2π × 70, strokeDashoffset = circumference × (1 - progress))
     - Subjects list with session counts and total minutes

### Session Card Display Pattern
```tsx
<button className="rounded-xl bg-muted/40 p-3 text-left hover:bg-muted/70">
  <div className="flex items-start gap-3">
    <div className="w-1 self-stretch rounded-full" style={{backgroundColor: subjectColor(subject?.color)}} />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold">{subject?.name}</div>
      <div className="truncate text-xs text-muted-foreground">{session.topic}</div>
    </div>
    <div className="shrink-0 text-right">
      <div className="text-sm font-semibold text-neon-green">{formatDuration(session.duration)}</div>
      <div className="flex items-center justify-end gap-1 text-xs">
        {session.isManualLog ? "📝" : MOOD_EMOJIS[session.moodRating]}
        <span>{formatSessionDate(session.date)} · {session.startTime}</span>
      </div>
    </div>
  </div>
</button>
```

### Modal Pattern
- Edit session when clicking a recent session card
- LogSessionModal with `initialSession` prop and `onSave`, `onDelete` callbacks
- Modal calls `editSession()` or `deleteSession()` from store, shows toast feedback

---

## SessionsPage.tsx (8.2 KB)

### Pagination Pattern
```tsx
const pageSize = 18;
const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
const safePage = Math.min(page, totalPages);

const pagedSessions = useMemo(() => {
  const startIndex = (safePage - 1) * pageSize;
  return sessions.slice(startIndex, startIndex + pageSize);
}, [sessions, safePage]);
```

### Grouping by Date
```tsx
const grouped = useMemo(() => {
  const result: { label: string; sessions: typeof sessions }[] = [];
  const todaySessions = pagedSessions.filter((s) => s.date === today);
  const yesterdaySessions = pagedSessions.filter((s) => s.date === yesterday);
  const olderSessions = pagedSessions.filter((s) => s.date !== today && s.date !== yesterday);

  if (todaySessions.length > 0) result.push({ label: "Today", sessions: todaySessions });
  if (yesterdaySessions.length > 0) result.push({ label: "Yesterday", sessions: yesterdaySessions });
  if (olderSessions.length > 0) result.push({ label: "Earlier", sessions: olderSessions });
  return result;
}, [pagedSessions, today, yesterday]);
```

### UI Structure
- Pagination controls at top (Prev/Next buttons, Page indicator)
- Grouped sessions with dividers and session count per group
- Grid layout: `grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3`
- Same session card pattern as DashboardPage
- Edit/delete via LogSessionModal

---

## InsightsPage.tsx (25 KB)

### Period Mode Management
```tsx
type PeriodMode = "week" | "month" | "all";
const [mode, setMode] = useState<PeriodMode>("week");
const [offset, setOffset] = useState(0);

// Period calculation memoized with all-time date ranges
const { start, end, periodLabel } = useMemo(() => {
  if (mode === "all") {
    const yearStart = new Date(now.getFullYear() + offset, 0, 1);
    const yearEnd = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
    return { start: yearStart, end: yearEnd, periodLabel: String(now.getFullYear() + offset) };
  }
  // ... month and week logic
}, [mode, offset, now]);
```

### Chart Data Aggregation
- **Bar Chart:** Daily/monthly/yearly breakdown with Recharts ResponsiveContainer
- **Pie Chart:** Subject breakdown with colors
- **Best day calculation:** Max day in period, second best day with unique values

### Key Metrics
- Total minutes, unique study days, daily average
- Longest session
- Best day/second best day
- Best subject by time

### HeatmapCard Component
Displays yearly heatmap using `useHeatmapData` hook

---

## DataPage.tsx (14.7 KB)

**Library/Data Management Page**

### Subject Management
```tsx
<div className="mb-4 flex items-center justify-between">
  <h2 className="text-xs font-semibold uppercase tracking-widest">📚 Subjects</h2>
  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold">{subjects.length}</span>
</div>
```

### Subject Card Pattern
```tsx
<Popover open={colorPickerSubjectId === sub.id} onOpenChange={(open) => {...}}>
  <PopoverTrigger asChild>
    <button className="flex h-10 w-10 items-center justify-center rounded-xl" style={{backgroundColor: colorMap[sub.color] + "1A"}}>
      <span>{getSafeSubjectIcon(sub.icon, sub.name.charAt(0) || "📘")}</span>
    </button>
  </PopoverTrigger>
  <PopoverContent className="z-[80] w-auto p-1.5">
    <div className="flex gap-1.5">
      {Object.entries(colorMap).map(([key, val]) => (
        <button key={key} onClick={...} style={{backgroundColor: val}} className="h-8 w-8 rounded-lg" />
      ))}
    </div>
  </PopoverContent>
</Popover>
```

### Delete Dialog Pattern
```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [pendingDelete, setPendingDelete] = useState<{
  type: "subject" | "session";
  id: string;
  title: string;
  description: string;
} | null>(null);

// RequestDelete → setPendingDelete → AlertDialog → confirmDelete → deleteSubject/deleteSession
```

---

## ProfilePage.tsx (44.8 KB)

### Tab Management
```tsx
const [tab, setTab] = useState<"overview" | "achievements" | "account" | "preferences">("overview");
```

### Draft Pattern for Forms
```tsx
const [editing, setEditing] = useState(false);
const [draft, setDraft] = useState({ name: user.name, username: user.username, email: user.email, phone: user.phone });

// Reset on editing state change
useEffect(() => {
  if (!editing) setDraft({ name: user.name, username: user.username, email: user.email, phone: user.phone });
}, [editing, user]);

// Similar for profileDraft, prefDraft, privacyDraft
```

### Stat Calculations
- **All-time stats:** Total minutes, sessions, avg session, longest, active days, streak info
- **Week stats:** Filtered to start of week
- **Subject stats:** Grouped, sorted by minutes, with percentages
- **Mood distribution:** Count by rating, calculate average
- **Server vs client:** Server StudyStatsSummary as authoritative, client calculations as fallback

### Server-Authoritative Aggregates
```tsx
const snapTotalMin = studyStats?.totalMinutes ?? totalMinutes;
const snapSessions = studyStats?.totalSessions ?? totalSessions;
const weekHours = studyStats != null ? studyStats.weekMinutesCurrent / 60 : weekHoursClient;
```

### Achievements Layout
Fetches `fetchMyAchievements()` and builds UI for earned/not-earned badges

---

## FriendsPage.tsx (53.1 KB)

**Complex page with tabs, modals, and live timer**

### Tab States
```tsx
type TabKey = "leaderboard" | "friends" | "discover" | "requests";
const [activeTab, setActiveTab] = useState<TabKey>("leaderboard");
```

### Leaderboard with Week Navigation
```tsx
function getWeekRange(weekOffset = 0, now = new Date()) {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  // ... return { start, endExclusive, label }
}
```

### Friend Session Modal
```tsx
const [showSessionModal, setShowSessionModal] = useState(false);
const [sessionMode, setSessionMode] = useState<SessionMode>("past");
const [friendIds, setFriendIds] = useState<string[]>([]);
const [useDifferentSubjects, setUseDifferentSubjects] = useState(false);
const [friendPlans, setFriendPlans] = useState<Record<string, { subjectName: string; topic: string }>>({});
```

### Timer State Persistence
Restores friend timer from `fetchTimerState()` with `timerType: "friend"` check

---

## PublicProfilePage.tsx (37.3 KB)

Displays another user's profile with:
- Public profile view (basic info + stats if allowed)
- Public profile details (overview, sessions, insights, heatmap if privacy allows)
- Link to add friend

---

## StrategyDashboard.tsx (970 bytes)

Minimal stub page (970 bytes).

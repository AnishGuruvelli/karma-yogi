# Karma Yogi Frontend Components & Modals

## TimerModal.tsx (32 KB)

**Location:** `/Users/admin/Code/karma-yogi/frontend/src/components/TimerModal.tsx`

### Timer Modes
```tsx
type TimerMode = 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'focus' | 'break';

const POMODORO_FOCUS = 25 * 60; // seconds
const POMODORO_BREAK = 5 * 60;
```

### Completed Timer Tracking
Prevents duplicate sessions after spin-down/restore:
```tsx
const COMPLETED_STARTS_KEY = 'karma_completed_timer_starts';

function markTimerCompleted(startedAtMs: number) {
  try {
    const raw: number[] = JSON.parse(localStorage.getItem(COMPLETED_STARTS_KEY) || '[]');
    const fresh = raw.filter((t) => Date.now() - t < 7 * 24 * 60 * 60 * 1000); // 7-day window
    fresh.push(startedAtMs);
    localStorage.setItem(COMPLETED_STARTS_KEY, JSON.stringify(fresh.slice(-20))); // Keep last 20
  } catch {}
}

function isTimerCompleted(startedAtMs: number): boolean {
  // Check if session was already completed locally
}
```

### State Shape
```tsx
const [isRunning, setIsRunning] = useState(false);
const [isPaused, setIsPaused] = useState(false);
const [elapsed, setElapsed] = useState(0); // seconds (stopwatch)
const [totalStudied, setTotalStudied] = useState(0);
const [hasStarted, setHasStarted] = useState(false);
const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
const [pauseStartedAtMs, setPauseStartedAtMs] = useState<number | null>(null);
const [pausedAccumMs, setPausedAccumMs] = useState(0);
const [tickNowMs, setTickNowMs] = useState(Date.now()); // Synced on visibility change
const [restoredOnce, setRestoredOnce] = useState(false);
const [showMoodStep, setShowMoodStep] = useState(false);
const [selectedMood, setSelectedMood] = useState<number | null>(null);
const [pendingDuration, setPendingDuration] = useState(0);
const [pendingEndTime, setPendingEndTime] = useState<Date | null>(null);

// Pomodoro state
const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus');
const [pomodoroRemaining, setPomodoroRemaining] = useState(POMODORO_FOCUS);
const [pomodoroCount, setPomodoroCount] = useState(0);
const [focusDuration, setFocusDuration] = useState(25);
const [breakDuration, setBreakDuration] = useState(5);
```

### Computed Elapsed Time
```tsx
const computedStopwatchElapsed = (() => {
  if (!startedAtMs) return elapsed;
  const effectiveNow = isPaused && pauseStartedAtMs ? pauseStartedAtMs : tickNowMs;
  const seconds = Math.floor((effectiveNow - startedAtMs - pausedAccumMs) / 1000);
  return Math.max(0, seconds);
})();
```

### Timer State Persistence
Saves to server via `saveTimerState()`:
```tsx
const state: TimerStatePayload = {
  timerType: 'main', // vs 'friend'
  mode,
  subjectId,
  topic,
  isRunning,
  isPaused,
  hasStarted,
  startedAtMs,
  pauseStartedAtMs,
  pausedAccumMs,
  elapsed,
  totalStudied,
  tickNowMs,
  pomodoroPhase,
  pomodoroRemaining,
  pomodoroCount,
  focusDuration,
  breakDuration,
};
```

### Restoration Pattern
```tsx
useEffect(() => {
  if (restoredOnce) return;
  let cancelled = false;
  void fetchTimerState()
    .then((state) => {
      if (cancelled) return;
      setRestoredOnce(true);
      if (!state || state.timerType === 'friend') return; // Skip friend sessions
      
      // Type-safe restoration with fallbacks
      const modeValue = state.mode === 'pomodoro' ? 'pomodoro' : 'stopwatch';
      const startedMsValue = typeof state.startedAtMs === 'number' ? state.startedAtMs : null;
      
      // Check if already completed locally
      if (startedMsValue && isTimerCompleted(startedMsValue)) {
        void clearTimerState().catch(() => {});
        return;
      }
      
      // Restore state from server
      setMode(modeValue);
      setSubjectId(...);
      setTopic(...);
      setIsRunning(Boolean(state.isRunning));
      // ... etc
    })
    .catch(() => { setRestoredOnce(true); });
  
  return () => { cancelled = true; };
}, []);
```

### Visibility Change Sync
Updates `tickNowMs` when tab regains focus to correct elapsed time:
```tsx
useEffect(() => {
  const handleVisible = () => setTickNowMs(Date.now());
  document.addEventListener('visibilitychange', handleVisible);
  window.addEventListener('focus', handleVisible);
  return () => {
    document.removeEventListener('visibilitychange', handleVisible);
    window.removeEventListener('focus', handleVisible);
  };
}, []);
```

### Subject Selection Logic
Uses `getLastStudiedSubjectId(sessions, subjects)` helper to pre-select

---

## LogSessionModal.tsx (32 KB)

**Manual session logging with date picker, duration, mood, subject selection**

### Subject Selection
```tsx
const [subjectId, setSubjectId] = useState(() => getLastStudiedSubjectId(sessions, subjects));
const selectedSubject = subjects.find((s) => s.id === subjectId);
```

### Duration Input
```tsx
const initialDuration = initialSession?.duration ?? 30;
const [hours, setHours] = useState<number | null>(Math.floor(initialDuration / 60));
const [minutes, setMinutes] = useState<number | null>(initialDuration % 60);
const totalMinutes = (hours ?? 0) * 60 + (minutes ?? 0);

const bumpHours = (delta: number) => {
  const h = hours ?? 0;
  setHours(Math.max(0, h + delta));
};

const bumpMinutes = (delta: number) => {
  let total = (hours ?? 0) * 60 + (minutes ?? 0) + delta;
  total = Math.max(0, total);
  setHours(Math.floor(total / 60));
  setMinutes(total % 60);
};
```

### Duration Chips
```tsx
const DURATION_CHIPS_MIN = [15, 30, 45, 60, 90, 120] as const;

function chipLabel(mins: (typeof DURATION_CHIPS_MIN)[number]): string {
  if (mins < 60) return `${mins}m`;
  if (mins === 60) return "1h";
  if (mins === 90) return "1h 30m";
  if (mins === 120) return "2h";
  // ...
}
```

### Date & Time Input
```tsx
const [sessionDate, setSessionDate] = useState(initialSession?.date || toLocalDateString(new Date()));
const [datePickerOpen, setDatePickerOpen] = useState(false);
// Time uses Calendar component for date picker
```

### Time Parsing
```tsx
function parseTimeHHMM(t: string): { h: number; m: number } | null {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
```

### Mood Selection
```tsx
const [mood, setMood] = useState<number | null>(initialSession?.moodRating ?? null);
// Renders 5 mood emoji buttons: 😞 😐 🙂 😄 🤩
```

### Create Subject Within Modal
```tsx
const [showCreateSubject, setShowCreateSubject] = useState(false);
const [newSubjectName, setNewSubjectName] = useState("");
const [newSubjectColor, setNewSubjectColor] = useState("cyan");

// On creation: addSubject(name, color) then setSubjectId(created.id)
```

### Edit Session Init Pattern
```tsx
const initDoneRef = useRef(false);

useEffect(() => {
  if (!open) {
    initDoneRef.current = false;
    return;
  }
  if (initDoneRef.current) return;
  initDoneRef.current = true;
  
  if (initialSession) {
    setSubjectId(initialSession.subjectId);
    setTopic(initialSession.topic);
    setHours(Math.floor(initialSession.duration / 60));
    setMinutes(initialSession.duration % 60);
    // ... etc
  }
}, [open, initialSession]);
```

### Save & Delete
```tsx
const handleSave = async () => {
  if (!subjectId || !sessionDate || totalMinutes < 1 || mood === null) {
    toast.error("Please fill in all required fields.");
    return;
  }
  
  if (initialSession && onSave) {
    // Edit mode: call onSave with changes
    const ok = await onSave({
      subjectId,
      topic,
      duration: totalMinutes,
      date: sessionDate,
      startTime: `${pad2(startHour)}:${pad2(startMinute)}`,
      moodRating: mood,
    });
    // ...
  } else {
    // Create mode: addSession from store
    addSession({...});
  }
  onClose();
};

// Delete shows confirmation, calls onDelete if provided
```

---

## Other Modals & Components

### GoalEditModal.tsx
Modal for setting weekly goal hours

### ExamCountdownCard.tsx
Card showing days until exam goal

### CalendarModal.tsx
Date picker modal (1.5 KB)

### HeatmapCard.tsx (7.3 KB)
Displays yearly heatmap using `useHeatmapData(dailyTotals, year)`

---

## TopNav.tsx (8.5 KB)

**Navigation bar with responsive desktop/mobile layouts**

### Desktop Layout (hidden on mobile)
```tsx
<header className="sticky top-0 z-50 hidden border-b bg-background/70 backdrop-blur-xl sm:block">
  <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
    {/* Logo */}
    {/* Nav tabs */}
    {/* Theme/Logout buttons */}
  </div>
</header>
```

### Mobile Bottom Tab Bar (hidden on sm+)
```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/85 backdrop-blur-xl sm:hidden">
  <div className="flex items-end justify-between gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    {navLinks.map(({ to, label, icon: Icon }) => (
      <Link key={to} to={to} className="flex min-w-[3rem] flex-1 flex-col items-center gap-1 py-1">
        <div className={`h-9 w-9 rounded-2xl ${isActive ? 'scale-105 border-primary/25 bg-primary/10 text-primary' : 'text-muted-foreground'}`} />
        <span className="text-[10px]">{label}</span>
      </Link>
    ))}
  </div>
</nav>
```

### Dynamic Navigation
```tsx
const baseNavLinks: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/", label: "Today", icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", icon: Timer },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/library", label: "Library", icon: Database },
  { to: "/profile", label: "Profile", icon: User },
];

const navLinks = useMemo(() => {
  if (user.id === "anon" || !preferences?.showStrategyPage) {
    return [...baseNavLinks];
  }
  const links = [...baseNavLinks];
  const afterInsights = links.findIndex((l) => l.to === "/insights");
  if (afterInsights >= 0) {
    links.splice(afterInsights + 1, 0, { to: "/strategy-dashboard", label: "Strategy", icon: Target });
  }
  return links;
}, [user.id, preferences.showStrategyPage]);
```

### Active Link Detection
```tsx
const isActive = to === "/" ? currentPath === "/" : currentPath.startsWith(to);
```

### Theme Picker & Dark Toggle
- Popover with ThemePicker component
- Toggle button for dark/light mode
- Logout button

---

## Helper Patterns

### Subject Icon Safety
```tsx
function getSafeSubjectIcon(icon: string | undefined, fallback: string): string {
  // Returns icon or fallback emoji
}
```

### Last Studied Subject
```tsx
function getLastStudiedSubjectId(sessions: Session[], subjects: Subject[]): string {
  // Returns most recent subject ID or first subject
}
```

### Mood Emoji Mapping
```tsx
const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const;
// Indexed 0-4, but code uses 1-5 rating (subtract 1 when indexing)
```

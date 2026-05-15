# Karma Yogi Frontend Architecture & Patterns

## App Structure and Routing (App.tsx)

**File:** `/Users/admin/Code/karma-yogi/frontend/src/App.tsx`

### Lazy Loading Pattern
All page components use React.lazy with Suspense:
```tsx
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const SessionsPage = lazy(() => import("@/pages/SessionsPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const StrategyDashboard = lazy(() => import("@/pages/StrategyDashboard"));
const FriendsPage = lazy(() => import("@/pages/FriendsPage"));
const DataPage = lazy(() => import("@/pages/DataPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));
```

### Error Boundary Pattern
Custom AppErrorBoundary class component catches errors and shows ErrorFallback UI:
```tsx
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
```

### Route Structure
- `/` → DashboardPage (wrapped in AppErrorBoundary & Suspense)
- `/sessions` → SessionsPage
- `/insights` → InsightsPage
- `/strategy-dashboard` → StrategyDashboard (dynamic navigation)
- `/strategy` → redirects to `/strategy-dashboard`
- `/friends` → FriendsPage
- `/friends/:userId` → PublicProfilePage
- `/library` → DataPage
- `/profile` → ProfilePage
- `*` → NotFound (404)

### Auth Flow
AuthScreen component handles login/register/password-reset flow with:
- Google OAuth (native on mobile, web on browser)
- Email/password login & registration
- Remember me flag stored in localStorage
- Secret question for password reset

### Splash & Loading Management
- SplashScreen shown on initial load (branded intro)
- LoadingSplash shown while auth/store data is loading
- StoreProvider wraps authenticated routes
- TopNav available when authenticated

---

## State Management (store.tsx)

**File:** `/Users/admin/Code/karma-yogi/frontend/src/lib/store.tsx`

### StoreContextType Interface
```tsx
interface StoreContextType {
  // Data state
  subjects: Subject[];
  sessions: Session[];
  goal: Goal;
  user: UserProfile;
  examGoal: ExamGoal | null;
  profileMeta: UserPublicProfile;
  preferences: UserPreferences;
  privacy: UserPrivacySettings;
  
  // Actions
  addSubject: (name: string, color: string) => Promise<Subject | null>;
  updateSubjectColor: (id: string, color: string) => Promise<boolean>;
  deleteSubject: (id: string) => void;
  addSession: (session: Omit<Session, 'id'>) => void;
  deleteSession: (id: string) => void;
  editSession: (id: string, changes: {...}) => Promise<boolean>;
  updateGoal: (targetHours: number) => void;
  getSubject: (id: string) => Subject | undefined;
  
  // Theme
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeName; // "sky" | "honey" | "forest" | "blossom"
  setTheme: (theme: ThemeName) => void;
  
  // Exam goal
  setExamGoal: (name: string, date: string) => Promise<void>;
  clearExamGoal: () => Promise<void>;
  
  // Profile
  updateUserProfile: (payload: { name: string; username: string; phone: string }) => Promise<void>;
  saveProfileMeta: (payload: Omit<UserPublicProfile, 'userId'>) => Promise<void>;
  savePreferences: (payload: Omit<UserPreferences, 'userId'>) => Promise<UserPreferences>;
  savePrivacy: (payload: Omit<UserPrivacySettings, 'userId'>) => Promise<void>;
  
  // Loading
  dataLoading: boolean;
  wrapWithDataLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  reloadStoreData: (force?: boolean) => Promise<void>;
}
```

### Key Patterns

**Optimistic Updates with Rollback:**
- deleteSession: removes immediately, rolls back if API fails
- deleteSubject: removes optimistically, refetches sessions on rollback
- Actions dispatch toast errors on failure

**Data Loading Counters:**
- `dataLoadCount` incremented/decremented to track parallel async operations
- `wrapWithDataLoading` wraps any async function to show splash screen
- `reloadStoreData` loads all data in parallel with Promise.allSettled
- 5-second debounce prevents excessive reloads

**Theme Management:**
- Dark mode time-based inference: dark 18:00–05:59, light otherwise
- 5 theme names stored in localStorage & applied as CSS class
- `theme-${theme}` class + `dark` class for dual styling

**Streak Calculation:**
- `currentStreakUntilToday(sessions)` imported from @/lib/stats
- Updated when sessions change

---

## API Layer (api.ts)

**File:** `/Users/admin/Code/karma-yogi/frontend/src/lib/api.ts`

### Configuration
```tsx
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const CLIENT_PLATFORM = String(import.meta.env.VITE_CLIENT_PLATFORM || 'web').toLowerCase();
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '').trim();
```

### Auth State Management
- AuthState: `{ accessToken, refreshId, refreshToken }`
- Stored in localStorage under `karma_auth`
- Event dispatcher notifies listeners of auth changes: `window.dispatchEvent(new Event('karma-auth-changed'))`

### Request Wrapper with Automatic Token Refresh
```tsx
async function request(path: string, init: RequestInit = {}): Promise<Response> {
  // Add auth header if token exists
  // On 401: if token changed by concurrent request, retry; else refresh token once (shared promise)
  // Retry with new token if refresh succeeded
}
```

**Concurrent 401 Handling:**
- Single in-flight promise `refreshInFlight` prevents token rotation races
- Multiple concurrent 401s all wait on one refresh
- After first request refreshes, others check if token changed and retry with new token

### Client Headers
```tsx
function withClientHeaders(headers: HeadersInit = {}): HeadersInit {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': CLIENT_PLATFORM,
  };
  if (APP_VERSION) {
    base['X-App-Version'] = APP_VERSION;
  }
  return { ...base, ...(headers as Record<string, string>) };
}
```

### Error Message Parsing
```tsx
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  // Parse JSON { error?, message? } or plain text, return first non-empty string
}
```

### Auth Functions
- `loginWithGoogle(token: string)` - POST /auth/google
- `loginWithPassword(email, password)` - POST /auth/login
- `registerWithPassword(email, fullName, password, secretAnswer)` - POST /auth/register
- `resetPasswordWithSecret(email, secretAnswer, newPassword)` - POST /auth/password-reset
- `logout()` - POST /auth/logout (optional; clears localStorage regardless)
- `refreshToken(refreshId, refreshToken)` - POST /auth/refresh

### User API
- `fetchMe(): UserProfile` - GET /users/me
- `updateMe(payload: { fullName, username, phone, avatarUrl? })` - PATCH /users/me
- `fetchMyPublicProfile(): UserPublicProfile` - GET /users/me/public-profile
- `patchMyPublicProfile(payload)` - PATCH /users/me/public-profile
- `fetchMyPreferences()` - GET /users/me/preferences (normalizes snake_case)
- `patchMyPreferences(payload)` - PATCH /users/me/preferences
- `fetchMyPrivacy()` - GET /users/me/privacy
- `patchMyPrivacy(payload)` - PATCH /users/me/privacy

### Subject API
- `fetchSubjects(): Subject[]` - GET /subjects
- `createSubject(name, color)` - POST /subjects
- `updateSubjectColor(id, color)` - PATCH /subjects/{id}
- `removeSubject(id)` - DELETE /subjects/{id}

### Session API
- `fetchSessions(): Session[]` - GET /sessions
- `createSession(payload)` - POST /sessions (converts date/startTime to ISO)
- `updateSession(id, payload)` - PATCH /sessions/{id}
- `removeSession(id)` - DELETE /sessions/{id}

### Goals API
- `fetchGoals(): Goal[]` - GET /goals
- `createOrUpdateGoal(targetHours)` - Creates or updates single goal with 1-month deadline

### Exam Goal API
- `fetchExamGoal(): ExamGoal | null` - GET /exam-goal
- `upsertExamGoal(name, dateIso)` - PUT /exam-goal
- `deleteExamGoal()` - DELETE /exam-goal

### Friends & Leaderboard
- `fetchDiscoverUsers(): FriendUser[]` - GET /friends/users
- `fetchFriends(): UserProfile[]` - GET /friends
- `fetchIncomingFriendRequests(): FriendRequest[]` - GET /friends/requests/incoming
- `fetchOutgoingFriendRequests(): FriendRequest[]` - GET /friends/requests/outgoing
- `sendFriendRequest(receiverId)` - POST /friends/requests
- `acceptFriendRequest(requestId)` - POST /friends/requests/{id}/accept
- `rejectFriendRequest(requestId)` - POST /friends/requests/{id}/reject
- `fetchFriendsLeaderboard(params?: { weekOffset?, fromIso?, toIso? })` - GET /friends/leaderboard
- `createFriendSession(payload)` - POST /friends/sessions

### Public Profile API
- `fetchPublicProfile(username)` - GET /users/{username}/public-profile
- `fetchPublicProfileDetails(usernameOrId, page, limit)` - POST /friends/friend-profile

### Achievements & Stats
- `fetchMyAchievements(): UserAchievement[]` - GET /users/me/achievements
- `fetchMyStudyStats(tz?)` - GET /users/me/study-stats (aggregated server stats)

### Timer State API
- `fetchTimerState()` - GET /timer-state
- `startTimerFromServer()` - POST /timer-state/start
- `saveTimerState(state)` - PUT /timer-state
- `clearTimerState()` - DELETE /timer-state

---

## Data Mapping Functions

Mapping between backend and frontend types:

```tsx
function mapUser(raw: BackendUser): UserProfile {
  return {
    id: raw.id,
    email: raw.email || '',
    name: raw.fullName || raw.name || 'Karma Yogi User',
    username: raw.username || '',
    phone: raw.phone || '',
    currentStreak: 0,
    lastActiveDate: toLocalDateKey(new Date()),
  };
}

function mapSession(raw: BackendSession | BackendSessionV2): Session {
  const started = new Date(raw.startedAt);
  const end = new Date(started.getTime() + raw.durationMin * 60000);
  const topic = 'topic' in raw && raw.topic ? raw.topic : ('subject' in raw ? raw.subject : 'General study');
  const subjectId = 'subjectId' in raw && raw.subjectId ? raw.subjectId : '';
  return {
    id: raw.id,
    subjectId,
    topic,
    duration: raw.durationMin,
    startTime: formatTimeHHMM(started),
    endTime: formatTimeHHMM(end),
    date: toLocalDateKey(started),
    moodRating: Number(raw.mood || 3),
    isManualLog: false,
  };
}

function mapGoal(raw: BackendGoal): Goal {
  return { id: raw.id, targetHours: Number(raw.targetMinutes || 0) / 60, currentProgress: 0 };
}

function mapExamGoal(raw: BackendExamGoal): ExamGoal {
  return {
    id: raw.id,
    name: raw.name,
    date: toLocalDateKey(new Date(raw.examDate)),
  };
}
```

### Preferences Normalization
Special handling for snake_case fallbacks and loose types:
```tsx
function normalizePreferences(raw: unknown): UserPreferences {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    userId: String(o.userId ?? ""),
    preferredStudyTime: String(o.preferredStudyTime ?? ""),
    defaultSessionMinutes: n(o.defaultSessionMinutes, 50),
    breakMinutes: n(o.breakMinutes, 10),
    pomodoroCycles: n(o.pomodoroCycles, 4),
    studyLevel: String(o.studyLevel ?? ""),
    weeklyGoalHours: n(o.weeklyGoalHours, 20) || 20,
    emailNotifications: b(o.emailNotifications),
    pushNotifications: b(o.pushNotifications),
    reminderNotifications: b(o.reminderNotifications),
    marketingNotifications: b(o.marketingNotifications),
    showStrategyPage: b(o.showStrategyPage ?? o.show_strategy_page),
  };
}
```

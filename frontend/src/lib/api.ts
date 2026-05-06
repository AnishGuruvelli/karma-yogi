import type {
  ExamGoal,
  FriendRequest,
  FriendUser,
  Goal,
  LeaderboardEntry,
  PublicProfileDetails,
  PublicProfileView,
  Session,
  Subject,
  UserPreferences,
  UserPrivacySettings,
  UserProfile,
  UserPublicProfile,
} from '@/lib/types';
import { toLocalDateKey } from '@/lib/date';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const CLIENT_PLATFORM = String(import.meta.env.VITE_CLIENT_PLATFORM || 'web').toLowerCase();
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '').trim();

type AuthState = { accessToken: string; refreshId: string; refreshToken: string };
type BackendUser = { id: string; email?: string; fullName?: string; name?: string; username?: string; phone?: string; avatarUrl?: string };
type BackendSession = { id: string; startedAt: string; durationMin: number; subject: string; mood?: string | number };
type BackendSessionV2 = { id: string; startedAt: string; durationMin: number; subjectId?: string; topic?: string; mood?: string | number };
type BackendGoal = { id: string; targetMinutes: number };
type BackendExamGoal = { id: string; name: string; examDate: string };
type BackendSubject = { id: string; name: string; color: string; icon?: string; createdAt: string };
type BackendUserPublicProfile = UserPublicProfile;
type BackendUserPreferences = UserPreferences;
type BackendUserPrivacy = UserPrivacySettings;
type BackendPublicProfileView = PublicProfileView;
type BackendPublicProfileDetails = PublicProfileDetails;
type TimerStatePayload = Record<string, unknown>;
const authKey = 'karma_auth';

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

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const raw = (await res.text()).trim();
  if (!raw) return fallback;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      const msg = (parsed.error || parsed.message || '').trim();
      if (msg) return msg;
    } catch {
      // fall through to raw text
    }
  }
  return raw || fallback;
}

export function getAuthState(): AuthState | null {
  const raw = localStorage.getItem(authKey);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthState; } catch { return null; }
}

function notifyAuthChanged() { window.dispatchEvent(new Event('karma-auth-changed')); }
function setAuthState(next: AuthState) {
  localStorage.setItem(authKey, JSON.stringify(next));
  notifyAuthChanged();
}
export function clearAuthState() {
  localStorage.removeItem(authKey);
  notifyAuthChanged();
}

export async function ensureDevAuth(): Promise<void> {
  const enabled = (import.meta.env.VITE_DEV_AUTO_LOGIN ?? 'false') === 'true';
  if (!enabled) return;

  const auth = getAuthState();
  if (auth) {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: withClientHeaders({ Authorization: `Bearer ${auth.accessToken}` }),
      });
      if (res.ok) return;
      // Keep tokens on server errors so a brief outage does not wipe a good session.
      if (res.status >= 500) return;
      clearAuthState();
    } catch {
      // Network / CORS while backend is down — keep existing tokens.
      return;
    }
  }

  if (getAuthState()) return;

  const res = await fetch(`${API_BASE}/auth/dev-login`, {
    method: 'POST',
    headers: withClientHeaders(),
    body: JSON.stringify({ email: 'dev@karmayogi.local' }),
  });
  if (!res.ok) return;
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
}

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const auth = getAuthState();
  const headers: HeadersInit = withClientHeaders(init.headers || {});
  if (auth?.accessToken) (headers as Record<string, string>).Authorization = `Bearer ${auth.accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && auth && retry) {
    try {
      const refreshed = await refreshToken(auth.refreshId, auth.refreshToken);
      setAuthState(refreshed);
      return request(path, init, false);
    } catch {
      clearAuthState();
      return res;
    }
  }
  return res;
}

export async function loginWithGoogle(token: string) {
  const res = await fetch(`${API_BASE}/auth/google`, { method: 'POST', headers: withClientHeaders(), body: JSON.stringify({ token }) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Google login failed'));
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
  return mapUser(data.user);
}

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: withClientHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Email/password login failed'));
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
  return mapUser(data.user);
}

export async function registerWithPassword(email: string, fullName: string, password: string, secretAnswer: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: withClientHeaders(),
    body: JSON.stringify({ email, fullName, password, secretAnswer }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Sign up failed'));
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
  return mapUser(data.user);
}

export async function resetPasswordWithSecret(email: string, secretAnswer: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/password-reset`, {
    method: 'POST',
    headers: withClientHeaders(),
    body: JSON.stringify({ email, secretAnswer, newPassword }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to reset password'));
}

export async function logout(): Promise<void> {
  const auth = getAuthState();
  try {
    if (auth?.refreshId) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: withClientHeaders(),
        body: JSON.stringify({ refreshId: auth.refreshId }),
      });
    }
  } finally {
    clearAuthState();
  }
}

async function refreshToken(refreshId: string, refreshToken: string): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: withClientHeaders(), body: JSON.stringify({ refreshId, refreshToken }) });
  if (!res.ok) throw new Error('Unable to refresh token');
  const data = await res.json();
  return { accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken };
}

export async function fetchMe(): Promise<UserProfile> {
  const res = await request('/users/me');
  if (!res.ok) throw new Error('Unable to fetch profile');
  const user = await res.json();
  return mapUser(user);
}

export async function fetchMyPublicProfile(): Promise<UserPublicProfile> {
  const res = await request('/users/me/public-profile');
  if (!res.ok) throw new Error('Unable to fetch public profile settings');
  return (await res.json()) as BackendUserPublicProfile;
}

export type UserAchievementKey =
  | 'seven_day_streak'
  | 'fourteen_day_warrior'
  | 'century_club'
  | 'first_session'
  | 'deep_work'
  | 'social_studier'
  | 'subject_master'
  | 'goal_crusher'
  | 'early_bird'
  | 'mock_master';

export interface UserAchievement {
  key: UserAchievementKey;
  earned: boolean;
  earnedAt?: string;
}

export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const res = await request('/users/me/achievements');
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to fetch achievements'));
  const data = (await res.json()) as { achievements: UserAchievement[] };
  return data.achievements;
}

/** Server-aggregated session stats (all-time + current week in `timezoneUsed`). */
export interface StudyStatsSummary {
  totalMinutes: number;
  totalSessions: number;
  avgSessionMinutes: number;
  longestSessionMinutes: number;
  avgMood: number;
  activeDistinctDays: number;
  weekMinutesCurrent: number;
  timezoneUsed: string;
}

export async function fetchMyStudyStats(tz?: string): Promise<StudyStatsSummary> {
  const q = tz ? `?tz=${encodeURIComponent(tz)}` : '';
  const res = await request(`/users/me/study-stats${q}`);
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to fetch study stats'));
  return (await res.json()) as StudyStatsSummary;
}

export async function patchMyPublicProfile(payload: {
  bio: string;
  location: string;
  education: string;
  occupation: string;
  targetExam: string;
  targetCollege: string;
}): Promise<UserPublicProfile> {
  const res = await request('/users/me/public-profile', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Unable to save public profile settings');
  return (await res.json()) as BackendUserPublicProfile;
}

/** Normalize GET/PATCH preferences JSON (handles snake_case fallbacks and loose types). */
function normalizePreferences(raw: unknown): UserPreferences {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (v: unknown, fallback: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  };
  const b = (v: unknown) => v === true || v === "true" || v === 1;
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

export async function fetchMyPreferences(): Promise<UserPreferences> {
  const res = await request('/users/me/preferences');
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to fetch preferences'));
  return normalizePreferences(await res.json());
}

export async function patchMyPreferences(payload: Omit<UserPreferences, 'userId'>): Promise<UserPreferences> {
  const res = await request('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to save preferences'));
  return normalizePreferences(await res.json());
}

export async function fetchMyPrivacy(): Promise<UserPrivacySettings> {
  const res = await request('/users/me/privacy');
  if (!res.ok) throw new Error('Unable to fetch privacy settings');
  return (await res.json()) as BackendUserPrivacy;
}

export async function patchMyPrivacy(payload: Omit<UserPrivacySettings, 'userId'>): Promise<UserPrivacySettings> {
  const res = await request('/users/me/privacy', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Unable to save privacy settings');
  return (await res.json()) as BackendUserPrivacy;
}

export async function fetchPublicProfile(username: string): Promise<PublicProfileView> {
  const res = await request(`/users/${encodeURIComponent(username)}/public-profile`);
  if (!res.ok) throw new Error('Unable to fetch public profile');
  return (await res.json()) as BackendPublicProfileView;
}

export async function fetchPublicProfileDetails(usernameOrId: string, page = 1, limit = 20): Promise<PublicProfileDetails> {
  const res = await request('/friends/friend-profile', { method: 'POST', body: JSON.stringify({ username: usernameOrId, page, limit }) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to fetch public profile details'));
  return (await res.json()) as BackendPublicProfileDetails;
}

export async function updateMe(payload: { fullName: string; username: string; phone: string; avatarUrl?: string }): Promise<UserProfile> {
  const res = await request('/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Unable to update profile');
  return mapUser(await res.json());
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await request('/sessions');
  if (!res.ok) throw new Error('Unable to fetch sessions');
  const sessions = await res.json();
  return sessions.map(mapSession);
}

export async function createSession(payload: Omit<Session, 'id'>): Promise<Session> {
  const startedAt = new Date(`${payload.date}T${payload.startTime}:00`).toISOString();
  const res = await request('/sessions', { method: 'POST', body: JSON.stringify({ subjectId: payload.subjectId, topic: payload.topic, durationMin: payload.duration, mood: String(payload.moodRating), startedAt }) });
  if (!res.ok) throw new Error('Unable to create session');
  return mapSession(await res.json());
}

export async function removeSession(id: string): Promise<void> {
  const res = await request(`/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Unable to delete session');
}

export async function updateSession(id: string, payload: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }): Promise<Session> {
  const startedAt = new Date(`${payload.date}T${payload.startTime}:00`).toISOString();
  const res = await request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      subjectId: payload.subjectId,
      topic: payload.topic,
      durationMin: payload.duration,
      mood: String(payload.moodRating),
      startedAt,
    }),
  });
  if (!res.ok) throw new Error('Unable to update session');
  return mapSession(await res.json());
}

export async function fetchGoals(): Promise<Goal[]> {
  const res = await request('/goals');
  if (!res.ok) throw new Error('Unable to fetch goals');
  const data = (await res.json()) as BackendGoal[] | null;
  if (!Array.isArray(data)) return [];
  return data.map(mapGoal);
}

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await request('/subjects');
  if (!res.ok) throw new Error('Unable to fetch subjects');
  const data = (await res.json()) as BackendSubject[];
  return data.map((s) => ({ id: s.id, name: s.name, color: s.color, icon: s.icon, createdAt: toLocalDateKey(new Date(s.createdAt)) }));
}

export async function createSubject(name: string, color: string): Promise<Subject> {
  const res = await request('/subjects', { method: 'POST', body: JSON.stringify({ name, color }) });
  if (!res.ok) throw new Error('Unable to create subject');
  const s = (await res.json()) as BackendSubject;
  return { id: s.id, name: s.name, color: s.color, icon: s.icon, createdAt: toLocalDateKey(new Date(s.createdAt)) };
}

export async function removeSubject(id: string): Promise<void> {
  const res = await request(`/subjects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Unable to delete subject');
}

export async function updateSubjectColor(id: string, color: string): Promise<Subject> {
  const res = await request(`/subjects/${id}`, { method: 'PATCH', body: JSON.stringify({ color }) });
  if (!res.ok) throw new Error('Unable to update subject color');
  const s = (await res.json()) as BackendSubject;
  return { id: s.id, name: s.name, color: s.color, icon: s.icon, createdAt: toLocalDateKey(new Date(s.createdAt)) };
}

export async function fetchTimerState(): Promise<TimerStatePayload | null> {
  const res = await request('/timer-state');
  if (!res.ok) throw new Error('Unable to fetch timer state');
  const data = (await res.json()) as { state?: TimerStatePayload | null };
  return data.state ?? null;
}

export async function startTimerFromServer(): Promise<number> {
  const res = await request('/timer-state/start', { method: 'POST' });
  if (!res.ok) throw new Error('Unable to start timer');
  const data = (await res.json()) as { startedAtMs?: number };
  if (typeof data.startedAtMs !== 'number') throw new Error('Invalid start time response');
  return data.startedAtMs;
}

export async function saveTimerState(state: TimerStatePayload): Promise<void> {
  const res = await request('/timer-state', { method: 'PUT', body: JSON.stringify({ state }) });
  if (!res.ok) throw new Error('Unable to save timer state');
}

export async function clearTimerState(): Promise<void> {
  const res = await request('/timer-state', { method: 'DELETE' });
  if (!res.ok) throw new Error('Unable to clear timer state');
}

export async function fetchDiscoverUsers(): Promise<FriendUser[]> {
  const res = await request('/friends/users');
  if (!res.ok) throw new Error('Unable to fetch users');
  return await res.json();
}

export async function fetchFriends(): Promise<UserProfile[]> {
  const res = await request('/friends');
  if (!res.ok) throw new Error('Unable to fetch friends');
  const users = await res.json();
  return users.map(mapUser);
}

export async function fetchIncomingFriendRequests(): Promise<FriendRequest[]> {
  const res = await request('/friends/requests/incoming');
  if (!res.ok) throw new Error('Unable to fetch incoming requests');
  return await res.json();
}

export async function fetchOutgoingFriendRequests(): Promise<FriendRequest[]> {
  const res = await request('/friends/requests/outgoing');
  if (!res.ok) throw new Error('Unable to fetch outgoing requests');
  return await res.json();
}

export async function sendFriendRequest(receiverId: string): Promise<void> {
  const res = await request('/friends/requests', { method: 'POST', body: JSON.stringify({ receiverId }) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to send friend request'));
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const res = await request(`/friends/requests/${requestId}/accept`, { method: 'POST' });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to accept request'));
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const res = await request(`/friends/requests/${requestId}/reject`, { method: 'POST' });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to reject request'));
}

export async function fetchFriendsLeaderboard(params?: {
  weekOffset?: number;
  fromIso?: string;
  toIso?: string;
}): Promise<LeaderboardEntry[]> {
  const query = new URLSearchParams();
  if (typeof params?.weekOffset === "number" && params.weekOffset !== 0) {
    query.set("weekOffset", String(params.weekOffset));
  }
  if (params?.fromIso) query.set("from", params.fromIso);
  if (params?.toIso) query.set("to", params.toIso);
  const qs = query.toString();
  const res = await request(`/friends/leaderboard${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error('Unable to fetch friends leaderboard');
  return await res.json();
}

export async function createFriendSession(payload: {
  friendIds: string[];
  subjectName: string;
  topic: string;
  perFriendPlans?: Array<{
    friendId: string;
    subjectName: string;
    topic: string;
  }>;
  durationMin: number;
  mood: string;
  startedAt: string;
}): Promise<void> {
  const res = await request('/friends/sessions', { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Unable to create friend session'));
}

export async function createOrUpdateGoal(targetHours: number): Promise<Goal> {
  const goals = await fetchGoals();
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 1);
  if (goals.length === 0) {
    const res = await request('/goals', { method: 'POST', body: JSON.stringify({ title: 'Monthly Study Goal', targetMinutes: Math.round(targetHours * 60), deadline: deadline.toISOString() }) });
    if (!res.ok) throw new Error('Unable to create goal');
    return mapGoal(await res.json());
  }
  const existing = goals[0];
  const res = await request(`/goals/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ title: 'Monthly Study Goal', targetMinutes: Math.round(targetHours * 60), deadline: deadline.toISOString() }) });
  if (!res.ok) throw new Error('Unable to update goal');
  return mapGoal(await res.json());
}

export async function fetchExamGoal(): Promise<ExamGoal | null> {
  const res = await request('/exam-goal');
  if (!res.ok) throw new Error('Unable to fetch exam goal');
  const data = (await res.json()) as { examGoal?: BackendExamGoal | null };
  if (!data.examGoal) return null;
  return mapExamGoal(data.examGoal);
}

export async function upsertExamGoal(name: string, dateIso: string): Promise<ExamGoal> {
  const examDate = new Date(`${dateIso}T00:00:00`).toISOString();
  const res = await request('/exam-goal', { method: 'PUT', body: JSON.stringify({ name, examDate }) });
  if (!res.ok) throw new Error('Unable to save exam goal');
  const data = (await res.json()) as { examGoal?: BackendExamGoal | null };
  if (!data.examGoal) throw new Error('Invalid exam goal response');
  return mapExamGoal(data.examGoal);
}

export async function deleteExamGoal(): Promise<void> {
  const res = await request('/exam-goal', { method: 'DELETE' });
  if (!res.ok) throw new Error('Unable to delete exam goal');
}

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
    startTime: `${started.getHours().toString().padStart(2, '0')}:${started.getMinutes().toString().padStart(2, '0')}`,
    endTime: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
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

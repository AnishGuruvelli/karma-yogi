import type { Goal, Session, Subject, UserProfile } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

type AuthState = { accessToken: string; refreshId: string; refreshToken: string };
type BackendUser = { id: string; email?: string; fullName?: string; name?: string; username?: string; phone?: string; avatarUrl?: string };
type BackendSession = { id: string; startedAt: string; durationMin: number; subject: string; mood?: string | number };
type BackendSessionV2 = { id: string; startedAt: string; durationMin: number; subjectId?: string; topic?: string; mood?: string | number };
type BackendGoal = { id: string; targetMinutes: number };
type BackendSubject = { id: string; name: string; color: string; icon?: string; createdAt: string };
const authKey = 'karma_auth';

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
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@karmayogi.local' }),
  });
  if (!res.ok) return;
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
}

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const auth = getAuthState();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(init.headers || {}) };
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
  const res = await fetch(`${API_BASE}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Google login failed'));
  const data = await res.json();
  setAuthState({ accessToken: data.accessToken, refreshId: data.refreshId, refreshToken: data.refreshToken });
  return mapUser(data.user);
}

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshId: auth.refreshId }),
      });
    }
  } finally {
    clearAuthState();
  }
}

async function refreshToken(refreshId: string, refreshToken: string): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshId, refreshToken }) });
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

export async function updateSession(id: string, payload: { topic: string; duration: number; date: string; startTime: string; moodRating: number }): Promise<Session> {
  const startedAt = new Date(`${payload.date}T${payload.startTime}:00`).toISOString();
  const res = await request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
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
  return data.map((s) => ({ id: s.id, name: s.name, color: s.color, icon: s.icon, createdAt: new Date(s.createdAt).toISOString().split('T')[0] }));
}

export async function createSubject(name: string, color: string): Promise<Subject> {
  const res = await request('/subjects', { method: 'POST', body: JSON.stringify({ name, color }) });
  if (!res.ok) throw new Error('Unable to create subject');
  const s = (await res.json()) as BackendSubject;
  return { id: s.id, name: s.name, color: s.color, icon: s.icon, createdAt: new Date(s.createdAt).toISOString().split('T')[0] };
}

export async function removeSubject(id: string): Promise<void> {
  const res = await request(`/subjects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Unable to delete subject');
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

function mapUser(raw: BackendUser): UserProfile {
  return {
    id: raw.id,
    email: raw.email || '',
    name: raw.fullName || raw.name || 'Karma Yogi User',
    username: raw.username || '',
    phone: raw.phone || '',
    currentStreak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
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
    date: started.toISOString().split('T')[0],
    moodRating: Number(raw.mood || 3),
    isManualLog: false,
  };
}

function mapGoal(raw: BackendGoal): Goal {
  return { id: raw.id, targetHours: Number(raw.targetMinutes || 0) / 60, currentProgress: 0 };
}

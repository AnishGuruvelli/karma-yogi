import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Subject, Session, Goal, UserProfile, ExamGoal, UserPreferences, UserPrivacySettings, UserPublicProfile } from '@/lib/types';
import { LoadingSplash } from '@/components/LoadingSplash';
import { createOrUpdateGoal, createSession, createSubject, deleteExamGoal, ensureDevAuth, fetchExamGoal, fetchGoals, fetchMe, fetchMyPreferences, fetchMyPrivacy, fetchMyPublicProfile, fetchSessions, fetchSubjects, patchMyPreferences, patchMyPrivacy, patchMyPublicProfile, removeSession, removeSubject, updateMe, updateSession, updateSubjectColor as patchSubjectColor, upsertExamGoal } from '@/lib/api';
import { currentStreakUntilToday } from '@/lib/stats';
import { toLocalDateKey } from '@/lib/date';

const THEME_MODE_STORAGE_KEY = 'karma_theme_mode';

/** Local clock: evening/night → dark (18:00–05:59), daytime → light. */
function inferDarkModeFromLocalTime(): boolean {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

function readInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return inferDarkModeFromLocalTime();
  } catch {
    return inferDarkModeFromLocalTime();
  }
}

interface TimerState {
  isRunning: boolean;
  elapsed: number;
  subjectId: string | null;
  topic: string;
}

export type ThemeName = "sky" | "honey" | "forest" | "blossom" | "ember";

interface StoreContextType {
  subjects: Subject[];
  sessions: Session[];
  goal: Goal;
  user: UserProfile;
  timer: TimerState;
  addSubject: (name: string, color: string) => Promise<Subject | null>;
  updateSubjectColor: (id: string, color: string) => Promise<boolean>;
  deleteSubject: (id: string) => void;
  addSession: (session: Omit<Session, 'id'>) => void;
  deleteSession: (id: string) => void;
  editSession: (id: string, changes: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }) => Promise<boolean>;
  updateGoal: (targetHours: number) => void;
  startTimer: (subjectId: string, topic: string) => void;
  stopTimer: () => Session | null;
  resetTimer: () => void;
  getSubject: (id: string) => Subject | undefined;
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  examGoal: ExamGoal | null;
  setExamGoal: (name: string, date: string) => Promise<void>;
  clearExamGoal: () => Promise<void>;
  updateUserProfile: (payload: { name: string; username: string; phone: string }) => Promise<void>;
  reloadStoreData: () => Promise<void>;
  /** True while initial or explicit store refresh (parallel /users + data APIs) is in flight. */
  dataLoading: boolean;
  /** Wrap saves + refetches so the loading splash covers the whole sequence (nested with reloadStoreData is OK). */
  wrapWithDataLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  profileMeta: UserPublicProfile;
  preferences: UserPreferences;
  privacy: UserPrivacySettings;
  saveProfileMeta: (payload: Omit<UserPublicProfile, 'userId'>) => Promise<void>;
  savePreferences: (payload: Omit<UserPreferences, 'userId'>) => Promise<UserPreferences>;
  savePrivacy: (payload: Omit<UserPrivacySettings, 'userId'>) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goal, setGoal] = useState<Goal>({ id: 'default', targetHours: 20, currentProgress: 0 });
  const [user, setUser] = useState<UserProfile>({ id: 'anon', email: '', name: 'Guest', username: '', phone: '', currentStreak: 0, lastActiveDate: toLocalDateKey(new Date()) });
  const [isDark, setIsDark] = useState(readInitialDarkMode);
  const [theme, setThemeState] = useState<ThemeName>("blossom");
  const [examGoal, setExamGoalState] = useState<ExamGoal | null>(null);
  const [timer, setTimer] = useState<TimerState>({ isRunning: false, elapsed: 0, subjectId: null, topic: '' });
  const [profileMeta, setProfileMeta] = useState<UserPublicProfile>({ userId: '', bio: '', location: '', education: '', occupation: '', targetExam: '', targetCollege: '' });
  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: '', preferredStudyTime: '', defaultSessionMinutes: 50, breakMinutes: 10, pomodoroCycles: 4, studyLevel: '', weeklyGoalHours: 20,
    emailNotifications: true, pushNotifications: true, reminderNotifications: true, marketingNotifications: false,
    showStrategyPage: false,
  });
  const [privacy, setPrivacy] = useState<UserPrivacySettings>({ userId: '', profilePublic: true, showStats: true, showLeaderboard: true });
  const [dataLoadCount, setDataLoadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<Date | null>(null);

  const wrapWithDataLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setDataLoadCount((n) => n + 1);
    try {
      return await fn();
    } finally {
      setDataLoadCount((n) => Math.max(0, n - 1));
    }
  }, []);

  const reloadStoreData = useCallback(async () => {
    setDataLoadCount((n) => n + 1);
    try {
      await ensureDevAuth();
      const [me, subs, sess, goals, examGoalRes, publicProfileRes, preferencesRes, privacyRes] = await Promise.allSettled([
        fetchMe(), fetchSubjects(), fetchSessions(), fetchGoals(), fetchExamGoal(), fetchMyPublicProfile(), fetchMyPreferences(), fetchMyPrivacy(),
      ]);
      if (me.status === 'fulfilled') setUser(me.value);
      if (subs.status === 'fulfilled') setSubjects(subs.value);
      if (sess.status === 'fulfilled') {
        setSessions(sess.value);
        setGoal((prev) => ({ ...prev, currentProgress: +(sess.value.reduce((a, s) => a + s.duration, 0) / 60).toFixed(1) }));
        setUser((prev) => ({ ...prev, currentStreak: currentStreakUntilToday(sess.value) }));
      }
      if (goals.status === 'fulfilled' && goals.value.length > 0) {
        setGoal((prev) => ({ ...prev, ...goals.value[0] }));
      }
      if (examGoalRes.status === 'fulfilled') {
        setExamGoalState(examGoalRes.value);
      }
      if (publicProfileRes.status === 'fulfilled') setProfileMeta(publicProfileRes.value);
      if (preferencesRes.status === 'fulfilled') setPreferences(preferencesRes.value);
      if (privacyRes.status === 'fulfilled') setPrivacy(privacyRes.value);
    } finally {
      setDataLoadCount((n) => Math.max(0, n - 1));
    }
  }, []);

  useEffect(() => {
    void reloadStoreData();
  }, [reloadStoreData]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('karma_theme_name');
    if (savedTheme && ['sky', 'honey', 'forest', 'blossom', 'ember'].includes(savedTheme)) {
      setThemeState(savedTheme as ThemeName);
    }
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement.classList;
    root.remove('theme-sky', 'theme-honey', 'theme-forest', 'theme-blossom', 'theme-ember');
    root.add(`theme-${theme}`);
    localStorage.setItem('karma_theme_name', theme);
  }, [theme]);

  useEffect(() => {
    if (timer.isRunning) {
      timerRef.current = setInterval(() => setTimer((prev) => ({ ...prev, elapsed: prev.elapsed + 1 })), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timer.isRunning]);

  const addSubject = useCallback(async (name: string, color: string): Promise<Subject | null> => {
    try {
      const created = await createSubject(name, color);
      setSubjects((prev) => [created, ...prev]);
      return created;
    } catch {
      return null;
    }
  }, []);

  const deleteSubject = useCallback((id: string) => {
    void removeSubject(id).then(async () => {
      // Optimistic UI: remove now so the Data page updates instantly.
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setSessions((prev) => prev.filter((s) => s.subjectId !== id));

      // Authoritative UI: refetch sessions after cascade delete in the DB.
      try {
        const latest = await fetchSessions();
        setSessions(latest);
        setUser((prev) => ({ ...prev, currentStreak: currentStreakUntilToday(latest) }));
      } catch {
        // If refetch fails, the optimistic filter above still keeps the UI consistent.
      }
    });
  }, []);

  const updateSubjectColor = useCallback(async (id: string, color: string): Promise<boolean> => {
    try {
      const updated = await patchSubjectColor(id, color);
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, color: updated.color } : s)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const addSession = useCallback((session: Omit<Session, 'id'>) => {
    void createSession(session).then((created) => {
      setSessions((prev) => {
        const next = [created, ...prev];
        setUser((u) => ({ ...u, currentStreak: currentStreakUntilToday(next) }));
        return next;
      });
      setGoal((prev) => ({ ...prev, currentProgress: +(prev.currentProgress + session.duration / 60).toFixed(1) }));
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    void removeSession(id).then(() => setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setUser((u) => ({ ...u, currentStreak: currentStreakUntilToday(next) }));
      return next;
    }));
  }, []);

  const editSession = useCallback(async (id: string, changes: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }): Promise<boolean> => {
    try {
      const updated = await updateSession(id, changes);
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updated } : s));
        setUser((u) => ({ ...u, currentStreak: currentStreakUntilToday(next) }));
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateGoal = useCallback((targetHours: number) => {
    void createOrUpdateGoal(targetHours).then((updated) => setGoal((prev) => ({ ...prev, ...updated })));
  }, []);

  const startTimer = useCallback((subjectId: string, topic: string) => {
    timerStartRef.current = new Date();
    setTimer({ isRunning: true, elapsed: 0, subjectId, topic });
  }, []);

  const stopTimer = useCallback((): Session | null => {
    if (!timer.subjectId || !timerStartRef.current) return null;
    const duration = Math.round(timer.elapsed / 60);
    if (duration < 1) {
      setTimer({ isRunning: false, elapsed: 0, subjectId: null, topic: '' });
      return null;
    }
    const now = new Date();
    const startTime = timerStartRef.current;
    const session: Omit<Session, 'id'> = {
      subjectId: timer.subjectId,
      topic: timer.topic,
      duration,
      startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      date: toLocalDateKey(now),
      moodRating: 3,
      isManualLog: false,
    };
    addSession(session);
    const newSession = { ...session, id: `sess${Date.now()}` };
    setTimer({ isRunning: false, elapsed: 0, subjectId: null, topic: '' });
    timerStartRef.current = null;
    return newSession;
  }, [timer, addSession]);

  const resetTimer = useCallback(() => {
    setTimer({ isRunning: false, elapsed: 0, subjectId: null, topic: '' });
    timerStartRef.current = null;
  }, []);

  const getSubject = useCallback((id: string) => subjects.find((s) => s.id === id), [subjects]);
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  }, []);
  const setTheme = useCallback((nextTheme: ThemeName) => setThemeState(nextTheme), []);
  const setExamGoal = useCallback(async (name: string, date: string) => {
    const saved = await upsertExamGoal(name, date);
    setExamGoalState(saved);
  }, []);
  const clearExamGoal = useCallback(async () => {
    await deleteExamGoal();
    setExamGoalState(null);
  }, []);
  const updateUserProfile = useCallback(async (payload: { name: string; username: string; phone: string }) => {
    const updated = await updateMe({ fullName: payload.name, username: payload.username, phone: payload.phone });
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);
  const saveProfileMeta = useCallback(async (payload: Omit<UserPublicProfile, 'userId'>) => {
    const updated = await patchMyPublicProfile(payload);
    setProfileMeta(updated);
  }, []);
  const savePreferences = useCallback(async (payload: Omit<UserPreferences, 'userId'>) => {
    const updated = await patchMyPreferences(payload);
    setPreferences(updated);
    return updated;
  }, []);
  const savePrivacy = useCallback(async (payload: Omit<UserPrivacySettings, 'userId'>) => {
    const updated = await patchMyPrivacy(payload);
    setPrivacy(updated);
  }, []);

  const dataLoading = dataLoadCount > 0;

  return (
    <StoreContext.Provider value={{
      subjects, sessions, goal, user, timer,
      addSubject, deleteSubject, addSession, deleteSession,
      updateSubjectColor,
      updateGoal, startTimer, stopTimer, resetTimer, getSubject, editSession,
      isDark, toggleTheme, theme, setTheme, examGoal, setExamGoal, clearExamGoal, updateUserProfile, reloadStoreData,
      dataLoading, wrapWithDataLoading,
      profileMeta, preferences, privacy, saveProfileMeta, savePreferences, savePrivacy,
    }}>
      <LoadingSplash open={dataLoading} />
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

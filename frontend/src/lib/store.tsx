import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Subject, Session, Goal, UserProfile } from '@/lib/types';
import { createOrUpdateGoal, createSession, createSubject, ensureDevAuth, fetchGoals, fetchMe, fetchSessions, fetchSubjects, removeSession, removeSubject, updateMe, updateSession, updateSubjectColor as patchSubjectColor } from '@/lib/api';
import { currentStreakUntilToday } from '@/lib/stats';
import { toLocalDateKey } from '@/lib/date';

interface TimerState {
  isRunning: boolean;
  elapsed: number;
  subjectId: string | null;
  topic: string;
}

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
  updateUserProfile: (payload: { name: string; username: string; phone: string }) => Promise<void>;
  reloadStoreData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goal, setGoal] = useState<Goal>({ id: 'default', targetHours: 20, currentProgress: 0 });
  const [user, setUser] = useState<UserProfile>({ id: 'anon', email: '', name: 'Guest', username: '', phone: '', currentStreak: 0, lastActiveDate: toLocalDateKey(new Date()) });
  const [isDark, setIsDark] = useState(false);
  const [timer, setTimer] = useState<TimerState>({ isRunning: false, elapsed: 0, subjectId: null, topic: '' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<Date | null>(null);

  const reloadStoreData = useCallback(async () => {
    await ensureDevAuth();
    const [me, subs, sess, goals] = await Promise.allSettled([fetchMe(), fetchSubjects(), fetchSessions(), fetchGoals()]);
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
  }, []);

  useEffect(() => {
    void reloadStoreData();
  }, [reloadStoreData]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

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
  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);
  const updateUserProfile = useCallback(async (payload: { name: string; username: string; phone: string }) => {
    const updated = await updateMe({ fullName: payload.name, username: payload.username, phone: payload.phone });
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <StoreContext.Provider value={{
      subjects, sessions, goal, user, timer,
      addSubject, deleteSubject, addSession, deleteSession,
      updateSubjectColor,
      updateGoal, startTimer, stopTimer, resetTimer, getSubject, editSession,
      isDark, toggleTheme, updateUserProfile, reloadStoreData,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { FullMock, QotdEntry, SectionalTest, Subject, Session, Goal, UserProfile, ExamGoal, UserPreferences, UserPrivacySettings, UserPublicProfile } from '@/lib/types';
import { LoadingSplash } from '@/components/LoadingSplash';
import { toast } from 'sonner';
import { createFullMock, createOrUpdateGoal, createQotdEntry, createSectional, createSession, createSubject, deleteExamGoal, ensureDevAuth, fetchExamGoal, fetchFullMocks, fetchGoals, fetchMe, fetchMyPreferences, fetchMyPrivacy, fetchMyPublicProfile, fetchQotdEntries, fetchSectionals, fetchSessions, fetchSubjects, patchMyPreferences, patchMyPrivacy, patchMyPublicProfile, removeFullMock, removeQotdEntry, removeSession, removeSectional, removeSubject, updateFullMock, updateMe, updateQotdEntry, updateSectional, updateSession, updateSubjectColor as patchSubjectColor, updateSubject as patchSubject, upsertExamGoal } from '@/lib/api';
import { currentStreakUntilToday } from '@/lib/stats';
import { toLocalDateKey } from '@/lib/date';

const THEME_MODE_STORAGE_KEY = 'karma_theme_mode';

function readInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false; // default: light mode
  } catch {
    return false;
  }
}

/** Returns the colour theme suited to the current hour. */
function inferThemeFromLocalTime(): ThemeName {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'honey';  // morning  → yellow
  if (h >= 12 && h < 18) return 'sky';   // afternoon → blue
  return 'forest';                         // night     → green
}

export type ThemeName = "sky" | "honey" | "forest" | "blossom";

interface StoreContextType {
  subjects: Subject[];
  sessions: Session[];
  goal: Goal;
  user: UserProfile;
  addSubject: (name: string, color: string) => Promise<Subject | null>;
  updateSubjectColor: (id: string, color: string) => Promise<boolean>;
  updateSubject: (id: string, name: string, color: string, icon: string) => Promise<boolean>;
  deleteSubject: (id: string) => void;
  addSession: (session: Omit<Session, 'id'>) => Promise<boolean>;
  deleteSession: (id: string) => void;
  editSession: (id: string, changes: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }) => Promise<boolean>;
  updateGoal: (targetHours: number) => Promise<void>;
  getSubject: (id: string) => Subject | undefined;
  isDark: boolean;
  toggleTheme: () => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  examGoal: ExamGoal | null;
  setExamGoal: (name: string, date: string) => Promise<void>;
  clearExamGoal: () => Promise<void>;
  updateUserProfile: (payload: { name: string; username: string; phone: string }) => Promise<void>;
  reloadStoreData: (force?: boolean) => Promise<void>;
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
  // Mocks
  fullMocks: FullMock[];
  sectionalTests: SectionalTest[];
  qotdEntries: QotdEntry[];
  addFullMock: (payload: Omit<FullMock, 'id' | 'userId' | 'createdAt'>) => Promise<FullMock | null>;
  editFullMock: (id: string, payload: Omit<FullMock, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
  deleteFullMock: (id: string) => void;
  addSectional: (payload: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>) => Promise<SectionalTest | null>;
  editSectional: (id: string, payload: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
  deleteSectional: (id: string) => void;
  addQotdEntry: (payload: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>) => Promise<QotdEntry | null>;
  editQotdEntry: (id: string, payload: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
  deleteQotdEntry: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goal, setGoal] = useState<Goal>({ id: 'default', targetHours: 20, currentProgress: 0 });
  const [user, setUser] = useState<UserProfile>({ id: 'anon', email: '', name: 'Guest', username: '', phone: '', currentStreak: 0, lastActiveDate: toLocalDateKey(new Date()) });
  const [isDark, setIsDark] = useState(readInitialDarkMode);
  const [theme, setThemeState] = useState<ThemeName>(inferThemeFromLocalTime);
  const [examGoal, setExamGoalState] = useState<ExamGoal | null>(null);
  const [profileMeta, setProfileMeta] = useState<UserPublicProfile>({ userId: '', bio: '', location: '', education: '', occupation: '', targetExam: '', targetCollege: '' });
  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: '', preferredStudyTime: '', defaultSessionMinutes: 50, breakMinutes: 10, pomodoroCycles: 4, studyLevel: '', weeklyGoalHours: 20,
    emailNotifications: true, pushNotifications: true, reminderNotifications: true, marketingNotifications: false,
    showStrategyPage: false,
  });
  const [privacy, setPrivacy] = useState<UserPrivacySettings>({ userId: '', profilePublic: true, showStats: true, showLeaderboard: true });
  const [fullMocks, setFullMocks] = useState<FullMock[]>([]);
  const [sectionalTests, setSectionalTests] = useState<SectionalTest[]>([]);
  const [qotdEntries, setQotdEntries] = useState<QotdEntry[]>([]);
  const [dataLoadCount, setDataLoadCount] = useState(0);
  const lastReloadRef = useRef<number>(0);

  const wrapWithDataLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setDataLoadCount((n) => n + 1);
    try {
      return await fn();
    } finally {
      setDataLoadCount((n) => Math.max(0, n - 1));
    }
  }, []);

  const reloadStoreData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastReloadRef.current < 5000) return;
    lastReloadRef.current = now;
    setDataLoadCount((n) => n + 1);
    try {
      await ensureDevAuth();
      const [me, subs, sess, goals, examGoalRes, publicProfileRes, preferencesRes, privacyRes, mocksRes, sectionalsRes, qotdRes] = await Promise.allSettled([
        fetchMe(), fetchSubjects(), fetchSessions(), fetchGoals(), fetchExamGoal(), fetchMyPublicProfile(), fetchMyPreferences(), fetchMyPrivacy(),
        fetchFullMocks(), fetchSectionals(), fetchQotdEntries(),
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
      if (mocksRes.status === 'fulfilled') setFullMocks(mocksRes.value);
      if (sectionalsRes.status === 'fulfilled') setSectionalTests(sectionalsRes.value);
      if (qotdRes.status === 'fulfilled') setQotdEntries(qotdRes.value);
    } finally {
      setDataLoadCount((n) => Math.max(0, n - 1));
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
    const root = document.documentElement.classList;
    root.remove('theme-sky', 'theme-honey', 'theme-forest', 'theme-blossom');
    root.add(`theme-${theme}`);
  }, [theme]);

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
    // Optimistic: remove immediately for instant UI feedback.
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSessions((prev) => prev.filter((s) => s.subjectId !== id));
    void removeSubject(id)
      .then(async () => {
        // Authoritative sync: refetch sessions after cascade delete in DB.
        try {
          const latest = await fetchSessions();
          setSessions(latest);
          setUser((prev) => ({ ...prev, currentStreak: currentStreakUntilToday(latest) }));
        } catch {
          // Optimistic filter still keeps UI consistent if refetch fails.
        }
      })
      .catch(() => {
        // Rollback: restore subjects and sessions from server.
        void Promise.all([fetchSubjects(), fetchSessions()])
          .then(([subs, sess]) => {
            setSubjects(subs);
            setSessions(sess);
          })
          .catch(() => {});
        toast.error("Couldn't delete subject. Please try again.");
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

  const updateSubject = useCallback(async (id: string, name: string, color: string, icon: string): Promise<boolean> => {
    try {
      const updated = await patchSubject(id, name, color, icon);
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, name: updated.name, color: updated.color, icon: updated.icon } : s)));
      return true;
    } catch {
      toast.error("Couldn't update subject. Please try again.");
      return false;
    }
  }, []);

  const addSession = useCallback(async (session: Omit<Session, 'id'>): Promise<boolean> => {
    try {
      const created = await createSession(session);
      setSessions((prev) => {
        const next = [created, ...prev];
        setUser((u) => ({ ...u, currentStreak: currentStreakUntilToday(next) }));
        return next;
      });
      setGoal((prev) => ({ ...prev, currentProgress: +(prev.currentProgress + session.duration / 60).toFixed(1) }));
      return true;
    } catch {
      toast.error("Session couldn't be saved. Please try again.");
      return false;
    }
  }, []);

  const deleteSession = useCallback((id: string) => {
    // Optimistic: remove immediately so the UI updates without waiting.
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setUser((u) => ({ ...u, currentStreak: currentStreakUntilToday(next) }));
      return next;
    });
    void removeSession(id).catch(() => {
      // Rollback: restore from server.
      void fetchSessions()
        .then((latest) => {
          setSessions(latest);
          setUser((prev) => ({ ...prev, currentStreak: currentStreakUntilToday(latest) }));
        })
        .catch(() => {});
      toast.error("Couldn't delete session. It has been restored.");
    });
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

  const updateGoal = useCallback(async (targetHours: number) => {
    try {
      const updated = await createOrUpdateGoal(targetHours);
      setGoal((prev) => ({ ...prev, ...updated }));
    } catch {
      toast.error("Couldn't update goal. Please try again.");
    }
  }, []);

  const addFullMock = useCallback(async (payload: Omit<FullMock, 'id' | 'userId' | 'createdAt'>): Promise<FullMock | null> => {
    try {
      const created = await createFullMock(payload);
      setFullMocks((prev) => [created, ...prev]);
      // Reload sessions since backend auto-creates a session for test duration
      if (payload.durationMin && payload.durationMin > 0) {
        try { const latest = await fetchSessions(); setSessions(latest); } catch { /* best-effort */ }
      }
      return created;
    } catch {
      toast.error("Couldn't save mock test. Please try again.");
      return null;
    }
  }, []);

  const editFullMock = useCallback(async (id: string, payload: Omit<FullMock, 'id' | 'userId' | 'createdAt'>): Promise<boolean> => {
    try {
      const updated = await updateFullMock(id, payload);
      setFullMocks((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return true;
    } catch {
      toast.error("Couldn't update mock test. Please try again.");
      return false;
    }
  }, []);

  const deleteFullMock = useCallback((id: string) => {
    setFullMocks((prev) => prev.filter((m) => m.id !== id));
    void removeFullMock(id).catch(() => {
      void fetchFullMocks().then(setFullMocks).catch(() => {});
      toast.error("Couldn't delete mock test. It has been restored.");
    });
  }, []);

  const addSectional = useCallback(async (payload: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>): Promise<SectionalTest | null> => {
    try {
      const created = await createSectional(payload);
      setSectionalTests((prev) => [created, ...prev]);
      if (payload.durationMin && payload.durationMin > 0) {
        try { const latest = await fetchSessions(); setSessions(latest); } catch { /* best-effort */ }
      }
      return created;
    } catch {
      toast.error("Couldn't save sectional test. Please try again.");
      return null;
    }
  }, []);

  const editSectional = useCallback(async (id: string, payload: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>): Promise<boolean> => {
    try {
      const updated = await updateSectional(id, payload);
      setSectionalTests((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return true;
    } catch {
      toast.error("Couldn't update sectional test. Please try again.");
      return false;
    }
  }, []);

  const deleteSectional = useCallback((id: string) => {
    setSectionalTests((prev) => prev.filter((s) => s.id !== id));
    void removeSectional(id).catch(() => {
      void fetchSectionals().then(setSectionalTests).catch(() => {});
      toast.error("Couldn't delete sectional test. It has been restored.");
    });
  }, []);

  const addQotdEntry = useCallback(async (payload: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>): Promise<QotdEntry | null> => {
    try {
      const created = await createQotdEntry(payload);
      setQotdEntries((prev) => [created, ...prev]);
      return created;
    } catch {
      toast.error("Couldn't save QOTD entry. Please try again.");
      return null;
    }
  }, []);

  const editQotdEntry = useCallback(async (id: string, payload: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>): Promise<boolean> => {
    try {
      const updated = await updateQotdEntry(id, payload);
      setQotdEntries((prev) => prev.map((e) => e.id === id ? updated : e));
      return true;
    } catch {
      toast.error("Couldn't update QOTD entry. Please try again.");
      return false;
    }
  }, []);

  const deleteQotdEntry = useCallback((id: string) => {
    setQotdEntries((prev) => prev.filter((e) => e.id !== id));
    void removeQotdEntry(id).catch(() => {
      void fetchQotdEntries().then(setQotdEntries).catch(() => {});
      toast.error("Couldn't delete QOTD entry. It has been restored.");
    });
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
      subjects, sessions, goal, user,
      addSubject, deleteSubject, addSession, deleteSession, updateSubject,
      updateSubjectColor,
      updateGoal, getSubject, editSession,
      isDark, toggleTheme, theme, setTheme, examGoal, setExamGoal, clearExamGoal, updateUserProfile, reloadStoreData,
      dataLoading, wrapWithDataLoading,
      profileMeta, preferences, privacy, saveProfileMeta, savePreferences, savePrivacy,
      fullMocks, sectionalTests, qotdEntries,
      addFullMock, editFullMock, deleteFullMock,
      addSectional, editSectional, deleteSectional,
      addQotdEntry, editQotdEntry, deleteQotdEntry,
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

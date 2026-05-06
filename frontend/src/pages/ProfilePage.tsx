import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Flame, Trophy, Clock, Target, BookOpen, Users, Calendar, TrendingUp, Award, Zap, Bell, Globe, Mail, Phone, MapPin,
  Briefcase, GraduationCap, Edit3, Settings, Shield, Download, Share2, Star, CheckCircle2, Sparkles, AtSign, Check, X, ChevronRight, User as User2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchFriends, fetchMyAchievements, fetchMyStudyStats, type UserAchievementKey, type StudyStatsSummary } from "@/lib/api";
import { useStore } from "@/lib/store";
import { UserAvatar } from "@/components/UserAvatar";
import { Switch } from "@/components/ui/switch";

const accent = {
  cyan: { fg: "var(--neon-cyan)", tint: "color-mix(in oklch, var(--neon-cyan) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-cyan) 30%, transparent)" },
  green: { fg: "var(--neon-green)", tint: "color-mix(in oklch, var(--neon-green) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-green) 30%, transparent)" },
  orange: { fg: "var(--neon-orange)", tint: "color-mix(in oklch, var(--neon-orange) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-orange) 30%, transparent)" },
  pink: { fg: "var(--neon-pink)", tint: "color-mix(in oklch, var(--neon-pink) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-pink) 30%, transparent)" },
  purple: { fg: "var(--neon-purple)", tint: "color-mix(in oklch, var(--neon-purple) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-purple) 30%, transparent)" },
} as const;
type AccentKey = keyof typeof accent;

export default function ProfilePage() {
  const { user, sessions, subjects, goal, updateUserProfile, profileMeta, preferences, privacy, saveProfileMeta, savePreferences, savePrivacy, reloadStoreData, dataLoading, wrapWithDataLoading } = useStore();
  const [tab, setTab] = useState<"overview" | "achievements" | "account" | "preferences">("overview");
  const [studyPrefsEditing, setStudyPrefsEditing] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [achByKey, setAchByKey] = useState<Partial<Record<UserAchievementKey, { earned: boolean; earnedAt?: string }>>>({});
  const [studyStats, setStudyStats] = useState<StudyStatsSummary | null>(null);
  const browserTz = useMemo(() => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"), []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: user.name, username: user.username, email: user.email, phone: user.phone });
  const [profileDraft, setProfileDraft] = useState({ bio: profileMeta.bio, location: profileMeta.location, education: profileMeta.education, occupation: profileMeta.occupation, targetExam: profileMeta.targetExam, targetCollege: profileMeta.targetCollege });
  const [prefDraft, setPrefDraft] = useState({
    preferredStudyTime: preferences.preferredStudyTime,
    defaultSessionMinutes: preferences.defaultSessionMinutes,
    breakMinutes: preferences.breakMinutes,
    pomodoroCycles: preferences.pomodoroCycles,
    studyLevel: preferences.studyLevel,
    weeklyGoalHours: preferences.weeklyGoalHours,
    emailNotifications: preferences.emailNotifications,
    pushNotifications: preferences.pushNotifications,
    reminderNotifications: preferences.reminderNotifications,
    marketingNotifications: preferences.marketingNotifications,
    showStrategyPage: preferences.showStrategyPage,
  });
  const [privacyDraft, setPrivacyDraft] = useState({
    profilePublic: privacy.profilePublic,
    showStats: privacy.showStats,
    showLeaderboard: privacy.showLeaderboard,
  });
  useEffect(() => {
    void fetchFriends().then((friends) => setFriendCount(friends.length)).catch(() => setFriendCount(0));
  }, []);

  useEffect(() => {
    void fetchMyAchievements()
      .then((rows) => {
        const next: Partial<Record<UserAchievementKey, { earned: boolean; earnedAt?: string }>> = {};
        for (const r of rows) {
          next[r.key] = { earned: r.earned, earnedAt: r.earnedAt };
        }
        setAchByKey(next);
      })
      .catch(() => setAchByKey({}));
  }, [user.id, sessions.length]);

  useEffect(() => {
    void fetchMyStudyStats(browserTz)
      .then(setStudyStats)
      .catch(() => setStudyStats(null));
  }, [user.id, sessions.length, browserTz]);

  useEffect(() => {
    if (!editing) setDraft({ name: user.name, username: user.username, email: user.email, phone: user.phone });
  }, [editing, user]);
  useEffect(() => {
    setProfileDraft({ bio: profileMeta.bio, location: profileMeta.location, education: profileMeta.education, occupation: profileMeta.occupation, targetExam: profileMeta.targetExam, targetCollege: profileMeta.targetCollege });
  }, [profileMeta]);
  useEffect(() => {
    setPrefDraft({
      preferredStudyTime: preferences.preferredStudyTime,
      defaultSessionMinutes: preferences.defaultSessionMinutes,
      breakMinutes: preferences.breakMinutes,
      pomodoroCycles: preferences.pomodoroCycles,
      studyLevel: preferences.studyLevel,
      weeklyGoalHours: preferences.weeklyGoalHours,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      reminderNotifications: preferences.reminderNotifications,
      marketingNotifications: preferences.marketingNotifications,
      showStrategyPage: preferences.showStrategyPage,
    });
  }, [preferences]);
  useEffect(() => {
    setPrivacyDraft({
      profilePublic: privacy.profilePublic,
      showStats: privacy.showStats,
      showLeaderboard: privacy.showLeaderboard,
    });
  }, [privacy]);

  const totalMinutes = sessions.reduce((sum, item) => sum + item.duration, 0);
  const totalSessions = sessions.length;
  const avgSession = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;
  const longestSession = sessions.reduce((max, item) => Math.max(max, item.duration), 0);
  const activeDays = new Set(sessions.map((item) => item.date)).size;
  const currentStreak = user.currentStreak;
  const maxStreak = Math.max(user.currentStreak, 25);

  const today = new Date();
  const startOfWeek = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  startOfWeek.setDate(today.getDate() - daysSinceMonday);
  const startOfWeekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
  const weekMins = sessions
    .filter((item) => item.date >= startOfWeekKey && item.date <= `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`)
    .reduce((sum, item) => sum + item.duration, 0);
  const weekHoursClient = weekMins / 60;

  const subjectStats = useMemo(
    () =>
      subjects
        .map((subject) => {
          const subjectSessions = sessions.filter((item) => item.subjectId === subject.id);
          const mins = subjectSessions.reduce((sum, item) => sum + item.duration, 0);
          return { ...subject, mins, count: subjectSessions.length, pct: totalMinutes ? (mins / totalMinutes) * 100 : 0 };
        })
        .sort((a, b) => b.mins - a.mins),
    [subjects, sessions, totalMinutes],
  );
  const topSubject = subjectStats[0];
  const moodDist = sessions.reduce((acc, item) => {
    acc[item.moodRating] = (acc[item.moodRating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const avgMood = sessions.length ? (sessions.reduce((sum, item) => sum + item.moodRating, 0) / sessions.length).toFixed(1) : "0";

  /** Server-authoritative aggregates when study-stats loads; client session list as fallback. */
  const snapTotalMin = studyStats?.totalMinutes ?? totalMinutes;
  const snapSessions = studyStats?.totalSessions ?? totalSessions;
  const snapAvgSession = studyStats?.avgSessionMinutes ?? avgSession;
  const snapLongest = studyStats?.longestSessionMinutes ?? longestSession;
  const snapAvgMoodStr = studyStats != null && Number.isFinite(studyStats.avgMood) ? studyStats.avgMood.toFixed(1) : avgMood;
  const weekHours = studyStats != null ? studyStats.weekMinutesCurrent / 60 : weekHoursClient;
  const totalHours = snapTotalMin / 60;
  const formatMinutesAsDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const formatAchievementDate = (iso: string | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const achievements: Array<{ id: number; icon: LucideIcon; title: string; desc: string; earned: boolean; color: AccentKey; date: string }> = useMemo(() => {
    const row = (key: UserAchievementKey) => achByKey[key];
    return [
      { id: 1, icon: Flame, title: "7-Day Streak", desc: "Studied 7 days in a row", earned: row("seven_day_streak")?.earned ?? false, color: "orange", date: formatAchievementDate(row("seven_day_streak")?.earnedAt) },
      { id: 2, icon: Flame, title: "14-Day Warrior", desc: "Two weeks of consistency", earned: row("fourteen_day_warrior")?.earned ?? false, color: "pink", date: formatAchievementDate(row("fourteen_day_warrior")?.earnedAt) },
      { id: 3, icon: Clock, title: "Century Club", desc: "Logged 100+ hours total", earned: row("century_club")?.earned ?? false, color: "cyan", date: formatAchievementDate(row("century_club")?.earnedAt) },
      { id: 4, icon: Trophy, title: "First Session", desc: "Logged your first session", earned: row("first_session")?.earned ?? false, color: "green", date: formatAchievementDate(row("first_session")?.earnedAt) },
      { id: 5, icon: Zap, title: "Deep Work", desc: "Single session over 2 hours", earned: row("deep_work")?.earned ?? false, color: "purple", date: formatAchievementDate(row("deep_work")?.earnedAt) },
      { id: 6, icon: Users, title: "Social Studier", desc: "Added 3+ friends", earned: row("social_studier")?.earned ?? false, color: "cyan", date: formatAchievementDate(row("social_studier")?.earnedAt) },
      { id: 7, icon: BookOpen, title: "Subject Master", desc: "Studied 3+ subjects", earned: row("subject_master")?.earned ?? false, color: "green", date: formatAchievementDate(row("subject_master")?.earnedAt) },
      { id: 8, icon: Target, title: "Goal Crusher", desc: "Hit weekly goal 4 weeks", earned: row("goal_crusher")?.earned ?? false, color: "orange", date: formatAchievementDate(row("goal_crusher")?.earnedAt) },
      { id: 9, icon: Star, title: "Early Bird", desc: "10 sessions before 9 AM", earned: row("early_bird")?.earned ?? false, color: "pink", date: formatAchievementDate(row("early_bird")?.earnedAt) },
      { id: 10, icon: Award, title: "Mock Master", desc: "Complete 5 full mocks", earned: row("mock_master")?.earned ?? false, color: "purple", date: formatAchievementDate(row("mock_master")?.earnedAt) },
    ];
  }, [achByKey]);
  const earnedCount = achievements.filter((item) => item.earned).length;

  const profileDetails = {
    bio: profileDraft.bio || "Consistent learner.",
    location: profileDraft.location || "-",
    occupation: profileDraft.occupation || "-",
    education: profileDraft.education || "-",
    targetExam: profileDraft.targetExam || "-",
    targetCollege: profileDraft.targetCollege || "-",
    joinedDate: "March 1, 2026",
    timezone: "Asia/Kolkata (GMT+5:30)",
    studyLevel: prefDraft.studyLevel || "-",
    preferredTime: prefDraft.preferredStudyTime || "-",
  };
  const effectiveGoalHours = goal.targetHours || 20;
  const goalPct = Math.min(100, Math.round((weekHours / effectiveGoalHours) * 100));

  const save = async () => {
    await Promise.all([
      updateUserProfile({ name: draft.name.trim(), username: draft.username.trim(), phone: draft.phone.trim() }),
      saveProfileMeta(profileDraft),
    ]);
    setEditing(false);
  };
  const persistStrategyDashboardVisibility = useCallback(
    async (enabled: boolean) => {
      const next = {
        preferredStudyTime: prefDraft.preferredStudyTime,
        defaultSessionMinutes: prefDraft.defaultSessionMinutes,
        breakMinutes: prefDraft.breakMinutes,
        pomodoroCycles: prefDraft.pomodoroCycles,
        studyLevel: prefDraft.studyLevel,
        weeklyGoalHours: prefDraft.weeklyGoalHours,
        emailNotifications: prefDraft.emailNotifications,
        pushNotifications: prefDraft.pushNotifications,
        reminderNotifications: prefDraft.reminderNotifications,
        marketingNotifications: prefDraft.marketingNotifications,
        showStrategyPage: enabled,
      };
      setPrefDraft(next);
      try {
        await wrapWithDataLoading(async () => {
          const updated = await savePreferences(next);
          if (updated.showStrategyPage !== enabled) {
            setPrefDraft((p) => ({ ...p, showStrategyPage: updated.showStrategyPage }));
            toast.error(
              "Strategy Dashboard did not stay on — the server returned a different value. Run DB migration 0012 (show_strategy_page) and redeploy the API if this persists.",
            );
            return;
          }
          await reloadStoreData();
        });
      } catch (e) {
        setPrefDraft((p) => ({ ...p, showStrategyPage: !enabled }));
        toast.error(e instanceof Error ? e.message : "Could not save preferences");
      }
    },
    [prefDraft, reloadStoreData, savePreferences, wrapWithDataLoading],
  );

  const savePreferencesAndPrivacy = async () => {
    try {
      await wrapWithDataLoading(async () => {
        await Promise.all([saveProfileMeta(profileDraft), savePreferences(prefDraft), savePrivacy(privacyDraft)]);
        await reloadStoreData();
        setStudyPrefsEditing(false);
        toast.success("Preferences saved");
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    }
  };

  const cancelStudyPrefsEdit = useCallback(() => {
    setPrefDraft((p) => ({
      ...p,
      preferredStudyTime: preferences.preferredStudyTime,
      defaultSessionMinutes: preferences.defaultSessionMinutes,
      breakMinutes: preferences.breakMinutes,
      pomodoroCycles: preferences.pomodoroCycles,
      studyLevel: preferences.studyLevel,
      weeklyGoalHours: preferences.weeklyGoalHours,
    }));
    setStudyPrefsEditing(false);
  }, [preferences]);

  const saveStudyPreferencesFields = useCallback(async () => {
    try {
      await wrapWithDataLoading(async () => {
        await savePreferences(prefDraft);
        await reloadStoreData();
      });
      setStudyPrefsEditing(false);
      toast.success("Study preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save study preferences");
    }
  }, [prefDraft, reloadStoreData, savePreferences, wrapWithDataLoading]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-12 lg:px-8">
      <section className="relative mb-6 overflow-hidden rounded-[28px] border border-border bg-card" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div aria-hidden className="absolute inset-0 opacity-60">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, color-mix(in oklch, var(--neon-purple) 18%, transparent), transparent)" }} />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, color-mix(in oklch, var(--neon-cyan) 18%, transparent), transparent)" }} />
        </div>
        <div className="relative px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-8">
            <div className="flex min-w-0 flex-1 items-start gap-5">
              <div className="relative shrink-0">
                <div className="rounded-full p-1" style={{ background: "linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))" }}>
                  <div className="rounded-full bg-card p-0.5">
                    <UserAvatar user={{ name: draft.name, avatarColor: "purple" }} size="xl" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-[3px] ring-card">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display truncate text-3xl font-semibold leading-none tracking-tight text-foreground sm:text-4xl">{draft.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                    <Sparkles className="h-2.5 w-2.5" /> Pro
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">@{draft.username || "karma_learner"}</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">{profileDetails.bio}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <Meta icon={MapPin} value={profileDetails.location} />
                  <Meta icon={GraduationCap} value={profileDetails.targetExam} />
                  <Meta icon={Calendar} value={`Joined ${profileDetails.joinedDate}`} />
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto lg:self-start">
              <button onClick={() => setTab("account")} className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90 sm:flex-none" style={{ boxShadow: "var(--shadow-md)" }}>
                <Edit3 className="h-3.5 w-3.5" /> Edit profile
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-foreground/20 hover:text-foreground" aria-label="Share">
                <Share2 className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-foreground/20 hover:text-foreground" aria-label="Settings" onClick={() => setTab("preferences")}>
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-8 grid grid-cols-1 gap-2 rounded-2xl border border-border/70 bg-background/40 p-2 backdrop-blur min-[420px]:grid-cols-2 sm:grid-cols-4">
            <HeroMetric icon={Flame} color="orange" label="Current streak" value={currentStreak} unit="days" />
            <HeroMetric icon={Clock} color="cyan" label="Total focus" value={totalHours.toFixed(1)} unit="hours" />
            <HeroMetric icon={Trophy} color="purple" label="Sessions" value={snapSessions} unit="logged" />
            <HeroMetric icon={Users} color="green" label="Friends" value={friendCount} unit="connected" />
          </div>
        </div>
      </section>

      <div className="mb-6 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1" style={{ boxShadow: "var(--shadow-sm)" }}>
        {([
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "achievements", label: "Achievements", icon: Trophy, badge: `${earnedCount}/${achievements.length}` },
          { id: "account", label: "Account", icon: User2 },
          { id: "preferences", label: "Preferences", icon: Settings },
        ] as const).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {"badge" in item && item.badge && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-background/20" : "bg-muted"}`}>{item.badge}</span>}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Performance Snapshot" icon={TrendingUp} eyebrow="All time">
              <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CompactStat label="Total focus" value={`${totalHours.toFixed(1)}h`} sub={`${snapSessions} sessions · goal ${effectiveGoalHours}h/wk`} />
                <CompactStat label="Avg session" value={formatMinutesAsDuration(snapAvgSession)} sub="duration" />
                <CompactStat label="Longest" value={formatMinutesAsDuration(snapLongest)} sub="single sit" />
                <CompactStat label="Avg mood" value={`${snapAvgMoodStr}`} sub="out of 5" />
              </div>
            </Panel>
            <Panel title="Subject Mix" icon={BookOpen} action={<MutedHint>{subjectStats.length} subjects</MutedHint>}>
              <div className="mt-2 space-y-4">
                {subjectStats.map((subject) => {
                  const palette = accent[(subject.color as AccentKey) ?? "cyan"];
                  return (
                    <div key={subject.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette.fg }} />
                          <span className="truncate text-sm font-semibold text-foreground">{subject.name}</span>
                          <span className="text-xs text-muted-foreground">· {subject.count} sessions</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 font-mono text-xs">
                          <span className="font-semibold text-foreground">{(subject.mins / 60).toFixed(1)}h</span>
                          <span className="text-muted-foreground">· {subject.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${subject.pct}%`, backgroundColor: palette.fg }} /></div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title="Weekly Goal" icon={Target}>
              <div className="flex flex-col items-center pt-2 text-center">
                <RingProgress pct={goalPct} value={`${weekHours.toFixed(1)}h`} sub={`of ${effectiveGoalHours}h`} />
                <p className="mt-3 text-sm font-medium text-foreground">{goalPct}% complete</p>
              </div>
            </Panel>
            {topSubject && (
              <Panel title="Top Subject" icon={Award}>
                <div className="mt-1 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: accent[(topSubject.color as AccentKey) ?? "cyan"].tint }}>
                    <span className="text-xl font-bold" style={{ color: accent[(topSubject.color as AccentKey) ?? "cyan"].fg }}>
                      {topSubject.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{topSubject.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{(topSubject.mins / 60).toFixed(1)}h · {topSubject.count} sessions</p>
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div className="space-y-6">
          <Panel title="Progress" icon={Trophy}>
            <div className="mt-1 flex items-center justify-between gap-6">
              <div className="min-w-0">
                <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {earnedCount}
                  <span className="text-xl font-semibold text-muted-foreground">/{achievements.length}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">badges earned · keep showing up</p>
                <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-700"
                    style={{ width: `${(earnedCount / (achievements.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
              <div
                className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl sm:flex"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklch, var(--neon-orange) 20%, transparent), color-mix(in oklch, var(--neon-pink) 20%, transparent))",
                }}
              >
                <Trophy className="h-9 w-9" style={{ color: "var(--neon-orange)" }} />
              </div>
            </div>
          </Panel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((item) => {
              const Icon = item.icon;
              const c = accent[item.color];
              return (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all ${item.earned ? "hover:-translate-y-0.5" : "opacity-55"}`}
                  style={item.earned ? { boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  {item.earned && (
                    <div
                      aria-hidden
                      className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-40 transition-opacity group-hover:opacity-60"
                      style={{ background: `radial-gradient(closest-side, ${c.tint}, transparent)` }}
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: c.tint, boxShadow: item.earned ? `inset 0 0 0 1px ${c.ring}` : undefined }}
                    >
                      <Icon className="h-5 w-5" style={{ color: c.fg }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                        {item.earned && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {item.earned ? `Earned · ${item.date}` : "Locked"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "account" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Panel
              title="Personal Information"
              icon={User2}
              action={
                !editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/20"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setDraft({ name: user.name, username: user.username, email: user.email, phone: user.phone });
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                    <button type="button" onClick={() => void save()} className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90">
                      <Check className="h-3 w-3" /> Save
                    </button>
                  </div>
                )
              }
            >
              <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Full name" icon={User2} editing={editing} value={draft.name} onChange={(v) => setDraft((prev) => ({ ...prev, name: v }))} />
                <Field label="Username" icon={AtSign} editing={editing} value={draft.username} onChange={(v) => setDraft((prev) => ({ ...prev, username: v }))} prefix="@" />
                <Field label="Email" icon={Mail} editing={false} value={draft.email} onChange={() => undefined} type="email" />
                <Field label="Phone" icon={Phone} editing={editing} value={draft.phone} onChange={(v) => setDraft((prev) => ({ ...prev, phone: v }))} placeholder="—" type="tel" />
              </div>
            </Panel>
            <Panel title="Background" icon={GraduationCap}>
              <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <BackgroundField editing={editing} multiline label="Bio" icon={BookOpen} value={profileDraft.bio} onChange={(v) => setProfileDraft((p) => ({ ...p, bio: v }))} />
                </div>
                <BackgroundField editing={editing} label="Status" icon={Briefcase} value={profileDraft.occupation} onChange={(v) => setProfileDraft((p) => ({ ...p, occupation: v }))} />
                <BackgroundField editing={editing} label="Education" icon={GraduationCap} value={profileDraft.education} onChange={(v) => setProfileDraft((p) => ({ ...p, education: v }))} />
                <BackgroundField editing={editing} label="Target exam" icon={Trophy} value={profileDraft.targetExam} onChange={(v) => setProfileDraft((p) => ({ ...p, targetExam: v }))} />
                <BackgroundField editing={editing} label="Target college" icon={Award} value={profileDraft.targetCollege} onChange={(v) => setProfileDraft((p) => ({ ...p, targetCollege: v }))} />
                <BackgroundField editing={editing} label="Location" icon={MapPin} value={profileDraft.location} onChange={(v) => setProfileDraft((p) => ({ ...p, location: v }))} />
                <ReadOnlyRow icon={Globe} label="Timezone" value={profileDetails.timezone} />
              </div>
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title="Account Status" icon={Shield}>
              <div className="mt-1 space-y-0">
                <StatusRow label="Verification" value="Verified" tone="success" />
                <StatusRow
                  label="Member since"
                  value={
                    user.lastActiveDate
                      ? new Date(`${user.lastActiveDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : profileDetails.joinedDate
                  }
                />
                <StatusRow label="Plan" value="Pro" tone="brand" />
                <StatusRow label="2FA" value="Disabled" tone="warning" />
              </div>
            </Panel>
            <Panel title="Quick Actions" icon={Settings}>
              <div className="mt-1 space-y-0.5">
                <ActionRow icon={Download} label="Export data" desc="Download CSV" />
                <ActionRow icon={Shield} label="Security center" desc="Password & 2FA" />
                <ActionRow icon={Bell} label="Notifications" desc="Manage alerts" onClick={() => setTab("preferences")} />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel
            title="Study Preferences"
            icon={Settings}
            action={
              !studyPrefsEditing ? (
                <button
                  type="button"
                  disabled={dataLoading}
                  onClick={() => setStudyPrefsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              ) : (
                <div className="flex flex-wrap justify-end gap-1.5">
                  <button
                    type="button"
                    disabled={dataLoading}
                    onClick={cancelStudyPrefsEdit}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                  <button
                    type="button"
                    disabled={dataLoading}
                    onClick={() => void saveStudyPreferencesFields()}
                    className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> Save
                  </button>
                </div>
              )
            }
          >
            <div className="mt-1 space-y-0">
              {studyPrefsEditing ? (
                <>
                  <StudyPrefTextRow label="Preferred study time" value={prefDraft.preferredStudyTime} onChange={(v) => setPrefDraft((p) => ({ ...p, preferredStudyTime: v }))} />
                  <StudyPrefNumberRow label="Default session length" suffix="minutes" value={prefDraft.defaultSessionMinutes} onChange={(v) => setPrefDraft((p) => ({ ...p, defaultSessionMinutes: v }))} />
                  <StudyPrefNumberRow label="Break length" suffix="minutes" value={prefDraft.breakMinutes} onChange={(v) => setPrefDraft((p) => ({ ...p, breakMinutes: v }))} />
                  <StudyPrefNumberRow label="Pomodoro cycles" suffix="per set" value={prefDraft.pomodoroCycles} onChange={(v) => setPrefDraft((p) => ({ ...p, pomodoroCycles: v }))} />
                  <StudyPrefTextRow label="Skill level" value={prefDraft.studyLevel} onChange={(v) => setPrefDraft((p) => ({ ...p, studyLevel: v }))} />
                  <StudyPrefNumberRow label="Weekly goal" suffix="hours" value={prefDraft.weeklyGoalHours} onChange={(v) => setPrefDraft((p) => ({ ...p, weeklyGoalHours: v }))} />
                </>
              ) : (
                <>
                  <StatusRow label="Preferred study time" value={prefDraft.preferredStudyTime.trim() ? prefDraft.preferredStudyTime : "Not set"} />
                  <StatusRow label="Default session length" value={`${prefDraft.defaultSessionMinutes} minutes`} />
                  <StatusRow label="Break length" value={`${prefDraft.breakMinutes} minutes`} />
                  <StatusRow label="Pomodoro cycles" value={`${prefDraft.pomodoroCycles} per set`} />
                  <StatusRow label="Skill level" value={prefDraft.studyLevel.trim() ? prefDraft.studyLevel : "Not set"} />
                  <StatusRow label="Weekly goal" value={`${prefDraft.weeklyGoalHours} hours`} />
                </>
              )}
            </div>
          </Panel>
          <Panel title="Notifications" icon={Bell}>
            <div className="mt-1 space-y-0">
              <SwitchRow label="Daily reminder" desc="Nudge me if I have not studied today" checked={prefDraft.reminderNotifications} onChange={(c) => setPrefDraft((p) => ({ ...p, reminderNotifications: c }))} />
              <SwitchRow label="Streak alerts" desc="Warn me before I lose my streak" checked={prefDraft.pushNotifications} onChange={(c) => setPrefDraft((p) => ({ ...p, pushNotifications: c }))} />
              <SwitchRow label="Friend activity" desc="When friends log a session" checked={prefDraft.marketingNotifications} onChange={(c) => setPrefDraft((p) => ({ ...p, marketingNotifications: c }))} />
              <SwitchRow label="Weekly summary" desc="Recap email for your week" checked={prefDraft.emailNotifications} onChange={(c) => setPrefDraft((p) => ({ ...p, emailNotifications: c }))} />
            </div>
          </Panel>
          <Panel title="Privacy" icon={Shield}>
            <div className="mt-1 space-y-0">
              <SwitchRow label="Public profile" desc="Allow others to find you by handle" checked={privacyDraft.profilePublic} onChange={(c) => setPrivacyDraft((p) => ({ ...p, profilePublic: c }))} />
              <SwitchRow label="Show on leaderboard" desc="Friends can see your weekly minutes" checked={privacyDraft.showLeaderboard} onChange={(c) => setPrivacyDraft((p) => ({ ...p, showLeaderboard: c }))} />
              <SwitchRow label="Share study mood" desc="Show mood on your public profile" checked={privacyDraft.showStats} onChange={(c) => setPrivacyDraft((p) => ({ ...p, showStats: c }))} />
              <SwitchRow label="Show streak" desc="Display streak count on your public profile" checked={privacyDraft.showStats} onChange={(c) => setPrivacyDraft((p) => ({ ...p, showStats: c }))} />
              <SwitchRow
                label="Show Strategy Dashboard"
                desc="Saves immediately, shows a short loading state, then reloads all app data from the server so the nav updates"
                checked={prefDraft.showStrategyPage}
                disabled={dataLoading}
                onChange={(c) => void persistStrategyDashboardVisibility(c)}
              />
            </div>
          </Panel>
          <Panel title="Account & Data" icon={Download}>
            <div className="mt-1 space-y-0.5">
              <ActionRow type="button" icon={Download} label="Export all data" desc="Download as CSV" />
              <ActionRow type="button" icon={Globe} label="Connected apps" desc="Integrations (coming soon)" />
              <ActionRow type="button" icon={Shield} label="Change password" desc="Use your account provider settings" />
              <ActionRow type="button" icon={Shield} label="Two-factor auth" desc="Not enabled" />
              <ActionRow type="button" icon={X} label="Delete account" desc="Permanent — cannot undo" danger />
              <button
                type="button"
                disabled={dataLoading}
                onClick={() => void savePreferencesAndPrivacy()}
                className="mt-4 w-full rounded-xl bg-foreground px-3 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                Save preferences
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 opacity-70" />{value}</span>;
}

function HeroMetric({ icon: Icon, color, label, value, unit }: { icon: LucideIcon; color: AccentKey; label: string; value: string | number; unit: string }) {
  const c = accent[color];
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-border/60 bg-card/45 px-4 py-3 sm:px-4 sm:py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.tint }}><Icon className="h-[18px] w-[18px]" style={{ color: c.fg }} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">
          <span className="break-words">{value}</span>
          <span className="ml-1 inline-block text-xs font-medium text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, eyebrow, action, children }: { title: string; icon: LucideIcon; eyebrow?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-3.5 w-3.5 text-foreground" /></div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            {eyebrow && <p className="-mt-0.5 text-[11px] text-muted-foreground">{eyebrow}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function MutedHint({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function CompactStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3.5 transition-colors hover:bg-muted/70">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function RingProgress({ pct, value, sub }: { pct: number; value: string; sub: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--neon-purple)" />
            <stop offset="100%" stopColor="var(--neon-cyan)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} stroke="var(--muted)" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, editing, value, onChange, prefix, type = "text", placeholder }: { label: string; icon: LucideIcon; editing: boolean; value: string; onChange: (v: string) => void; prefix?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" /> {label}</label>
      {editing ? (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`input-field w-full rounded-xl py-2.5 text-sm text-foreground ${prefix ? "pl-7 pr-3" : "px-3"}`} />
        </div>
      ) : (
        <p className="truncate py-2 text-sm text-foreground">{value ? `${prefix ?? ""}${value}` : <span className="text-muted-foreground">-</span>}</p>
      )}
    </div>
  );
}

function ReadOnlyRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="truncate text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function BackgroundField({
  label,
  icon: Icon,
  value,
  onChange,
  editing,
  multiline,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  multiline?: boolean;
}) {
  if (!editing) {
    return <ReadOnlyRow icon={Icon} label={label} value={value} />;
  }
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="input-field w-full resize-y rounded-xl px-3 py-2.5 text-sm text-foreground" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input-field w-full rounded-xl px-3 py-2.5 text-sm text-foreground" />
      )}
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "brand" }) {
  const toneStyles =
    tone === "success"
      ? { color: "var(--neon-green)", background: "color-mix(in oklch, var(--neon-green) 12%, transparent)" }
      : tone === "warning"
        ? { color: "var(--neon-orange)", background: "color-mix(in oklch, var(--neon-orange) 12%, transparent)" }
        : tone === "brand"
          ? { color: "var(--primary)", background: "color-mix(in oklch, var(--primary) 12%, transparent)" }
          : undefined;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      {tone ? (
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={toneStyles}>
          {value}
        </span>
      ) : (
        <span className="text-xs font-medium text-foreground">{value}</span>
      )}
    </div>
  );
}

function StudyPrefTextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. evenings"
        className="input-field max-w-[60%] min-w-0 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function StudyPrefNumberRow({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex min-w-0 max-w-[60%] items-baseline justify-end gap-1.5">
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="input-field w-20 shrink-0 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="shrink-0 text-sm font-medium text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (c: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
        className="shrink-0 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border"
      />
    </div>
  );
}

function ActionRow({
  icon: Icon,
  label,
  desc,
  danger,
  onClick,
  type = "button",
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  danger?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${danger ? "hover:bg-destructive/10" : "hover:bg-muted/60"}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-destructive/10" : "bg-muted"}`}>
        <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-foreground"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</p>
        <p className={`text-xs ${danger ? "text-destructive/70" : "text-muted-foreground"}`}>{desc}</p>
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${danger ? "text-destructive/60" : "text-muted-foreground"}`} />
    </button>
  );
}

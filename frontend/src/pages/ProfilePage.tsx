import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Flame, Trophy, Clock, Target, BookOpen, Users, Calendar, TrendingUp, Award, Zap, Bell, Globe, Mail, Phone, MapPin,
  Briefcase, GraduationCap, Edit3, Settings, Shield, Download, Share2, Star, CheckCircle2, Sparkles, AtSign, Check, X, ChevronRight, User as User2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchFriends } from "@/lib/api";
import { useStore } from "@/lib/store";
import { UserAvatar } from "@/components/UserAvatar";

const accent = {
  cyan: { fg: "var(--neon-cyan)", tint: "color-mix(in oklch, var(--neon-cyan) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-cyan) 30%, transparent)" },
  green: { fg: "var(--neon-green)", tint: "color-mix(in oklch, var(--neon-green) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-green) 30%, transparent)" },
  orange: { fg: "var(--neon-orange)", tint: "color-mix(in oklch, var(--neon-orange) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-orange) 30%, transparent)" },
  pink: { fg: "var(--neon-pink)", tint: "color-mix(in oklch, var(--neon-pink) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-pink) 30%, transparent)" },
  purple: { fg: "var(--neon-purple)", tint: "color-mix(in oklch, var(--neon-purple) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-purple) 30%, transparent)" },
} as const;
type AccentKey = keyof typeof accent;

export default function ProfilePage() {
  const { user, sessions, subjects, goal, updateUserProfile, profileMeta, preferences, privacy, saveProfileMeta, savePreferences, savePrivacy } = useStore();
  const [tab, setTab] = useState<"overview" | "achievements" | "account" | "preferences">("overview");
  const [friendCount, setFriendCount] = useState(0);
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
  const totalHours = totalMinutes / 60;
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
  const weekHours = weekMins / 60;

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

  const achievements: Array<{ id: number; icon: LucideIcon; title: string; desc: string; earned: boolean; color: AccentKey; date: string }> = [
    { id: 1, icon: Flame, title: "7-Day Streak", desc: "Studied 7 days in a row", earned: currentStreak >= 7, color: "orange", date: "Apr 18" },
    { id: 2, icon: Flame, title: "14-Day Warrior", desc: "Two weeks of consistency", earned: currentStreak >= 14, color: "pink", date: "-" },
    { id: 3, icon: Clock, title: "Century Club", desc: "Logged 100+ hours total", earned: totalHours >= 100, color: "cyan", date: "-" },
    { id: 4, icon: Trophy, title: "First Session", desc: "Logged your first session", earned: totalSessions >= 1, color: "green", date: "Mar 1" },
    { id: 5, icon: Zap, title: "Deep Work", desc: "Single session over 2 hours", earned: longestSession >= 120, color: "purple", date: "Apr 22" },
    { id: 6, icon: Users, title: "Social Studier", desc: "Added 3+ friends", earned: friendCount >= 3, color: "cyan", date: "Apr 10" },
    { id: 7, icon: BookOpen, title: "Subject Master", desc: "Studied 3+ subjects", earned: subjects.length >= 3, color: "green", date: "Mar 5" },
  ];
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
  const goalPct = Math.min(100, Math.round((weekHours / goal.targetHours) * 100));

  const save = async () => {
    await updateUserProfile({ name: draft.name.trim(), username: draft.username.trim(), phone: draft.phone.trim() });
    setEditing(false);
  };
  const savePreferencesAndPrivacy = async () => {
    await Promise.all([
      saveProfileMeta(profileDraft),
      savePreferences(prefDraft),
      savePrivacy(privacyDraft),
    ]);
  };

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
            <div className="flex shrink-0 gap-2 lg:self-start">
              <button onClick={() => setTab("account")} className="group flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90" style={{ boxShadow: "var(--shadow-md)" }}>
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

          <div className="relative mt-8 grid grid-cols-2 divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/40 backdrop-blur sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <HeroMetric icon={Flame} color="orange" label="Current streak" value={currentStreak} unit="days" />
            <HeroMetric icon={Clock} color="cyan" label="Total focus" value={totalHours.toFixed(1)} unit="hours" />
            <HeroMetric icon={Trophy} color="purple" label="Sessions" value={totalSessions} unit="logged" />
            <HeroMetric icon={Users} color="green" label="Friends" value={friendCount} unit="connected" />
          </div>
        </div>
      </section>

      <div className="mb-6 inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1" style={{ boxShadow: "var(--shadow-sm)" }}>
        {([
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "achievements", label: "Achievements", icon: Trophy, badge: `${earnedCount}/${achievements.length}` },
          { id: "account", label: "Account", icon: User2 },
          { id: "preferences", label: "Preferences", icon: Settings },
        ] as const).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
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
            <Panel title="Performance Snapshot" icon={TrendingUp} eyebrow="Last 30 days">
              <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CompactStat label="This week" value={`${weekHours.toFixed(1)}h`} sub={`Goal ${goal.targetHours}h`} />
                <CompactStat label="Avg session" value={`${avgSession}m`} sub="duration" />
                <CompactStat label="Longest" value={`${Math.floor(longestSession / 60)}h ${longestSession % 60}m`} sub="single sit" />
                <CompactStat label="Avg mood" value={`${avgMood}`} sub="out of 5" />
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
                <RingProgress pct={goalPct} value={`${weekHours.toFixed(1)}h`} sub={`of ${goal.targetHours}h`} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((item) => {
            const Icon = item.icon;
            const c = accent[item.color];
            return (
              <div key={item.id} className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all ${item.earned ? "hover:-translate-y-0.5" : "opacity-55"}`} style={item.earned ? { boxShadow: "var(--shadow-sm)" } : undefined}>
                <div className="relative flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: c.tint, boxShadow: item.earned ? `inset 0 0 0 1px ${c.ring}` : undefined }}>
                    <Icon className="h-5 w-5" style={{ color: c.fg }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                      {item.earned && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">{item.earned ? `Earned · ${item.date}` : "Locked"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "account" && (
        <Panel title="Personal Information" icon={User2} action={!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-foreground/20">
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => { setEditing(false); setDraft({ name: user.name, username: user.username, email: user.email, phone: user.phone }); }} className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
              <X className="h-3 w-3" /> Cancel
            </button>
            <button onClick={save} className="flex items-center gap-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90">
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        )}>
          <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Full name" icon={User2} editing={editing} value={draft.name} onChange={(v) => setDraft((prev) => ({ ...prev, name: v }))} />
            <Field label="Username" icon={AtSign} editing={editing} value={draft.username} onChange={(v) => setDraft((prev) => ({ ...prev, username: v }))} prefix="@" />
            <Field label="Email" icon={Mail} editing={false} value={draft.email} onChange={() => undefined} type="email" />
            <Field label="Phone" icon={Phone} editing={editing} value={draft.phone} onChange={(v) => setDraft((prev) => ({ ...prev, phone: v }))} placeholder="-" type="tel" />
          </div>
        </Panel>
      )}

      {tab === "preferences" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Study Preferences" icon={Settings}>
            <div className="mt-1 space-y-3">
              <InputRow label="Preferred study time" value={prefDraft.preferredStudyTime} onChange={(value) => setPrefDraft((prev) => ({ ...prev, preferredStudyTime: value }))} />
              <InputRow label="Study level" value={prefDraft.studyLevel} onChange={(value) => setPrefDraft((prev) => ({ ...prev, studyLevel: value }))} />
              <NumberRow label="Default session length (minutes)" value={prefDraft.defaultSessionMinutes} onChange={(value) => setPrefDraft((prev) => ({ ...prev, defaultSessionMinutes: value }))} />
              <NumberRow label="Break length (minutes)" value={prefDraft.breakMinutes} onChange={(value) => setPrefDraft((prev) => ({ ...prev, breakMinutes: value }))} />
              <NumberRow label="Pomodoro cycles per set" value={prefDraft.pomodoroCycles} onChange={(value) => setPrefDraft((prev) => ({ ...prev, pomodoroCycles: value }))} />
              <NumberRow label="Weekly goal (hours)" value={prefDraft.weeklyGoalHours} onChange={(value) => setPrefDraft((prev) => ({ ...prev, weeklyGoalHours: value }))} />
            </div>
          </Panel>
          <Panel title="Account & Data" icon={Download}>
            <div className="mt-1 space-y-3">
              <InputRow label="Bio" value={profileDraft.bio} onChange={(value) => setProfileDraft((prev) => ({ ...prev, bio: value }))} />
              <InputRow label="Location" value={profileDraft.location} onChange={(value) => setProfileDraft((prev) => ({ ...prev, location: value }))} />
              <InputRow label="Education" value={profileDraft.education} onChange={(value) => setProfileDraft((prev) => ({ ...prev, education: value }))} />
              <InputRow label="Occupation" value={profileDraft.occupation} onChange={(value) => setProfileDraft((prev) => ({ ...prev, occupation: value }))} />
              <InputRow label="Target exam" value={profileDraft.targetExam} onChange={(value) => setProfileDraft((prev) => ({ ...prev, targetExam: value }))} />
              <InputRow label="Target college" value={profileDraft.targetCollege} onChange={(value) => setProfileDraft((prev) => ({ ...prev, targetCollege: value }))} />
              <ToggleRow label="Public profile" checked={privacyDraft.profilePublic} onChange={(checked) => setPrivacyDraft((prev) => ({ ...prev, profilePublic: checked }))} />
              <ToggleRow label="Show stats publicly" checked={privacyDraft.showStats} onChange={(checked) => setPrivacyDraft((prev) => ({ ...prev, showStats: checked }))} />
              <ToggleRow label="Show leaderboard publicly" checked={privacyDraft.showLeaderboard} onChange={(checked) => setPrivacyDraft((prev) => ({ ...prev, showLeaderboard: checked }))} />
              <ToggleRow label="Email notifications" checked={prefDraft.emailNotifications} onChange={(checked) => setPrefDraft((prev) => ({ ...prev, emailNotifications: checked }))} />
              <ToggleRow label="Push notifications" checked={prefDraft.pushNotifications} onChange={(checked) => setPrefDraft((prev) => ({ ...prev, pushNotifications: checked }))} />
              <ToggleRow label="Reminder notifications" checked={prefDraft.reminderNotifications} onChange={(checked) => setPrefDraft((prev) => ({ ...prev, reminderNotifications: checked }))} />
              <ToggleRow label="Marketing notifications" checked={prefDraft.marketingNotifications} onChange={(checked) => setPrefDraft((prev) => ({ ...prev, marketingNotifications: checked }))} />
              <ActionRow icon={Download} label="Export all data" desc="Download as CSV" />
              <ActionRow icon={Globe} label="Profile visibility" desc={privacyDraft.profilePublic ? "Public profile enabled" : "Only friends can view profile"} />
              <ActionRow icon={Shield} label="Stats visibility" desc={privacyDraft.showStats ? "Stats shown on public profile" : "Stats hidden"} />
              <ActionRow icon={Bell} label="Notifications" desc={prefDraft.reminderNotifications ? "Reminders enabled" : "Reminders disabled"} />
              <ActionRow icon={X} label="Delete account" desc="Permanent - cannot undo" danger />
              <button onClick={() => void savePreferencesAndPrivacy()} className="mt-2 w-full rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:opacity-90">Save preferences</button>
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
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.tint }}><Icon className="h-[18px] w-[18px]" style={{ color: c.fg }} /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-lg font-bold leading-none text-foreground sm:text-xl">{value}<span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span></p>
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

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input-field w-full rounded-xl px-3 py-2.5 text-sm text-foreground" />
    </label>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="input-field w-full rounded-xl px-3 py-2.5 text-sm text-foreground"
      />
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />
    </label>
  );
}

function ActionRow({ icon: Icon, label, desc, danger }: { icon: LucideIcon; label: string; desc: string; danger?: boolean }) {
  return (
    <button className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${danger ? "hover:bg-destructive/10" : "hover:bg-muted/60"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-destructive/10" : "bg-muted"}`}>
        <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-foreground"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</p>
        <p className={`text-xs ${danger ? "text-destructive/70" : "text-muted-foreground"}`}>{desc}</p>
      </div>
      <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${danger ? "text-destructive/60" : "text-muted-foreground"}`} />
    </button>
  );
}

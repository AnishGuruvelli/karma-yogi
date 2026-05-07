import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Trophy,
  Award,
  Check,
  TrendingUp,
  Sparkles,
  MapPin,
  GraduationCap,
  Calendar,
  BarChart3,
  BookOpen,
  Star,
  Crown,
  ChevronLeft,
  ChevronRight,
  Target,
  Flame,
  Users,
  Zap,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ReferenceLine } from "recharts";
import { fetchPublicProfileDetails } from "@/lib/api";
import { UserAvatar } from "@/components/UserAvatar";
import { CalendarModal } from "@/components/CalendarModal";
import { HeatmapCard } from "@/components/HeatmapCard";
import { Panel, CompactStat, MutedHint, RingProgress, HeroMetric } from "@/components/StatsPanel";
import { OverviewTab } from "@/components/OverviewTab";
import { LoadingSplash } from "@/components/LoadingSplash";
import type { PublicProfileDetails, PublicProfileSessionEntry, Session } from "@/lib/types";
import { subjectColor, accent, type AccentKey } from "@/lib/colors";
import { fromLocalDateKey, toLocalDateKey } from "@/lib/date";

type TabKey = "overview" | "sessions" | "insights";
type PeriodMode = "week" | "month" | "all";
const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function subjectToneFromId(id: string): "cyan" | "green" | "orange" | "pink" | "purple" {
  const tones: Array<"cyan" | "green" | "orange" | "pink" | "purple"> = ["cyan", "green", "orange", "pink", "purple"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return tones[hash % tones.length];
}

export default function PublicProfilePage() {
  const { userId = "" } = useParams();
  const [tab, setTab] = useState<TabKey>("overview");
  const [mode, setMode] = useState<PeriodMode>("week");
  const [offset, setOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [data, setData] = useState<PublicProfileDetails | null>(null);
  const [allSessions, setAllSessions] = useState<PublicProfileSessionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setSessionsPage(1);
    setAllSessions([]);
    void fetchPublicProfileDetails(userId, 1, 20)
      .then((res) => {
        setData(res);
        setAllSessions(res.sessions ?? []);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Unable to fetch profile details");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId || !data?.sessionsHasMore) return;
    let cancelled = false;
    const loadRemainingSessions = async () => {
      let page = 2;
      let hasMore = true;
      while (!cancelled && hasMore) {
        const next = await fetchPublicProfileDetails(userId, page, 100);
        if (cancelled) return;
        setAllSessions((prev) => mergeUniqueSessions(prev, next.sessions ?? []));
        hasMore = next.sessionsHasMore;
        page += 1;
      }
    };
    void loadRemainingSessions().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, data?.sessionsHasMore]);

  const handleLoadMoreSessions = () => {
    if (!data || loadingMore) return;
    const nextPage = sessionsPage + 1;
    setLoadingMore(true);
    void fetchPublicProfileDetails(userId, nextPage, 20)
      .then((res) => {
        setData((prev) => prev ? {
          ...prev,
          sessions: [...(prev.sessions ?? []), ...(res.sessions ?? [])],
          sessionsHasMore: res.sessionsHasMore,
        } : res);
        setAllSessions((prev) => mergeUniqueSessions(prev, res.sessions ?? []));
        setSessionsPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  };

  const grouped = useMemo(() => groupSessions(data?.sessions ?? []), [data?.sessions]);
  const normalizedSessions = useMemo<Session[]>(
    () =>
      allSessions.map((s) => {
        const started = new Date(s.startedAt);
        const end = new Date(started.getTime() + s.durationMin * 60 * 1000);
        const moodNumber = Number(s.mood);
        return {
          id: s.id,
          subjectId: s.subjectId,
          topic: s.topic || "Session",
          duration: s.durationMin,
          startTime: started.toTimeString().slice(0, 5),
          endTime: end.toTimeString().slice(0, 5),
          date: toLocalDateKey(started),
          moodRating: Number.isFinite(moodNumber) ? Math.max(1, Math.min(5, Math.round(moodNumber))) : 3,
          isManualLog: true,
        };
      }),
    [allSessions],
  );
  const now = useMemo(() => new Date(), []);
  const { start, end, periodLabel } = useMemo(() => {
    if (mode === "all") {
      const yearStart = new Date(now.getFullYear() + offset, 0, 1);
      const yearEnd = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
      return { start: yearStart, end: yearEnd, periodLabel: String(now.getFullYear() + offset) };
    }
    if (mode === "month") {
      const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const e = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
      return { start: s, end: e, periodLabel: s.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase() };
    }
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const label =
      offset === 0
        ? "This Week"
        : offset === -1
          ? "Last Week"
          : `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { start: monday, end: sunday, periodLabel: label };
  }, [mode, offset, now]);
  const filteredSessions = useMemo(
    () =>
      normalizedSessions.filter((s) => {
        const d = fromLocalDateKey(s.date);
        return d >= start && d <= end;
      }),
    [normalizedSessions, start, end],
  );
  // Server-precomputed daily map — accurate from first load, no pagination gaps
  const insightsDailyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data?.insights?.dailyMinutes ?? []) map.set(d.dateKey, d.minutes);
    return map;
  }, [data?.insights?.dailyMinutes]);

  const { totalMinutes, uniqueDays } = useMemo(() => {
    let total = 0;
    let days = 0;
    for (const [dateKey, mins] of insightsDailyMap) {
      const d = fromLocalDateKey(dateKey);
      if (d >= start && d <= end) { total += mins; if (mins > 0) days++; }
    }
    return { totalMinutes: total, uniqueDays: days };
  }, [insightsDailyMap, start, end]);
  const dailyAvg = uniqueDays > 0 ? totalMinutes / uniqueDays : 0;
  const longestSession = filteredSessions.length > 0 ? Math.max(...filteredSessions.map((s) => s.duration)) : 0;
  const canGoForward = offset < 0;
  const weekBars = useMemo(() => {
    if (mode === "week") {
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return dayNames.map((name, i) => {
        const targetDate = new Date(start);
        targetDate.setDate(targetDate.getDate() + i);
        const dateStr = toLocalDateKey(targetDate);
        const mins = insightsDailyMap.get(dateStr) ?? 0;
        const isToday = dateStr === toLocalDateKey(now);
        return { name, hours: +(mins / 60).toFixed(1), minutes: mins, isToday, tooltipLabel: targetDate.toLocaleDateString("en-US") };
      });
    }
    if (mode === "month") {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const targetDate = new Date(start.getFullYear(), start.getMonth(), day);
        const dateStr = toLocalDateKey(targetDate);
        const mins = insightsDailyMap.get(dateStr) ?? 0;
        const isToday = dateStr === toLocalDateKey(now);
        return { name: String(day), hours: +(mins / 60).toFixed(1), minutes: mins, isToday, tooltipLabel: targetDate.toLocaleDateString("en-US") };
      });
    }
    return MONTH_LABELS.map((name, i) => {
      const monthStart = new Date(start.getFullYear(), i, 1);
      const monthEnd = new Date(start.getFullYear(), i + 1, 0, 23, 59, 59, 999);
      let mins = 0;
      for (const [dateKey, m] of insightsDailyMap) {
        const d = fromLocalDateKey(dateKey);
        if (d >= monthStart && d <= monthEnd) mins += m;
      }
      const isCurrentMonth = i === now.getMonth() && start.getFullYear() === now.getFullYear();
      return { name, hours: +(mins / 60).toFixed(1), minutes: mins, isToday: isCurrentMonth, tooltipLabel: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
    });
  }, [mode, insightsDailyMap, start, end, now]);
  const avgLineHours = useMemo(() => {
    if (mode === "all") {
      const activeMonths = weekBars.filter((d) => d.hours > 0).length;
      if (activeMonths === 0) return 0;
      return +(totalMinutes / 60 / activeMonths).toFixed(2);
    }
    return +(dailyAvg / 60).toFixed(2);
  }, [mode, totalMinutes, dailyAvg, weekBars]);
  // Use server-precomputed subject breakdown — always accurate regardless of pagination
  const publicSubjectStats = useMemo(() => {
    const breakdown = data?.insights?.subjectBreakdown ?? [];
    const totalMins = breakdown.reduce((sum, v) => sum + v.minutes, 0);
    // Count sessions per subject from loaded sessions (best effort; accurate when all loaded)
    const countMap = new Map<string, number>();
    for (const s of allSessions) countMap.set(s.subjectId, (countMap.get(s.subjectId) ?? 0) + 1);
    return breakdown.map((v) => ({
      id: v.subjectId,
      name: v.subjectName,
      mins: v.minutes,
      count: countMap.get(v.subjectId) ?? 0,
      pct: totalMins ? (v.minutes / totalMins) * 100 : 0,
      color: subjectToneFromId(v.subjectId) as AccentKey,
    }));
  }, [data?.insights?.subjectBreakdown, allSessions]);

  const ratedSessions = useMemo(() => filteredSessions.filter((s) => s.moodRating > 0), [filteredSessions]);
  const avgMood = ratedSessions.length > 0 ? (ratedSessions.reduce((sum, s) => sum + s.moodRating, 0) / ratedSessions.length).toFixed(1) : "—";
  const moodLabel = Number(avgMood) >= 4 ? "Great" : Number(avgMood) >= 3 ? "Good" : Number(avgMood) >= 2 ? "Fair" : "Low";

  // Use server-precomputed peak hour — always accurate regardless of pagination
  const peakHour = data?.insights?.peakHourLocal ?? -1;
  const peakLabel = (data?.insights?.peakHourMinutes ?? 0) === 0
    ? null
    : peakHour >= 21 || peakHour < 5 ? "🌙 Night Owl" : peakHour >= 5 && peakHour < 12 ? "☀️ Early Bird" : "🌤️ Afternoon Warrior";
  const maxHours = Math.max(...weekBars.map((d) => d.hours), 0.5);

  const subjectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of data?.insights?.subjectBreakdown ?? []) map.set(s.subjectId, s.subjectName);
    for (const s of allSessions) map.set(s.subjectId, s.subjectName);
    return map;
  }, [data?.insights?.subjectBreakdown, allSessions]);
  const bestSubjectByTime = useMemo(() => {
    const byId = new Map<string, number>();
    for (const s of filteredSessions) byId.set(s.subjectId, (byId.get(s.subjectId) || 0) + s.duration);
    const ranked = [...byId.entries()].map(([id, minutes]) => ({ minutes, name: subjectNameMap.get(id) ?? id })).sort((a, b) => b.minutes - a.minutes);
    return ranked[0] ?? null;
  }, [filteredSessions, subjectNameMap]);
  const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayTotalsByWeekday = useMemo(() => {
    const dailyTotals = new Map<string, number>();
    filteredSessions.forEach((s) => dailyTotals.set(s.date, (dailyTotals.get(s.date) || 0) + s.duration));
    const totals = Array(7).fill(0) as number[];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(end);
    endCursor.setHours(0, 0, 0, 0);
    while (cursor <= endCursor) {
      const dateStr = toLocalDateKey(cursor);
      const idx = (cursor.getDay() + 6) % 7;
      totals[idx] += dailyTotals.get(dateStr) || 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return totals;
  }, [filteredSessions, start, end]);
  const { bestDay, bestDayMinutes, secondBestDay, secondBestDayMinutes } = useMemo(() => {
    const totals = dayTotalsByWeekday;
    const maxVal = Math.max(...totals, 0);
    if (maxVal <= 0) return { bestDay: "—", bestDayMinutes: 0, secondBestDay: "—", secondBestDayMinutes: 0 };
    const bestIdx = totals.indexOf(maxVal);
    const distinct = [...new Set(totals)].filter((t) => t > 0).sort((a, b) => b - a);
    if (distinct.length < 2) return { bestDay: weekdayNames[bestIdx], bestDayMinutes: totals[bestIdx], secondBestDay: "—", secondBestDayMinutes: 0 };
    const target = distinct[1];
    const secondIdx = totals.findIndex((t) => t === target);
    return { bestDay: weekdayNames[bestIdx], bestDayMinutes: totals[bestIdx], secondBestDay: secondIdx >= 0 ? weekdayNames[secondIdx] : "—", secondBestDayMinutes: secondIdx >= 0 ? totals[secondIdx] : 0 };
  }, [dayTotalsByWeekday]);
  const piePalette = ["#22d3ee", "#4ade80", "#fb923c", "#f472b6", "#a78bfa", "#facc15", "#34d399", "#f87171"];
  const insightsPieData = useMemo(() => {
    const byId = new Map<string, { name: string; value: number }>();
    for (const s of filteredSessions) {
      const name = subjectNameMap.get(s.subjectId) ?? s.subjectId;
      const existing = byId.get(s.subjectId) ?? { name, value: 0 };
      existing.value += s.duration;
      byId.set(s.subjectId, existing);
    }
    return [...byId.values()].filter((d) => d.value > 0).sort((a, b) => b.value - a.value).map((d, idx) => ({ ...d, color: piePalette[idx % piePalette.length] }));
  }, [filteredSessions, subjectNameMap]);
  const insightsPieTotal = insightsPieData.reduce((sum, d) => sum + d.value, 0);
  // Server-precomputed heatmap — always accurate from first load
  const heatmapDailyTotals = useMemo(
    () => new Map<string, number>(Object.entries(data?.heatmap ?? {})),
    [data?.heatmap],
  );

  if (loading) {
    return <LoadingSplash open />;
  }
  if (error) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-destructive">{error}</div>;
  }
  if (!data) return null;

  const pubGoalHours = (data.overview?.weeklyGoalHours) || 20;

  const profile = {
    id: data.user.id,
    name: data.user.fullName || "Friend",
    avatarColor: "purple",
    handle: data.user.username || data.user.id,
    bio: data.profile.bio || "Focused learner on Karma Yogi.",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-12 lg:px-8">
      <Link to="/friends" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="glass-card mb-6 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <UserAvatar user={profile} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{profile.name}</h1>
              {data.canViewDetails && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" /> Friends
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            <p className="mt-2 max-w-xl text-sm text-foreground/80">{profile.bio}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {data.profile.location || "-"}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined Karma Yogi</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> {data.profile.targetExam || "-"} {data.profile.targetCollege ? `-> ${data.profile.targetCollege}` : ""}</span>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" /> {data.canViewDetails ? "Friends" : "Public"}
            </span>
          </div>
        </div>
        {data.canViewDetails && data.overview && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-background/40 p-2 backdrop-blur sm:grid-cols-3 lg:grid-cols-5">
            <HeroMetric icon={Flame} color="orange" label="Current streak" value={data.overview.currentStreakDays} unit="days" />
            <HeroMetric icon={Zap} color="pink" label="Max streak" value={data.overview.maxStreakDays} unit="days" />
            <div className="col-span-2 sm:col-span-1">
              <HeroMetric icon={Clock} color="cyan" label="Total focus" value={(data.overview.totalMinutes / 60).toFixed(1)} unit="hours" wide />
            </div>
            <HeroMetric icon={Trophy} color="purple" label="Sessions" value={data.overview.totalSessions} unit="logged" />
            <HeroMetric icon={Users} color="green" label="Friends" value={data.overview.friendCount} unit="connected" />
          </div>
        )}
      </div>

      {!data.canViewDetails ? (
        <div className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
          Detailed stats are visible to friends only.
        </div>
      ) : (
        <>
          <div className="mb-6 inline-flex items-center gap-1 rounded-2xl bg-muted/60 p-1">
            {(["overview", "sessions", "insights"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  tab === item ? "bg-card text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {tab === "overview" && data.overview && (
            <OverviewTab
              snapshot={{
                totalHoursLabel: `${(data.overview.totalMinutes / 60).toFixed(1)}h`,
                totalSessions: data.overview.totalSessions,
                avgSessionLabel: formatDuration(data.overview.avgSessionMinutes),
                longestLabel: formatDuration(data.overview.longestSession),
                avgMoodLabel: data.overview.avgMood > 0 ? data.overview.avgMood.toFixed(1) : "—",
                goalHours: pubGoalHours,
                weekHoursLabel: `${(data.overview.thisWeekMinutes / 60).toFixed(1)}h`,
                goalPct: Math.min(100, Math.round((data.overview.thisWeekMinutes / 60 / pubGoalHours) * 100)),
              }}
              subjects={publicSubjectStats}
              dailyTotals={heatmapDailyTotals}
            />
          )}

          {tab === "sessions" && (
            <section className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h3>
                  <div className="grid gap-3">
                    {group.items.map((session) => (
                      <div key={session.id} className="glass-card flex items-center gap-4 rounded-2xl p-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            color: subjectColor(subjectToneFromId(session.subjectId)),
                            backgroundColor: `color-mix(in oklch, ${subjectColor(subjectToneFromId(session.subjectId))} 16%, transparent)`,
                          }}
                        >
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{session.subjectName}</p>
                          <p className="truncate text-xs text-muted-foreground">{session.topic || "Session"} · {new Date(session.startedAt).toLocaleString()}</p>
                        </div>
                        <span className="ml-auto shrink-0 text-sm font-semibold text-foreground">{formatDuration(session.durationMin)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
              {data?.sessionsHasMore && (
                <button
                  type="button"
                  onClick={handleLoadMoreSessions}
                  disabled={loadingMore}
                  className="mt-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : `Load more · ${data.sessionsTotal - (data.sessions?.length ?? 0)} remaining`}
                </button>
              )}
              {!data?.sessionsHasMore && (data?.sessionsTotal ?? 0) > 0 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">All {data!.sessionsTotal} sessions loaded</p>
              )}
            </section>
          )}

          {tab === "insights" && (
            <div>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 sm:w-auto sm:flex">
                    {(["week", "month", "all"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => { setMode(p); setOffset(0); }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${mode === p ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        style={mode === p ? { boxShadow: "var(--shadow-sm)" } : undefined}>
                        {p === "week" ? "Week" : p === "month" ? "Month" : "All Time"}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setCalendarOpen(true)}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:w-auto">
                    <Calendar className="h-4 w-4" /><span>Calendar</span>
                  </button>
                </div>
              </div>

              <div className="glass-card mb-6 rounded-2xl p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between sm:mb-5">
                  <button type="button" onClick={() => setOffset((o) => o - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                    style={{ boxShadow: "var(--shadow-sm)" }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 px-2 text-center">
                    <h2 className="truncate text-base font-bold text-foreground sm:text-lg">{periodLabel}</h2>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {mode === "week" ? "Weekly" : mode === "month" ? "Monthly" : "Yearly"} Overview
                    </p>
                  </div>
                  <button type="button" onClick={() => setOffset((o) => Math.min(o + 1, 0))} disabled={!canGoForward}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ boxShadow: "var(--shadow-sm)" }}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-2 sm:mb-5 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <Clock className="mx-auto mb-1 h-4 w-4 text-neon-cyan" />
                    <div className="text-base font-bold text-foreground sm:text-lg">{formatDuration(totalMinutes)}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <BarChart3 className="mx-auto mb-1 h-4 w-4 text-neon-green" />
                    <div className="text-base font-bold text-foreground sm:text-lg">{formatDuration(dailyAvg)}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Daily Avg</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <div className="mx-auto mb-1 text-sm">📅</div>
                    <div className="text-base font-bold text-foreground sm:text-lg">{uniqueDays}{mode === "week" ? "/7" : ""}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Days Active</div>
                  </div>
                </div>
                <h3 className="mb-3 font-semibold text-foreground">Study Hours</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weekBars} barCategoryGap={mode === "month" ? "10%" : "20%"}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} interval={mode === "month" ? 6 : 0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} domain={[0, Math.ceil(maxHours)]} tickFormatter={(v: number) => `${v}h`} />
                    <Tooltip cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as { name: string; minutes: number; tooltipLabel?: string };
                        return <div className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground" style={{ boxShadow: "var(--shadow-md)" }}>{d.tooltipLabel || d.name}: {formatDuration(d.minutes)}</div>;
                      }} />
                    {avgLineHours > 0 && <ReferenceLine y={avgLineHours} stroke="var(--color-neon-green)" strokeDasharray="4 4" ifOverflow="extendDomain" />}
                    <Bar dataKey="hours" radius={[mode === "month" ? 2 : 6, mode === "month" ? 2 : 6, 0, 0]}>
                      {weekBars.map((entry, idx) => <Cell key={idx} fill={entry.isToday ? "var(--color-primary)" : entry.hours > 0 ? "var(--color-neon-purple)" : "var(--color-muted)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-xs text-muted-foreground">{mode === "all" ? "Monthly avg line" : "Daily avg line"}: {avgLineHours.toFixed(1)}h</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                {(([
                  { icon: Clock, value: formatDuration(totalMinutes), label: "Total", color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
                  { icon: BarChart3, value: formatDuration(dailyAvg), label: "Daily Avg", color: "text-neon-purple", bg: "bg-neon-purple/10" },
                  { icon: Crown, value: bestSubjectByTime ? <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{bestSubjectByTime.name}</div> : "—", label: "Best Subject", color: "text-neon-green", bg: "bg-neon-green/10" },
                  { icon: Trophy, value: formatDuration(longestSession), label: "Longest", color: "text-neon-orange", bg: "bg-neon-orange/10" },
                  { icon: Star, value: bestDay !== "—" ? <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{bestDay}</div> : "—", label: bestDay !== "—" ? `Best Day : ${formatDuration(bestDayMinutes)}` : "Best Day", labelSentenceCase: true, color: "text-neon-pink", bg: "bg-neon-pink/10" },
                  { icon: Calendar, value: secondBestDay !== "—" ? <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{secondBestDay}</div> : "—", label: secondBestDay !== "—" ? `2nd Best Day : ${formatDuration(secondBestDayMinutes)}` : "2nd Best Day", labelSentenceCase: true, color: "text-neon-purple", bg: "bg-neon-purple/10" },
                ] satisfies Array<{ icon: typeof Clock; value: ReactNode; label: string; color: string; bg: string; labelSentenceCase?: boolean }>)).map(({ icon: Icon, value, label, color, bg, labelSentenceCase }) => (
                  <div key={label} className="stat-card rounded-2xl p-3 text-center sm:p-4">
                    <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">{value}</div>
                    <div className={labelSentenceCase ? "mt-0.5 text-xs font-medium tabular-nums tracking-normal text-muted-foreground" : "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {insightsPieData.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-2">
                    <h2 className="mb-4 font-semibold text-foreground">By Subject</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={insightsPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {insightsPieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const item = payload[0]?.payload as { name: string; value: number } | undefined;
                          if (!item) return null;
                          const pct = insightsPieTotal > 0 ? Math.round((item.value / insightsPieTotal) * 100) : 0;
                          return <div style={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", padding: "10px 12px" }}><p>Subject: {item.name}</p><p>Percentage: {pct}%</p><p>Hours: {formatDuration(item.value)}</p></div>;
                        }} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
                      {insightsPieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2 text-sm">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="font-medium text-foreground">{d.name}</span>
                          <span className="text-muted-foreground">{insightsPieTotal > 0 ? Math.round((d.value / insightsPieTotal) * 100) : 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="glass-card rounded-2xl p-4 sm:p-5">
                    <h2 className="mb-4 font-semibold text-foreground">Productivity</h2>
                    <div className="flex flex-wrap items-center justify-around gap-y-3 sm:flex-nowrap sm:gap-y-0">
                      <div className="text-center">
                        <div className="text-2xl">☀️</div>
                        <div className="text-2xl font-bold text-foreground">{avgMood}</div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg. Mood</div>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{ratedSessions.length}</div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rated</div>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-neon-green">{moodLabel}</div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Overall</div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card rounded-2xl p-4 sm:p-5">
                    <h2 className="mb-3 font-semibold text-foreground">Peak Performance</h2>
                    <div className="py-4 text-center">
                      <div className="mb-2 text-2xl sm:text-3xl">{peakLabel}</div>
                      <p className="text-xs text-muted-foreground sm:text-sm">Most productive around {peakHour}:00 – {(peakHour + 3) % 24}:00</p>
                    </div>
                  </div>
                </div>
              </div>

              <HeatmapCard dailyTotals={heatmapDailyTotals} />
            </div>
          )}
        </>
      )}
      <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} sessions={normalizedSessions} />
    </div>
  );
}

function groupSessions(sessions: PublicProfileSessionEntry[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const groups: Array<{ label: string; items: PublicProfileSessionEntry[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  sessions.forEach((session) => {
    const d = new Date(session.startedAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].items.push(session);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(session);
    else groups[2].items.push(session);
  });
  return groups.filter((g) => g.items.length > 0);
}

function mergeUniqueSessions(
  base: PublicProfileSessionEntry[],
  incoming: PublicProfileSessionEntry[],
): PublicProfileSessionEntry[] {
  if (!incoming.length) return base;
  const seen = new Set(base.map((s) => s.id));
  const merged = [...base];
  for (const session of incoming) {
    if (seen.has(session.id)) continue;
    seen.add(session.id);
    merged.push(session);
  }
  return merged;
}

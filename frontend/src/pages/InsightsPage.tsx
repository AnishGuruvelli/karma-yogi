import { useState, useMemo, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ReferenceLine } from "recharts";
import { Clock, BarChart3, Crown, Trophy, Star, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { CalendarModal } from "@/components/CalendarModal";
import { HeatmapCard } from "@/components/HeatmapCard";
import { fromLocalDateKey, toLocalDateKey } from "@/lib/date";
import { getSafeSubjectIcon } from "@/lib/subject-icon";

type PeriodMode = "week" | "month" | "all";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function InsightsPage() {
  const { sessions, subjects } = useStore();
  const [mode, setMode] = useState<PeriodMode>("week");
  const [offset, setOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const now = useMemo(() => new Date(), []);

  const { start, end, periodLabel } = useMemo(() => {
    if (mode === "all") {
      const yearStart = new Date(now.getFullYear() + offset, 0, 1);
      const yearEnd = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
      const label = offset === 0 ? String(now.getFullYear()) : String(now.getFullYear() + offset);
      return { start: yearStart, end: yearEnd, periodLabel: label };
    }
    if (mode === "month") {
      const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const e = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
      const label = s.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
      return { start: s, end: e, periodLabel: label };
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
      sessions.filter((s) => {
        const d = fromLocalDateKey(s.date);
        return d >= start && d <= end;
      }),
    [sessions, start, end],
  );

  const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
  const uniqueDays = new Set(filteredSessions.map((s) => s.date)).size;
  const dailyAvg = uniqueDays > 0 ? totalMinutes / uniqueDays : 0;
  const longestSession = filteredSessions.length > 0 ? Math.max(...filteredSessions.map((s) => s.duration)) : 0;

  const bestSubjectByTime = useMemo(() => {
    const byId = new Map<string, number>();
    for (const s of filteredSessions) {
      byId.set(s.subjectId, (byId.get(s.subjectId) || 0) + s.duration);
    }
    const ranked = [...byId.entries()]
      .map(([subjectId, minutes]) => ({
        minutes,
        name: subjects.find((sub) => sub.id === subjectId)?.name ?? "Unknown",
      }))
      .sort((a, b) => b.minutes - a.minutes);
    return ranked[0] ?? null;
  }, [filteredSessions, subjects]);

  const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayTotalsByWeekday = useMemo(() => {
    const dailyTotals = new Map<string, number>();
    filteredSessions.forEach((s) => {
      dailyTotals.set(s.date, (dailyTotals.get(s.date) || 0) + s.duration);
    });

    const totals = Array(7).fill(0) as number[];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(end);
    endCursor.setHours(0, 0, 0, 0);

    while (cursor <= endCursor) {
      const dateStr = toLocalDateKey(cursor);
      const mondayFirstIndex = (cursor.getDay() + 6) % 7;
      totals[mondayFirstIndex] += dailyTotals.get(dateStr) || 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return totals;
  }, [filteredSessions, start, end]);

  const { bestDay, bestDayMinutes, secondBestDay, secondBestDayMinutes } = useMemo(() => {
    const totals = dayTotalsByWeekday;
    const maxVal = Math.max(...totals, 0);
    if (maxVal <= 0) {
      return { bestDay: "—", bestDayMinutes: 0, secondBestDay: "—", secondBestDayMinutes: 0 };
    }
    const bestIdx = totals.indexOf(maxVal);
    const bestDay = weekdayNames[bestIdx];
    const bestDayMinutes = totals[bestIdx];

    const distinct = [...new Set(totals)].filter((t) => t > 0).sort((a, b) => b - a);
    if (distinct.length < 2) {
      return { bestDay, bestDayMinutes, secondBestDay: "—", secondBestDayMinutes: 0 };
    }
    const target = distinct[1];
    const secondIdx = totals.findIndex((t) => t === target);
    return {
      bestDay,
      bestDayMinutes,
      secondBestDay: secondIdx >= 0 ? weekdayNames[secondIdx] : "—",
      secondBestDayMinutes: secondIdx >= 0 ? totals[secondIdx] : 0,
    };
  }, [dayTotalsByWeekday]);

  const formatDuration = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = Math.round(m % 60);
    if (h > 0) return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    return `${mins}m`;
  };

  const barData = useMemo(() => {
    if (mode === "week") {
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return dayNames.map((name, i) => {
        const targetDate = new Date(start);
        targetDate.setDate(targetDate.getDate() + i);
        const dateStr = toLocalDateKey(targetDate);
        const mins = filteredSessions.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
        const isToday = dateStr === toLocalDateKey(now);
        return {
          name,
          hours: +(mins / 60).toFixed(1),
          minutes: mins,
          isToday,
          tooltipLabel: targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        };
      });
    }
    if (mode === "month") {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const targetDate = new Date(start.getFullYear(), start.getMonth(), day);
        const dateStr = toLocalDateKey(targetDate);
        const mins = filteredSessions.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
        const isToday = dateStr === toLocalDateKey(now);
        return {
          name: String(day),
          hours: +(mins / 60).toFixed(1),
          minutes: mins,
          isToday,
          tooltipLabel: targetDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        };
      });
    }
    return MONTH_LABELS.map((name, i) => {
      const monthStart = new Date(start.getFullYear(), i, 1);
      const monthEnd = new Date(start.getFullYear(), i + 1, 0, 23, 59, 59, 999);
      const mins = sessions
        .filter((s) => {
          const d = fromLocalDateKey(s.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, s) => sum + s.duration, 0);
      const isCurrentMonth = i === now.getMonth() && start.getFullYear() === now.getFullYear();
      return {
        name,
        hours: +(mins / 60).toFixed(1),
        minutes: mins,
        isToday: isCurrentMonth,
        tooltipLabel: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });
  }, [mode, filteredSessions, sessions, start, now]);

  const maxHours = Math.max(...barData.map((d) => d.hours), 0.5);
  const avgLineHours = useMemo(() => {
    if (mode === "all") {
      const activeMonths = barData.filter((d) => d.hours > 0).length;
      if (activeMonths === 0) return 0;
      return +(totalMinutes / 60 / activeMonths).toFixed(2);
    }
    return +(dailyAvg / 60).toFixed(2);
  }, [mode, totalMinutes, dailyAvg, barData]);

  const piePalette = ["#22d3ee", "#4ade80", "#fb923c", "#f472b6", "#a78bfa", "#facc15", "#34d399", "#f87171"];
  const pieData = subjects
    .map((sub, index) => {
      const mins = filteredSessions.filter((s) => s.subjectId === sub.id).reduce((sum, s) => sum + s.duration, 0);
      return {
        name: `${getSafeSubjectIcon(sub.icon, sub.name.charAt(0) || "📘")} ${sub.name}`,
        value: mins,
        color: piePalette[index % piePalette.length] || "#cbd5e1",
      };
    })
    .filter((d) => d.value > 0);
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  const ratedSessions = filteredSessions.filter((s) => s.moodRating > 0);
  const avgMood =
    ratedSessions.length > 0
      ? (ratedSessions.reduce((sum, s) => sum + s.moodRating, 0) / ratedSessions.length).toFixed(1)
      : "—";
  const moodLabel = ratedSessions.length === 0 ? "—" : Number(avgMood) >= 4 ? "Great" : Number(avgMood) >= 3 ? "Good" : Number(avgMood) >= 2 ? "Fair" : "Low";

  const heatmapDailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) map.set(s.date, (map.get(s.date) || 0) + s.duration);
    return map;
  }, [sessions]);

  const hourBuckets = Array(24).fill(0);
  filteredSessions.forEach((s) => {
    hourBuckets[parseInt(s.startTime.split(":")[0], 10)] += s.duration;
  });
  const maxHourBucket = Math.max(...hourBuckets);
  const peakHour = maxHourBucket > 0 ? hourBuckets.indexOf(maxHourBucket) : -1;
  const peakLabel =
    peakHour < 0 ? null : peakHour >= 21 || peakHour < 5 ? "🌙 Night Owl" : peakHour >= 5 && peakHour < 12 ? "☀️ Early Bird" : "🌤️ Afternoon Warrior";

  const hasData = filteredSessions.length > 0;
  const canGoForward = offset < 0;

  const handleModeChange = (newMode: PeriodMode) => {
    setMode(newMode);
    setOffset(0);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Insights</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="grid w-full grid-cols-3 rounded-xl bg-muted p-1 sm:w-auto sm:flex">
            {(["week", "month", "all"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleModeChange(p)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                  mode === p ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={mode === p ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                {p === "week" ? "Week" : p === "month" ? "Month" : "All Time"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:w-auto"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      <div className="glass-card mb-6 rounded-2xl p-4 sm:mb-8 sm:p-5">
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 px-2 text-center">
            <h2 className="truncate text-base font-bold text-foreground sm:text-lg">{periodLabel}</h2>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {mode === "week" ? "Weekly" : mode === "month" ? "Monthly" : "Yearly"} Overview
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(o + 1, 0))}
            disabled={!canGoForward}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {hasData ? (
          <>
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
                <div className="text-base font-bold text-foreground sm:text-lg">
                  {uniqueDays}
                  {mode === "week" ? "/7" : ""}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Days Active</div>
              </div>
            </div>

            <h3 className="mb-3 font-semibold text-foreground">Study Hours</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barCategoryGap={mode === "month" ? "10%" : "20%"}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  interval={mode === "month" ? 6 : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  domain={[0, Math.ceil(maxHours)]}
                  tickFormatter={(v: number) => `${v}h`}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground" style={{ boxShadow: "var(--shadow-md)" }}>
                        {(d.tooltipLabel as string) || d.name}: {formatDuration(d.minutes)}
                      </div>
                    );
                  }}
                />
                {avgLineHours > 0 && (
                  <ReferenceLine
                    y={avgLineHours}
                    stroke="var(--color-neon-green)"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                )}
                <Bar dataKey="hours" radius={[mode === "month" ? 2 : 6, mode === "month" ? 2 : 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.isToday ? "var(--color-primary)" : entry.hours > 0 ? "var(--color-neon-purple)" : "var(--color-muted)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "all" ? "Monthly avg line" : "Daily avg line"}: {avgLineHours.toFixed(1)}h
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 text-4xl">📭</div>
            <p className="text-sm font-semibold text-foreground">No sessions {mode === "week" ? "this week" : mode === "month" ? "this month" : "this year"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Log a study session to see your insights here.</p>
          </div>
        )}
      </div>

      {hasData && <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {(
          [
            { icon: Clock, value: formatDuration(totalMinutes), label: "Total", color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
            { icon: BarChart3, value: formatDuration(dailyAvg), label: "Daily Avg", color: "text-neon-purple", bg: "bg-neon-purple/10" },
            {
              icon: Crown,
              value: bestSubjectByTime ? (
                <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{bestSubjectByTime.name}</div>
              ) : (
                "—"
              ),
              label: "Best Subject",
              color: "text-neon-green",
              bg: "bg-neon-green/10",
            },
            { icon: Trophy, value: formatDuration(longestSession), label: "Longest", color: "text-neon-orange", bg: "bg-neon-orange/10" },
            {
              icon: Star,
              value:
                bestDay !== "—" ? (
                  <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{bestDay}</div>
                ) : (
                  "—"
                ),
              label: bestDay !== "—" ? `Best Day : ${formatDuration(bestDayMinutes)}` : "Best Day",
              labelSentenceCase: true,
              color: "text-neon-pink",
              bg: "bg-neon-pink/10",
            },
            {
              icon: Calendar,
              value:
                secondBestDay !== "—" ? (
                  <div className="truncate px-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">{secondBestDay}</div>
                ) : (
                  "—"
                ),
              label: secondBestDay !== "—" ? `2nd Best Day : ${formatDuration(secondBestDayMinutes)}` : "2nd Best Day",
              labelSentenceCase: true,
              color: "text-neon-purple",
              bg: "bg-neon-purple/10",
            },
          ] satisfies ReadonlyArray<{
            icon: typeof Clock;
            value: ReactNode;
            label: string;
            color: string;
            bg: string;
            labelSentenceCase?: boolean;
          }>
        ).map(({ icon: Icon, value, label, color, bg, labelSentenceCase }) => (
          <div key={label} className="stat-card rounded-2xl p-3 text-center sm:p-4">
            <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">{value}</div>
            <div
              className={
                labelSentenceCase
                  ? "mt-0.5 text-xs font-medium tabular-nums tracking-normal text-muted-foreground"
                  : "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              }
            >
              {label}
            </div>
          </div>
        ))}
      </div>}

      {hasData && <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {pieData.length > 0 && (
          <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold text-foreground">By Subject</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3} dataKey="value">
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0]?.payload as { name: string; value: number } | undefined;
                    if (!item) return null;
                    const percentage = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;
                    return (
                      <div
                        style={{
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          color: "var(--color-foreground)",
                          padding: "10px 12px",
                        }}
                      >
                        <p>Subject: {item.name}</p>
                        <p>Percentage: {percentage}%</p>
                        <p>Hours: {formatDuration(item.value)}</p>
                      </div>
                    );
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    color: "var(--color-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-medium text-foreground">{d.name}</span>
                  <span className="text-muted-foreground">{pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%</span>
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
              <p className="text-xs text-muted-foreground sm:text-sm">
                Most productive around {peakHour}:00 – {(peakHour + 3) % 24}:00
              </p>
            </div>
          </div>
        </div>
      </div>}

      <HeatmapCard dailyTotals={heatmapDailyTotals} />

      <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} sessions={sessions} />
    </div>
  );
}

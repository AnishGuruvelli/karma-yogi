import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ReferenceLine } from "recharts";
import { Clock, BarChart3, BookOpen, List, Trophy, Star, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { CalendarModal } from "@/components/CalendarModal";
import { fromLocalDateKey, toLocalDateKey } from "@/lib/date";

type PeriodMode = "week" | "month" | "all";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function InsightsPage() {
  const { sessions, subjects } = useStore();
  const [mode, setMode] = useState<PeriodMode>("week");
  const [offset, setOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [heatmapYear, setHeatmapYear] = useState(2026);

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
  const activeSubjects = new Set(filteredSessions.map((s) => s.subjectId)).size;
  const longestSession = filteredSessions.length > 0 ? Math.max(...filteredSessions.map((s) => s.duration)) : 0;

  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
      totals[cursor.getDay()] += dailyTotals.get(dateStr) || 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return totals;
  }, [filteredSessions, start, end]);

  const bestDay = dayTotalsByWeekday.some((x) => x > 0)
    ? weekdayNames[dayTotalsByWeekday.indexOf(Math.max(...dayTotalsByWeekday))]
    : "—";

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
        return { name, hours: +(mins / 60).toFixed(1), minutes: mins, isToday };
      });
    }
    if (mode === "month") {
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const mins = filteredSessions.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
        const isToday = dateStr === toLocalDateKey(now);
        return { name: String(day), hours: +(mins / 60).toFixed(1), minutes: mins, isToday };
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
      return { name, hours: +(mins / 60).toFixed(1), minutes: mins, isToday: isCurrentMonth };
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

  const colorMap: Record<string, string> = {
    green: "#4ade80",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    purple: "#a78bfa",
  };
  const pieData = subjects
    .map((sub) => {
      const mins = filteredSessions.filter((s) => s.subjectId === sub.id).reduce((sum, s) => sum + s.duration, 0);
      return { name: `${sub.icon} ${sub.name}`, value: mins, color: colorMap[sub.color] || "#888" };
    })
    .filter((d) => d.value > 0);
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  const ratedSessions = filteredSessions.filter((s) => s.moodRating > 0);
  const avgMood =
    ratedSessions.length > 0
      ? (ratedSessions.reduce((sum, s) => sum + s.moodRating, 0) / ratedSessions.length).toFixed(1)
      : "—";
  const moodLabel = Number(avgMood) >= 4 ? "Great" : Number(avgMood) >= 3 ? "Good" : Number(avgMood) >= 2 ? "Fair" : "Low";

  const heatmapData = useMemo(() => {
    const dailyTotals = new Map<string, number>();
    sessions.forEach((session) => {
      dailyTotals.set(session.date, (dailyTotals.get(session.date) || 0) + session.duration);
    });

    const startDate = new Date(heatmapYear, 0, 1);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(heatmapYear, 11, 31);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: { date: string; minutes: number; month: string; dayOfWeek: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = toLocalDateKey(cursor);
      days.push({
        date: dateStr,
        minutes: dailyTotals.get(dateStr) || 0,
        month: cursor.toLocaleDateString("en-US", { month: "short" }),
        dayOfWeek: cursor.getDay(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
    const monthLabels = weeks.map((week, idx) => {
      const first = week[0];
      const prev = idx > 0 ? weeks[idx - 1][0] : null;
      if (!first) return "";
      if (!prev || prev.month !== first.month) return first.month;
      return "";
    });

    return { weeks, maxMinutes, monthLabels };
  }, [sessions, heatmapYear]);

  const hourBuckets = Array(24).fill(0);
  filteredSessions.forEach((s) => {
    hourBuckets[parseInt(s.startTime.split(":")[0], 10)] += s.duration;
  });
  const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
  const peakLabel =
    peakHour >= 21 || peakHour < 5 ? "🌙 Night Owl" : peakHour >= 5 && peakHour < 12 ? "☀️ Early Bird" : "🌤️ Afternoon Warrior";

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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
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
            <div className="text-base font-bold text-foreground sm:text-lg">
              {uniqueDays}
              {mode === "week" ? "/7" : ""}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Days Active</div>
          </div>
        </div>

        <h3 className="mb-3 font-semibold text-foreground">Study Hours</h3>
        <ResponsiveContainer width="100%" height={180}>
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
                    {d.name}: {formatDuration(d.minutes)}
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
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {[
          { icon: Clock, value: formatDuration(totalMinutes), label: "Total", color: "text-neon-cyan", bg: "bg-neon-cyan/10" },
          { icon: BarChart3, value: formatDuration(dailyAvg), label: "Daily Avg", color: "text-neon-purple", bg: "bg-neon-purple/10" },
          { icon: BookOpen, value: String(activeSubjects), label: "Subjects", color: "text-neon-green", bg: "bg-neon-green/10" },
          { icon: List, value: String(filteredSessions.length), label: "Sessions", color: "text-neon-orange", bg: "bg-neon-orange/10" },
          { icon: Trophy, value: formatDuration(longestSession), label: "Longest", color: "text-neon-orange", bg: "bg-neon-orange/10" },
          { icon: Star, value: bestDay, label: "Best Day", color: "text-neon-pink", bg: "bg-neon-pink/10" },
        ].map(({ icon: Icon, value, label, color, bg }) => (
          <div key={label} className="stat-card rounded-2xl p-3 text-center sm:p-4">
            <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">{value}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {pieData.length > 0 && (
          <div className="glass-card rounded-2xl p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold text-foreground">By Subject</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
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
            <div className="flex items-center justify-around">
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
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-foreground">Focus Heatmap</h2>
          <div className="flex items-center rounded-xl bg-muted p-1">
            {[2025, 2026].map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setHeatmapYear(year)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  heatmapYear === year ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={heatmapYear === year ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[680px] sm:min-w-0">
            <div className="mb-2 grid grid-cols-[26px_1fr] gap-1">
              <div />
              <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-[2px] text-[9px] text-muted-foreground">
                {heatmapData.monthLabels.map((label, i) => (
                  <span key={`${label}-${i}`} className="col-span-4">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[26px_1fr] gap-1">
              <div className="flex flex-col justify-between py-[1px] text-[9px] text-muted-foreground">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-[2px]">
                {heatmapData.weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-[2px]">
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const day = week[dayIdx];
                      if (!day) {
                        return <div key={`empty-${weekIndex}-${dayIdx}`} className="aspect-square w-full" />;
                      }

                      const ratio = day.minutes / heatmapData.maxMinutes;
                      let bg = "oklch(0.95 0.01 255)";
                      if (day.minutes > 0 && ratio <= 0.25) bg = "oklch(0.88 0.08 170)";
                      else if (ratio > 0.25 && ratio <= 0.5) bg = "oklch(0.78 0.12 165)";
                      else if (ratio > 0.5 && ratio <= 0.75) bg = "oklch(0.68 0.16 160)";
                      else if (ratio > 0.75) bg = "oklch(0.58 0.19 155)";

                      return (
                        <div key={day.date} className="group relative aspect-square w-full">
                          <div className="h-full w-full rounded-[2px] border border-black/5" style={{ backgroundColor: bg }} />
                          <div className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            {formatDuration(day.minutes)} studied on{" "}
                            {new Date(day.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
              <span>Less</span>
              {["oklch(0.95 0.01 255)", "oklch(0.88 0.08 170)", "oklch(0.78 0.12 165)", "oklch(0.68 0.16 160)", "oklch(0.58 0.19 155)"].map(
                (c) => (
                  <span key={c} className="h-[10px] w-[10px] rounded-[2px] border border-black/5" style={{ backgroundColor: c }} />
                ),
              )}
              <span>More</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {heatmapYear} contribution-style activity
        </p>
      </div>

      <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} sessions={sessions} />
    </div>
  );
}

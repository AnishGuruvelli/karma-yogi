import { useEffect, useMemo, useState, type CSSProperties, type ComponentType } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Flame,
  Clock,
  Trophy,
  Award,
  CalendarCheck,
  Check,
  TrendingUp,
  Sparkles,
  MapPin,
  GraduationCap,
  Calendar,
  BarChart3,
  BookOpen,
  List,
  Star,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { fetchPublicProfileDetails } from "@/lib/api";
import { UserAvatar } from "@/components/UserAvatar";
import type { PublicProfileDetails, PublicProfileSessionEntry } from "@/lib/types";
import { subjectColor } from "@/lib/colors";

type TabKey = "overview" | "sessions" | "insights";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
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
  const [data, setData] = useState<PublicProfileDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    void fetchPublicProfileDetails(userId)
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Unable to fetch profile details");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const grouped = useMemo(() => groupSessions(data?.sessions ?? []), [data?.sessions]);
  const weekBars = useMemo(() => {
    const weekly = data?.insights?.weeklyMinutes ?? [];
    const last = weekly.slice(-7);
    const labels = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
    return last.map((x, i) => ({
      name: labels[Math.max(0, labels.length - last.length + i)],
      minutes: x.minutes,
      hours: +(x.minutes / 60).toFixed(2),
      isLatest: i === last.length - 1,
    }));
  }, [data?.insights?.weeklyMinutes]);
  const subjectPie = useMemo(() => {
    const colorKeys = ["cyan", "green", "orange", "pink", "purple"] as const;
    return (data?.insights?.subjectBreakdown ?? []).slice(0, 6).map((item, idx) => ({
      ...item,
      color: subjectColor(colorKeys[idx % colorKeys.length]),
    }));
  }, [data?.insights?.subjectBreakdown]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">Loading profile...</div>;
  }
  if (error) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-destructive">{error}</div>;
  }
  if (!data) return null;

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
            <section className="space-y-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stats</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={Flame} label="Current Streak" value={`${data.overview.currentStreakDays}`} sub="days" color="var(--neon-orange)" />
                <StatCard icon={Award} label="Max Streak" value={`${data.overview.maxStreakDays}`} sub="days" color="var(--neon-pink)" />
                <StatCard icon={Clock} label="Total Studied" value={formatDuration(data.overview.totalMinutes)} sub={`avg ${formatDuration(data.overview.avgSessionMinutes)}`} color="var(--neon-cyan)" />
                <StatCard icon={Trophy} label="Sessions" value={`${data.overview.totalSessions}`} sub={`longest ${formatDuration(data.overview.longestSession)}`} color="var(--neon-purple)" />
                <StatCard icon={CalendarCheck} label="Active Days" value={`${data.overview.activeDays}`} sub="logged" color="var(--neon-green)" />
                <StatCard icon={Clock} label="This Week" value={formatDuration(data.overview.thisWeekMinutes)} sub="of focus" color="var(--primary)" />
              </div>
              <div className="glass-card rounded-2xl p-5">
                <p className="mb-1 text-lg font-semibold text-foreground">Focus Heatmap</p>
                <p className="mb-3 text-xs text-muted-foreground">{data.overview.activeDays} active days</p>
                <HeatmapGrid heatmap={data.heatmap ?? {}} />
              </div>
            </section>
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
            </section>
          )}

          {tab === "insights" && data.insights && (
            <section className="space-y-6">
              <div className="glass-card rounded-2xl p-5">
                <h3 className="mb-4 font-semibold text-foreground">This Week's Study Hours</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekBars}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as { name: string; minutes: number };
                        return (
                          <div className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground" style={{ boxShadow: "var(--shadow-md)" }}>
                            {d.name}: {formatDuration(d.minutes)}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {weekBars.map((entry, idx) => (
                        <Cell key={idx} fill={entry.isLatest ? "var(--color-primary)" : entry.hours > 0 ? "var(--color-neon-purple)" : "var(--color-muted)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MiniStat icon={Clock} value={formatDuration(data.overview?.totalMinutes ?? 0)} label="Total" color="text-neon-cyan" bg="bg-neon-cyan/10" />
                <MiniStat icon={BarChart3} value={formatDuration(data.overview?.avgSessionMinutes ?? 0)} label="Avg Session" color="text-neon-purple" bg="bg-neon-purple/10" />
                <MiniStat icon={BookOpen} value={`${(data.insights?.subjectBreakdown ?? []).length}`} label="Subjects" color="text-neon-green" bg="bg-neon-green/10" />
                <MiniStat icon={List} value={`${data.overview?.totalSessions ?? 0}`} label="Sessions" color="text-neon-orange" bg="bg-neon-orange/10" />
                <MiniStat icon={Trophy} value={formatDuration(data.overview?.longestSession ?? 0)} label="Longest" color="text-neon-orange" bg="bg-neon-orange/10" />
                <MiniStat icon={Star} value={data.insights?.bestDayDateKey || "-"} label="Best Day" color="text-neon-pink" bg="bg-neon-pink/10" />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {subjectPie.length > 0 && (
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="mb-4 font-semibold text-foreground">By Subject</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={subjectPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="minutes">
                          {subjectPie.map((d) => <Cell key={d.subjectId} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-4">
                      {subjectPie.map((d) => {
                        const total = subjectPie.reduce((sum, x) => sum + x.minutes, 0);
                        return (
                          <div key={d.subjectId} className="flex items-center gap-2 text-sm">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="font-medium text-foreground">{d.subjectName}</span>
                            <span className="text-muted-foreground">{total > 0 ? Math.round((d.minutes / total) * 100) : 0}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="glass-card rounded-2xl p-5">
                  <h2 className="mb-4 font-semibold text-foreground">Peak Performance</h2>
                  <div className="py-6 text-center">
                    <div className="mb-2 text-3xl">⚡</div>
                    <p className="text-sm text-muted-foreground">
                      Most productive around {String(data.insights?.peakHourLocal ?? 0).padStart(2, "0")}:00
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Best day: {data.insights?.bestDayDateKey || "-"} · {formatDuration(data.insights?.bestDayMinutes ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
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

function HeatmapGrid({ heatmap }: { heatmap: Record<string, number> }) {
  const entries = Object.entries(heatmap).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-84);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="grid grid-cols-12 gap-1 sm:grid-cols-14">
      {entries.map(([day, value]) => {
        const intensity = Math.max(0.12, value / max);
        return <div key={day} title={`${day}: ${value} min`} className="h-4 rounded-sm bg-primary" style={{ opacity: intensity }} />;
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)` }}>
          <Icon className="h-[18px] w-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      <p className="mt-1 text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  color,
  bg,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="stat-card rounded-2xl p-4 text-center">
      <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="text-lg font-bold tracking-tight text-foreground">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

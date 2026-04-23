import { useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Flame, Sun, Calendar, Play, Plus, Pencil } from "lucide-react";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";
import { GoalEditModal } from "@/components/GoalEditModal";
import { currentStreakUntilToday } from "@/lib/stats";
import { fromLocalDateKey, toLocalDateKey } from "@/lib/date";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user, sessions, subjects, goal, getSubject } = useStore();
  const [timerOpen, setTimerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const today = toLocalDateKey(new Date());
  const todaySessions = sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const weekSessions = sessions.filter((s) => fromLocalDateKey(s.date) >= startOfWeek);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

  const weekBySubject = subjects
    .map((sub) => {
      const mins = weekSessions.filter((s) => s.subjectId === sub.id).reduce((sum, s) => sum + s.duration, 0);
      return { ...sub, minutes: mins };
    })
    .filter((s) => s.minutes > 0);
  const totalWeekMins = weekBySubject.reduce((sum, s) => sum + s.minutes, 0);

  const missingSubjects = subjects.filter((sub) => !sessions.some((s) => s.subjectId === sub.id));
  const recentSessions = sessions.slice(0, 10);

  const formatDuration = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const formatSessionDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const colorMap: Record<string, string> = {
    green: "#4ade80",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    purple: "#a78bfa",
  };

  const weekHours = weekMinutes / 60;
  const goalProgress = Math.min(weekHours / goal.targetHours, 1);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference * (1 - goalProgress);
  const currentStreak = currentStreakUntilToday(sessions);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting()}, {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <motion.button
            type="button"
            onClick={() => setTimerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon-orange px-5 py-2.5 font-semibold text-white transition-all hover:opacity-90 neon-glow-orange sm:w-auto"
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <Play className="h-4 w-4" />
            Start Timer
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setLogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-all hover:opacity-90 sm:w-auto"
            style={{ boxShadow: "var(--shadow-md)" }}
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <Plus className="h-4 w-4" />
            Log Session
          </motion.button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card flex items-center gap-4 rounded-2xl p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-cyan/10">
            <Sun className="h-6 w-6 text-neon-cyan" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatDuration(todayMinutes)}</div>
            <div className="text-sm text-muted-foreground">Studied Today</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4 rounded-2xl p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-purple/10">
            <Calendar className="h-6 w-6 text-neon-purple" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatDuration(weekMinutes)}</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4 rounded-2xl p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-orange/10">
            <Flame className="h-6 w-6 text-neon-orange" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{currentStreak} days</div>
            <div className="text-sm text-muted-foreground">Current Streak 🔥</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {totalWeekMins > 0 && (
              <div className={`glass-card rounded-2xl p-5 ${missingSubjects.length === 0 ? "sm:col-span-2" : ""}`}>
                <h2 className="mb-3 font-semibold text-foreground">This Week by Subject</h2>
                <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted">
                  {weekBySubject.map((s) => (
                    <div
                      key={s.id}
                      className="transition-all duration-500"
                      style={{
                        width: `${(s.minutes / totalWeekMins) * 100}%`,
                        backgroundColor: colorMap[s.color] || "#888",
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  {weekBySubject.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorMap[s.color] || "#888" }} />
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">{formatDuration(s.minutes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingSubjects.length > 0 && (
              <div className="glass-card flex items-center gap-3 rounded-2xl border-neon-orange/20 bg-neon-orange/5 p-5">
                <span className="text-2xl">✨</span>
                <p className="text-sm text-foreground">
                  You haven&apos;t logged any sessions for <strong>{missingSubjects[0].name}</strong> yet. Start today!
                </p>
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-foreground">Recent Sessions</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recentSessions.map((session) => {
                const subject = getSubject(session.subjectId);
                return (
                  <div key={session.id} className="rounded-xl bg-muted/40 p-3 transition-colors hover:bg-muted/70">
                    <div className="flex items-start gap-3">
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: colorMap[subject?.color || "cyan"] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{subject?.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{session.topic}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-neon-green">{formatDuration(session.duration)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center justify-end gap-1 text-xs text-muted-foreground">
                        {session.isManualLog ? "📝" : MOOD_EMOJIS[session.moodRating]}
                        <span>{formatSessionDate(session.date)} · {session.startTime}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Weekly Goal</h2>
              <button
                type="button"
                onClick={() => setGoalOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center py-4 sm:py-6">
              <svg width="170" height="170" viewBox="0 0 180 180" className="sm:h-[180px] sm:w-[180px]">
                <circle cx="90" cy="90" r="70" fill="none" stroke="var(--color-muted)" strokeWidth="10" />
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 90 90)"
                  className="transition-all duration-1000"
                />
                <text x="90" y="84" textAnchor="middle" className="fill-foreground font-bold" fontSize="30">
                  {weekHours.toFixed(1)}
                </text>
                <text x="90" y="106" textAnchor="middle" className="fill-muted-foreground" fontSize="14">
                  / {goal.targetHours}h
                </text>
              </svg>
            </div>
            <div className="text-center">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {Math.round(goalProgress * 100)}% complete
              </span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-3 font-semibold text-foreground">Subjects</h2>
            <div className="space-y-2.5">
              {subjects.map((sub) => {
                const count = sessions.filter((s) => s.subjectId === sub.id).length;
                const totalMins = sessions.filter((s) => s.subjectId === sub.id).reduce((sum, s) => sum + s.duration, 0);
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colorMap[sub.color] }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{sub.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {count} sessions · {formatDuration(totalMins)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TimerModal open={timerOpen} onClose={() => setTimerOpen(false)} onRequestOpen={() => setTimerOpen(true)} />
      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
      <GoalEditModal open={goalOpen} onClose={() => setGoalOpen(false)} />
    </div>
  );
}

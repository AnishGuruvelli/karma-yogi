import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import type { Session } from '@/lib/types';
import { fromLocalDateKey, toLocalDateKey } from '@/lib/date';

interface WeeklyStatsProps {
  sessions: Session[];
}

export function WeeklyStats({ sessions }: WeeklyStatsProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekLabel, barData, totalMinutes, avgMinutes, studyDays } = useMemo(() => {
    const now = new Date();
    const currentMonday = new Date(now);
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentMonday.setDate(now.getDate() - diff);
    currentMonday.setHours(0, 0, 0, 0);

    const start = new Date(currentMonday);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${startLabel} – ${endLabel}`;

    const weekSessions = sessions.filter(s => {
      const d = fromLocalDateKey(s.date);
      return d >= start && d <= end;
    });

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = dayNames.map((name, i) => {
      const targetDate = new Date(start);
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = toLocalDateKey(targetDate);
      const mins = weekSessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
      const isToday = dateStr === toLocalDateKey(now);
      return { name, hours: +(mins / 60).toFixed(1), minutes: mins, isToday };
    });

    const total = data.reduce((sum, d) => sum + d.minutes, 0);
    const daysWithStudy = data.filter(d => d.minutes > 0).length;
    const avg = daysWithStudy > 0 ? total / daysWithStudy : 0;

    return { weekLabel: label, barData: data, totalMinutes: total, avgMinutes: avg, studyDays: daysWithStudy };
  }, [sessions, weekOffset]);

  const formatDuration = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = Math.round(m % 60);
    if (h > 0) return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    return `${mins}m`;
  };

  const maxHours = Math.max(...barData.map(d => d.hours), 0.5);

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Week Navigator */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-semibold text-foreground">{weekLabel}</h2>
        <button
          onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <Clock className="mx-auto mb-1 h-4 w-4 text-neon-cyan" />
          <div className="text-lg font-bold text-foreground">{formatDuration(totalMinutes)}</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <TrendingUp className="mx-auto mb-1 h-4 w-4 text-neon-green" />
          <div className="text-lg font-bold text-foreground">{formatDuration(avgMinutes)}</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Daily Avg</div>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <div className="mx-auto mb-1 text-sm">📅</div>
          <div className="text-lg font-bold text-foreground">{studyDays}/7</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active</div>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={barData} barCategoryGap="20%">
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} domain={[0, Math.ceil(maxHours)]} tickFormatter={(v: number) => `${v}h`} />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
            {barData.map((entry, index) => (
              <Cell key={index} fill={entry.isToday ? 'var(--color-primary)' : entry.hours > 0 ? 'var(--color-neon-purple)' : 'var(--color-muted)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {barData.map(d => (
          <div key={d.name} className="text-center">
            <div className={`text-xs font-medium ${d.minutes > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
              {d.minutes > 0 ? formatDuration(d.minutes) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

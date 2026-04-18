import type { Session } from '@/lib/types';

function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function activeDaysUntilToday(sessions: Session[]): number {
  const today = todayDateStr();
  return new Set(sessions.filter((s) => s.date <= today).map((s) => s.date)).size;
}

export function currentStreakUntilToday(sessions: Session[]): number {
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  for (const cursor = new Date(todayDateStr()); ; cursor.setDate(cursor.getDate() - 1)) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!dates.has(key)) break;
    streak += 1;
  }
  return streak;
}

export function totalHours(sessions: Session[]): number {
  return +(sessions.reduce((sum, s) => sum + s.duration, 0) / 60).toFixed(1);
}

export function maxStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const uniqueDates = Array.from(new Set(sessions.map((s) => s.date))).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < uniqueDates.length; i += 1) {
    const prev = new Date(uniqueDates[i - 1]);
    const cur = new Date(uniqueDates[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
    } else if (diffDays > 1) {
      current = 1;
    }
    if (current > best) best = current;
  }
  return best;
}

import { useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import type { Session } from '@/lib/types';

interface StudyCalendarProps {
  sessions: Session[];
}

export function StudyCalendar({ sessions }: StudyCalendarProps) {
  const todayRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const studyDates = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => set.add(s.date));
    return set;
  }, [sessions]);

  const months = useMemo(() => {
    const result: { year: number; month: number; label: string }[] = [];
    const firstSessionDate = sessions.reduce<Date | null>((earliest, session) => {
      const sessionDate = new Date(session.date);
      if (Number.isNaN(sessionDate.getTime())) return earliest;
      return earliest === null || sessionDate < earliest ? sessionDate : earliest;
    }, null);

    const start = firstSessionDate
      ? new Date(firstSessionDate.getFullYear(), firstSessionDate.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);

    let cursor = new Date(start);
    while (cursor <= end) {
      const d = new Date(cursor);
      result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return result;
  }, [sessions, today]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ block: 'center' });
    }
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="max-h-[72vh] overflow-y-auto px-3 pb-6 sm:px-5">
        <div className="sticky top-0 z-10 -mx-3 grid grid-cols-7 border-b border-border bg-card px-3 py-3 sm:-mx-5 sm:px-5">
          {dayHeaders.map((d, i) => (
            <div key={i} className="text-center text-sm font-semibold text-foreground sm:text-base">{d}</div>
          ))}
        </div>
        <div className="space-y-7 py-5">
          {months.map(({ year, month, label }) => {
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfWeek(year, month);
            return (
              <div key={`${year}-${month}`}>
                <h3 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">{label}</h3>
                <div className="grid grid-cols-7 gap-y-2">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const hasStudy = studyDates.has(dateStr);
                    const isFuture = new Date(dateStr) > today;
                    return (
                      <div key={day} className="flex justify-center" ref={isToday ? todayRef : undefined}>
                        <div className={`relative flex h-10 w-10 items-center justify-center rounded-full text-base font-medium transition-all sm:h-12 sm:w-12 sm:text-lg ${
                          isToday
                            ? 'bg-slate-900 text-white font-semibold'
                            : isFuture
                              ? 'text-muted-foreground/30'
                              : hasStudy
                                ? 'bg-muted text-foreground'
                                : 'text-foreground'
                        }`}
                          style={isToday ? { boxShadow: 'var(--shadow-md)' } : undefined}
                        >
                          {day}
                          {hasStudy && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 sm:h-5 sm:w-5">
                              <Check className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MockCalendar({ dates }: { dates: string[] }) {
  const todayRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const mockCounts = useMemo(() => {
    const map = new Map<string, number>();
    dates.forEach((d) => map.set(d, (map.get(d) || 0) + 1));
    return map;
  }, [dates]);

  const months = useMemo(() => {
    const result: { year: number; month: number; label: string }[] = [];
    const firstDate = dates.length > 0 ? dates.reduce((min, d) => (d < min ? d : min)) : null;
    const start = firstDate
      ? new Date(new Date(firstDate).getFullYear(), new Date(firstDate).getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 1);
    let cursor = new Date(start);
    while (cursor <= end) {
      const d = new Date(cursor);
      result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return result;
  }, [dates, today]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    if (todayRef.current) todayRef.current.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="max-h-[72vh] overflow-y-auto px-3 pb-6 sm:px-5">
        <div className="sticky top-0 z-10 -mx-3 grid grid-cols-7 border-b border-border bg-card px-3 py-3 sm:-mx-5 sm:px-5">
          {dayHeaders.map((d, i) => (
            <div key={i} className="text-center text-sm font-semibold text-foreground sm:text-base">{d}</div>
          ))}
        </div>
        <div className="space-y-7 py-5">
          {months.map(({ year, month, label }) => {
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfWeek(year, month);
            return (
              <div key={`${year}-${month}`}>
                <h3 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">{label}</h3>
                <div className="grid grid-cols-7 gap-y-2">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = dateStr === todayStr;
                    const count = mockCounts.get(dateStr) ?? 0;
                    const isFuture = new Date(dateStr) > today;
                    return (
                      <div key={day} className="flex justify-center" ref={isToday ? todayRef : undefined}>
                        <div
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full text-base font-medium sm:h-12 sm:w-12 sm:text-lg ${
                            isToday
                              ? 'bg-slate-900 text-white font-semibold'
                              : isFuture
                                ? 'text-muted-foreground/30'
                                : count > 0
                                  ? 'bg-muted text-foreground'
                                  : 'text-foreground'
                          }`}
                          style={isToday ? { boxShadow: 'var(--shadow-md)' } : undefined}
                        >
                          {day}
                          {count > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white sm:h-5 sm:w-5 sm:text-[10px]">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {dates.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No mocks logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

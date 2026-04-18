import { useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import type { Session } from '@/lib/types';

interface StudyCalendarProps {
  sessions: Session[];
  monthsToShow?: number;
}

export function StudyCalendar({ sessions, monthsToShow = 6 }: StudyCalendarProps) {
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
    for (let i = monthsToShow - 1; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
    }
    return result;
  }, [monthsToShow, today]);

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
      <div className="max-h-[72vh] overflow-y-auto px-5 pb-6">
        <div className="sticky top-0 z-10 -mx-5 grid grid-cols-7 border-b border-border bg-card px-5 py-3">
          {dayHeaders.map((d, i) => (
            <div key={i} className="text-center text-base font-semibold text-foreground">{d}</div>
          ))}
        </div>
        <div className="space-y-7 py-5">
          {months.map(({ year, month, label }) => {
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfWeek(year, month);
            return (
              <div key={`${year}-${month}`}>
                <h3 className="mb-4 text-2xl font-bold text-foreground">{label}</h3>
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
                        <div className={`relative flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium transition-all ${
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
                            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
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

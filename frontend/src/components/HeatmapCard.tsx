import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { fromLocalDateKey } from "@/lib/date";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useStore } from "@/lib/store";
import type { Session, Subject } from "@/lib/types";

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (h > 0) return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  return `${mins}m`;
}

interface HeatmapCardProps {
  dailyTotals: Map<string, number>;
  sessions?: Session[];
  subjects?: Subject[];
  className?: string;
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_COL_W = 28; // px width for the day-label column

export const HeatmapCard = memo(function HeatmapCard({ dailyTotals, sessions, subjects, className }: HeatmapCardProps) {
  const { isDark } = useStore();
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear];
  const [year, setYear] = useState(thisYear);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  const selectedLabel = subjectFilter === "ALL"
    ? "All Subjects"
    : (subjects?.find(s => s.id === subjectFilter)?.name ?? "All Subjects");

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>, tooltipText: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text: tooltipText, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const activeDailyTotals = useMemo(() => {
    if (!sessions || subjectFilter === "ALL") return dailyTotals;
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.subjectId === subjectFilter) {
        map.set(s.date, (map.get(s.date) || 0) + s.duration);
      }
    }
    return map;
  }, [dailyTotals, sessions, subjectFilter]);

  const heatmapData = useHeatmapData(activeDailyTotals, year);

  const darkScale = ["oklch(0.35 0.06 165)", "oklch(0.48 0.11 172)", "oklch(0.60 0.15 174)", "oklch(0.74 0.2 178)"];
  const lightScale = ["oklch(0.88 0.08 170)", "oklch(0.78 0.12 165)", "oklch(0.68 0.16 160)", "oklch(0.58 0.19 155)"];
  const emptyBg = isDark ? "oklch(0.22 0 0)" : "oklch(0.93 0 0)";
  const scale = isDark ? darkScale : lightScale;
  const legend = [emptyBg, ...scale];

  const numWeeks = heatmapData.weeks.length;

  // One flat CSS grid: first column = day labels, remaining N columns = one per week.
  // Rows: 1 month-label row + 7 day rows = 8 rows.
  // aspect-ratio: 1 on cells keeps them square as the columns stretch to fill width.
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${DAY_COL_W}px repeat(${numWeeks}, 1fr)`,
    gap: 2,
  };

  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5${className ? ` ${className}` : ""}`}>
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-foreground">Focus Heatmap</h2>
        <div className="flex items-center gap-2">
          {subjects && subjects.length > 0 && (
            <div className="relative flex items-center rounded-xl bg-muted p-1" ref={dropRef} style={{ boxShadow: "var(--shadow-sm)" }}>
              <button
                type="button"
                onClick={() => setDropOpen(p => !p)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background/40"
              >
                <span className="max-w-[110px] truncate">{selectedLabel}</span>
                <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground ${dropOpen ? "rotate-180" : ""}`} />
              </button>
              {dropOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card py-1"
                  style={{ boxShadow: "var(--shadow-md)" }}
                >
                  {[{ id: "ALL", name: "All Subjects" }, ...(subjects ?? [])].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { setSubjectFilter(opt.id); setDropOpen(false); }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <span className="truncate">{opt.name}</span>
                      {subjectFilter === opt.id && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center rounded-xl bg-muted p-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  year === y ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                style={year === y ? { boxShadow: "var(--shadow-sm)" } : undefined}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap: scrolls horizontally if viewport too narrow, never vertically */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        {/* min-w prevents cells from shrinking below ~10px on very narrow screens */}
        <div className="pb-1" style={{ minWidth: DAY_COL_W + 2 + numWeeks * 12 }}>
          <div style={gridStyle}>

            {/* Row 0: empty corner + month labels */}
            <div /> {/* corner spacer */}
            {heatmapData.monthLabels.map((label, i) => (
              <span key={i} className="text-[9px] text-muted-foreground leading-none pb-1">
                {label}
              </span>
            ))}

            {/* Rows 1-7: day label + cells */}
            {DAY_LABELS.map((dayName, dayIdx) => (
              <>
                {/* Day label — vertically centered within the row */}
                <span
                  key={`label-${dayIdx}`}
                  className="flex items-center text-[9px] text-muted-foreground leading-none"
                >
                  {dayName}
                </span>

                {/* One cell per week for this day */}
                {heatmapData.weeks.map((week, weekIndex) => {
                  const day = week[dayIdx];
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekIndex}-${dayIdx}`}
                        className="w-full rounded-[2px]"
                        style={{ aspectRatio: "1 / 1" }}
                      />
                    );
                  }
                  const ratio = day.minutes / heatmapData.maxMinutes;
                  let bg = emptyBg;
                  if (day.minutes > 0 && ratio <= 0.25) bg = scale[0];
                  else if (ratio > 0.25 && ratio <= 0.5) bg = scale[1];
                  else if (ratio > 0.5 && ratio <= 0.75) bg = scale[2];
                  else if (ratio > 0.75) bg = scale[3];
                  const dateStr = fromLocalDateKey(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const tooltipText =
                    (day.minutes > 0 ? `${fmt(day.minutes)} studied` : "No study") +
                    ` · ${dateStr}`;
                  return (
                    <div
                      key={day.date}
                      className="w-full rounded-[2px] border border-black/5 dark:border-white/5 transition-all duration-100 hover:ring-2 hover:ring-foreground/50 hover:ring-offset-1 cursor-default"
                      style={{ aspectRatio: "1 / 1", backgroundColor: bg }}
                      onMouseEnter={(e) => handleMouseEnter(e, tooltipText)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {legend.map((c) => (
          <span
            key={c}
            className="h-[10px] w-[10px] rounded-[2px] border border-black/5 dark:border-white/5"
            style={{ backgroundColor: c }}
          />
        ))}
        <span>More</span>
      </div>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {year} contribution-style activity
      </p>

      {/* Tooltip rendered into document.body — escapes all overflow/transform/backdrop ancestors */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99999] whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium shadow-xl ring-1 ring-black/10 dark:ring-white/20 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tooltip.text}
          </div>,
          document.body,
        )}
    </div>
  );
});

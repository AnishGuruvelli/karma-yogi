import { useState } from "react";
import { fromLocalDateKey } from "@/lib/date";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useStore } from "@/lib/store";

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (h > 0) return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  return `${mins}m`;
}

interface HeatmapCardProps {
  dailyTotals: Map<string, number>;
  className?: string;
}

export function HeatmapCard({ dailyTotals, className }: HeatmapCardProps) {
  const { isDark } = useStore();
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear];
  const [year, setYear] = useState(thisYear);
  const heatmapData = useHeatmapData(dailyTotals, year);

  const darkScale = ["oklch(0.35 0.06 165)", "oklch(0.48 0.11 172)", "oklch(0.60 0.15 174)", "oklch(0.74 0.2 178)"];
  const lightScale = ["oklch(0.88 0.08 170)", "oklch(0.78 0.12 165)", "oklch(0.68 0.16 160)", "oklch(0.58 0.19 155)"];
  const emptyBg = isDark ? "oklch(0.22 0 0)" : "oklch(0.93 0 0)";
  const scale = isDark ? darkScale : lightScale;
  const legend = [emptyBg, ...scale];

  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-5${className ? ` ${className}` : ""}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-foreground">Focus Heatmap</h2>
        <div className="flex items-center rounded-xl bg-muted p-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                year === y ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              style={year === y ? { boxShadow: "var(--shadow-sm)" } : undefined}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="mb-2 grid grid-cols-[32px_1fr] gap-1">
            <div />
            <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-[3px] text-[9px] text-muted-foreground">
              {heatmapData.monthLabels.map((label, i) => (
                <span key={`${label}-${i}`} className="col-span-4">{label}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[32px_1fr] gap-1">
            <div className="flex flex-col gap-[3px] text-[9px] text-muted-foreground leading-none">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="flex h-[13px] items-center">{d}</span>
              ))}
            </div>
            <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-[3px]">
              {heatmapData.weeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-[3px]">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const day = week[dayIdx];
                    if (!day) {
                      return <div key={`empty-${weekIndex}-${dayIdx}`} className="h-[13px] w-full rounded-[2px]" />;
                    }
                    const ratio = day.minutes / heatmapData.maxMinutes;
                    let bg = emptyBg;
                    if (day.minutes > 0 && ratio <= 0.25) bg = scale[0];
                    else if (ratio > 0.25 && ratio <= 0.5) bg = scale[1];
                    else if (ratio > 0.5 && ratio <= 0.75) bg = scale[2];
                    else if (ratio > 0.75) bg = scale[3];
                    return (
                      <div key={day.date} className="group relative h-[13px] w-full">
                        <div
                          className="h-full w-full rounded-[2px] border border-black/5 dark:border-white/5 transition-transform duration-100 group-hover:scale-125 group-hover:z-10"
                          style={{ backgroundColor: bg }}
                        />
                        <div
                          className={`pointer-events-none absolute z-[9999] bottom-full mb-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-xl ring-1 ring-black/10 transition-opacity group-hover:opacity-100 dark:ring-white/20 ${
                            weekIndex <= 3
                              ? "left-0"
                              : weekIndex >= heatmapData.weeks.length - 4
                                ? "right-0"
                                : "left-1/2 -translate-x-1/2"
                          } bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900`}
                        >
                          {day.minutes > 0
                            ? `${fmt(day.minutes)} studied`
                            : "No study"}{" · "}
                          {fromLocalDateKey(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}

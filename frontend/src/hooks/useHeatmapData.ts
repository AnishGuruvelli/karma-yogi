import { useMemo } from "react";
import { fromLocalDateKey, toLocalDateKey } from "@/lib/date";

export type HeatmapDay = {
  date: string;
  minutes: number;
  month: string;
  monthIndex: number;
  year: number;
  dayOfWeek: number;
};

export type HeatmapResult = {
  weeks: (HeatmapDay | undefined)[][];
  maxMinutes: number;
  monthLabels: string[];
};

export function useHeatmapData(dailyTotals: Map<string, number>, year: number): HeatmapResult {
  return useMemo(() => {
    const days: HeatmapDay[] = [];
    const cursor = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    while (cursor <= endDate) {
      const dateStr = toLocalDateKey(cursor);
      days.push({
        date: dateStr,
        minutes: dailyTotals.get(dateStr) || 0,
        month: cursor.toLocaleDateString("en-US", { month: "short" }),
        monthIndex: cursor.getMonth(),
        year: cursor.getFullYear(),
        dayOfWeek: (cursor.getDay() + 6) % 7,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    const weekMap = new Map<string, (HeatmapDay | undefined)[]>();
    const weekOrder: string[] = [];
    for (const day of days) {
      const dayDate = fromLocalDateKey(day.date);
      const monday = new Date(dayDate);
      monday.setDate(dayDate.getDate() - day.dayOfWeek);
      const weekKey = toLocalDateKey(monday);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, Array(7).fill(undefined));
        weekOrder.push(weekKey);
      }
      weekMap.get(weekKey)![day.dayOfWeek] = day;
    }
    const weeks = weekOrder.map((wk) => weekMap.get(wk) || []);
    const maxMinutes = Math.max(...days.map((d) => d.minutes), 1);
    const monthLabels = weeks.map((week, idx) => {
      const first = week.find((d) => d && d.year === year);
      const prev = idx > 0 ? weeks[idx - 1]?.find((d) => d && d.year === year) : null;
      if (!first) return "";
      if (!prev || prev.monthIndex !== first.monthIndex) return first.month;
      return "";
    });
    return { weeks, maxMinutes, monthLabels };
  }, [dailyTotals, year]);
}

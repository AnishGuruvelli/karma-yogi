import { TrendingUp, BookOpen, Target, Award } from "lucide-react";
import { Panel, CompactStat, MutedHint, RingProgress } from "@/components/StatsPanel";
import { HeatmapCard } from "@/components/HeatmapCard";
import { accent, type AccentKey } from "@/lib/colors";

export type OverviewSnapshot = {
  totalHoursLabel: string;
  totalSessions: number;
  avgSessionLabel: string;
  longestLabel: string;
  avgMoodLabel: string;
  goalHours: number;
  weekHoursLabel: string;
  goalPct: number;
};

export type OverviewSubject = {
  id: string;
  name: string;
  color: AccentKey | string;
  mins: number;
  count: number;
  pct: number;
};

export function OverviewTab({
  snapshot,
  subjects,
  dailyTotals,
}: {
  snapshot: OverviewSnapshot;
  subjects: OverviewSubject[];
  dailyTotals: Map<string, number>;
}) {
  const topSubject = subjects[0];
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Performance Snapshot" icon={TrendingUp} eyebrow="All time">
            <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CompactStat
                label="Total focus"
                value={snapshot.totalHoursLabel}
                sub={`${snapshot.totalSessions} sessions · goal ${snapshot.goalHours}h/wk`}
              />
              <CompactStat label="Avg session" value={snapshot.avgSessionLabel} sub="duration" />
              <CompactStat label="Longest" value={snapshot.longestLabel} sub="single sit" />
              <CompactStat label="Avg mood" value={snapshot.avgMoodLabel} sub="out of 5" />
            </div>
          </Panel>
          <Panel
            title="Subject Mix"
            icon={BookOpen}
            action={<MutedHint>{subjects.length} subjects</MutedHint>}
            className="flex flex-1 flex-col min-h-0"
          >
            <div className="mt-2 flex-1 min-h-[8rem] overflow-y-auto space-y-4 pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
              {subjects.map((subject) => {
                const palette = accent[(subject.color as AccentKey) ?? "cyan"];
                return (
                  <div key={subject.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette.fg }} />
                        <span className="truncate text-sm font-semibold text-foreground">{subject.name}</span>
                        <span className="text-xs text-muted-foreground">· {subject.count} sessions</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 font-mono text-xs">
                        <span className="font-semibold text-foreground">{(subject.mins / 60).toFixed(1)}h</span>
                        <span className="text-muted-foreground">· {subject.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${subject.pct}%`, backgroundColor: palette.fg }}
                      />
                    </div>
                  </div>
                );
              })}
              {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Weekly Goal" icon={Target}>
            <div className="flex flex-col items-center pt-2 text-center">
              <RingProgress
                pct={snapshot.goalPct}
                value={snapshot.weekHoursLabel}
                sub={`of ${snapshot.goalHours}h`}
              />
              <p className="mt-3 text-sm font-medium text-foreground">{snapshot.goalPct}% complete</p>
            </div>
          </Panel>
          {topSubject && (
            <Panel title="Top Subject" icon={Award}>
              <div className="mt-1 flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: accent[(topSubject.color as AccentKey) ?? "cyan"].tint }}
                >
                  <span
                    className="text-xl font-bold"
                    style={{ color: accent[(topSubject.color as AccentKey) ?? "cyan"].fg }}
                  >
                    {topSubject.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{topSubject.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(topSubject.mins / 60).toFixed(1)}h · {topSubject.count} sessions
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
      <HeatmapCard dailyTotals={dailyTotals} className="mt-6" />
    </>
  );
}

import { useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Play, Plus } from "lucide-react";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";

export default function SessionsPage() {
  const { sessions, getSubject, editSession } = useStore();
  const [timerOpen, setTimerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<null | (typeof sessions)[number]>(null);

  const colorMap: Record<string, string> = {
    green: "#4ade80",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    purple: "#a78bfa",
  };

  const formatDuration = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const grouped: { label: string; sessions: typeof sessions }[] = [];
  const todaySessions = sessions.filter((s) => s.date === today);
  const yesterdaySessions = sessions.filter((s) => s.date === yesterday);
  const olderSessions = sessions.filter((s) => s.date !== today && s.date !== yesterday);

  if (todaySessions.length > 0) grouped.push({ label: "Today", sessions: todaySessions });
  if (yesterdaySessions.length > 0) grouped.push({ label: "Yesterday", sessions: yesterdaySessions });
  if (olderSessions.length > 0) grouped.push({ label: "Earlier", sessions: olderSessions });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sessions</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTimerOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-neon-orange px-5 py-2.5 font-semibold text-white transition-all hover:opacity-90 neon-glow-orange"
          >
            <Play className="h-4 w-4" />
            Start Timer
          </button>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <Plus className="h-4 w-4" />
            Log Session
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map((group) => (
          <div key={group.label}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.label}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.sessions.map((session) => {
                const subject = getSubject(session.subjectId);
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setEditing(session)}
                    className="stat-card flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-accent/60"
                  >
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ backgroundColor: colorMap[subject?.color || "cyan"] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{subject?.name}</div>
                      <div className="truncate text-sm text-muted-foreground">{session.topic}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold text-neon-green">{formatDuration(session.duration)}</div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        {MOOD_EMOJIS[session.moodRating]}
                        <span>{session.startTime}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TimerModal open={timerOpen} onClose={() => setTimerOpen(false)} />
      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
      {editing && (
        <LogSessionModal
          open
          onClose={() => setEditing(null)}
          initialSession={editing}
          onSave={(changes) => {
            editSession(editing.id, changes);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Play, Plus } from "lucide-react";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";
import { toLocalDateKey } from "@/lib/date";
import { toast } from "sonner";

export default function SessionsPage() {
  const { sessions, getSubject, editSession, deleteSession } = useStore();
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

  const formatSessionDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const today = toLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDateKey(yesterdayDate);

  const grouped: { label: string; sessions: typeof sessions }[] = [];
  const todaySessions = sessions.filter((s) => s.date === today);
  const yesterdaySessions = sessions.filter((s) => s.date === yesterday);
  const olderSessions = sessions.filter((s) => s.date !== today && s.date !== yesterday);

  if (todaySessions.length > 0) grouped.push({ label: "Today", sessions: todaySessions });
  if (yesterdaySessions.length > 0) grouped.push({ label: "Yesterday", sessions: yesterdaySessions });
  if (olderSessions.length > 0) grouped.push({ label: "Earlier", sessions: olderSessions });

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sessions</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={() => setTimerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon-orange px-5 py-2.5 font-semibold text-white transition-all hover:opacity-90 neon-glow-orange sm:w-auto"
          >
            <Play className="h-4 w-4" />
            Start Timer
          </button>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-all hover:opacity-90 sm:w-auto"
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
                        <span>{formatSessionDate(session.date)} · {session.startTime}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TimerModal open={timerOpen} onClose={() => setTimerOpen(false)} onRequestOpen={() => setTimerOpen(true)} />
      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
      {editing && (
        <LogSessionModal
          open
          onClose={() => setEditing(null)}
          initialSession={editing}
          onSave={async (changes) => {
            const ok = await editSession(editing.id, changes);
            if (ok) {
              toast.success("Session updated");
              setEditing(null);
              return;
            }
            toast.error("Couldn't update session. Please try again.");
          }}
          onDelete={() => {
            deleteSession(editing.id);
            toast.success("Session deleted");
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

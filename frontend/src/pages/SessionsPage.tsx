import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Play, Plus } from "lucide-react";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";
import { toLocalDateKey } from "@/lib/date";
import { toast } from "sonner";
import { subjectColor, subjectColorSoft } from "@/lib/colors";

export default function SessionsPage() {
  const { sessions, getSubject, editSession, deleteSession } = useStore();
  const [timerOpen, setTimerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<null | (typeof sessions)[number]>(null);
  const [page, setPage] = useState(1);
  const pageSize = 18;

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

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pagedSessions = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sessions.slice(startIndex, startIndex + pageSize);
  }, [sessions, safePage]);

  const grouped = useMemo(() => {
    const result: { label: string; sessions: typeof sessions }[] = [];
    const todaySessions = pagedSessions.filter((s) => s.date === today);
    const yesterdaySessions = pagedSessions.filter((s) => s.date === yesterday);
    const olderSessions = pagedSessions.filter((s) => s.date !== today && s.date !== yesterday);

    if (todaySessions.length > 0) result.push({ label: "Today", sessions: todaySessions });
    if (yesterdaySessions.length > 0) result.push({ label: "Yesterday", sessions: yesterdaySessions });
    if (olderSessions.length > 0) result.push({ label: "Earlier", sessions: olderSessions });
    return result;
  }, [pagedSessions, today, yesterday]);

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

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {sessions.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-
          {Math.min(safePage * pageSize, sessions.length)} of {sessions.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-foreground">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No sessions yet. Start a timer or log your first session.
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group.label}</h2>
              <div className="ink-divider flex-1" />
              <span className="text-xs text-muted-foreground">{group.sessions.length}</span>
            </div>
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
                      style={{
                        backgroundColor: subjectColor(subject?.color),
                        boxShadow: `0 0 12px ${subjectColor(subject?.color)}, 0 0 24px ${subjectColorSoft(subject?.color, 45)}`,
                      }}
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

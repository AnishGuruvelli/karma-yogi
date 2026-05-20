import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Play, Plus, Trash2, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MockCard } from "@/components/mocks/MockCard";
import { SectionalCard } from "@/components/mocks/SectionalCard";
import { EditQotdModal } from "@/components/mocks/EditTestModal";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";
import { LogTestModal } from "@/components/mocks/LogTestModal";
import { toLocalDateKey } from "@/lib/date";
import { toast } from "sonner";
import { subjectColor } from "@/lib/colors";
import type { QotdEntry } from "@/lib/types";

type Tab = "study" | "mocks" | "sectional" | "qotd";

function formatDuration(m: number) {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  }
  return `${m}m`;
}





function QotdEntryCard({ entry, onDelete }: { entry: QotdEntry; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
    <div className="stat-card flex items-center gap-3 rounded-2xl p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${entry.correct ? "bg-green-500/15" : "bg-red-500/15"}`}>
        {entry.correct ? "✓" : "✗"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{entry.topic}</span>
          <span className="text-xs text-muted-foreground">{entry.date}</span>
        </div>
        {entry.source && <div className="text-sm text-foreground truncate">{entry.source}</div>}
        {(entry.questionsCorrect != null || entry.questionsTotal != null) && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Score: <span className="font-semibold text-foreground">{entry.questionsCorrect ?? "—"} / {entry.questionsTotal ?? "—"}</span>
          </div>
        )}
        {entry.note && <div className="text-xs text-muted-foreground italic truncate">{entry.note}</div>}
      </div>
      <div className="shrink-0 text-right">
        {entry.timeTakenMin != null && <div className="text-xs text-muted-foreground">{entry.timeTakenMin}m</div>}
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } onDelete(); }}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${confirmDelete ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
          >
            <Trash2 className="h-3 w-3" />
            {confirmDelete ? "Confirm?" : "Del"}
          </button>
        </div>
      </div>
    </div>
    {editOpen && <EditQotdModal entry={entry} onClose={() => setEditOpen(false)} />}
    </>
  );
}

function formatSessionDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SessionsPage() {
  const { sessions, getSubject, editSession, deleteSession, fullMocks, sectionalTests, qotdEntries, deleteQotdEntry } = useStore();
  const [timerOpen, setTimerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logTestOpen, setLogTestOpen] = useState(false);
  const [editing, setEditing] = useState<null | (typeof sessions)[number]>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const today = toLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDateKey(yesterdayDate);

  const studySessions = useMemo(() => sessions.filter((s) => s.kind !== 'test'), [sessions]);

  const totalPages = Math.max(1, Math.ceil(studySessions.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedSessions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return studySessions.slice(start, start + pageSize);
  }, [studySessions, safePage]);

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

  const sortedMocks = useMemo(() => [...fullMocks].sort((a, b) => b.date.localeCompare(a.date)), [fullMocks]);
  const sortedSectionals = useMemo(() => [...sectionalTests].sort((a, b) => b.date.localeCompare(a.date)), [sectionalTests]);
  const sortedQotd = useMemo(() => [...qotdEntries].sort((a, b) => b.date.localeCompare(a.date)), [qotdEntries]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "study", label: "Study", count: studySessions.length },
    { id: "mocks", label: "Mocks", count: fullMocks.length },
    { id: "sectional", label: "Sectional", count: sectionalTests.length },
    { id: "qotd", label: "QOTD", count: qotdEntries.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Practice</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sessions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Study sits, mock tests &amp; analyses — all in one place.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => setTimerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto neon-glow-cyan"
            >
              <Play className="h-4 w-4" />
              Begin Session
            </button>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:border-foreground/30 sm:w-auto"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <Plus className="h-4 w-4" />
              Log Session
            </button>
            <button
              type="button"
              onClick={() => setLogTestOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:border-foreground/30 sm:w-auto"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <Plus className="h-4 w-4" />
              Log Test
            </button>
          </div>
        </div>

        <Tabs defaultValue="study" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}{tab.count > 0 ? ` (${tab.count})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Study Tab */}
          <TabsContent value="study">
            <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {studySessions.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, studySessions.length)} of {studySessions.length}
              </span>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold text-foreground">Page {safePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {grouped.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No study sessions yet. Start a timer or log your first session.
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
                          className="stat-card flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-accent/60"
                        >
                          <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: subjectColor(subject?.color) }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground">{subject?.name ?? "—"}</div>
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
          </TabsContent>

          {/* Mocks Tab */}
          <TabsContent value="mocks">
            <div className="space-y-3">
              {sortedMocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No full mocks logged yet. Tap "Log Test" to add one.
                </div>
              ) : (
                sortedMocks.map((mock) => (
                  <MockCard
                    key={mock.id}
                    mock={mock}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Sectional Tab */}
          <TabsContent value="sectional">
            <div className="space-y-3">
              {sortedSectionals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No sectional tests logged yet. Tap "Log Test" to add one.
                </div>
              ) : (
                sortedSectionals.map((test) => (
                  <SectionalCard
                    key={test.id}
                    test={test}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* QOTD Tab */}
          <TabsContent value="qotd">
            <div className="space-y-2">
              {sortedQotd.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No QOTD entries yet. Tap "Log Test" and pick "Question of the Day".
                </div>
              ) : (
                sortedQotd.map((entry) => (
                  <QotdEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => { deleteQotdEntry(entry.id); toast.success("Entry deleted"); }}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <TimerModal open={timerOpen} onClose={() => setTimerOpen(false)} onRequestOpen={() => setTimerOpen(true)} />
      <LogSessionModal open={logOpen} onClose={() => setLogOpen(false)} />
      <LogTestModal open={logTestOpen} onClose={() => setLogTestOpen(false)} />

      {editing && (
        <LogSessionModal
          open
          onClose={() => setEditing(null)}
          initialSession={editing}
          onSave={async (changes) => {
            const ok = await editSession(editing.id, changes);
            if (ok) { toast.success("Session updated"); setEditing(null); return; }
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

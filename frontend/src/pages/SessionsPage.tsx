import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Play, Plus, FlaskConical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { TimerModal } from "@/components/TimerModal";
import { LogSessionModal } from "@/components/LogSessionModal";
import { LogTestModal } from "@/components/mocks/LogTestModal";
import { toLocalDateKey } from "@/lib/date";
import { toast } from "sonner";
import { subjectColor } from "@/lib/colors";
import type { FullMock, SectionalTest, QotdEntry } from "@/lib/types";

type Tab = "study" | "mocks" | "sectional" | "qotd";

function formatDuration(m: number) {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  }
  return `${m}m`;
}

function fmt(v: number | null | undefined, suffix = "") {
  if (v == null) return "—";
  return `${v}${suffix}`;
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    TIME: "bg-blue-500/15 text-blue-600",
    IMS: "bg-green-500/15 text-green-600",
    CL: "bg-orange-500/15 text-orange-600",
    AIMCAT: "bg-purple-500/15 text-purple-600",
    OTHER: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors[provider] ?? colors.OTHER}`}>
      {provider}
    </span>
  );
}

function MockCard({ mock, onDelete }: { mock: FullMock; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    onDelete();
  };

  const hasScores = mock.varcScore != null || mock.dilrScore != null || mock.quantScore != null || mock.overallScore != null;

  return (
    <div className="stat-card rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <ProviderBadge provider={mock.provider} />
            <span className="text-xs text-muted-foreground">{mock.date}</span>
          </div>
          <div className="font-semibold text-foreground truncate">{mock.testName}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {mock.overallScore != null && (
            <span className="font-bold text-primary text-lg">{mock.overallScore}</span>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {hasScores && (
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {[
            { label: "VARC", score: mock.varcScore, pct: mock.varcPercentile },
            { label: "DILR", score: mock.dilrScore, pct: mock.dilrPercentile },
            { label: "QUANT", score: mock.quantScore, pct: mock.quantPercentile },
            { label: "Overall", score: mock.overallScore, pct: mock.overallPercentile },
          ].map(({ label, score, pct }) => (
            <div key={label} className="rounded-lg bg-muted/60 px-2 py-1.5 text-center">
              <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
              <div className="text-sm font-bold text-foreground">{fmt(score)}</div>
              {pct != null && <div className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%ile</div>}
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "VARC", att: mock.varcAttempted, cor: mock.varcCorrect },
              { label: "DILR", att: mock.dilrAttempted, cor: mock.dilrCorrect },
              { label: "QUANT", att: mock.quantAttempted, cor: mock.quantCorrect },
            ].map(({ label, att, cor }) => (
              <div key={label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
                <div className="text-xs text-foreground">{fmt(att)} att · {fmt(cor)} cor</div>
              </div>
            ))}
          </div>
          {mock.durationMin != null && (
            <div className="text-xs text-muted-foreground">⏱ {formatDuration(mock.durationMin)}</div>
          )}
          {mock.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mock.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{t}</span>
              ))}
            </div>
          )}
          {mock.notes && <p className="text-xs text-muted-foreground italic">{mock.notes}</p>}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${confirmDelete ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? "Confirm delete?" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionalCard({ test, onDelete }: { test: SectionalTest; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sectionColors: Record<string, string> = {
    VARC: "text-cyan-600 bg-cyan-500/10",
    DILR: "text-green-600 bg-green-500/10",
    QUANT: "text-orange-600 bg-orange-500/10",
  };

  return (
    <div className="stat-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sectionColors[test.section] ?? "bg-muted text-muted-foreground"}`}>
              {test.section}
            </span>
            <ProviderBadge provider={test.provider} />
            <span className="text-xs text-muted-foreground">{test.date}</span>
          </div>
          <div className="font-semibold text-foreground truncate">{test.testName}</div>
        </div>
        {test.score != null && <span className="font-bold text-primary text-lg shrink-0">{test.score}</span>}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
        {test.attempted != null && <span>Att: <b className="text-foreground">{test.attempted}</b></span>}
        {test.correct != null && <span>Cor: <b className="text-foreground">{test.correct}</b></span>}
        {test.percentile != null && <span><b className="text-foreground">{test.percentile.toFixed(1)}</b>%ile</span>}
        {test.durationMin != null && <span>⏱ {formatDuration(test.durationMin)}</span>}
      </div>

      {test.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {test.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{t}</span>
          ))}
        </div>
      )}
      {test.notes && <p className="text-xs text-muted-foreground italic mb-2">{test.notes}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } onDelete(); }}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${confirmDelete ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:text-red-500"}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete ? "Confirm delete?" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function QotdEntryCard({ entry, onDelete }: { entry: QotdEntry; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
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
        {entry.note && <div className="text-xs text-muted-foreground italic truncate">{entry.note}</div>}
      </div>
      <div className="shrink-0 text-right">
        {entry.timeTakenSec != null && <div className="text-xs text-muted-foreground">{Math.round(entry.timeTakenSec / 60)}m {entry.timeTakenSec % 60}s</div>}
        <button
          type="button"
          onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } onDelete(); }}
          className={`mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${confirmDelete ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
        >
          <Trash2 className="h-3 w-3" />
          {confirmDelete ? "Confirm?" : "Del"}
        </button>
      </div>
    </div>
  );
}

function formatSessionDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SessionsPage() {
  const { sessions, getSubject, editSession, deleteSession, fullMocks, sectionalTests, qotdEntries, deleteFullMock, deleteSectional, deleteQotdEntry } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>("study");
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sessions</h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => setTimerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90 sm:w-auto"
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

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                activeTab === tab.id ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === tab.id ? { boxShadow: "var(--shadow-sm)" } : undefined}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Study Tab */}
        {activeTab === "study" && (
          <>
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
          </>
        )}

        {/* Mocks Tab */}
        {activeTab === "mocks" && (
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
                  onDelete={() => { deleteFullMock(mock.id); toast.success("Mock deleted"); }}
                />
              ))
            )}
          </div>
        )}

        {/* Sectional Tab */}
        {activeTab === "sectional" && (
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
                  onDelete={() => { deleteSectional(test.id); toast.success("Sectional test deleted"); }}
                />
              ))
            )}
          </div>
        )}

        {/* QOTD Tab */}
        {activeTab === "qotd" && (
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
        )}

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

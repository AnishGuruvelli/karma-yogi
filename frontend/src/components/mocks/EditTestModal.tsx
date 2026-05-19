import { useState, useMemo, useRef } from "react";
import { X, Loader2, Plus, CalendarIcon } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FullMock, MockProvider, SectionalTest, QotdEntry } from "@/lib/types";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PROVIDERS: { value: MockProvider; label: string }[] = [
  { value: "TIME", label: "TIME" },
  { value: "IMS", label: "IMS" },
  { value: "OTHER", label: "Other" },
];

const SECTIONS = ["varc", "dilr", "quant"] as const;
type SK = (typeof SECTIONS)[number];
const SECTION_LABELS: Record<SK, string> = { varc: "VARC", dilr: "DILR", quant: "QUANT" };

function ni(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
function nf(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseDateStr(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

// ── EDIT FULL MOCK ─────────────────────────────────────────────────────────────

interface EditFullMockModalProps {
  mock: FullMock;
  onClose: () => void;
}

export function EditFullMockModal({ mock, onClose }: EditFullMockModalProps) {
  useBodyScrollLock(true);
  const { editFullMock, fullMocks } = useStore();

  const allMockTags = useMemo(() => {
    const s = new Set<string>();
    fullMocks.forEach(m => m.tags.forEach(t => s.add(t.toLowerCase())));
    return Array.from(s).sort();
  }, [fullMocks]);

  const str = (v: number | null | undefined) => (v != null ? String(v) : "");

  const [provider, setProvider] = useState<MockProvider>(mock.provider);
  const [providerName, setProviderName] = useState(mock.providerName ?? "");
  const [testName, setTestName] = useState(mock.testName);
  const [date, setDate] = useState<Date>(parseDateStr(mock.date));
  const [varcScore, setVarcScore] = useState(str(mock.varcScore));
  const [varcAttempted, setVarcAttempted] = useState(str(mock.varcAttempted));
  const [varcCorrect, setVarcCorrect] = useState(str(mock.varcCorrect));
  const [varcPercentile, setVarcPercentile] = useState(str(mock.varcPercentile));
  const [dilrScore, setDilrScore] = useState(str(mock.dilrScore));
  const [dilrAttempted, setDilrAttempted] = useState(str(mock.dilrAttempted));
  const [dilrCorrect, setDilrCorrect] = useState(str(mock.dilrCorrect));
  const [dilrPercentile, setDilrPercentile] = useState(str(mock.dilrPercentile));
  const [quantScore, setQuantScore] = useState(str(mock.quantScore));
  const [quantAttempted, setQuantAttempted] = useState(str(mock.quantAttempted));
  const [quantCorrect, setQuantCorrect] = useState(str(mock.quantCorrect));
  const [quantPercentile, setQuantPercentile] = useState(str(mock.quantPercentile));
  const [overallPercentile, setOverallPercentile] = useState(str(mock.overallPercentile));
  const [duration, setDuration] = useState(mock.durationMin ?? 0);
  const [tags, setTags] = useState<string[]>(mock.tags);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(mock.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return allMockTags.filter(t => t.includes(q) && !tags.includes(t)).slice(0, 6);
  }, [tagInput, tags, allMockTags]);

  const sectionState: Record<SK, { score: string; attempted: string; correct: string; percentile: string; setScore: (v: string) => void; setAttempted: (v: string) => void; setCorrect: (v: string) => void; setPercentile: (v: string) => void }> = {
    varc: { score: varcScore, attempted: varcAttempted, correct: varcCorrect, percentile: varcPercentile, setScore: setVarcScore, setAttempted: setVarcAttempted, setCorrect: setVarcCorrect, setPercentile: setVarcPercentile },
    dilr: { score: dilrScore, attempted: dilrAttempted, correct: dilrCorrect, percentile: dilrPercentile, setScore: setDilrScore, setAttempted: setDilrAttempted, setCorrect: setDilrCorrect, setPercentile: setDilrPercentile },
    quant: { score: quantScore, attempted: quantAttempted, correct: quantCorrect, percentile: quantPercentile, setScore: setQuantScore, setAttempted: setQuantAttempted, setCorrect: setQuantCorrect, setPercentile: setQuantPercentile },
  };

  const computedOverallScore = (ni(varcScore) ?? 0) + (ni(dilrScore) ?? 0) + (ni(quantScore) ?? 0);

  const addTag = (val?: string) => {
    const t = (val ?? tagInput).trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
    setSuggestOpen(false);
    tagInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!testName.trim()) return;
    setSaving(true);
    try {
      await editFullMock(mock.id, {
        provider,
        providerName: provider === "OTHER" ? providerName.trim() : provider,
        testName: testName.trim(),
        date: format(date, "yyyy-MM-dd"),
        varcScore: ni(varcScore), varcAttempted: ni(varcAttempted),
        varcCorrect: ni(varcCorrect), varcPercentile: nf(varcPercentile),
        dilrScore: ni(dilrScore), dilrAttempted: ni(dilrAttempted),
        dilrCorrect: ni(dilrCorrect), dilrPercentile: nf(dilrPercentile),
        quantScore: ni(quantScore), quantAttempted: ni(quantAttempted),
        quantCorrect: ni(quantCorrect), quantPercentile: nf(quantPercentile),
        overallScore: computedOverallScore > 0 ? computedOverallScore : null,
        overallPercentile: nf(overallPercentile),
        durationMin: duration > 0 ? duration : null,
        tags,
        notes: notes.trim(),
        linkedSessionId: mock.linkedSessionId ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Edit Full Mock</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Provider */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Provider</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(p => (
                <button key={p.value} type="button" onClick={() => setProvider(p.value)}
                  className={cn("rounded-full border px-4 py-1.5 text-sm font-medium",
                    provider === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            {provider === "OTHER" && (
              <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Provider name" className="input-field mt-2 w-full rounded-xl p-3 text-sm" />
            )}
          </div>

          {/* Test name + Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Test name</label>
              <input type="text" value={testName} onChange={e => setTestName(e.target.value)} className="input-field w-full rounded-xl p-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground">
                    {format(date, "PPP")}
                    <CalendarIcon className="h-4 w-4 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[70] w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Sectional scores */}
          <div className="space-y-3">
            <p className="eyebrow">sectional scores</p>
            {SECTIONS.map(key => {
              const s = sectionState[key];
              return (
                <div key={key} className="rounded-xl border border-border bg-card/60 p-3">
                  <p className="mb-2 font-display font-semibold text-foreground">{SECTION_LABELS[key]}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([["Score", s.score, s.setScore], ["Attempted", s.attempted, s.setAttempted], ["Correct", s.correct, s.setCorrect], ["Percentile", s.percentile, s.setPercentile]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                      <div key={label}>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
                        <input type="number" value={val} onChange={e => setter(e.target.value)} className="input-field w-full rounded-lg p-2 text-sm tabular-nums" placeholder="0" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Overall */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Overall score</label>
                <div className="group relative">
                  <div className="input-field flex w-full cursor-default select-none items-center rounded-lg p-2 opacity-80">
                    <span className="flex-1 text-sm tabular-nums font-semibold text-foreground">
                      {computedOverallScore > 0 ? computedOverallScore : <span className="text-muted-foreground/40 font-normal">auto-populated</span>}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover:block">
                    <div className="whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground" style={{ boxShadow: "var(--shadow-sm)" }}>
                      Auto-calculated from VARC + DILR + QUANT
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Overall %ile <span className="normal-case tracking-normal font-normal text-muted-foreground/60">(optional)</span></label>
                <input type="number" step="0.1" value={overallPercentile} onChange={e => setOverallPercentile(e.target.value)} className="input-field w-full rounded-lg p-2 text-sm tabular-nums font-semibold" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Duration + Tags — same row */}
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Duration <span className="text-xs text-muted-foreground/60">(min)</span></label>
              <input type="number" min={0} value={duration || ""} onChange={e => setDuration(Math.max(0, parseInt(e.target.value) || 0))} placeholder="120" className="input-field w-full rounded-xl p-3 text-sm tabular-nums" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic-mistake tags</label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={e => { setTagInput(e.target.value.toLowerCase()); setSuggestOpen(true); }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } if (e.key === "Escape") setSuggestOpen(false); }}
                    onFocus={() => setSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                    placeholder="e.g. pnc, rc inference"
                    className="input-field flex-1 rounded-xl p-3 text-sm"
                  />
                  <button type="button" onClick={() => addTag()} className="rounded-xl border border-border bg-card px-3 hover:bg-muted"><Plus className="h-4 w-4" /></button>
                </div>
                {suggestOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card py-1" style={{ boxShadow: "var(--shadow-md)" }}>
                    {suggestions.map(s => (
                      <button key={s} type="button" onMouseDown={e => { e.preventDefault(); addTag(s); }} className="w-full px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted">{s}</button>
                    ))}
                  </div>
                )}
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <button key={t} type="button" onClick={() => setTags(tags.filter(x => x !== t))}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                      {t} <span className="ml-1 opacity-60">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Learnings / notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What worked, what didn't…" className="input-field w-full resize-none rounded-xl p-3 text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground hover:bg-muted">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !testName.trim()}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-md)" }}>
              {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDIT SECTIONAL ─────────────────────────────────────────────────────────────

interface EditSectionalModalProps {
  test: SectionalTest;
  onClose: () => void;
}

export function EditSectionalModal({ test, onClose }: EditSectionalModalProps) {
  useBodyScrollLock(true);
  const { editSectional } = useStore();

  const str = (v: number | null | undefined) => (v != null ? String(v) : "");

  const [provider, setProvider] = useState<MockProvider>(test.provider);
  const [providerName, setProviderName] = useState(test.providerName ?? "");
  const [testName, setTestName] = useState(test.testName);
  const [section, setSection] = useState(test.section);
  const [date, setDate] = useState<Date>(parseDateStr(test.date));
  const [score, setScore] = useState(str(test.score));
  const [attempted, setAttempted] = useState(str(test.attempted));
  const [correct, setCorrect] = useState(str(test.correct));
  const [percentile, setPercentile] = useState(str(test.percentile));
  const [duration, setDuration] = useState(test.durationMin ?? 0);
  const [tags, setTags] = useState<string[]>(test.tags);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(test.notes ?? "");
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!testName.trim()) return;
    setSaving(true);
    try {
      await editSectional(test.id, {
        provider,
        providerName: provider === "OTHER" ? providerName.trim() : provider,
        testName: testName.trim(),
        section,
        date: format(date, "yyyy-MM-dd"),
        score: ni(score), attempted: ni(attempted),
        correct: ni(correct), percentile: nf(percentile),
        durationMin: duration > 0 ? duration : null,
        tags,
        notes: notes.trim(),
        linkedSessionId: test.linkedSessionId ?? null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Edit Sectional Test</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Provider */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Provider</label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map(p => (
                <button key={p.value} type="button" onClick={() => setProvider(p.value)}
                  className={cn("rounded-full border px-4 py-1.5 text-sm font-medium",
                    provider === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            {provider === "OTHER" && (
              <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Provider name" className="input-field mt-2 w-full rounded-xl p-3 text-sm" />
            )}
          </div>

          {/* Test name + Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Test name</label>
              <input type="text" value={testName} onChange={e => setTestName(e.target.value)} className="input-field w-full rounded-xl p-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground">
                    {format(date, "PPP")}
                    <CalendarIcon className="h-4 w-4 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[70] w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Section</label>
            <div className="flex gap-2">
              {(["VARC", "DILR", "QUANT"] as const).map(s => (
                <button key={s} type="button" onClick={() => setSection(s)}
                  className={cn("flex-1 rounded-full border px-3 py-2 text-sm font-medium",
                    section === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card/60 p-3 sm:grid-cols-4">
            {([["Score", score, setScore], ["Attempted", attempted, setAttempted], ["Correct", correct, setCorrect], ["Percentile", percentile, setPercentile]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
                <input type="number" value={val} onChange={e => setter(e.target.value)} className="input-field w-full rounded-lg p-2 text-sm tabular-nums" placeholder="0" />
              </div>
            ))}
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Duration <span className="text-xs text-muted-foreground/70">(minutes)</span></label>
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" min={0} value={duration || ""} onChange={e => setDuration(Math.max(0, parseInt(e.target.value) || 0))} placeholder="40" className="input-field w-24 rounded-xl p-3 text-sm tabular-nums" />
              {[40, 60, 30].map(p => (
                <button key={p} type="button" onClick={() => setDuration(p)}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-mono",
                    duration === p ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}>{p}m</button>
              ))}
              <button type="button" onClick={() => setDuration(0)}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-mono",
                  duration === 0 ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}>skip</button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic-mistake tags</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="e.g. PnC, RC inference" className="input-field flex-1 rounded-xl p-3 text-sm" />
              <button type="button" onClick={addTag} className="rounded-xl border border-border bg-card px-3 hover:bg-muted"><Plus className="h-4 w-4" /></button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <button key={t} type="button" onClick={() => setTags(tags.filter(x => x !== t))}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                    {t} <span className="ml-1 opacity-60">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Learnings / notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What worked, what didn't…" className="input-field w-full resize-none rounded-xl p-3 text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground hover:bg-muted">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || !testName.trim()}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-md)" }}>
              {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDIT QOTD ─────────────────────────────────────────────────────────────────

const QOTD_TOPICS = ["QUANT", "VA", "RC", "LR", "DI"] as const;

interface EditQotdModalProps {
  entry: QotdEntry;
  onClose: () => void;
}

export function EditQotdModal({ entry, onClose }: EditQotdModalProps) {
  useBodyScrollLock(true);
  const { editQotdEntry } = useStore();

  const [date, setDate] = useState<Date>(parseDateStr(entry.date));
  const [topic, setTopic] = useState(entry.topic);
  const [source, setSource] = useState(entry.source ?? "");
  const correct = entry.correct;
  const [timeTakenSec, setTimeTakenSec] = useState(entry.timeTakenSec != null ? String(entry.timeTakenSec) : "");
  const [questionsCorrect, setQuestionsCorrect] = useState(entry.questionsCorrect != null ? String(entry.questionsCorrect) : "");
  const [questionsTotal, setQuestionsTotal] = useState(entry.questionsTotal != null ? String(entry.questionsTotal) : "");
  const [note, setNote] = useState(entry.note ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await editQotdEntry(entry.id, {
        date: format(date, "yyyy-MM-dd"),
        topic,
        source: source.trim(),
        correct,
        timeTakenSec: timeTakenSec ? parseInt(timeTakenSec, 10) : null,
        questionsCorrect: questionsCorrect ? parseInt(questionsCorrect, 10) : null,
        questionsTotal: questionsTotal ? parseInt(questionsTotal, 10) : null,
        note: note.trim(),
      });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Edit QOTD Entry</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground">
                  {format(date, "PPP")}
                  <CalendarIcon className="h-4 w-4 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="z-[70] w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Topic */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic</label>
            <div className="flex flex-wrap gap-2">
              {QOTD_TOPICS.map(t => (
                <button key={t} type="button" onClick={() => setTopic(t)}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-medium",
                    topic === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Score <span className="text-xs text-muted-foreground/70">(optional)</span></label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={questionsCorrect} onChange={e => setQuestionsCorrect(e.target.value)}
                placeholder="Correct" className="input-field w-full rounded-xl p-3 text-sm tabular-nums" />
              <span className="shrink-0 text-sm text-muted-foreground">out of</span>
              <input type="number" min={0} value={questionsTotal} onChange={e => setQuestionsTotal(e.target.value)}
                placeholder="Total" className="input-field w-full rounded-xl p-3 text-sm tabular-nums" />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Source <span className="text-xs text-muted-foreground/70">(optional)</span></label>
            <input type="text" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. IMS QOTD, TIME daily" className="input-field w-full rounded-xl p-3 text-sm" />
          </div>

          {/* Time taken */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Time taken <span className="text-xs text-muted-foreground/70">(seconds, optional)</span></label>
            <input type="number" min={0} value={timeTakenSec} onChange={e => setTimeTakenSec(e.target.value)} placeholder="e.g. 90" className="input-field w-full rounded-xl p-3 text-sm tabular-nums" />
          </div>

          {/* Note */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Note <span className="text-xs text-muted-foreground/70">(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What tripped you up..." className="input-field w-full resize-none rounded-xl p-3 text-sm" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground hover:bg-muted">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-md)" }}>
              {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

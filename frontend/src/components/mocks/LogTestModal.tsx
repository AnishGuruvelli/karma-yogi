import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, ChevronLeft, Loader2, Plus, CalendarIcon } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FullMock, MockProvider, SectionalTest, QotdEntry } from "@/lib/types";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TestKind = "full" | "sectional" | "qotd";

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

// ── FULL MOCK FORM ────────────────────────────────────────────────────────────

interface FullState {
  provider: MockProvider;
  providerName: string;
  testName: string;
  date: Date;
  varcScore: string; varcAttempted: string; varcCorrect: string; varcPercentile: string;
  dilrScore: string; dilrAttempted: string; dilrCorrect: string; dilrPercentile: string;
  quantScore: string; quantAttempted: string; quantCorrect: string; quantPercentile: string;
  overallPercentile: string;
  duration: number;
  tags: string[];
  tagInput: string;
  notes: string;
}

function emptyFull(): FullState {
  return {
    provider: "TIME", providerName: "", testName: "", date: new Date(),
    varcScore: "", varcAttempted: "", varcCorrect: "", varcPercentile: "",
    dilrScore: "", dilrAttempted: "", dilrCorrect: "", dilrPercentile: "",
    quantScore: "", quantAttempted: "", quantCorrect: "", quantPercentile: "",
    overallPercentile: "",
    duration: 120,
    tags: [], tagInput: "", notes: "",
  };
}

function FullMockForm({ onSave, allTags }: { onSave: (m: Omit<FullMock, "id" | "userId" | "createdAt">) => Promise<void>; allTags: string[] }) {
  const [f, setF] = useState<FullState>(emptyFull());
  const [saving, setSaving] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FullState>(k: K, v: FullState[K]) => setF(p => ({ ...p, [k]: v }));

  const suggestions = useMemo(() => {
    const q = f.tagInput.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter(t => t.includes(q) && !f.tags.includes(t)).slice(0, 6);
  }, [f.tagInput, f.tags, allTags]);

  const computedOverallScore = (ni(f.varcScore) ?? 0) + (ni(f.dilrScore) ?? 0) + (ni(f.quantScore) ?? 0);

  const addTag = (val?: string) => {
    const t = (val ?? f.tagInput).trim().toLowerCase();
    if (t && !f.tags.includes(t)) set("tags", [...f.tags, t]);
    set("tagInput", "");
    setSuggestOpen(false);
    tagInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!f.testName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        provider: f.provider,
        providerName: f.provider === "OTHER" ? f.providerName.trim() : f.provider,
        testName: f.testName.trim(),
        date: format(f.date, "yyyy-MM-dd"),
        varcScore: ni(f.varcScore), varcAttempted: ni(f.varcAttempted),
        varcCorrect: ni(f.varcCorrect), varcPercentile: nf(f.varcPercentile),
        dilrScore: ni(f.dilrScore), dilrAttempted: ni(f.dilrAttempted),
        dilrCorrect: ni(f.dilrCorrect), dilrPercentile: nf(f.dilrPercentile),
        quantScore: ni(f.quantScore), quantAttempted: ni(f.quantAttempted),
        quantCorrect: ni(f.quantCorrect), quantPercentile: nf(f.quantPercentile),
        overallScore: computedOverallScore > 0 ? computedOverallScore : null,
        overallPercentile: nf(f.overallPercentile),
        durationMin: f.duration > 0 ? f.duration : null,
        tags: f.tags,
        notes: f.notes.trim(),
        linkedSessionId: null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Provider */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Provider</label>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => set("provider", p.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium",
                f.provider === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {f.provider === "OTHER" && (
          <input
            type="text"
            value={f.providerName}
            onChange={e => set("providerName", e.target.value)}
            placeholder="e.g. Career Launcher, 2IIM"
            className="input-field mt-2 w-full rounded-xl p-3 text-sm"
          />
        )}
      </div>

      {/* Test name + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Test name</label>
          <input
            type="text"
            value={f.testName}
            onChange={e => set("testName", e.target.value)}
            placeholder="AIMCAT 06"
            className="input-field w-full rounded-xl p-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground"
              >
                {format(f.date, "PPP")}
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[70] w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={f.date}
                onSelect={d => d && set("date", d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Sectional scores */}
      <div className="space-y-3">
        <p className="eyebrow">sectional scores</p>
        {SECTIONS.map(key => {
          const label = SECTION_LABELS[key];
          return (
            <div key={key} className="rounded-xl border border-border bg-card/60 p-3">
              <p className="mb-2 font-display font-semibold text-foreground">{label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["Score", "Attempted", "Correct", "Percentile"] as const).map(field => (
                  <div key={field}>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {field}
                    </label>
                    <input
                      type="number"
                      value={(f as unknown as Record<string, string>)[`${key}${field}`]}
                      onChange={e => set(`${key}${field}` as keyof FullState, e.target.value as FullState[keyof FullState])}
                      className="input-field w-full rounded-lg p-2 text-sm tabular-nums"
                      placeholder="0"
                    />
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
            <input
              type="number"
              step="0.1"
              value={f.overallPercentile}
              onChange={e => set("overallPercentile", e.target.value)}
              className="input-field w-full rounded-lg p-2 text-sm tabular-nums font-semibold"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Duration + Tags — same row */}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        {/* Duration */}
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Duration <span className="text-xs text-muted-foreground/60">(min)</span>
          </label>
          <input
            type="number"
            min={0}
            value={f.duration || ""}
            onChange={e => set("duration", Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="120"
            className="input-field w-full rounded-xl p-3 text-sm tabular-nums"
          />
        </div>

        {/* Tags with autocomplete */}
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic-mistake tags</label>
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={tagInputRef}
                type="text"
                value={f.tagInput}
                onChange={e => { set("tagInput", e.target.value.toLowerCase()); setSuggestOpen(true); }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                  if (e.key === "Escape") setSuggestOpen(false);
                }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                placeholder="e.g. pnc, rc inference"
                className="input-field flex-1 rounded-xl p-3 text-sm"
              />
              <button type="button" onClick={() => addTag()} className="rounded-xl border border-border bg-card px-3 hover:bg-muted">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {suggestOpen && suggestions.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card py-1" style={{ boxShadow: "var(--shadow-md)" }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addTag(s); }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {f.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.tags.map(t => (
                <button key={t} type="button" onClick={() => set("tags", f.tags.filter(x => x !== t))}
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
        <textarea
          value={f.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          placeholder="What worked, what didn't, what to fix next time…"
          className="input-field w-full resize-none rounded-xl p-3 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !f.testName.trim()}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : (
          "Save Full Mock"
        )}
      </button>
    </div>
  );
}

// ── SECTIONAL FORM ────────────────────────────────────────────────────────────

interface SectionalState {
  provider: MockProvider;
  providerName: string;
  testName: string;
  section: string;
  date: Date;
  score: string; attempted: string; correct: string; percentile: string;
  duration: number;
  tags: string[];
  tagInput: string;
  notes: string;
}

function SectionalForm({ onSave }: { onSave: (s: Omit<SectionalTest, "id" | "userId" | "createdAt">) => Promise<void> }) {
  const [f, setF] = useState<SectionalState>({
    provider: "TIME", providerName: "", testName: "", section: "VARC",
    date: new Date(),
    score: "", attempted: "", correct: "", percentile: "",
    duration: 40, tags: [], tagInput: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SectionalState>(k: K, v: SectionalState[K]) => setF(p => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = f.tagInput.trim();
    if (t && !f.tags.includes(t)) set("tags", [...f.tags, t]);
    set("tagInput", "");
  };

  const handleSubmit = async () => {
    if (!f.testName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        provider: f.provider,
        providerName: f.provider === "OTHER" ? f.providerName.trim() : f.provider,
        testName: f.testName.trim(),
        section: f.section,
        date: format(f.date, "yyyy-MM-dd"),
        score: ni(f.score), attempted: ni(f.attempted),
        correct: ni(f.correct), percentile: nf(f.percentile),
        durationMin: f.duration > 0 ? f.duration : null,
        tags: f.tags,
        notes: f.notes.trim(),
        linkedSessionId: null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Provider */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Provider</label>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => set("provider", p.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium",
                f.provider === p.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {f.provider === "OTHER" && (
          <input
            type="text"
            value={f.providerName}
            onChange={e => set("providerName", e.target.value)}
            placeholder="e.g. Career Launcher, 2IIM"
            className="input-field mt-2 w-full rounded-xl p-3 text-sm"
          />
        )}
      </div>

      {/* Test name + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Test name</label>
          <input
            type="text"
            value={f.testName}
            onChange={e => set("testName", e.target.value)}
            placeholder="Quant Sectional 12"
            className="input-field w-full rounded-xl p-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground"
              >
                {format(f.date, "PPP")}
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[70] w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={f.date}
                onSelect={d => d && set("date", d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Section selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Section</label>
        <div className="flex gap-2">
          {SECTIONS.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => set("section", SECTION_LABELS[k])}
              className={cn(
                "flex-1 rounded-full border px-3 py-2 text-sm font-medium",
                f.section === SECTION_LABELS[k]
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {SECTION_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card/60 p-3 sm:grid-cols-4">
        {(["Score", "Attempted", "Correct", "Percentile"] as const).map(field => (
          <div key={field}>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              {field}
            </label>
            <input
              type="number"
              value={(f as unknown as Record<string, string>)[field.toLowerCase()]}
              onChange={e => set(field.toLowerCase() as keyof SectionalState, e.target.value as SectionalState[keyof SectionalState])}
              className="input-field w-full rounded-lg p-2 text-sm tabular-nums"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {/* Duration */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Duration{" "}
          <span className="text-xs text-muted-foreground/70">(minutes — also logs a session)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={f.duration || ""}
            onChange={e => set("duration", Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="40"
            className="input-field w-24 rounded-xl p-3 text-sm tabular-nums"
          />
          {[40, 60, 30].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => set("duration", preset)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-mono",
                f.duration === preset
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {preset}m
            </button>
          ))}
          <button
            type="button"
            onClick={() => set("duration", 0)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-mono",
              f.duration === 0
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            skip
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic-mistake tags</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={f.tagInput}
            onChange={e => set("tagInput", e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
            }}
            placeholder="e.g. PnC, RC inference"
            className="input-field flex-1 rounded-xl p-3 text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-xl border border-border bg-card px-3 hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {f.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.tags.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set("tags", f.tags.filter(x => x !== t))}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                {t} <span className="ml-1 opacity-60">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Learnings / notes</label>
        <textarea
          value={f.notes}
          onChange={e => set("notes", e.target.value)}
          rows={3}
          placeholder="What worked, what didn't, what to fix next time…"
          className="input-field w-full resize-none rounded-xl p-3 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !f.testName.trim()}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : (
          "Save Sectional Test"
        )}
      </button>
    </div>
  );
}

// ── QOTD FORM ─────────────────────────────────────────────────────────────────

interface QotdState {
  date: Date;
  topic: string;
  source: string;
  correct: boolean;
  timeTakenMin: string;
  questionsCorrect: string;
  questionsTotal: string;
  note: string;
}

function QotdForm({ onSave, subjects }: { onSave: (e: Omit<QotdEntry, "id" | "userId" | "createdAt">) => Promise<void>; subjects: { id: string; name: string }[] }) {
  const topicOptions = subjects.map(s => s.name);
  const [f, setF] = useState<QotdState>({ date: new Date(), topic: subjects[0]?.name ?? "", source: "iQuanta", correct: false, timeTakenMin: "", questionsCorrect: "", questionsTotal: "", note: "" });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof QotdState>(k: K, v: QotdState[K]) => setF(p => ({ ...p, [k]: v }));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!f.topic.trim() || !f.timeTakenMin || !f.questionsCorrect || !f.questionsTotal) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        date: format(f.date, "yyyy-MM-dd"),
        topic: f.topic.trim(),
        source: f.source.trim() || "iQuanta",
        correct: f.correct,
        timeTakenMin: ni(f.timeTakenMin),
        questionsCorrect: ni(f.questionsCorrect),
        questionsTotal: ni(f.questionsTotal),
        note: f.note.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Date + Source */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-sm font-medium text-foreground"
              >
                {format(f.date, "PPP")}
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[70] w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={f.date}
                onSelect={d => d && set("date", d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Source</label>
          <input
            type="text"
            value={f.source}
            onChange={e => set("source", e.target.value)}
            className="input-field w-full rounded-xl p-3 text-sm"
          />
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Topic</label>
        <div className="flex flex-wrap gap-2">
          {topicOptions.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set("topic", t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                f.topic === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Time (min)</label>
        <input
          type="number"
          value={f.timeTakenMin}
          onChange={e => set("timeTakenMin", e.target.value)}
          placeholder="e.g. 2"
          className="input-field w-full rounded-xl p-3 text-sm tabular-nums"
        />
      </div>

      <hr className="border-border" />

      {/* Score */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Score</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={f.questionsCorrect}
            onChange={e => set("questionsCorrect", e.target.value)}
            placeholder="Correct"
            className="input-field flex-1 rounded-xl p-3 text-sm tabular-nums"
          />
          <span className="shrink-0 text-sm font-medium text-muted-foreground">out of</span>
          <input
            type="number"
            value={f.questionsTotal}
            onChange={e => set("questionsTotal", e.target.value)}
            placeholder="Total"
            className="input-field flex-1 rounded-xl p-3 text-sm tabular-nums"
          />
          <span className="shrink-0 text-sm text-muted-foreground">questions</span>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">Note</label>
        <textarea
          value={f.note}
          onChange={e => set("note", e.target.value)}
          rows={3}
          placeholder="What did you learn?"
          className="input-field w-full resize-none rounded-xl p-3 text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {(() => {
        const missing: string[] = [];
        if (!f.topic) missing.push("topic");
        if (!f.timeTakenMin) missing.push("time");
        if (!f.questionsCorrect) missing.push("correct");
        if (!f.questionsTotal) missing.push("total");
        const isDisabled = saving || missing.length > 0;
        const label = saving
          ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
          : missing.length > 0
            ? `Fill: ${missing.join(", ")}`
            : "Save QOTD Entry";
        return (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            {label}
          </button>
        );
      })()}
    </div>
  );
}

// ── MAIN MODAL ────────────────────────────────────────────────────────────────

export function LogTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBodyScrollLock(open);
  const { addFullMock, addSectional, addQotdEntry, fullMocks, sectionalTests, subjects } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<TestKind>("full");

  const allMockTags = useMemo(() => {
    const s = new Set<string>();
    fullMocks.forEach(m => m.tags.forEach(t => s.add(t.toLowerCase())));
    return Array.from(s).sort();
  }, [fullMocks]);

  const handleClose = useCallback(() => {
    setStep(1);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  const handleSaveFull = async (payload: Omit<FullMock, "id" | "userId" | "createdAt">) => {
    const created = await addFullMock(payload);
    if (created) handleClose();
  };

  const handleSaveSectional = async (payload: Omit<SectionalTest, "id" | "userId" | "createdAt">) => {
    const created = await addSectional(payload);
    if (created) handleClose();
  };

  const handleSaveQotd = async (payload: Omit<QotdEntry, "id" | "userId" | "createdAt">) => {
    const created = await addQotdEntry(payload);
    if (created) handleClose();
  };

  // suppress unused var warning — fullMocks/sectionalTests used only to satisfy store destructure
  void fullMocks; void sectionalTests;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={handleClose}
    >
      <div
        className="glass-modal w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Log a Test</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step 1: pick type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="eyebrow">step 1 / 2 — pick a type</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                { v: "full" as const, title: "Full Mock", desc: "AIMCAT, SIMCAT, etc." },
                { v: "sectional" as const, title: "Sectional", desc: "One section test" },
                { v: "qotd" as const, title: "QOTD", desc: "iQuanta daily question" },
              ]).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => { setKind(opt.v); setStep(2); }}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted",
                  )}
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  <p className="font-display text-lg font-semibold text-foreground">{opt.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: fill form */}
        {step === 2 && (
          <>
            {kind === "full" && <FullMockForm onSave={handleSaveFull} allTags={allMockTags} />}
            {kind === "sectional" && <SectionalForm onSave={handleSaveSectional} />}
            {kind === "qotd" && <QotdForm onSave={handleSaveQotd} subjects={subjects} />}
          </>
        )}
      </div>
    </div>
  );
}

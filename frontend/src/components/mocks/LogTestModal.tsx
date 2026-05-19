import { useState, useCallback } from "react";
import { X, ChevronLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useStore } from "@/lib/store";
import { toLocalDateKey } from "@/lib/date";
import type { FullMock, MockProvider, SectionalTest, QotdEntry } from "@/lib/types";

type TestKind = "full" | "sectional" | "qotd";

const PROVIDERS: { value: MockProvider; label: string }[] = [
  { value: "TIME", label: "TIME" },
  { value: "IMS", label: "IMS" },
  { value: "CL", label: "CL" },
  { value: "AIMCAT", label: "AIMCAT" },
  { value: "OTHER", label: "Other" },
];

const SECTIONS = ["VARC", "DILR", "QUANT"];
const QOTD_TOPICS = ["VARC", "DILR", "QUANT", "Reading Comprehension", "Verbal Ability", "Data Interpretation", "Logical Reasoning", "Quantitative Aptitude"];

function TagInput({ tags, onChange, allTags }: { tags: string[]; onChange: (t: string[]) => void; allTags: string[] }) {
  const [input, setInput] = useState("");
  const suggestions = input.length > 0
    ? allTags.filter((t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)).slice(0, 5)
    : [];

  const add = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="ml-0.5 text-muted-foreground hover:text-foreground">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); if (input.trim()) add(input); }
            if (e.key === "Backspace" && !input && tags.length > 0) onChange(tags.slice(0, -1));
          }}
          placeholder="Add tag (Enter to confirm)"
          className="input-field w-full text-sm"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FullMockFormState {
  provider: MockProvider;
  providerName: string;
  testName: string;
  date: string;
  varcScore: string;
  varcAttempted: string;
  varcCorrect: string;
  varcPercentile: string;
  dilrScore: string;
  dilrAttempted: string;
  dilrCorrect: string;
  dilrPercentile: string;
  quantScore: string;
  quantAttempted: string;
  quantCorrect: string;
  quantPercentile: string;
  overallScore: string;
  overallPercentile: string;
  durationMin: string;
  tags: string[];
  notes: string;
}

const emptyFullMock = (): FullMockFormState => ({
  provider: "TIME",
  providerName: "",
  testName: "",
  date: toLocalDateKey(new Date()),
  varcScore: "", varcAttempted: "", varcCorrect: "", varcPercentile: "",
  dilrScore: "", dilrAttempted: "", dilrCorrect: "", dilrPercentile: "",
  quantScore: "", quantAttempted: "", quantCorrect: "", quantPercentile: "",
  overallScore: "", overallPercentile: "",
  durationMin: "",
  tags: [],
  notes: "",
});

function ni(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
function nf(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function FullMockForm({ onSave, allTags }: { onSave: (m: Omit<FullMock, 'id' | 'userId' | 'createdAt'>) => Promise<void>; allTags: string[] }) {
  const [form, setForm] = useState<FullMockFormState>(emptyFullMock());
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FullMockFormState, v: string | string[]) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.testName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        provider: form.provider,
        providerName: form.provider === "OTHER" ? form.providerName.trim() : form.provider,
        testName: form.testName.trim(),
        date: form.date,
        varcScore: ni(form.varcScore),
        varcAttempted: ni(form.varcAttempted),
        varcCorrect: ni(form.varcCorrect),
        varcPercentile: nf(form.varcPercentile),
        dilrScore: ni(form.dilrScore),
        dilrAttempted: ni(form.dilrAttempted),
        dilrCorrect: ni(form.dilrCorrect),
        dilrPercentile: nf(form.dilrPercentile),
        quantScore: ni(form.quantScore),
        quantAttempted: ni(form.quantAttempted),
        quantCorrect: ni(form.quantCorrect),
        quantPercentile: nf(form.quantPercentile),
        overallScore: ni(form.overallScore),
        overallPercentile: nf(form.overallPercentile),
        durationMin: ni(form.durationMin),
        tags: form.tags,
        notes: form.notes.trim(),
        linkedSessionId: null,
      });
    } finally {
      setSaving(false);
    }
  };

  const sectionFields = [
    { key: "varc" as const, label: "VARC" },
    { key: "dilr" as const, label: "DILR" },
    { key: "quant" as const, label: "QUANT" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provider</label>
          <select
            value={form.provider}
            onChange={(e) => set("provider", e.target.value as MockProvider)}
            className="input-field w-full text-sm"
          >
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Test Name *</label>
          <input
            required
            type="text"
            value={form.testName}
            onChange={(e) => set("testName", e.target.value)}
            placeholder="e.g. Mock CAT 23"
            className="input-field w-full text-sm"
          />
        </div>
      </div>
      {form.provider === "OTHER" && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provider Name</label>
          <input type="text" value={form.providerName} onChange={(e) => set("providerName", e.target.value)} placeholder="Provider name" className="input-field w-full text-sm" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration (min)</label>
          <input type="number" min="0" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="180" className="input-field w-full text-sm" />
        </div>
      </div>

      {sectionFields.map(({ key, label }) => (
        <div key={key} className="rounded-xl border border-border p-3">
          <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Score</label>
              <input type="number" value={(form as unknown as Record<string, string>)[`${key}Score`]} onChange={(e) => set(`${key}Score` as keyof FullMockFormState, e.target.value)} className="input-field w-full text-xs" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Attempted</label>
              <input type="number" value={(form as unknown as Record<string, string>)[`${key}Attempted`]} onChange={(e) => set(`${key}Attempted` as keyof FullMockFormState, e.target.value)} className="input-field w-full text-xs" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">Correct</label>
              <input type="number" value={(form as unknown as Record<string, string>)[`${key}Correct`]} onChange={(e) => set(`${key}Correct` as keyof FullMockFormState, e.target.value)} className="input-field w-full text-xs" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">%ile</label>
              <input type="number" step="0.01" value={(form as unknown as Record<string, string>)[`${key}Percentile`]} onChange={(e) => set(`${key}Percentile` as keyof FullMockFormState, e.target.value)} className="input-field w-full text-xs" placeholder="0" />
            </div>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Overall Score</label>
          <input type="number" value={form.overallScore} onChange={(e) => set("overallScore", e.target.value)} placeholder="0" className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Overall %ile</label>
          <input type="number" step="0.01" value={form.overallPercentile} onChange={(e) => set("overallPercentile", e.target.value)} placeholder="0" className="input-field w-full text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Weak Topics / Tags</label>
        <TagInput tags={form.tags} onChange={(t) => set("tags", t)} allTags={allTags} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Notes / Learnings</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Key takeaways, mistakes, strategy notes..."
          className="input-field w-full resize-none text-sm"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {form.durationMin && parseInt(form.durationMin) > 0 ? "✓ A study session will be auto-logged in your heatmap." : "Add duration to auto-log a study session in your heatmap."}
      </p>

      <button
        type="submit"
        disabled={saving || !form.testName.trim()}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Save Full Mock"}
      </button>
    </form>
  );
}

interface SectionalFormState {
  provider: MockProvider;
  providerName: string;
  testName: string;
  section: string;
  date: string;
  score: string;
  attempted: string;
  correct: string;
  percentile: string;
  durationMin: string;
  tags: string[];
  notes: string;
}

function SectionalForm({ onSave, allTags }: { onSave: (s: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>) => Promise<void>; allTags: string[] }) {
  const [form, setForm] = useState<SectionalFormState>({
    provider: "TIME", providerName: "", testName: "", section: "VARC",
    date: toLocalDateKey(new Date()), score: "", attempted: "", correct: "", percentile: "",
    durationMin: "", tags: [], notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof SectionalFormState, v: string | string[]) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.testName.trim() || !form.section.trim()) return;
    setSaving(true);
    try {
      await onSave({
        provider: form.provider,
        providerName: form.provider === "OTHER" ? form.providerName.trim() : form.provider,
        testName: form.testName.trim(),
        section: form.section,
        date: form.date,
        score: ni(form.score),
        attempted: ni(form.attempted),
        correct: ni(form.correct),
        percentile: nf(form.percentile),
        durationMin: ni(form.durationMin),
        tags: form.tags,
        notes: form.notes.trim(),
        linkedSessionId: null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provider</label>
          <select value={form.provider} onChange={(e) => set("provider", e.target.value as MockProvider)} className="input-field w-full text-sm">
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Section</label>
          <select value={form.section} onChange={(e) => set("section", e.target.value)} className="input-field w-full text-sm">
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {form.provider === "OTHER" && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Provider Name</label>
          <input type="text" value={form.providerName} onChange={(e) => set("providerName", e.target.value)} placeholder="Provider name" className="input-field w-full text-sm" />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Test Name *</label>
        <input required type="text" value={form.testName} onChange={(e) => set("testName", e.target.value)} placeholder="e.g. AIMCAT 2024" className="input-field w-full text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Duration (min)</label>
          <input type="number" min="0" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="40" className="input-field w-full text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[["score", "Score"], ["attempted", "Attempted"], ["correct", "Correct"], ["percentile", "%ile"]] .map(([k, label]) => (
          <div key={k}>
            <label className="mb-1 block text-[10px] text-muted-foreground">{label}</label>
            <input type="number" step={k === "percentile" ? "0.01" : "1"} value={(form as unknown as Record<string, string>)[k]} onChange={(e) => set(k as keyof SectionalFormState, e.target.value)} className="input-field w-full text-xs" placeholder="0" />
          </div>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Weak Topics / Tags</label>
        <TagInput tags={form.tags} onChange={(t) => set("tags", t)} allTags={allTags} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes..." className="input-field w-full resize-none text-sm" />
      </div>
      <button type="submit" disabled={saving || !form.testName.trim()} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" style={{ boxShadow: "var(--shadow-md)" }}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Save Sectional Test"}
      </button>
    </form>
  );
}

interface QotdFormState {
  date: string;
  topic: string;
  source: string;
  correct: boolean;
  timeTakenSec: string;
  note: string;
}

function QotdForm({ onSave }: { onSave: (e: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>) => Promise<void> }) {
  const [form, setForm] = useState<QotdFormState>({ date: toLocalDateKey(new Date()), topic: "VARC", source: "", correct: false, timeTakenSec: "", note: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof QotdFormState, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ date: form.date, topic: form.topic.trim(), source: form.source.trim(), correct: form.correct, timeTakenSec: ni(form.timeTakenSec), note: form.note.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input-field w-full text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Topic</label>
          <select value={form.topic} onChange={(e) => set("topic", e.target.value)} className="input-field w-full text-sm">
            {QOTD_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Source / Platform</label>
        <input type="text" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. CAT 2024, AIMCAT, TIME app" className="input-field w-full text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Time Taken (sec)</label>
          <input type="number" min="0" value={form.timeTakenSec} onChange={(e) => set("timeTakenSec", e.target.value)} placeholder="120" className="input-field w-full text-sm" />
        </div>
        <div className="flex flex-col justify-end">
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Got it right?</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => set("correct", true)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold ${form.correct ? "border-green-500 bg-green-500/10 text-green-600" : "border-border text-muted-foreground"}`}>
              <CheckCircle2 className="h-4 w-4" /> Yes
            </button>
            <button type="button" onClick={() => set("correct", false)} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold ${!form.correct ? "border-red-500 bg-red-500/10 text-red-500" : "border-border text-muted-foreground"}`}>
              <XCircle className="h-4 w-4" /> No
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note</label>
        <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} placeholder="What did you learn?" className="input-field w-full resize-none text-sm" />
      </div>
      <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" style={{ boxShadow: "var(--shadow-md)" }}>
        {saving ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span> : "Save QOTD Entry"}
      </button>
    </form>
  );
}

export function LogTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBodyScrollLock(open);
  const { addFullMock, addSectional, addQotdEntry, fullMocks, sectionalTests } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<TestKind>("full");

  const allTags = [...new Set([
    ...fullMocks.flatMap((m) => m.tags),
    ...sectionalTests.flatMap((s) => s.tags),
  ])].sort();

  const handleClose = useCallback(() => {
    setStep(1);
    onClose();
  }, [onClose]);

  const handleSaveFull = async (payload: Omit<FullMock, 'id' | 'userId' | 'createdAt'>) => {
    const created = await addFullMock(payload);
    if (created) handleClose();
  };

  const handleSaveSectional = async (payload: Omit<SectionalTest, 'id' | 'userId' | 'createdAt'>) => {
    const created = await addSectional(payload);
    if (created) handleClose();
  };

  const handleSaveQotd = async (payload: Omit<QotdEntry, 'id' | 'userId' | 'createdAt'>) => {
    const created = await addQotdEntry(payload);
    if (created) handleClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={handleClose}
    >
      <div
        className="glass-modal w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground">
              {step === 1 ? "Log Test" : kind === "full" ? "Full Mock" : kind === "sectional" ? "Sectional Test" : "QOTD Entry"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">What type of test did you take?</p>
            {(
              [
                { kind: "full" as const, title: "Full Mock", desc: "3-section (VARC + DILR + QUANT) timed test" },
                { kind: "sectional" as const, title: "Sectional Test", desc: "Single-section practice test" },
                { kind: "qotd" as const, title: "Question of the Day", desc: "Daily practice question (QOTD)" },
              ]
            ).map(({ kind: k, title, desc }) => (
              <button
                key={k}
                type="button"
                onClick={() => { setKind(k); setStep(2); }}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted"
              >
                <div className="font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        ) : (
          <>
            {kind === "full" && <FullMockForm onSave={handleSaveFull} allTags={allTags} />}
            {kind === "sectional" && <SectionalForm onSave={handleSaveSectional} allTags={allTags} />}
            {kind === "qotd" && <QotdForm onSave={handleSaveQotd} />}
          </>
        )}
      </div>
    </div>
  );
}

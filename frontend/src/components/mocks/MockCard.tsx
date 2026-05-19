import { useState } from 'react';
import { ChevronDown, Trash2, Pencil } from 'lucide-react';
import type { FullMock } from '@/lib/types';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { EditFullMockModal } from '@/components/mocks/EditTestModal';

const fmtDur = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
const fmt = (v: number | null | undefined) => (v == null ? '—' : String(v));
const acc = (att: number | null | undefined, cor: number | null | undefined) => {
  if (!att || !cor) return '—';
  return `${Math.round((cor / att) * 100)}%`;
};

export function MockCard({ mock }: { mock: FullMock }) {
  const { deleteFullMock } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const providerLabel = mock.provider === 'OTHER' ? (mock.providerName || 'Other') : mock.provider;

  const sections = [
    { label: 'VARC', score: mock.varcScore, attempted: mock.varcAttempted, correct: mock.varcCorrect, percentile: mock.varcPercentile },
    { label: 'DILR', score: mock.dilrScore, attempted: mock.dilrAttempted, correct: mock.dilrCorrect, percentile: mock.dilrPercentile },
    { label: 'QUANT', score: mock.quantScore, attempted: mock.quantAttempted, correct: mock.quantCorrect, percentile: mock.quantPercentile },
  ];

  const hasSectionData = sections.some(s => s.score != null);

  const dateLabel = (() => {
    const [y, m, d] = mock.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  return (
    <>
    <div className="glass-card rounded-2xl p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="terminal-chip text-[10px]">{providerLabel}</span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">{mock.testName}</span>
          <span className="text-xs text-muted-foreground">· {dateLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {mock.overallScore != null && (
            <div className="text-right">
              <p className="font-display text-2xl font-semibold tabular-nums text-foreground leading-none">{mock.overallScore}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">score</p>
            </div>
          )}
          {mock.overallPercentile != null && (
            <div className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold tabular-nums text-primary">
              {mock.overallPercentile.toFixed(1)}%ile
            </div>
          )}
        </div>
      </div>

      {/* Section grid */}
      {hasSectionData && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {sections.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">{fmt(s.score)}</p>
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {fmt(s.correct)}/{fmt(s.attempted)} · {acc(s.attempted, s.correct)}
                {s.percentile != null ? ` · ${s.percentile.toFixed(1)}%ile` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Toggle + actions */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`h-3.5 w-3.5 ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Hide' : 'Show'} tags & notes
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              deleteFullMock(mock.id);
              toast.success('Mock deleted');
            }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              confirmDelete ? 'bg-red-500/15 text-red-500' : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Expandable: duration, tags, notes */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {mock.durationMin != null && (
            <p className="text-xs text-muted-foreground">⏱ {fmtDur(mock.durationMin)}</p>
          )}
          {mock.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mock.tags.map(t => (
                <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">{t}</span>
              ))}
            </div>
          )}
          {mock.notes && (
            <p className="text-sm leading-relaxed text-muted-foreground">{mock.notes}</p>
          )}
          {mock.tags.length === 0 && !mock.notes && mock.durationMin == null && (
            <p className="text-xs italic text-muted-foreground">No tags, notes, or duration logged.</p>
          )}
        </div>
      )}
    </div>
    {editOpen && <EditFullMockModal mock={mock} onClose={() => setEditOpen(false)} />}
    </>
  );
}

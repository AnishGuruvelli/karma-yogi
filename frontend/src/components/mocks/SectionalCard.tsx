import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import type { SectionalTest } from '@/lib/types';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { EditSectionalModal } from '@/components/mocks/EditTestModal';

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

const sectionColor: Record<string, string> = {
  VARC: 'bg-cyan-500/15 text-cyan-600',
  DILR: 'bg-green-500/15 text-green-600',
  QUANT: 'bg-orange-500/15 text-orange-600',
};

export function SectionalCard({ test }: { test: SectionalTest }) {
  const { deleteSectional } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const providerLabel = test.provider === 'OTHER' ? (test.providerName || 'Other') : test.provider;
  const acc = test.attempted && test.correct
    ? `${Math.round((test.correct / test.attempted) * 100)}%`
    : '—';

  const dateLabel = (() => {
    const [y, m, d] = test.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  return (
    <>
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="terminal-chip text-[10px]">{providerLabel}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${sectionColor[test.section] ?? 'bg-muted text-muted-foreground'}`}>
            {test.section}
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">{test.testName}</span>
          <span className="text-xs text-muted-foreground">· {dateLabel}</span>
        </div>
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
              deleteSectional(test.id);
              toast.success('Sectional test deleted');
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

      {/* Score grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="score" value={test.score != null ? String(test.score) : '—'} accent />
        <Stat label="attempted" value={test.attempted != null ? String(test.attempted) : '—'} />
        <Stat label="accuracy" value={acc} />
        <Stat label="%ile" value={test.percentile != null ? test.percentile.toFixed(1) : '—'} accent />
      </div>

      {/* Tags / notes */}
      {(test.tags.length > 0 || test.notes || test.durationMin != null) && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {test.durationMin != null && (
            <p className="text-xs text-muted-foreground">⏱ {test.durationMin >= 60 ? `${Math.floor(test.durationMin / 60)}h ${test.durationMin % 60}m` : `${test.durationMin}m`}</p>
          )}
          {test.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {test.tags.map(t => (
                <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">{t}</span>
              ))}
            </div>
          )}
          {test.notes && (
            <p className="text-sm leading-relaxed text-muted-foreground">{test.notes}</p>
          )}
        </div>
      )}

    </div>
    {editOpen && <EditSectionalModal test={test} onClose={() => setEditOpen(false)} />}
    </>
  );
}

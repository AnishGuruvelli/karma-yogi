import { useState } from 'react';
import { useStore } from '@/lib/store';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface GoalEditModalProps {
  open: boolean;
  onClose: () => void;
}

export function GoalEditModal({ open, onClose }: GoalEditModalProps) {
  const { goal, updateGoal } = useStore();
  const [targetHours, setTargetHours] = useState(goal.targetHours);
  useBodyScrollLock(open);
  if (!open) return null;

  const handleSave = () => {
    if (targetHours > 0) {
      updateGoal(targetHours);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass-modal w-full max-w-sm rounded-2xl p-4 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit Weekly Goal</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">Target hours per week</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTargetHours(Math.max(1, targetHours - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-foreground hover:bg-muted transition-colors"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              −
            </button>
            <input
              type="number" min={1} max={168} value={targetHours}
              onChange={e => setTargetHours(Math.max(1, Number(e.target.value)))}
              className="input-field flex-1 rounded-xl p-3 text-center text-2xl font-bold text-foreground"
            />
            <button
              onClick={() => setTargetHours(Math.min(168, targetHours + 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-foreground hover:bg-muted transition-colors"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              +
            </button>
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            ≈ {(targetHours / 7).toFixed(1)} hours per day
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

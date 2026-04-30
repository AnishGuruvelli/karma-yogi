import { X } from 'lucide-react';
import { StudyCalendar } from '@/components/StudyCalendar';
import type { Session } from '@/lib/types';

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
}

export function CalendarModal({ open, onClose, sessions }: CalendarModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-modal relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-card p-0 sm:max-h-[90dvh] sm:max-w-xl sm:rounded-3xl" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <div className="relative flex items-center justify-center border-b border-border px-4 py-4 sm:px-5">
          <button
            onClick={onClose}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:text-foreground sm:left-5"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Calendar</h2>
        </div>
        <div className="min-h-0 flex-1 p-0">
          <StudyCalendar sessions={sessions} />
        </div>
      </div>
    </div>
  );
}

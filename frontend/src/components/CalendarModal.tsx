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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-modal relative w-full max-w-xl overflow-hidden rounded-3xl bg-card p-0" style={{ boxShadow: 'var(--shadow-xl)' }}>
        <div className="relative flex items-center justify-center border-b border-border px-5 py-4">
          <button
            onClick={onClose}
            className="absolute left-5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-foreground">Calendar</h2>
        </div>
        <div className="p-0">
          <StudyCalendar sessions={sessions} />
        </div>
      </div>
    </div>
  );
}

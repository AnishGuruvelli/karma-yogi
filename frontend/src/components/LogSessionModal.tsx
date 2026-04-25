import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { MOOD_EMOJIS } from '@/lib/types';
import { CalendarDays, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { getSafeSubjectIcon } from '@/lib/subject-icon';
import { getLastStudiedSubjectId } from '@/lib/last-studied-subject';
import { toast } from 'sonner';
const SHEET_CLOSE_DRAG_Y = 120;
const SHEET_CLOSE_VELOCITY_Y = 700;

interface LogSessionModalProps {
  open: boolean;
  onClose: () => void;
  initialSession?: {
    id: string;
    subjectId: string;
    topic: string;
    duration: number;
    date: string;
    startTime: string;
    moodRating: number;
  } | null;
  onSave?: (changes: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }) => void;
  onDelete?: () => void;
}

export function LogSessionModal({ open, onClose, initialSession, onSave, onDelete }: LogSessionModalProps) {
  const { subjects, sessions, addSession, addSubject } = useStore();
  const [subjectId, setSubjectId] = useState(() => getLastStudiedSubjectId(sessions, subjects));
  const [topic, setTopic] = useState(initialSession?.topic || '');
  const initialDuration = initialSession?.duration ?? 30;
  const [hours, setHours] = useState(Math.floor(initialDuration / 60));
  const [minutes, setMinutes] = useState(initialDuration % 60);
  const [mood, setMood] = useState(initialSession?.moodRating || 3);
  const toLocalDateString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [sessionDate, setSessionDate] = useState(initialSession?.date || toLocalDateString(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('cyan');
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const colorMap: Record<string, string> = {
    green: '#4ade80', cyan: '#22d3ee', orange: '#fb923c', pink: '#f472b6', purple: '#a78bfa',
  };

  useEffect(() => {
    if (initialSession) {
      setSubjectId(initialSession.subjectId);
      setTopic(initialSession.topic);
      const d = initialSession.duration;
      setHours(Math.floor(d / 60));
      setMinutes(d % 60);
      setMood(initialSession.moodRating);
      setSessionDate(initialSession.date);
    } else {
      setSubjectId(getLastStudiedSubjectId(sessions, subjects));
      setTopic('');
      setHours(0);
      setMinutes(30);
      setMood(3);
      setSessionDate(toLocalDateString(new Date()));
    }
  }, [initialSession, sessions, subjects]);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(getLastStudiedSubjectId(sessions, subjects));
    }
  }, [subjectId, sessions, subjects]);

  useEffect(() => {
    if (!open) return;
    const { overflow: prevOverflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleCreateSubject = async () => {
    const normalizedName = newSubjectName.trim().toUpperCase();
    if (!normalizedName) return;
    const alreadyExists = subjects.some((s) => s.name.trim().toUpperCase() === normalizedName);
    if (alreadyExists) {
      toast.error('Subject already exists.');
      return;
    }
    const created = await addSubject(normalizedName, newSubjectColor);
    if (created) {
      setSubjectId(created.id);
      toast.success('Subject created.');
    } else {
      toast.error('Unable to create subject. Please try again.');
      return;
    }
    setNewSubjectName('');
    setShowCreateSubject(false);
  };

  const handleSubmit = () => {
    const trimmedTopic = topic.trim();
    if (!subjectId || (!hours && !minutes) || !trimmedTopic) return;
    const duration = hours * 60 + minutes;
    const now = new Date();
    const endDateTime = new Date(`${sessionDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`);
    const startDate = new Date(endDateTime.getTime() - duration * 60000);
    const payload = {
      topic: trimmedTopic,
      duration,
      startTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`,
      date: sessionDate,
      moodRating: mood,
      isManualLog: true,
    };
    if (initialSession && onSave) {
      onSave({ subjectId, topic: payload.topic, duration: payload.duration, date: payload.date, startTime: payload.startTime, moodRating: payload.moodRating });
    } else {
      addSession({ subjectId, ...payload });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <motion.div
            className="glass-modal mt-10 flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:mt-0 sm:max-h-[min(92dvh,860px)] sm:max-w-3xl sm:rounded-2xl"
            onClick={e => e.stopPropagation()}
            initial={{ y: 88, opacity: 0.92, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 96, opacity: 0.88, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 1 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.16}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > SHEET_CLOSE_DRAG_Y || info.velocity.y > SHEET_CLOSE_VELOCITY_Y) {
                onClose();
              }
            }}
          >
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{initialSession ? 'Edit Session' : 'Log Session'}</h2>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Subject</label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger
                className="h-14 rounded-2xl border-border bg-card/80 px-4 text-lg font-medium text-foreground transition-all hover:border-primary/40 focus:ring-2 focus:ring-primary/20 data-[state=open]:border-primary/50 data-[state=open]:bg-card [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-muted-foreground [&>svg]:transition-transform [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                {selectedSubject ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-base">{getSafeSubjectIcon(selectedSubject.icon, selectedSubject.name.charAt(0) || '📘')}</span>
                    <span className="font-medium">{selectedSubject.name}</span>
                  </span>
                ) : (
                  <SelectValue placeholder="Select subject" />
                )}
              </SelectTrigger>
              {/* Radix portals use z-index; the modal overlay is z-[60], so bump this above it. */}
              <SelectContent className="z-[80] rounded-xl border-border bg-card p-1 shadow-xl">
                {subjects.length === 0 ? (
                  <SelectItem value="__no_subjects__" disabled>No subjects yet</SelectItem>
                ) : (
                  subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{getSafeSubjectIcon(s.icon, s.name.charAt(0) || '📘')}</span>
                        <span className="font-medium">{s.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {subjects.length === 0 ? 'No subjects available. Create one now:' : "Can't find your subject? Create one now:"}
              </p>
              {!showCreateSubject ? (
                <button type="button" onClick={() => setShowCreateSubject(true)} className="mt-2 text-sm font-semibold text-primary hover:underline">
                  + Create Subject
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Subject name"
                    className="input-field w-full rounded-lg p-2 text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    {Object.entries(colorMap).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setNewSubjectColor(key);
                        }}
                        onClick={() => setNewSubjectColor(key)}
                        aria-pressed={newSubjectColor === key}
                        className={`h-8 w-8 rounded-full transition-all ${newSubjectColor === key ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card border-2 border-primary/60' : 'border border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: val }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleCreateSubject();
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateSubject(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Date</label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card/60 px-3 text-left transition-all hover:border-primary/40 hover:bg-card"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Session Date</span>
                      <span className="block text-sm font-semibold text-foreground">
                        {format(new Date(`${sessionDate}T00:00:00`), 'EEE, dd MMM yyyy')}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-primary/80 group-hover:text-primary">Change</span>
                </button>
              </PopoverTrigger>
                  <PopoverContent className="z-[80] w-auto rounded-xl border-border bg-card p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(`${sessionDate}T00:00:00`)}
                  onSelect={(d) => {
                    if (!d) return;
                    if (d > new Date()) return;
                    setSessionDate(toLocalDateString(d));
                    setDatePickerOpen(false);
                  }}
                  disabled={(date) => date > new Date()}
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Topic</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Algebra basics"
              className="input-field w-full rounded-xl p-3 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-muted-foreground">Hours</label>
                <div className="text-xs text-muted-foreground">Quick pick</div>
              </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                      hours === h
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                max={12}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="input-field mt-3 w-full rounded-xl p-3 text-foreground"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-muted-foreground">Minutes</label>
                <div className="text-xs text-muted-foreground">Quick pick</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0, 15, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                      minutes === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="input-field mt-3 w-full rounded-xl p-3 text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Mood</label>
            <div className="flex justify-between rounded-xl bg-muted/50 p-2">
              {[1, 2, 3, 4, 5].map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`rounded-lg p-2.5 text-2xl transition-all ${
                    mood === m ? 'scale-110 bg-card' : 'opacity-40 hover:opacity-70'
                  }`}
                  style={mood === m ? { boxShadow: 'var(--shadow-sm)' } : undefined}
                >
                  {MOOD_EMOJIS[m]}
                </button>
              ))}
            </div>
          </div>

            {initialSession && onDelete ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-red-300 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  Delete Session
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={subjects.length === 0 || !topic.trim() || (!hours && !minutes)}
                  className="rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  {subjects.length === 0 ? 'Add a subject first' : !topic.trim() ? 'Topic is required' : 'Save Session'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={subjects.length === 0 || !topic.trim() || (!hours && !minutes)}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                {subjects.length === 0 ? 'Add a subject first' : !topic.trim() ? 'Topic is required' : 'Save Session'}
              </button>
            )}
          </div>
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl"
                  initial={{ y: 10, opacity: 0.95, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 8, opacity: 0.95, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-2xl font-bold text-foreground">Delete this session?</h3>
                  <p className="mt-3 text-lg text-muted-foreground">
                    Session topic: &quot;{topic.trim() || initialSession?.topic || 'Untitled'}&quot;. This action cannot be undone.
                  </p>
                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-xl border border-border bg-card px-5 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        onDelete?.();
                      }}
                      className="rounded-xl bg-red-600 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

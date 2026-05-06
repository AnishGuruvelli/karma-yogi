import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { X, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { clearTimerState, fetchTimerState, saveTimerState, startTimerFromServer } from '@/lib/api';
import { toLocalDateKey } from '@/lib/date';
import { getSafeSubjectIcon } from '@/lib/subject-icon';
import { getLastStudiedSubjectId } from '@/lib/last-studied-subject';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

type TimerMode = 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'focus' | 'break';

interface TimerModalProps {
  open: boolean;
  onClose: () => void;
  onRequestOpen?: () => void;
}

const POMODORO_FOCUS = 25 * 60;
const POMODORO_BREAK = 5 * 60;
const labelClass = "mb-1.5 block text-sm font-medium text-muted-foreground";
const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const;

export function TimerModal({ open, onClose, onRequestOpen }: TimerModalProps) {
  const { subjects, sessions, addSession, addSubject } = useStore();
  const [subjectId, setSubjectId] = useState(() => getLastStudiedSubjectId(sessions, subjects));
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [subjectSelectOpen, setSubjectSelectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('cyan');
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const colorMap: Record<string, string> = {
    green: '#4ade80', cyan: '#22d3ee', orange: '#fb923c', pink: '#f472b6', purple: '#a78bfa',
  };
  const CREATE_SUBJECT_VALUE = "__create_subject__";

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalStudied, setTotalStudied] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [pauseStartedAtMs, setPauseStartedAtMs] = useState<number | null>(null);
  const [pausedAccumMs, setPausedAccumMs] = useState(0);
  const [tickNowMs, setTickNowMs] = useState(Date.now());
  const [restoredOnce, setRestoredOnce] = useState(false);
  const [showMoodStep, setShowMoodStep] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [pendingEndTime, setPendingEndTime] = useState<Date | null>(null);

  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus');
  const [pomodoroRemaining, setPomodoroRemaining] = useState(POMODORO_FOCUS);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const computedStopwatchElapsed = (() => {
    if (!startedAtMs) return elapsed;
    const effectiveNow = isPaused && pauseStartedAtMs ? pauseStartedAtMs : tickNowMs;
    const seconds = Math.floor((effectiveNow - startedAtMs - pausedAccumMs) / 1000);
    return Math.max(0, seconds);
  })();

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    const handleVisible = () => setTickNowMs(Date.now());
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, []);

  useEffect(() => {
    if (restoredOnce) return;
    let cancelled = false;
    void fetchTimerState()
      .then((state) => {
        if (cancelled) return;
        setRestoredOnce(true);
        if (cancelled || !state || typeof state !== 'object') return;
        const timerTypeValue = typeof state.timerType === 'string' ? state.timerType : 'main';
        if (timerTypeValue === 'friend') return;
        const modeValue = state.mode === 'pomodoro' ? 'pomodoro' : 'stopwatch';
        const subjectValue = typeof state.subjectId === 'string' ? state.subjectId : '';
        const topicValue = typeof state.topic === 'string' ? state.topic : '';
        const runningValue = Boolean(state.isRunning);
        const pausedValue = Boolean(state.isPaused);
        const startedValue = Boolean(state.hasStarted);
        const startedMsValue = typeof state.startedAtMs === 'number' ? state.startedAtMs : null;
        const pauseMsValue = typeof state.pauseStartedAtMs === 'number' ? state.pauseStartedAtMs : null;
        const pausedTotalMsValue = typeof state.pausedAccumMs === 'number' ? state.pausedAccumMs : 0;
        const elapsedValue = typeof state.elapsed === 'number' ? state.elapsed : 0;
        const totalStudiedValue = typeof state.totalStudied === 'number' ? state.totalStudied : 0;
        const pomodoroCountValue = typeof state.pomodoroCount === 'number' ? state.pomodoroCount : 0;
        const focusDurationValue = typeof state.focusDuration === 'number' ? state.focusDuration : 25;
        const breakDurationValue = typeof state.breakDuration === 'number' ? state.breakDuration : 5;
        const pomodoroPhaseValue = state.pomodoroPhase === 'break' ? 'break' : 'focus';
        const pomodoroRemainingValue =
          typeof state.pomodoroRemaining === 'number' ? state.pomodoroRemaining : focusDurationValue * 60;

        setMode(modeValue);
        setSubjectId(subjectValue);
        setTopic(topicValue);
        setIsRunning(runningValue);
        setIsPaused(pausedValue);
        setHasStarted(startedValue);
        setElapsed(elapsedValue);
        setTotalStudied(totalStudiedValue);
        setPomodoroCount(pomodoroCountValue);
        setFocusDuration(focusDurationValue);
        setBreakDuration(breakDurationValue);
        setPomodoroPhase(pomodoroPhaseValue);
        setPomodoroRemaining(pomodoroRemainingValue);
        setStartedAtMs(startedMsValue);
        setPauseStartedAtMs(pauseMsValue);
        setPausedAccumMs(pausedTotalMsValue);
        setTickNowMs(Date.now());
        startTimeRef.current = startedMsValue ? new Date(startedMsValue) : null;
        if ((startedValue || runningValue) && !open) {
          onRequestOpen?.();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [restoredOnce, open, onRequestOpen]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTickNowMs(Date.now());
        if (mode === 'stopwatch') {
          return;
        } else {
          setPomodoroRemaining(prev => {
            if (prev <= 1) {
              if (pomodoroPhase === 'focus') {
                setTotalStudied(ts => ts + focusDuration * 60);
                setPomodoroCount(c => c + 1);
                setPomodoroPhase('break');
                return breakDuration * 60;
              } else {
                setPomodoroPhase('focus');
                return focusDuration * 60;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return clearTimer;
  }, [isRunning, isPaused, mode, pomodoroPhase, focusDuration, breakDuration, clearTimer]);

  useEffect(() => {
    if (!hasStarted) return;
    const baseState = {
      timerType: 'main',
      mode,
      subjectId,
      topic,
      isRunning,
      isPaused,
      elapsed,
      totalStudied,
      hasStarted,
      startedAtMs,
      pauseStartedAtMs,
      pausedAccumMs,
    };
    const modeState =
      mode === 'pomodoro'
        ? {
            pomodoroPhase,
            pomodoroRemaining,
            pomodoroCount,
            focusDuration,
            breakDuration,
          }
        : {};
    const state = { ...baseState, ...modeState };
    void saveTimerState(state).catch(() => {});
  }, [
    mode,
    subjectId,
    topic,
    isRunning,
    isPaused,
    elapsed,
    totalStudied,
    hasStarted,
    pomodoroPhase,
    pomodoroRemaining,
    pomodoroCount,
    focusDuration,
    breakDuration,
    startedAtMs,
    pauseStartedAtMs,
    pausedAccumMs,
  ]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStartedAt = (startedMs: number | null) => {
    if (!startedMs) return '';
    return new Date(startedMs).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleStart = async () => {
    if (!subjectId || !topic.trim()) return;
    const now = await startTimerFromServer().catch(() => null);
    if (!now) return;
    startTimeRef.current = new Date(now);
    setStartedAtMs(now);
    setPauseStartedAtMs(null);
    setPausedAccumMs(0);
    setTickNowMs(now);
    setIsRunning(true);
    setIsPaused(false);
    setHasStarted(true);
    setElapsed(0);
    setTotalStudied(0);
    setPomodoroCount(0);
    setPomodoroPhase('focus');
    setPomodoroRemaining(focusDuration * 60);
  };

  const handleStop = () => {
    clearTimer();
    const totalSeconds =
      mode === 'stopwatch'
        ? computedStopwatchElapsed
        : totalStudied + (pomodoroPhase === 'focus' ? focusDuration * 60 - pomodoroRemaining : 0);
    const duration = Math.round(totalSeconds / 60);
    if (duration >= 1 && startTimeRef.current) {
      setPendingDuration(duration);
      setPendingEndTime(new Date());
      setSelectedMood(null);
      setShowMoodStep(true);
      setIsRunning(false);
      setIsPaused(false);
      setTickNowMs(Date.now());
      void clearTimerState().catch(() => {});
      return;
    }
    void clearTimerState().catch(() => {});
    resetAll();
    onClose();
  };

  const handleSaveStoppedSession = () => {
    if (!startTimeRef.current || !pendingEndTime || !selectedMood || pendingDuration < 1) return;
    addSession({
      subjectId,
      topic: topic || 'General study',
      duration: pendingDuration,
      startTime: `${startTimeRef.current.getHours().toString().padStart(2, '0')}:${startTimeRef.current.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${pendingEndTime.getHours().toString().padStart(2, '0')}:${pendingEndTime.getMinutes().toString().padStart(2, '0')}`,
      date: toLocalDateKey(pendingEndTime),
      moodRating: selectedMood,
      isManualLog: false,
    });
    setShowMoodStep(false);
    setSelectedMood(null);
    setPendingDuration(0);
    setPendingEndTime(null);
    resetAll();
    onClose();
  };

  const handleDiscardStoppedSession = () => {
    setShowMoodStep(false);
    setSelectedMood(null);
    setPendingDuration(0);
    setPendingEndTime(null);
    void clearTimerState().catch(() => {});
    resetAll();
    onClose();
  };

  const resetAll = () => {
    setIsRunning(false);
    setIsPaused(false);
    setHasStarted(false);
    setElapsed(0);
    setTotalStudied(0);
    setPomodoroCount(0);
    setPomodoroPhase('focus');
    setPomodoroRemaining(focusDuration * 60);
    setStartedAtMs(null);
    setPauseStartedAtMs(null);
    setPausedAccumMs(0);
    setTickNowMs(Date.now());
    startTimeRef.current = null;
  };

  const skipPhase = () => {
    if (pomodoroPhase === 'focus') {
      setTotalStudied(ts => ts + (focusDuration * 60 - pomodoroRemaining));
      setPomodoroCount(c => c + 1);
      setPomodoroPhase('break');
      setPomodoroRemaining(breakDuration * 60);
    } else {
      setPomodoroPhase('focus');
      setPomodoroRemaining(focusDuration * 60);
    }
  };

  const pomodoroTotal = pomodoroPhase === 'focus' ? focusDuration * 60 : breakDuration * 60;
  const pomodoroProgress = 1 - pomodoroRemaining / pomodoroTotal;
  const circumference = 2 * Math.PI * 90;
  const canStart = subjects.length > 0 && topic.trim().length > 0;
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
      setSubjectSelectOpen(false);
    } else {
      toast.error('Unable to create subject. Please try again.');
      return;
    }
    setNewSubjectName('');
    setShowCreateSubject(false);
  };

  const handleSubjectChange = (value: string) => {
    if (value === CREATE_SUBJECT_VALUE) {
      setShowCreateSubject(true);
      window.setTimeout(() => setSubjectSelectOpen(true), 0);
      return;
    }
    setSubjectId(value);
    setShowCreateSubject(false);
    setSubjectSelectOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={() => {
            if (!hasStarted) onClose();
          }}
        >
          <motion.div
            className="glass-modal mt-10 flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:mt-0 sm:max-h-[min(92dvh,860px)] sm:rounded-2xl"
            initial={{ y: 88, opacity: 0.92, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 96, opacity: 0.88, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 1 }}
            onClick={e => e.stopPropagation()}
          >
        <div className="min-h-0 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Study Timer</h2>
            <button
              onClick={() => {
                if (!hasStarted) onClose();
              }}
              disabled={hasStarted}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!hasStarted ? (
            <>
            {/* Mode Selector */}
            <div className="mb-5 flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setMode('stopwatch')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === 'stopwatch' ? 'bg-card text-primary' : 'text-muted-foreground'
                }`}
                style={mode === 'stopwatch' ? { boxShadow: 'var(--shadow-sm)' } : undefined}
              >
                ⏱ Stopwatch
              </button>
              <button
                onClick={() => setMode('pomodoro')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === 'pomodoro' ? 'bg-card text-primary' : 'text-muted-foreground'
                }`}
                style={mode === 'pomodoro' ? { boxShadow: 'var(--shadow-sm)' } : undefined}
              >
                🍅 Pomodoro
              </button>
            </div>

            {/* Setup */}
            <div className="mb-5 space-y-3">
              <div>
                <label className={labelClass}>Subject</label>
                <Select value={subjectId} onValueChange={handleSubjectChange} open={subjectSelectOpen} onOpenChange={setSubjectSelectOpen}>
                  <SelectTrigger
                    className="input-field h-12 rounded-xl px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 focus:ring-2 focus:ring-primary/20 sm:text-base data-[state=open]:border-primary/50 [&>svg]:text-muted-foreground"
                  >
                    {selectedSubject ? (
                      <span className="inline-flex min-w-0 items-center gap-4">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                          {getSafeSubjectIcon(selectedSubject.icon, selectedSubject.name.charAt(0) || '📘')}
                        </span>
                        <span className="truncate font-medium">{selectedSubject.name}</span>
                      </span>
                    ) : (
                      <SelectValue placeholder="Select subject" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="z-[80] rounded-xl border-border bg-card p-1 shadow-xl">
                    {subjects.length === 0 ? (
                      <SelectItem value="__no_subjects__" disabled>No subjects yet</SelectItem>
                    ) : (
                      subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                              {getSafeSubjectIcon(s.icon, s.name.charAt(0) || '📘')}
                            </span>
                            <span className="font-medium">{s.name}</span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                    <SelectItem
                      value={CREATE_SUBJECT_VALUE}
                      onSelect={(event) => {
                        event.preventDefault();
                        setShowCreateSubject(true);
                        setSubjectSelectOpen(true);
                      }}
                    >
                      <span className="font-semibold text-primary">+ Create Subject</span>
                    </SelectItem>
                    {showCreateSubject && (
                        <div className="mt-1 space-y-2 rounded-xl border border-border bg-muted/50 p-3">
                        <input
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          placeholder="Subject name"
                          className="input-field w-full rounded-xl p-2 text-sm"
                        />
                          <div className="flex flex-wrap gap-2 pt-0.5">
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
                              className={`h-8 w-8 rounded-full transition-all ${newSubjectColor === key ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card' : 'border border-transparent hover:scale-105'}`}
                              style={{ backgroundColor: val }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void handleCreateSubject();
                            }}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateSubject(false)}
                            className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelClass}>Topic</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Algebra basics"
                  className="input-field w-full rounded-xl p-3 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              {mode === 'pomodoro' && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <label className={labelClass}>Focus (min)</label>
                    <input
                      type="number" min={1} max={120} value={focusDuration}
                      onChange={e => { setFocusDuration(Number(e.target.value)); setPomodoroRemaining(Number(e.target.value) * 60); }}
                      className="input-field w-full rounded-xl p-3 text-foreground"
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Break (min)</label>
                    <input
                      type="number" min={1} max={30} value={breakDuration}
                      onChange={e => setBreakDuration(Number(e.target.value))}
                      className="input-field w-full rounded-xl p-3 text-foreground"
                    />
                  </div>
                </div>
              )}
            </div>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (!canStart) return;
                        void handleStart();
                      }}
                      aria-disabled={!canStart}
                      title={!canStart ? (subjects.length === 0 ? 'Please create/select a subject first.' : 'Please enter a topic to start the timer.') : undefined}
                      className={`w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-all ${
                        canStart ? 'hover:opacity-95' : 'cursor-not-allowed opacity-70'
                      }`}
                      style={{ boxShadow: "var(--shadow-md)" }}
                    >
                      <Play className="mr-2 inline h-4 w-4" />
                      {subjects.length === 0
                        ? 'Add a subject first'
                        : topic.trim().length === 0
                          ? 'Add a topic first'
                          : `Start ${mode === 'pomodoro' ? 'Pomodoro' : 'Timer'}`}
                    </button>
                  </TooltipTrigger>
                  {!canStart && (
                    <TooltipContent side="top">
                      {subjects.length === 0 ? 'Please create/select a subject first.' : 'Please enter a topic to start the timer.'}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          ) : showMoodStep ? (
            <div className="space-y-5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
              <div className="rounded-2xl border border-border bg-card/60 p-4">
                <h3 className="text-base font-semibold text-foreground">How was this session?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select your mood to save this {pendingDuration} min session.
                </p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {MOOD_EMOJIS.map((emoji, idx) => {
                    const mood = idx + 1;
                    const active = selectedMood === mood;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedMood(mood)}
                        aria-label={`Mood ${mood}`}
                        className={`flex h-12 items-center justify-center rounded-xl border text-2xl transition-all ${
                          active
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/25'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDiscardStoppedSession}
                  className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveStoppedSession}
                  disabled={!selectedMood}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!selectedMood ? 'Select mood to save' : 'Save session'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
            {/* Timer Display */}
            <div className="flex flex-col items-center py-4">
              {mode === 'pomodoro' ? (
                <>
                  <div className="relative mb-3">
                    <svg width="180" height="180" viewBox="0 0 200 200" className="sm:h-[200px] sm:w-[200px]">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-muted)" strokeWidth="8" />
                      <circle
                        cx="100" cy="100" r="90" fill="none"
                        stroke={pomodoroPhase === 'focus' ? 'var(--color-neon-orange)' : 'var(--color-neon-green)'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pomodoroProgress)}
                        transform="rotate(-90 100 100)"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-mono font-bold text-foreground sm:text-4xl">{formatTime(pomodoroRemaining)}</span>
                      <span className={`mt-1 text-sm font-semibold ${pomodoroPhase === 'focus' ? 'text-neon-orange' : 'text-neon-green'}`}>
                        {pomodoroPhase === 'focus' ? '🍅 Focus' : '☕ Break'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Pomodoros: <strong className="text-foreground">{pomodoroCount}</strong></span>
                    <span>Studied: <strong className="text-foreground">{Math.floor(totalStudied / 60)}m</strong></span>
                  </div>
                </>
              ) : (
                <div className="text-5xl font-mono font-bold tracking-tight text-foreground sm:text-6xl">{formatTime(computedStopwatchElapsed)}</div>
              )}
              <p className="mt-3 max-w-full text-center text-sm text-muted-foreground">
                <span className="inline-flex max-w-full items-center gap-2.5 align-middle">
                  {selectedSubject ? (
                    <>
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                        {getSafeSubjectIcon(selectedSubject.icon, selectedSubject.name.charAt(0) || '📘')}
                      </span>
                      <span className="truncate">{selectedSubject.name}</span>
                    </>
                  ) : (
                    <span>Subject</span>
                  )}
                </span>{' '}
                — {topic || 'General study'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/90">
                Started at {formatStartedAt(startedAtMs)}
              </p>
              {isPaused && (
                <span className="mt-2 rounded-full bg-neon-orange/10 border border-neon-orange/20 px-3 py-1 text-xs font-semibold text-neon-orange">
                  Paused
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  clearTimer();
                  void clearTimerState().catch(() => {});
                  resetAll();
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-all"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              {isPaused ? (
                <button
                  onClick={() => {
                    if (mode === 'stopwatch' && pauseStartedAtMs) {
                      setPausedAccumMs((prev) => prev + (Date.now() - pauseStartedAtMs));
                      setPauseStartedAtMs(null);
                    }
                    setTickNowMs(Date.now());
                    setIsPaused(false);
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green text-white transition-all hover:opacity-90 neon-glow-green"
                >
                  <Play className="h-6 w-6" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (mode === 'stopwatch') setPauseStartedAtMs(Date.now());
                    setIsPaused(true);
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-orange text-white transition-all hover:opacity-90 neon-glow-orange"
                >
                  <Pause className="h-6 w-6" />
                </button>
              )}

              <button
                onClick={handleStop}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all hover:opacity-90"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                <Square className="h-5 w-5" />
              </button>
            </div>

            {mode === 'pomodoro' && (
              <button
                onClick={skipPhase}
                className="w-full rounded-xl border border-border bg-muted/50 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Skip {pomodoroPhase === 'focus' ? 'to Break' : 'to Focus'} →
              </button>
            )}
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

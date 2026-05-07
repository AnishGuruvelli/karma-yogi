import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { MOOD_EMOJIS } from "@/lib/types";
import { Calendar as CalendarIcon, X, Minus, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { getSafeSubjectIcon } from "@/lib/subject-icon";
import { getLastStudiedSubjectId } from "@/lib/last-studied-subject";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DURATION_CHIPS_MIN = [15, 30, 45, 60, 90, 120] as const;

function chipLabel(mins: (typeof DURATION_CHIPS_MIN)[number]): string {
  if (mins < 60) return `${mins}m`;
  if (mins === 60) return "1h";
  if (mins === 90) return "1h 30m";
  if (mins === 120) return "2h";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseTimeHHMM(t: string): { h: number; m: number } | null {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function normalizeTimePart(raw: string, max: number): string {
  if (!raw.trim()) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  const clamped = Math.min(max, Math.max(0, Math.floor(n)));
  return String(clamped);
}

function defaultStartHM(): { h: number; m: number } {
  const n = new Date();
  return { h: n.getHours(), m: n.getMinutes() };
}

function startTimeFromInitial(s: { startTime: string; duration: number; endTime?: string }): string {
  const st = parseTimeHHMM(s.startTime);
  if (!st) {
    const d = defaultStartHM();
    return `${pad2(d.h)}:${pad2(d.m)}`;
  }
  return `${pad2(st.h)}:${pad2(st.m)}`;
}

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
    endTime?: string;
    moodRating: number;
  } | null;
  onSave?: (changes: { subjectId: string; topic: string; duration: number; date: string; startTime: string; moodRating: number }) => void;
  onDelete?: () => void;
}

const labelClass = "mb-1.5 block text-sm font-medium text-muted-foreground";

export function LogSessionModal({ open, onClose, initialSession, onSave, onDelete }: LogSessionModalProps) {
  useBodyScrollLock(open);
  const { subjects, sessions, addSession, addSubject } = useStore();
  const [subjectId, setSubjectId] = useState(() => getLastStudiedSubjectId(sessions, subjects));
  const [topic, setTopic] = useState(initialSession?.topic || "");
  const initialDuration = initialSession?.duration ?? 30;
  const [hours, setHours] = useState<number | null>(Math.floor(initialDuration / 60));
  const [minutes, setMinutes] = useState<number | null>(initialDuration % 60);
  const [mood, setMood] = useState<number | null>(initialSession?.moodRating ?? null);
  const toLocalDateString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [sessionDate, setSessionDate] = useState(initialSession?.date || toLocalDateString(new Date()));
  const [endHour, setEndHour] = useState(() => {
    const d = defaultStartHM();
    return String(d.h);
  });
  const [endMinute, setEndMinute] = useState(() => {
    const d = defaultStartHM();
    return String(d.m);
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [subjectSelectOpen, setSubjectSelectOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("cyan");
  const initDoneRef = useRef(false);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const colorMap: Record<string, string> = {
    green: "#4ade80",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    purple: "#a78bfa",
  };
  const CREATE_SUBJECT_VALUE = "__create_subject__";

  const totalMinutes = (hours ?? 0) * 60 + (minutes ?? 0);

  const bumpHours = (delta: number) => {
    const h = hours ?? 0;
    setHours(Math.max(0, h + delta));
  };

  const bumpMinutes = (delta: number) => {
    let total = (hours ?? 0) * 60 + (minutes ?? 0) + delta;
    total = Math.max(0, total);
    setHours(Math.floor(total / 60));
    setMinutes(total % 60);
  };

  useEffect(() => {
    if (!open) {
      initDoneRef.current = false;
      return;
    }
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    if (initialSession) {
      setSubjectId(initialSession.subjectId);
      setTopic(initialSession.topic);
      const d = initialSession.duration;
      setHours(Math.floor(d / 60));
      setMinutes(d % 60);
      setMood(initialSession.moodRating ?? null);
      setSessionDate(initialSession.date);
      {
        const p = parseTimeHHMM(startTimeFromInitial(initialSession));
        if (p) {
          setEndHour(String(p.h));
          setEndMinute(String(p.m));
        } else {
          const d = defaultStartHM();
          setEndHour(String(d.h));
          setEndMinute(String(d.m));
        }
      }
      return;
    }
    setSubjectId(getLastStudiedSubjectId(sessions, subjects));
    setTopic("");
    setHours(0);
    setMinutes(30);
    setMood(null);
    setSessionDate(toLocalDateString(new Date()));
    {
      const d = defaultStartHM();
      setEndHour(String(d.h));
      setEndMinute(String(d.m));
    }
    setShowCreateSubject(false);
    setSubjectSelectOpen(false);
    setNewSubjectName("");
    setNewSubjectColor("cyan");
  }, [open, initialSession, sessions, subjects]);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(getLastStudiedSubjectId(sessions, subjects));
    }
  }, [subjectId, sessions, subjects]);

  useEffect(() => {
    if (!open) return;
    const { overflow: prevOverflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleCreateSubject = async () => {
    const normalizedName = newSubjectName.trim().toUpperCase();
    if (!normalizedName) return;
    const alreadyExists = subjects.some((s) => s.name.trim().toUpperCase() === normalizedName);
    if (alreadyExists) {
      toast.error("Subject already exists.");
      return;
    }
    const created = await addSubject(normalizedName, newSubjectColor);
    if (created) {
      setSubjectId(created.id);
      toast.success("Subject created.");
      setSubjectSelectOpen(false);
    } else {
      toast.error("Unable to create subject. Please try again.");
      return;
    }
    setNewSubjectName("");
    setShowCreateSubject(false);
  };

  const handleSubmit = () => {
    const safeHours = hours ?? 0;
    const safeMinutes = minutes ?? 0;
    const trimmedTopic = topic.trim();
    if (!subjectId || (!safeHours && !safeMinutes) || !trimmedTopic || !mood) return;
    const duration = safeHours * 60 + safeMinutes;
    const hourValue = Number(endHour);
    const minuteValue = Number(endMinute);
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue) || hourValue < 0 || hourValue > 23 || minuteValue < 0 || minuteValue > 59) {
      toast.error("Enter a valid start time.");
      return;
    }
    const startDateTime = new Date(`${sessionDate}T${pad2(hourValue)}:${pad2(minuteValue)}:00`);
    if (Number.isNaN(startDateTime.getTime())) {
      toast.error("Invalid date or time.");
      return;
    }
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    const payload = {
      topic: trimmedTopic,
      duration,
      startTime: `${pad2(startDateTime.getHours())}:${pad2(startDateTime.getMinutes())}`,
      endTime: `${pad2(endDateTime.getHours())}:${pad2(endDateTime.getMinutes())}`,
      date: sessionDate,
      moodRating: mood!,
      isManualLog: true,
    };
    if (initialSession && onSave) {
      onSave({ subjectId, topic: payload.topic, duration: payload.duration, date: payload.date, startTime: payload.startTime, moodRating: payload.moodRating });
    } else {
      addSession({ subjectId, ...payload });
    }
    onClose();
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

  const chipActive = (mins: number) => totalMinutes === mins;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="glass-modal mt-10 flex max-h-[84dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:mt-0 sm:max-h-[min(92dvh,760px)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 88, opacity: 0.92, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 96, opacity: 0.88, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 34, mass: 1 }}
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {initialSession ? "Edit Session" : "Log Session"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] font-sans">
                <div>
                  <label className={labelClass}>Subject</label>
                  <Select value={subjectId} onValueChange={handleSubjectChange} open={subjectSelectOpen} onOpenChange={setSubjectSelectOpen}>
                    <SelectTrigger className="input-field flex h-12 w-full items-center justify-between rounded-xl px-3 text-sm font-medium shadow-none ring-0 focus:ring-0 data-[placeholder]:text-muted-foreground data-[state=open]:shadow-none sm:h-[3.25rem] sm:px-4 sm:text-base">
                      {selectedSubject ? (
                        <span className="inline-flex min-w-0 items-center gap-4">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                            {getSafeSubjectIcon(selectedSubject.icon, selectedSubject.name.charAt(0) || "📘")}
                          </span>
                          <span className="truncate font-medium">{selectedSubject.name}</span>
                        </span>
                      ) : (
                        <SelectValue placeholder="Select subject" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="z-[80] rounded-xl border-border bg-popover p-1 shadow-xl">
                      {subjects.length === 0 ? (
                        <SelectItem value="__no_subjects__" disabled>
                          No subjects yet
                        </SelectItem>
                      ) : (
                        subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                                {getSafeSubjectIcon(s.icon, s.name.charAt(0) || "📘")}
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
                            className="input-field w-full rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground/60"
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
                                className={cn(
                                  "h-10 w-10 rounded-full transition-all",
                                  newSubjectColor === key
                                    ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card"
                                    : "border border-transparent hover:scale-105",
                                )}
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
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Algebra basics"
                    className="input-field w-full rounded-xl px-3 py-3 text-sm placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>When</label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="input-field flex h-12 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-foreground transition hover:border-primary/40 sm:h-[3.25rem]"
                        >
                          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium">{format(new Date(`${sessionDate}T12:00:00`), "EEE, d MMM yyyy")}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">Pick</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="z-[80] w-auto rounded-xl border-border bg-popover p-0 shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(`${sessionDate}T12:00:00`)}
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
                    <label className={labelClass}>Started at</label>
                    <div className="input-field flex h-12 w-full items-center gap-1 rounded-xl px-3 sm:h-[3.25rem]">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={endHour}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setEndHour("");
                            return;
                          }
                          if (!/^\d{1,2}$/.test(raw)) return;
                          setEndHour(normalizeTimePart(raw, 23));
                        }}
                        onBlur={() => setEndHour((v) => normalizeTimePart(v, 23))}
                        className="w-10 bg-transparent text-center font-mono text-sm text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="font-mono text-muted-foreground">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={endMinute}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setEndMinute("");
                            return;
                          }
                          if (!/^\d{1,2}$/.test(raw)) return;
                          setEndMinute(normalizeTimePart(raw, 59));
                        }}
                        onBlur={() => setEndMinute((v) => normalizeTimePart(v, 59))}
                        className="w-10 bg-transparent text-center font-mono text-sm text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">24h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-end justify-between gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <span className="eyebrow !text-[10px]">
                      {(hours ?? 0) > 0 ? `${hours ?? 0}h ` : ""}
                      {minutes ?? 0}m
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="stat-card group relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4">
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">Hours</span>
                      <div className="flex w-full items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => bumpHours(-1)}
                          disabled={(hours ?? 0) <= 0}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Decrease hours"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          value={hours ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setHours(null);
                              return;
                            }
                            const v = Number(e.target.value);
                            if (Number.isNaN(v)) return;
                            setHours(Math.max(0, Math.floor(v)));
                          }}
                          className="w-full min-w-0 bg-transparent text-center font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => bumpHours(1)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Increase hours"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="stat-card group relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4">
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">Minutes</span>
                      <div className="flex w-full items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => bumpMinutes(-1)}
                          disabled={(hours ?? 0) * 60 + (minutes ?? 0) < 5}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Decrease minutes"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={minutes ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setMinutes(null);
                              return;
                            }
                            const v = Number(e.target.value);
                            if (Number.isNaN(v)) return;
                            setMinutes(Math.min(59, Math.max(0, Math.floor(v))));
                          }}
                          className="w-full min-w-0 bg-transparent text-center font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => bumpMinutes(1)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Increase minutes"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {DURATION_CHIPS_MIN.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setHours(Math.floor(mins / 60));
                          setMinutes(mins % 60);
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-mono tracking-wider transition-all sm:px-3.5 sm:text-sm",
                          chipActive(mins)
                            ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
                            : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {chipLabel(mins)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Mood</label>
                  <div className="flex justify-between rounded-xl bg-muted/50 p-2">
                    {([1, 2, 3, 4, 5] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        className={cn(
                          "rounded-lg p-2.5 text-2xl transition-all",
                          mood === m ? "scale-110 bg-card shadow-[var(--shadow-sm)]" : "opacity-40 hover:opacity-70",
                        )}
                      >
                        {MOOD_EMOJIS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {initialSession && onDelete ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-xl border border-red-300/80 bg-red-50 py-3 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                    >
                      Delete Session
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={subjects.length === 0 || !topic.trim() || (!(hours ?? 0) && !(minutes ?? 0)) || !mood}
                      className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                      style={{ boxShadow: "var(--shadow-md)" }}
                    >
                      {subjects.length === 0 ? "Add a subject first" : !topic.trim() ? "Topic is required" : !mood ? "Mood is required" : "Save Session"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={subjects.length === 0 || !topic.trim() || (!(hours ?? 0) && !(minutes ?? 0)) || !mood}
                    className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ boxShadow: "var(--shadow-md)" }}
                  >
                    {subjects.length === 0 ? "Add a subject first" : !topic.trim() ? "Topic is required" : !mood ? "Mood is required" : "Save Session"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    className="log-session-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    <motion.div
                      className="log-session-modal-panel w-full max-w-md rounded-3xl p-5 sm:p-6"
                      initial={{ y: 10, opacity: 0.95, scale: 0.98 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 8, opacity: 0.95, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Delete this session?</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Session topic: &quot;{topic.trim() || initialSession?.topic || "Untitled"}&quot;. This cannot be undone.
                      </p>
                      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="rounded-xl border border-primary/30 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/8 sm:px-5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            onDelete?.();
                          }}
                          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:px-5"
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

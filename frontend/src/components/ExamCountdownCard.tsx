import { useEffect, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { Target, Pencil, Plus, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { ExamGoalModal } from "@/components/ExamGoalModal";

function useDaysLeft(dateIso: string | undefined): number | null {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 5, 0);
    const ms = next.getTime() - now.getTime();
    const timer = setTimeout(() => setTick((x) => x + 1), ms);
    return () => clearTimeout(timer);
  }, [tick]);

  if (!dateIso) return null;
  const exam = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(exam, today);
}

export function ExamCountdownCard() {
  const { examGoal } = useStore();
  const [open, setOpen] = useState(false);
  const daysLeft = useDaysLeft(examGoal?.date);

  if (!examGoal) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="group mb-6 flex w-full items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-5 text-left transition-all hover:border-foreground/40 hover:bg-card"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background">
            <Plus className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-[10px] !tracking-[0.2em]">Add your goal</p>
            <p className="mt-0.5 font-display text-lg font-semibold text-foreground">Set your exam goal</p>
            <p className="text-xs text-muted-foreground">Pick an exam and date - we&apos;ll show your countdown here.</p>
          </div>
          <Sparkles className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
        <ExamGoalModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const examDate = new Date(`${examGoal.date}T00:00:00`);
  const formattedDate = format(examDate, "EEEE, d MMMM yyyy");
  const days = daysLeft ?? 0;

  let headline: string;
  let sub: string;
  if (days > 0) {
    headline = `${days}`;
    const weeks = Math.floor(days / 7);
    const months = Math.round(days / 30);
    sub = `≈ ${weeks} ${weeks === 1 ? "week" : "weeks"} · ${months} ${months === 1 ? "month" : "months"}`;
  } else if (days === 0) {
    headline = "Today";
    sub = "is the day. Breathe.";
  } else {
    headline = "Done";
    sub = "Exam day passed - set your next goal.";
  }

  return (
    <>
      <div
        className="stat-card mb-6 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-6"
        style={{ borderColor: "color-mix(in oklch, var(--neon-orange) 25%, var(--border))" }}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border" style={{ background: "color-mix(in oklch, var(--neon-orange) 14%, transparent)" }}>
          <Target className="h-6 w-6" style={{ color: "var(--neon-orange)" }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="eyebrow !text-[10px] !tracking-[0.2em]">Exam Goal</p>
            <button
              onClick={() => setOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Edit exam goal"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-0.5 font-display text-xl font-semibold text-foreground">{examGoal.name}</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="flex items-baseline gap-3 sm:flex-col sm:items-end sm:gap-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl" style={{ color: "var(--neon-orange)" }}>
              {headline}
            </span>
            {days > 0 && <span className="text-xs font-medium text-muted-foreground sm:text-sm">{days === 1 ? "day left" : "days left"}</span>}
          </div>
          <p className="text-xs text-muted-foreground sm:mt-1">{sub}</p>
        </div>
      </div>
      <ExamGoalModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

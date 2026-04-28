import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useStore } from "@/lib/store";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESETS = ["CAT", "XAT", "GMAT", "GRE", "CUET", "NMAT"];
const nameSchema = z.string().trim().min(1, "Name required").max(40, "Too long");

export function ExamGoalModal({ open, onClose }: Props) {
  const { examGoal, setExamGoal } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setName(examGoal?.name ?? "");
      setDate(examGoal?.date ? new Date(examGoal.date) : undefined);
      setError(null);
    }
  }, [open, examGoal]);

  if (!open) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleContinue = () => {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSave = async () => {
    if (!date) {
      setError("Pick an exam date");
      return;
    }
    if (date < today) {
      setError("Date must be today or later");
      return;
    }
    const iso = format(date, "yyyy-MM-dd");
    await setExamGoal(name, iso);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-modal w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground">{examGoal ? "Edit Exam Goal" : "Set Exam Goal"}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("font-semibold", step === 1 ? "text-foreground" : "")}>1. Exam</span>
          <span>-</span>
          <span className={cn("font-semibold", step === 2 ? "text-foreground" : "")}>2. Date</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Pick a preset</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setName(preset)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      name === preset ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Or type your own</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. CAT 2026" className="input-field w-full rounded-xl p-3 text-base font-medium text-foreground" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={handleContinue} className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90" style={{ boxShadow: "var(--shadow-md)" }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Exam</p>
              <p className="font-display text-xl font-semibold text-foreground">{name}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Exam date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "input-field flex w-full items-center justify-between rounded-xl p-3 text-left text-base font-medium",
                      date ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {date ? format(date, "PPP") : "Pick a date"}
                    <CalendarIcon className="h-4 w-4 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="z-[70] w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < today} initialFocus className={cn("pointer-events-auto p-3")} />
                </PopoverContent>
              </Popover>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={() => void handleSave()} className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90" style={{ boxShadow: "var(--shadow-md)" }}>
                Save Goal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

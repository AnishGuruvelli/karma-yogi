import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { accent, type AccentKey } from "@/lib/colors";

export function Panel({
  title,
  icon: Icon,
  eyebrow,
  action,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-5 sm:p-6${className ? ` ${className}` : ""}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-3.5 w-3.5 text-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            {eyebrow && <p className="-mt-0.5 text-[11px] text-muted-foreground">{eyebrow}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function CompactStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3.5 transition-colors hover:bg-muted/70">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function MutedHint({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

export function HeroMetric({ icon: Icon, color, label, value, unit }: { icon: LucideIcon; color: AccentKey; label: string; value: string | number; unit: string }) {
  const c = accent[color];
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-border/60 bg-card/45 px-4 py-3 sm:px-4 sm:py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: c.tint }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: c.fg }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">
          <span className="break-words">{value}</span>
          <span className="ml-1 inline-block text-xs font-medium text-muted-foreground">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export function RingProgress({ pct, value, sub }: { pct: number; value: string; sub: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--neon-purple)" />
            <stop offset="100%" stopColor="var(--neon-cyan)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} stroke="var(--muted)" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

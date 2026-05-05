import { Target, TrendingUp, GraduationCap, Briefcase } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PROFILE = {
  category: "OBC-NCL",
  background: "Engineer Male",
  academics: "85/86/8.1",
  experience: "25 Months Exp",
  targetYear: "2026",
};

const PEAK_PCTILE = "99.0";

const TARGETS = [
  { label: "Total Raw Score", value: "92", unit: "/198", sub: "~ 31 Correct Answers", accent: "var(--tech-cyan)", dark: true as const },
  { label: "VARC (Verbal)", value: "40", unit: "/72", sub: "~ 14 Correct", accent: "var(--tech-cyan)", dark: false as const },
  { label: "DILR (Logic)", value: "28", unit: "/60", sub: "~ 10 Correct (2 Sets)", accent: "var(--tech-violet)", dark: false as const },
  { label: "QA (Quant)", value: "24", unit: "/66", sub: "~ 8 Correct", accent: "var(--tech-lime)", dark: false as const },
];

type ExamKind = "CAT" | "XAT" | "SNAP" | "NMAT";

type MatrixRow = {
  name: string;
  exam: ExamKind;
  percentile: number;
  rawScore: number | null;
  displayScore: string;
  lpa: number;
  rationale: string;
};

const DATA_MATRIX: MatrixRow[] = [
  { name: "IIM Ahmedabad", exam: "CAT", percentile: 99.0, rawScore: 92, displayScore: "92", lpa: 34.0, rationale: "Stretch · sectional cutoffs unforgiving" },
  { name: "IIM Bangalore", exam: "CAT", percentile: 98.5, rawScore: 85, displayScore: "85", lpa: 33.8, rationale: "Reachable with strong DILR" },
  { name: "FMS Delhi", exam: "CAT", percentile: 98.2, rawScore: 82, displayScore: "82", lpa: 32.4, rationale: "High Quant weight — focus QA accuracy" },
  { name: "IIM Calcutta", exam: "CAT", percentile: 98.0, rawScore: 80, displayScore: "80", lpa: 32.5, rationale: "Primary target — math-heavy cohort fit" },
  { name: "IIM Indore", exam: "CAT", percentile: 97.2, rawScore: 75, displayScore: "75", lpa: 26.8, rationale: "Reachable · IPM cohort raises bar" },
  { name: "IIM Lucknow", exam: "CAT", percentile: 97.0, rawScore: 74, displayScore: "74", lpa: 28.5, rationale: "Comfort target · strong WAT prep needed" },
  { name: "SPJIMR PGDM", exam: "CAT", percentile: 96.8, rawScore: 72, displayScore: "72", lpa: 32.0, rationale: "Profile-based shortlist · GE/PI heavy" },
  { name: "IIM Kozhikode", exam: "CAT", percentile: 96.5, rawScore: 71, displayScore: "71", lpa: 27.0, rationale: "High diversity weight — favors profile" },
  { name: "XLRI BM", exam: "XAT", percentile: 96.0, rawScore: null, displayScore: "XAT 38", lpa: 29.0, rationale: "Switch to XAT prep Nov–Dec" },
  { name: "MDI Gurgaon", exam: "CAT", percentile: 95.5, rawScore: 68, displayScore: "68", lpa: 26.4, rationale: "Safe target · early call expected" },
  { name: "IIFT Delhi", exam: "CAT", percentile: 95.5, rawScore: 68, displayScore: "68", lpa: 29.1, rationale: "Trade/Finance focus. Exam now merged with CAT." },
  { name: "IIM Mumbai", exam: "CAT", percentile: 95.0, rawScore: 66, displayScore: "66", lpa: 28.0, rationale: "Engineer-heavy · 25m exp is a massive asset." },
  { name: "SIBM Pune", exam: "SNAP", percentile: 95.0, rawScore: null, displayScore: "SNAP 42", lpa: 28.1, rationale: "Speed-based exam. High corporate visibility." },
  { name: "IIT Bombay", exam: "CAT", percentile: 94.5, rawScore: 64, displayScore: "64", lpa: 30.3, rationale: "Elite ROI · Highly exp-friendly cohort." },
  { name: "IIM Shillong", exam: "CAT", percentile: 94.0, rawScore: 62, displayScore: "62", lpa: 26.1, rationale: "Growing brand · strong consulting placements." },
  { name: "IIT Delhi", exam: "CAT", percentile: 93.0, rawScore: 58, displayScore: "58", lpa: 25.8, rationale: "Solid tech-management backup." },
  { name: "IIM Udaipur", exam: "CAT", percentile: 92.0, rawScore: 55, displayScore: "55", lpa: 20.0, rationale: "Best among new IIMs · Strong research focus." },
  { name: "NMIMS Mumbai", exam: "NMAT", percentile: 90.0, rawScore: null, displayScore: "NMAT 235", lpa: 26.6, rationale: "Requires NMAT. Strong FMCG placements." },
  { name: "IIM Trichy", exam: "CAT", percentile: 91.5, rawScore: 53, displayScore: "53", lpa: 19.5, rationale: "Solid backup for CAP rounds." },
  { name: "IIM Ranchi", exam: "CAT", percentile: 91.0, rawScore: 52, displayScore: "52", lpa: 18.7, rationale: "HR/Core options · Safe CAP convert." },
];

const SORTED_MATRIX = [...DATA_MATRIX].sort((a, b) => b.percentile - a.percentile);

const CHART_CAT_ROWS = SORTED_MATRIX.filter((d) => d.exam === "CAT" && d.rawScore != null).map((d) => ({
  name: d.name,
  rawScore: d.rawScore as number,
  lpa: d.lpa,
}));

const LPA_BAR = "#10b981";

function ExamBadge({ exam }: { exam: ExamKind }) {
  const base = "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border";
  if (exam === "CAT") return <span className={`${base} border-blue-200/80 bg-blue-500/10 text-blue-700 dark:text-blue-400`}>{exam}</span>;
  if (exam === "XAT") return <span className={`${base} border-red-200/80 bg-red-500/10 text-red-700 dark:text-red-400`}>{exam}</span>;
  return <span className={`${base} border-purple-200/80 bg-purple-500/10 text-purple-700 dark:text-purple-400`}>{exam}</span>;
}

export function StrategyBlueprint() {
  return (
    <section className="mb-10 space-y-6">
      {/* Executive header — same shell as before (glass-card-elevated), copy aligned to MBA exec view */}
      <div className="glass-card-elevated relative overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {[
              { icon: GraduationCap, v: PROFILE.category, chip: true as const },
              { icon: Briefcase, v: PROFILE.background, chip: true as const },
              { icon: Target, v: PROFILE.academics, chip: true as const },
              { icon: TrendingUp, v: PROFILE.experience, chip: false as const },
            ].map(({ icon: Icon, v, chip }) =>
              chip ? (
                <span key={v} className="terminal-chip flex items-center gap-1.5 !px-3 !py-1.5 text-[11px] font-semibold uppercase tracking-wide">
                  <Icon className="h-3 w-3 opacity-70" />
                  {v}
                </span>
              ) : (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-200/80 bg-blue-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400"
                >
                  <Icon className="h-3 w-3 opacity-80" />
                  {v}
                </span>
              ),
            )}
            <span className="inline-flex items-center rounded-md border border-border bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-background">
              Target: {PROFILE.targetYear}
            </span>
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Top 20 Execution Matrix</h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Your updated targets. Percentiles are relative. Raw scores are actionable. Master the sectional breakdown to secure the top-tier calls.
            </p>
          </div>
        </div>
      </div>

      {/* Peak mathematical target */}
      <div>
        <h3 className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Peak Mathematical Target ({PEAK_PCTILE} %ile)
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {TARGETS.map((t, i) => (
            <div
              key={t.label}
              className={`stat-card relative overflow-hidden rounded-2xl border p-5 ${t.dark ? "border-border bg-foreground text-background" : "border-border"}`}
              style={t.dark ? undefined : { borderTop: `4px solid ${t.accent}` }}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider ${t.dark ? "text-background/70" : ""}`}
                style={!t.dark ? { color: t.accent } : undefined}
              >
                {i === 0 ? "Total Raw Score" : t.label}
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${t.dark ? "text-background" : "text-foreground"}`}>
                  {t.value}
                </span>
                <span className={`font-mono text-sm ${t.dark ? "text-background/60" : "text-muted-foreground"}`}>{t.unit}</span>
              </div>
              <p className={`mt-1 text-sm ${t.dark ? "text-background/75" : "text-muted-foreground"}`}>{t.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance vs Reward — horizontal grouped bars (CAT-only), dual value scales */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance vs Reward (Grouped Bar)</h3>
        <p className="mt-1 text-xs text-muted-foreground">CAT institutes only — raw score scale (bottom) vs median LPA (top).</p>
        <div className="mt-4 w-full min-w-0 overflow-x-auto">
          <div className="h-[720px] min-h-[480px] w-full min-w-[720px] max-sm:h-[560px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={CHART_CAT_ROWS}
                margin={{ top: 36, right: 24, left: 8, bottom: 36 }}
                barGap={4}
                barCategoryGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.6} />
                <XAxis
                  xAxisId="raw"
                  type="number"
                  domain={[40, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  label={{
                    value: "Raw CAT score required",
                    position: "insideBottom",
                    offset: -2,
                    style: { fill: "var(--color-muted-foreground)", fontSize: 11, fontWeight: 600 },
                  }}
                />
                <XAxis
                  xAxisId="lpa"
                  type="number"
                  domain={[15, 40]}
                  orientation="top"
                  tick={{ fontSize: 10, fill: LPA_BAR }}
                  axisLine={{ stroke: LPA_BAR, opacity: 0.35 }}
                  label={{
                    value: "Median LPA (₹)",
                    position: "insideTop",
                    offset: -4,
                    style: { fill: LPA_BAR, fontSize: 11, fontWeight: 600 },
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklch, var(--color-muted) 35%, transparent)" }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number, name: string) => (name === "Median LPA" ? [`₹ ${v.toFixed(1)}`, name] : [v, name])}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                <Bar
                  xAxisId="raw"
                  dataKey="rawScore"
                  name="Target Raw Score (Marks)"
                  fill="var(--color-foreground)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                />
                <Bar
                  xAxisId="lpa"
                  dataKey="lpa"
                  name="Median LPA"
                  fill={LPA_BAR}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 20 matrix */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">Top 20 Execution Matrix (OBC-NCL)</h3>
          <span className="eyebrow !text-[10px]">{PROFILE.targetYear}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 font-medium">Institute</th>
                <th className="px-3 py-3 font-medium">Exam</th>
                <th className="px-3 py-3 font-medium">Safe %ile</th>
                <th className="px-3 py-3 font-medium">Target score</th>
                <th className="px-3 py-3 font-medium">Median LPA</th>
                <th className="px-3 py-3 font-medium">Consultant rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {SORTED_MATRIX.map((row) => (
                <tr key={row.name} className="transition-colors hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">{row.name}</td>
                  <td className="px-3 py-3">
                    <ExamBadge exam={row.exam} />
                  </td>
                  <td className="px-3 py-3 font-mono text-sm font-semibold tabular-nums text-primary">{row.percentile.toFixed(1)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold tabular-nums text-foreground">
                    {row.displayScore}
                    {row.exam === "CAT" && <span className="ml-1 text-xs font-normal text-muted-foreground">/198</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold tabular-nums" style={{ color: LPA_BAR }}>
                    ₹ {row.lpa.toFixed(1)}
                  </td>
                  <td className="max-w-md px-3 py-3 leading-relaxed text-muted-foreground">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

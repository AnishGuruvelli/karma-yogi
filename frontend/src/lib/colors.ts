export type SubjectColorKey = "cyan" | "green" | "orange" | "pink" | "purple";

export const subjectColorVar: Record<SubjectColorKey, string> = {
  cyan: "var(--subject-cyan)",
  green: "var(--subject-green)",
  orange: "var(--subject-orange)",
  pink: "var(--subject-pink)",
  purple: "var(--subject-purple)",
};

export function subjectColor(key?: string | null): string {
  if (key && key in subjectColorVar) {
    return subjectColorVar[key as SubjectColorKey];
  }
  return "var(--muted-foreground)";
}

export function subjectColorSoft(key?: string | null, percent = 12): string {
  const color = subjectColor(key);
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

export const medalColorVar = {
  1: "var(--medal-gold)",
  2: "var(--medal-silver)",
  3: "var(--medal-bronze)",
} as const;

export function medalColor(place: 1 | 2 | 3): string {
  return medalColorVar[place];
}

export function medalColorSoft(place: 1 | 2 | 3, percent = 15): string {
  return `color-mix(in oklch, ${medalColorVar[place]} ${percent}%, transparent)`;
}

export const accent = {
  cyan:   { fg: "var(--neon-cyan)",   tint: "color-mix(in oklch, var(--neon-cyan)   12%, transparent)", ring: "color-mix(in oklch, var(--neon-cyan)   30%, transparent)" },
  green:  { fg: "var(--neon-green)",  tint: "color-mix(in oklch, var(--neon-green)  12%, transparent)", ring: "color-mix(in oklch, var(--neon-green)  30%, transparent)" },
  orange: { fg: "var(--neon-orange)", tint: "color-mix(in oklch, var(--neon-orange) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-orange) 30%, transparent)" },
  pink:   { fg: "var(--neon-pink)",   tint: "color-mix(in oklch, var(--neon-pink)   12%, transparent)", ring: "color-mix(in oklch, var(--neon-pink)   30%, transparent)" },
  purple: { fg: "var(--neon-purple)", tint: "color-mix(in oklch, var(--neon-purple) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-purple) 30%, transparent)" },
} as const;
export type AccentKey = keyof typeof accent;

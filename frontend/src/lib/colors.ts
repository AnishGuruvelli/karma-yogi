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

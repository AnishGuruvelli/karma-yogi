# Karma Yogi Frontend Styling & Theme System

## CSS Architecture

**File:** `/Users/admin/Code/karma-yogi/frontend/src/styles.css` (600+ lines)

### Framework
- Tailwind CSS with custom theme variables
- tw-animate-css for animations
- Custom @theme inline definitions
- oklch color model for all colors

### Theme Names & Classes
```tsx
type ThemeName = "sky" | "honey" | "forest" | "blossom";

// Applied as class: theme-${theme}
// Dark variant: dark.theme-${theme} or .dark:not([class*="theme-"])
```

### Dynamic Theming
1. No default theme in `<root>` (uses blossom by default)
2. Each theme class sets `--background`, `--foreground`, `--primary`, etc.
3. `.dark` variant overrides values for dark mode
4. Combines: `.theme-sky.dark { ... }` or `.dark.theme-sky { ... }`

### Color Variables (Root & Each Theme)

**Root sets (all themes override):**
- `--background`, `--foreground`, `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--neon-cyan`, `--neon-green`, `--neon-orange`, `--neon-pink`, `--neon-purple`
- `--glass`, `--glass-border`
- `--chart-1` through `--chart-5`
- `--sidebar-*` colors for future layout
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-card`, `--shadow-elevated`
- `--medal-gold`, `--medal-silver`, `--medal-bronze`
- `--subject-cyan`, `--subject-green`, `--subject-orange`, `--subject-pink`, `--subject-purple`

### Color Spaces
All colors use `oklch()` color space:
```css
--destructive: oklch(0.58 0.18 27);
--medal-gold: oklch(0.78 0.14 85);
--neon-cyan: oklch(0.8 0.1 340); /* Light mode */
/* Dark mode overrides with higher lightness */
--neon-cyan: oklch(0.84 0.12 340); /* Dark mode */
```

### Shadow System
```css
--shadow-sm: 0 1px 2px oklch(...);
--shadow-md: 0 2px 10px oklch(...), 0 1px 3px oklch(...);
--shadow-lg: 0 8px 24px oklch(...), 0 2px 6px oklch(...);
--shadow-xl: 0 16px 40px oklch(...), 0 4px 12px oklch(...);
--shadow-card: 0 1px 3px oklch(...), 0 8px 24px oklch(...);
--shadow-elevated: 0 6px 28px oklch(...), 0 2px 8px oklch(...);
```

### Glassmorphism
- `--glass: oklch(.../ 78%)` - Semi-transparent backdrop background
- `--glass-border: oklch(.../ 70%)` - Border with similar transparency
- Used for card backgrounds with `backdrop-blur-xl`

### Font Stack
```css
--font-display: "Fraunces", ui-serif, Georgia, serif;
--font-sans: "Inter", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### Border Radius
```css
--radius: 0.75rem; /* 12px */
--radius-sm: calc(var(--radius) - 4px); /* 8px */
--radius-md: calc(var(--radius) - 2px); /* 10px */
--radius-lg: var(--radius); /* 12px */
--radius-xl: calc(var(--radius) + 4px); /* 16px */
--radius-2xl: calc(var(--radius) + 8px); /* 20px */
--radius-3xl: calc(var(--radius) + 12px); /* 24px */
--radius-4xl: calc(var(--radius) + 16px); /* 28px */
```

---

## Color System (colors.ts)

**File:** `/Users/admin/Code/karma-yogi/frontend/src/lib/colors.ts`

### Subject Color Map
```tsx
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
```

### Medal Colors
```tsx
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
```

### Accent Map
```tsx
export const accent = {
  cyan:   { fg: "var(--neon-cyan)",   tint: "color-mix(in oklch, var(--neon-cyan)   12%, transparent)", ring: "color-mix(in oklch, var(--neon-cyan)   30%, transparent)" },
  green:  { fg: "var(--neon-green)",  tint: "color-mix(in oklch, var(--neon-green)  12%, transparent)", ring: "color-mix(in oklch, var(--neon-green)  30%, transparent)" },
  orange: { fg: "var(--neon-orange)", tint: "color-mix(in oklch, var(--neon-orange) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-orange) 30%, transparent)" },
  pink:   { fg: "var(--neon-pink)",   tint: "color-mix(in oklch, var(--neon-pink)   12%, transparent)", ring: "color-mix(in oklch, var(--neon-pink)   30%, transparent)" },
  purple: { fg: "var(--neon-purple)", tint: "color-mix(in oklch, var(--neon-purple) 12%, transparent)", ring: "color-mix(in oklch, var(--neon-purple) 30%, transparent)" },
} as const;

export type AccentKey = keyof typeof accent;
```

---

## Theme Palettes

### Blossom (Default - Pink/Rose)
**Light:** oklch(0.985 0.018 350) background, oklch(0.68 0.19 350) primary
**Dark:** oklch(0.19 0.03 350) background, oklch(0.78 0.18 350) primary
Neon: cyan, green, orange, pink (350°), purple

### Sky (Blue)
**Light:** oklch(0.985 0.014 235) background, oklch(0.62 0.18 235) primary
**Dark:** oklch(0.18 0.025 250) background, oklch(0.74 0.16 235) primary
Neon: cyan, green (rotated), orange, pink, purple

### Honey (Gold/Yellow)
**Light:** oklch(0.985 0.022 95) background, oklch(0.72 0.16 80) primary
**Dark:** oklch(0.18 0.04 95) background, oklch(0.82 0.16 80) primary
Neon: cyan (rotated), green, orange, pink, purple

### Forest (Green)
(Not fully visible in snippet, but follows same pattern)

### Ember (Red/Orange)
(Not fully visible in snippet, but follows same pattern)

---

## Utility Classes (Tailwind)

### Glass Card Pattern
```css
.glass-card {
  @apply bg-glass/70 rounded-2xl border border-glass-border backdrop-blur-xl;
}
```

### Stat Card Pattern
```css
.stat-card {
  @apply bg-card border border-border shadow-sm;
}
```

### Eyebrow Text
```css
.eyebrow {
  @apply text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground;
}
```

### Color Transitions
Smooth duration: `transition-all duration-500` for progress bars, `duration-1000` for SVG circles

### Grid Layouts
- Mobile-first: `grid-cols-1` default
- Tablet+: `sm:grid-cols-2`
- Desktop+: `lg:grid-cols-3`

### Responsive Padding
- Mobile: `px-3 py-6`
- Tablet: `sm:px-6 sm:py-8`
- Desktop: `lg:px-8`

### Box Shadows Applied
- Cards: `box-shadow: var(--shadow-sm)`
- Elevated: `box-shadow: var(--shadow-elevated)`
- On hover: Often subtle opacity change instead of shadow change

---

## Tailwind Config Additions

### Custom Radius Variables
```js
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  // ... etc
}
```

### Theme Color Mapping
All CSS variables prefixed with `--color-` are auto-available in Tailwind utilities:
- `bg-primary`, `text-primary`, `border-primary` (from `--color-primary`)
- `bg-neon-cyan`, `text-neon-cyan`, etc.
- Custom: `bg-glass`, `border-glass-border`, `bg-chart-1` through `--color-chart-5`

---

## Animation Patterns

### Motion Components (Framer Motion)
```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Button with spring physics
<motion.button
  whileHover={{ y: -1, scale: 1.01 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 500, damping: 28 }}
>
  Begin Session
</motion.button>
```

### Progress Animation
```tsx
strokeDashoffset={strokeDashoffset}
className="transition-all duration-1000"
```

### Page Transitions
Can use Suspense + lazy loading for route transitions with LoadingSplash overlay

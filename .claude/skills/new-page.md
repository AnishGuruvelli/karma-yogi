# Skill: Add a new page

When the user asks to add a new page, follow these exact steps in order.

## 1. Create the page file

Create `frontend/src/pages/<PageName>Page.tsx`.

Page shell:
```tsx
export default function <PageName>Page() {
  return (
    <div className="min-h-screen bg-background pb-24 pt-4 sm:pt-6">
      <div className="mx-auto max-w-2xl px-4">
        {/* content */}
      </div>
    </div>
  );
}
```

- `pb-24` reserves space for the bottom nav on mobile
- `max-w-2xl` is the standard content width used across all pages
- Do NOT add a TopNav — it is rendered globally in App.tsx

## 2. Register the route in App.tsx

File: `frontend/src/App.tsx`

Add a lazy import near the other page imports (around line 14–21):
```tsx
const <PageName>Page = lazy(() => import("@/pages/<PageName>Page"));
```

Add a route inside the `<Routes>` block (around line 708–716):
```tsx
<Route path="/<route-path>" element={<AppErrorBoundary><PageName>Page /></AppErrorBoundary>} />
```

## 3. Add to TopNav if it should appear in the bottom nav

File: `frontend/src/components/TopNav.tsx`

The bottom nav renders icons for main pages. Only add if this is a primary navigation destination.

## Design rules to follow

- Use `glass-card` for cards: `<div className="glass-card rounded-2xl p-4 sm:p-5">`
- Use `font-display` for large headings: `<h1 className="font-display text-2xl font-bold">`
- Accent colors come from `@/lib/colors` — use the `accent` map, never hardcode colors
- All interactive elements must be at least `h-10 w-10` (44px) for touch targets
- Section headers: `text-sm font-semibold uppercase tracking-wider text-muted-foreground`
- Use `var(--shadow-md)` for elevated elements via inline style
- Spacing: `gap-3` between items, `gap-6` between sections

## After creating the page

Run `npx tsc --noEmit` to confirm no type errors.

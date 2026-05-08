# Skill: Mobile responsiveness checklist

When the user reports a mobile UI issue or asks to review mobile responsiveness, run through this checklist.

## Tap targets

Every interactive element must be at least 44×44px:
- Icon-only buttons: `h-10 w-10` (40px — acceptable minimum, use `h-11 w-11` when possible)
- Full-width buttons: `py-3` gives enough height
- Small inline buttons: wrap in a `h-10 w-10 flex items-center justify-center` container

## Bottom sheet modals

All modals that slide up from the bottom must:
- Use `items-end justify-center sm:items-center` on the overlay
- Call `useBodyScrollLock(open)` to prevent background scroll
- Have `p-4 sm:p-6` padding on the panel

## Overflow / scroll

- Horizontal scroll containers: `overflow-x-auto overflow-y-hidden` (never `overflow-x-auto` alone — it forces `overflow-y: auto`)
- Never use fixed pixel widths for content that should flex — use `min-w-0` on flex children that should truncate
- Tables / grids that might overflow: wrap in `overflow-x-auto`

## Typography

- Large display numbers (stats, timers): `font-display` class + `text-xl` minimum
- Truncating text in tight spaces: `truncate` on the element, `min-w-0` on the flex parent

## Grid layouts

- Default to `grid-cols-1` with `sm:grid-cols-2` or `sm:grid-cols-3`
- Stats grid pattern (5 items): `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
  - For 5-item grids on mobile, the middle item should `col-span-2` to fill the row

## Heatmap / HeatmapCard

- Uses a flat CSS grid, `overflow-x-auto overflow-y-hidden`, `pb-1` for ring visibility
- Tooltip rendered via `createPortal` to escape overflow ancestors
- Do not change the scroll container overflow — it is intentional

## SVG / chart sizes

- Inline SVGs for circular progress: `width="160"` max on mobile (was 180 originally)
- Bar charts: `height={220}` minimum so bars are readable

## Spacing

- Page padding: `px-4` on mobile, content max-width `max-w-2xl mx-auto`
- Bottom padding on pages: `pb-24` to clear the bottom nav

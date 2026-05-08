# Skill: Add a new modal / bottom sheet

When the user asks to add a new modal, follow this exact pattern used across all modals in this project.

## File location

`frontend/src/components/<Name>Modal.tsx`

## Standard modal shell

```tsx
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function <Name>Modal({ open, onClose }: Props) {
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-md rounded-2xl p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Title</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">
          {/* content */}
        </div>

        {/* Footer buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Rules

- `useBodyScrollLock(open)` MUST be called before the early return — prevents background scroll on mobile
- Overlay: `z-[60]`, `items-end` (slides up from bottom on mobile), `sm:items-center` (centered on desktop)
- Close button: always `h-10 w-10` (44px tap target)
- All other interactive buttons inside modal: minimum `h-10 w-10` or `py-3` on full-width buttons
- `glass-modal` class for the panel — never use raw background colors
- `max-w-md` for standard modals, `max-w-sm` for simple confirm dialogs
- If the modal has a calendar/popover inside, use `z-[70]` for the popover content

## After creating

1. Import and render it in the parent component with `open` + `onClose` props
2. Run `npx tsc --noEmit`

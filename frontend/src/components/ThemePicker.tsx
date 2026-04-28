import { useStore, type ThemeName } from "@/lib/store";

type Swatch = { name: ThemeName; label: string; color: string };

const SWATCHES: Swatch[] = [
  { name: "sky", label: "Sky", color: "oklch(0.62 0.18 235)" },
  { name: "honey", label: "Honey", color: "oklch(0.72 0.16 80)" },
  { name: "forest", label: "Forest", color: "oklch(0.58 0.13 155)" },
  { name: "blossom", label: "Blossom", color: "oklch(0.68 0.19 350)" },
  { name: "ember", label: "Ember", color: "oklch(0.60 0.18 28)" },
];

interface ThemePickerProps {
  size?: "sm" | "md";
  layout?: "horizontal" | "vertical";
}

export function ThemePicker({ size = "md", layout = "horizontal" }: ThemePickerProps) {
  const { theme, setTheme } = useStore();
  const dot = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  if (layout === "vertical") {
    return (
      <div className="flex flex-col gap-1">
        {SWATCHES.map((swatch) => {
          const active = theme === swatch.name;
          return (
            <button
              key={swatch.name}
              type="button"
              onClick={() => setTheme(swatch.name)}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted ${active ? "bg-muted" : ""}`}
            >
              <span
                className={`${dot} shrink-0 rounded-full`}
                style={{
                  background: swatch.color,
                  boxShadow: active
                    ? `0 0 0 2px var(--color-card), 0 0 0 4px ${swatch.color}`
                    : "0 1px 3px oklch(0 0 0 / 14%), inset 0 0 0 1px oklch(1 0 0 / 18%)",
                }}
              />
              <span className={`flex-1 text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {swatch.label}
              </span>
              {active && <span className="text-xs font-semibold text-primary">Active</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {SWATCHES.map((swatch) => {
        const active = theme === swatch.name;
        return (
          <button
            key={swatch.name}
            type="button"
            onClick={() => setTheme(swatch.name)}
            aria-label={`Switch to ${swatch.label} theme`}
            aria-pressed={active}
            title={swatch.label}
            className={`group relative ${dot} rounded-full transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none`}
            style={{
              background: swatch.color,
              boxShadow: active
                ? `0 0 0 2px var(--color-background), 0 0 0 4px ${swatch.color}, 0 2px 6px oklch(0 0 0 / 18%)`
                : "0 1px 3px oklch(0 0 0 / 14%), inset 0 0 0 1px oklch(1 0 0 / 18%)",
            }}
          />
        );
      })}
    </div>
  );
}

import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Timer, BarChart3, Moon, Sun, Users, Palette, Target, Database, User, LogOut, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { YogiIcon } from "@/components/YogiIcon";
import { ThemePicker } from "@/components/ThemePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const centerNavLinks: ReadonlyArray<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/", label: "Today", icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", icon: Timer },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/friends", label: "Friends", icon: Users },
];

function AvatarDropdown({ onLogout, user, preferences }: { onLogout: () => void; user: { name: string; username: string }; preferences: { showStrategyPage: boolean } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = (user.name || "K").slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground text-sm font-bold hover:opacity-90"
        style={{ boxShadow: "var(--shadow-sm)" }}
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-[70] mt-2 w-52 rounded-xl border border-border bg-card py-1"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
            {user.username && <div className="text-xs text-muted-foreground truncate">@{user.username}</div>}
          </div>
          {preferences.showStrategyPage && (
            <Link
              to="/strategy-dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <Target className="h-4 w-4 text-muted-foreground" />
              Strategy
            </Link>
          )}
          <Link
            to="/library"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Database className="h-4 w-4 text-muted-foreground" />
            Library
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Profile
          </Link>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isDark, toggleTheme, user, preferences } = useStore();

  // Bottom nav on mobile includes Library and Profile for full access
  const mobileBottomLinks = useMemo(() => {
    const base = [...centerNavLinks];
    if (preferences?.showStrategyPage) {
      base.push({ to: "/strategy-dashboard", label: "Strategy", icon: Target });
    }
    base.push({ to: "/library", label: "Library", icon: Database });
    base.push({ to: "/profile", label: "Profile", icon: User });
    return base;
  }, [preferences?.showStrategyPage]);

  return (
    <>
      {/* Desktop header */}
      <header className="sticky top-0 z-50 hidden border-b border-border/70 bg-background/70 backdrop-blur-xl sm:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <YogiIcon size={22} className="text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[1.05rem] font-semibold tracking-tight text-foreground">Karma Yogi</span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">show up · compound</span>
            </div>
          </Link>

          {/* Center nav pill */}
          <nav className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/70 p-1">
            {centerNavLinks.map(({ to, label, icon: Icon }) => {
              const isActive = to === "/" ? currentPath === "/" : currentPath.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ${
                    isActive ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={isActive ? { boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                  aria-label="Choose theme palette"
                >
                  <Palette className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-4">
                <div className="flex flex-col gap-3">
                  <span className="eyebrow">Theme palette</span>
                  <ThemePicker layout="vertical" />
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              style={{ boxShadow: "var(--shadow-sm)" }}
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <AvatarDropdown onLogout={onLogout} user={user} preferences={preferences} />
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl sm:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
              <YogiIcon size={18} className="text-primary" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-foreground">Karma Yogi</span>
          </Link>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground" aria-label="Choose theme palette">
                  <Palette className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-4">
                <div className="flex flex-col gap-3">
                  <span className="eyebrow">Theme palette</span>
                  <ThemePicker layout="vertical" />
                </div>
              </PopoverContent>
            </Popover>
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground" aria-label="Toggle dark mode">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <AvatarDropdown onLogout={onLogout} user={user} preferences={preferences} />
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/85 backdrop-blur-xl sm:hidden"
        style={{ boxShadow: "0 -4px 24px oklch(0.30 0.04 60 / 10%)" }}
      >
        <div className="flex items-end justify-between gap-1 overflow-x-auto px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {mobileBottomLinks.map(({ to, label, icon: Icon }) => {
            const isActive = to === "/" ? currentPath === "/" : currentPath.startsWith(to);
            return (
              <Link key={to} to={to} className="flex min-w-[3rem] flex-1 flex-col items-center gap-1 py-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                    isActive ? "scale-105 border border-primary/25 bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                  style={isActive ? { boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

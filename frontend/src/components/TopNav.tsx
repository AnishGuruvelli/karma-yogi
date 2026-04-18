import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Timer, BarChart3, Database, Moon, Sun, UserCircle2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { LotusIcon } from '@/components/LotusIcon';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sessions', label: 'Sessions', icon: Timer },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/data', label: 'Data', icon: Database },
  { to: '/profile', label: 'Profile', icon: UserCircle2 },
] as const;

export function TopNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isDark, toggleTheme } = useStore();

  return (
    <>
      {/* Desktop / Tablet top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl hidden sm:block" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform group-hover:scale-105" style={{ boxShadow: 'var(--shadow-md)' }}>
              <LotusIcon size={22} className="text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Karma Yogi</span>
          </Link>

          <nav className="flex items-center gap-0.5 rounded-2xl bg-muted/60 p-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = to === '/' ? currentPath === '/' : currentPath.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-card text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={isActive ? { boxShadow: 'var(--shadow-sm)' } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground hover:border-foreground/20"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl sm:hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary" style={{ boxShadow: 'var(--shadow-md)' }}>
              <LotusIcon size={18} className="text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">Karma Yogi</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border bg-card/95 backdrop-blur-xl" style={{ boxShadow: '0 -2px 10px oklch(0 0 0 / 8%)' }}>
        <div className="flex items-end justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? currentPath === '/' : currentPath.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 py-1 min-w-[4rem]"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'text-muted-foreground'
                  }`}
                  style={isActive ? { boxShadow: 'var(--shadow-md)' } : undefined}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

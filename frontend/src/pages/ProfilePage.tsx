import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Flame, Clock3, BookOpen, CalendarDays, Pencil, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { activeDaysUntilToday, currentStreakUntilToday, totalHours, maxStreak } from "@/lib/stats";

export default function ProfilePage() {
  const { user, sessions, updateUserProfile } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) return;
    setName(user.name);
    setUsername(user.username);
    setPhone(user.phone);
  }, [user.id, user.name, user.username, user.phone, user.email, editing]);

  const stats = useMemo(
    () => ({
      currentStreak: currentStreakUntilToday(sessions),
      maxStreak: maxStreak(sessions),
      hours: totalHours(sessions),
      sessions: sessions.length,
      activeDays: activeDaysUntilToday(sessions),
    }),
    [sessions],
  );

  const save = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), username: username.trim(), phone: phone.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account information</p>

      <section className="glass-card mt-6 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-foreground">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">@{user.username || "karma_learner"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing((prev) => {
                const next = !prev;
                if (!next) {
                  setName(user.name);
                  setUsername(user.username);
                  setPhone(user.phone);
                }
                return next;
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-4 w-4" /> {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" value={name} editing={editing} onChange={setName} />
          <Field label="Username" value={username} editing={editing} onChange={setUsername} />
          <Field label="Email" value={user.email || "Not linked"} editing={false} onChange={() => undefined} />
          <Field label="Phone" value={phone || "—"} editing={editing} onChange={setPhone} />
        </div>

        {editing && (
          <div className="mt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        )}
      </section>

      <section className="glass-card mt-6 rounded-2xl p-6">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">Your Stats</h3>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard icon={<Flame className="h-5 w-5 text-neon-orange" />} value={`${stats.currentStreak}`} label="Current Streak" />
          <StatCard icon={<Flame className="h-5 w-5 text-neon-orange" />} value={`${stats.maxStreak}`} label="Max Streak" />
          <StatCard icon={<Clock3 className="h-5 w-5 text-neon-cyan" />} value={`${stats.hours}h`} label="Total Studied" />
          <StatCard icon={<BookOpen className="h-5 w-5 text-neon-purple" />} value={`${stats.sessions}`} label="Sessions" />
          <StatCard icon={<CalendarDays className="h-5 w-5 text-neon-green" />} value={`${stats.activeDays}`} label="Active Days" />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none"
        />
      ) : (
        <p className="mt-1 text-lg text-foreground">{value}</p>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-card">{icon}</div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Clock, Trophy, Award, CalendarCheck, UserPlus, Check, TrendingUp, Sparkles, MapPin, GraduationCap, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchPublicProfile } from "@/lib/api";
import { UserAvatar } from "@/components/UserAvatar";
import type { PublicProfileView } from "@/lib/types";

export default function PublicProfilePage() {
  const { userId = "" } = useParams();
  const [data, setData] = useState<PublicProfileView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    void fetchPublicProfile(userId)
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Unable to fetch public profile");
        setData(null);
      });
  }, [userId]);

  const profile = {
    id: data?.user.id || userId,
    name: data?.user.fullName || "Friend",
    avatarColor: "purple",
    handle: data?.user.username || userId || "friend",
    bio: data?.profile.bio || "This profile is private.",
  };
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-12 lg:px-8">
      <Link to="/friends" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="glass-card mb-6 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <UserAvatar user={profile} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{profile.name}</h1>
              {data && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" /> Profile
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            <p className="mt-2 max-w-xl text-sm text-foreground/80">{error || profile.bio}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {data?.profile.location || "-"}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined Karma Yogi</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> {data?.profile.targetExam || "-"}</span>
            </div>
          </div>
          <div className="shrink-0">
            <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90" style={{ boxShadow: "var(--shadow-sm)" }}>
              <UserPlus className="h-4 w-4" /> Add Friend
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stats</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Flame} label="Friends" value={stats ? `${stats.friendCount}` : "-"} sub="connected" color="var(--neon-orange)" />
          <StatCard icon={Award} label="Avg Session" value={stats ? `${stats.avgSessionMinutes}m` : "-"} sub="duration" color="var(--neon-pink)" />
          <StatCard icon={Clock} label="Total Studied" value={stats ? `${(stats.totalMinutes / 60).toFixed(1)}h` : "-"} sub="focus" color="var(--neon-cyan)" />
          <StatCard icon={Trophy} label="Sessions" value={stats ? `${stats.totalSessions}` : "-"} sub={stats ? `longest ${stats.longestSession}m` : "-"} color="var(--neon-purple)" />
          <StatCard icon={CalendarCheck} label="Active Days" value={stats ? `${stats.activeDays}` : "-"} sub="logged" color="var(--neon-green)" />
          <StatCard icon={Sparkles} label="This Week" value={stats ? `${(stats.thisWeekMinutes / 60).toFixed(1)}h` : "-"} sub="of focus" color="var(--primary)" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)` }}>
          <Icon className="h-[18px] w-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

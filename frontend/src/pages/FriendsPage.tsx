import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, Edit3, Play, Search, Square, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  acceptFriendRequest,
  clearTimerState,
  createFriendSession,
  fetchDiscoverUsers,
  fetchFriends,
  fetchFriendsLeaderboard,
  fetchIncomingFriendRequests,
  fetchMe,
  fetchOutgoingFriendRequests,
  fetchTimerState,
  rejectFriendRequest,
  saveTimerState,
  sendFriendRequest,
  startTimerFromServer,
} from "@/lib/api";
import type { FriendRequest, FriendUser, LeaderboardEntry, UserProfile } from "@/lib/types";

type TabKey = "leaderboard" | "friends" | "discover" | "requests";
type SessionMode = "live" | "past";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatLongDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}.${Math.floor((m / 60) * 10)}h`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function weekLabel(weekOffset = 0, now = new Date()): string {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
}

const durationPresets = [30, 45, 60, 90, 120];
const tabStyle =
  "rounded-full px-4 py-1.5 text-sm font-semibold transition border border-transparent dark:text-slate-300";

export default function FriendsPage() {
  const { subjects } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>("leaderboard");
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>("past");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [topic, setTopic] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [liveStartedAtMs, setLiveStartedAtMs] = useState<number | null>(null);
  const [liveElapsedSec, setLiveElapsedSec] = useState(0);
  const [friendTimerRestored, setFriendTimerRestored] = useState(false);
  const loadRequestRef = useRef(0);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const incomingCount = incomingRequests.length;
  const outgoingCount = outgoingRequests.length;

  const discoverUsers = useMemo(
    () =>
      users.filter((u) => {
        if (u.friendshipStatus !== "none") return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }),
    [search, users],
  );

  useEffect(() => {
    if (!liveStartedAtMs) return;
    const id = window.setInterval(() => {
      setLiveElapsedSec(Math.floor((Date.now() - liveStartedAtMs) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [liveStartedAtMs]);

  useEffect(() => {
    if (friendTimerRestored) return;
    let cancelled = false;
    void fetchTimerState()
      .then((state) => {
        if (cancelled) return;
        setFriendTimerRestored(true);
        if (!state || typeof state !== "object") return;
        if (state.timerType !== "friend") return;
        if (state.sessionMode !== "live") return;
        setSessionMode("live");
        setShowSessionModal(Boolean(state.hasStarted) || Boolean(state.isRunning));
        setFriendIds(Array.isArray(state.friendIds) ? state.friendIds.filter((v): v is string => typeof v === "string") : []);
        setSubjectName(typeof state.subjectName === "string" ? state.subjectName : "");
        setTopic(typeof state.topic === "string" ? state.topic : "");
        setDurationMin(typeof state.durationMin === "number" ? state.durationMin : 60);
        const startedMs = typeof state.startedAtMs === "number" ? state.startedAtMs : null;
        setLiveStartedAtMs(startedMs);
        if (startedMs) {
          setLiveElapsedSec(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [friendTimerRestored]);

  const load = async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    try {
      const [u, f, incoming, outgoing, l, myProfile] = await Promise.all([
        fetchDiscoverUsers(),
        fetchFriends(),
        fetchIncomingFriendRequests(),
        fetchOutgoingFriendRequests(),
        fetchFriendsLeaderboard(weekOffset),
        fetchMe(),
      ]);
      if (loadRequestRef.current !== requestId) return;
      setUsers(u);
      setFriends(f);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setLeaderboard(l);
      setMe(myProfile);
    } catch (e) {
      if (loadRequestRef.current !== requestId) return;
      toast.error(e instanceof Error ? e.message : "Failed to load friends");
    } finally {
      if (loadRequestRef.current !== requestId) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [weekOffset]);

  const leaderboardWithRank = useMemo(
    () =>
      [...leaderboard]
        .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 })),
    [leaderboard],
  );

  const myRank = leaderboardWithRank.find((entry) => entry.userId === me?.id)?.rank;
  const topThree = leaderboardWithRank.slice(0, 3);
  const topStudier = topThree[0];
  const groupTotal = leaderboardWithRank.reduce((sum, row) => sum + row.weeklyMinutes, 0);

  const resetSessionForm = () => {
    setSessionMode("past");
    setFriendIds([]);
    setSubjectName("");
    setTopic("");
    setDurationMin(60);
    setLiveStartedAtMs(null);
    setLiveElapsedSec(0);
  };

  const openSessionModal = (preselectedFriendId?: string) => {
    if (liveStartedAtMs) {
      setShowSessionModal(true);
      return;
    }
    resetSessionForm();
    if (preselectedFriendId) setFriendIds([preselectedFriendId]);
    setShowSessionModal(true);
  };

  const selectedFriends = useMemo(() => friends.filter((f) => friendIds.includes(f.id)), [friendIds, friends]);
  const canStartOrLog = friendIds.length > 0 && subjectName.trim().length > 0 && topic.trim().length > 0;
  const canLogPast = canStartOrLog && Number.isFinite(durationMin) && durationMin >= 1;
  const subjectExists = subjects.some((s) => s.name.toLowerCase() === subjectName.trim().toLowerCase());

  useEffect(() => {
    if (!liveStartedAtMs) return;
    void saveTimerState({
      timerType: "friend",
      sessionMode: "live",
      hasStarted: true,
      isRunning: true,
      startedAtMs: liveStartedAtMs,
      friendIds,
      subjectName: subjectName.trim(),
      topic: topic.trim(),
      durationMin,
    }).catch(() => {});
  }, [liveStartedAtMs, friendIds, subjectName, topic, durationMin]);

  const createSession = async (payload: { duration: number; startedAt: string }) => {
    if (!subjectName.trim()) throw new Error("Subject is required");
    if (!topic.trim()) throw new Error("Topic is required");
    if (friendIds.length === 0) throw new Error("Select at least one friend");

    await createFriendSession({
      friendIds,
      subjectName: subjectName.trim(),
      topic: topic.trim(),
      durationMin: payload.duration,
      mood: "4",
      startedAt: payload.startedAt,
    });
  };

  const onLogPast = async () => {
    try {
      await createSession({ duration: durationMin, startedAt: new Date().toISOString() });
      toast.success("Friend session logged");
      setShowSessionModal(false);
      resetSessionForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to log session");
    }
  };

  const onLivePrimary = async () => {
    if (!liveStartedAtMs) {
      if (!subjectName.trim() || !topic.trim() || friendIds.length === 0) {
        toast.error("Select friends, subject and topic first");
        return;
      }
      const startedAtMs = await startTimerFromServer().catch(() => null);
      if (!startedAtMs) {
        toast.error("Unable to start timer");
        return;
      }
      setLiveStartedAtMs(startedAtMs);
      setLiveElapsedSec(0);
      return;
    }

    const minutes = Math.max(1, Math.round(liveElapsedSec / 60));
    try {
      await createSession({ duration: minutes, startedAt: new Date(liveStartedAtMs).toISOString() });
      await clearTimerState().catch(() => {});
      toast.success("Live friend session saved");
      setShowSessionModal(false);
      resetSessionForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save live session");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white sm:text-4xl">Friends</h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-slate-400 sm:text-base">Study together. Grow together.</p>
        </div>
        <button
          type="button"
          onClick={() => openSessionModal()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm dark:border dark:border-cyan-300/30 dark:bg-cyan-400 dark:text-slate-900 sm:w-auto"
        >
          <Users className="h-4 w-4" />
          New Friend Session
        </button>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-border/60 bg-muted/25 p-2 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`${tabStyle} shrink-0 ${activeTab === "leaderboard" ? "bg-primary/10 text-primary dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-300" : "bg-muted/50 text-muted-foreground dark:bg-slate-900/70 dark:text-slate-400"}`}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className={`${tabStyle} shrink-0 ${activeTab === "friends" ? "bg-primary/10 text-primary dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-300" : "bg-muted/50 text-muted-foreground dark:bg-slate-900/70 dark:text-slate-400"}`}
          >
            My Friends <span className="ml-1 text-xs">{friends.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("discover")}
            className={`${tabStyle} shrink-0 ${activeTab === "discover" ? "bg-primary/10 text-primary dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-300" : "bg-muted/50 text-muted-foreground dark:bg-slate-900/70 dark:text-slate-400"}`}
          >
            Discover <span className="ml-1 text-xs">{discoverUsers.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`${tabStyle} shrink-0 ${activeTab === "requests" ? "bg-primary/10 text-primary dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-300" : "bg-muted/50 text-muted-foreground dark:bg-slate-900/70 dark:text-slate-400"}`}
          >
            Requests <span className="ml-1 text-xs">{incomingCount}</span>
          </button>
        </div>

      </div>

      {activeTab === "leaderboard" && (
        <section className="mt-6 space-y-5">
          <div className="rounded-2xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#081126]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground dark:border-slate-700 dark:text-slate-500"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground dark:text-slate-400">{weekOffset === 0 ? "This Week" : "Selected Week"}</p>
                <p className="text-sm font-semibold text-foreground dark:text-slate-200">{weekLabel(weekOffset)}</p>
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={weekOffset === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-500"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-border bg-background p-5 text-center dark:border-slate-800 dark:bg-[#081126]">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Group Total</p>
              <p className="mt-1 text-4xl font-bold leading-none text-foreground dark:text-slate-100 sm:text-[38px]">{formatLongDuration(groupTotal)}</p>
            </article>
            <article className="rounded-3xl border border-border bg-background p-5 text-center dark:border-slate-800 dark:bg-[#081126]">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Your Rank</p>
              <p className="mt-1 text-4xl font-bold leading-none text-violet-600 dark:text-violet-400 sm:text-[38px]">#{myRank ?? "-"}</p>
            </article>
            <article className="col-span-2 rounded-3xl border border-border bg-background p-5 text-center dark:border-slate-800 dark:bg-[#081126] lg:col-span-1">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Top Studier</p>
              <p className="mt-1 text-4xl font-bold leading-none text-amber-600 dark:text-amber-400 sm:text-[38px]">{topStudier?.fullName || topStudier?.username || "-"}</p>
            </article>
          </div>

          <div className="rounded-3xl border border-border bg-background p-4 sm:p-6 dark:border-slate-800 dark:bg-[#071027]">
            <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-3 md:gap-4 md:overflow-visible">
              {topThree.map((entry, idx) => {
                const bg =
                  idx === 0 ? "from-orange-100 to-orange-50" : idx === 1 ? "from-slate-100 to-slate-50" : "from-pink-100 to-pink-50";
                return (
                  <article key={entry.userId} className={`min-w-[240px] rounded-2xl bg-gradient-to-b ${bg} p-5 text-center md:min-w-0`}>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white text-base font-bold text-foreground shadow-sm dark:border-slate-500 dark:bg-[#10213d] dark:text-slate-100">
                      {initials(entry.fullName || entry.username || "F")}
                    </div>
                    <p className="mt-2 text-xl font-semibold text-foreground">{entry.fullName || entry.username}</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(entry.weeklyMinutes)} this week</p>
                    <div className={`mt-3 rounded-xl py-6 ${idx === 0 ? "bg-orange-100/80" : idx === 1 ? "bg-slate-100/90" : "bg-pink-100/80"} dark:bg-slate-900/40`}>
                      <p className="text-5xl font-extrabold text-foreground">#{entry.rank}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-background p-5 dark:border-slate-800 dark:bg-[#071027]">
            <h3 className="mb-4 text-lg font-semibold text-foreground dark:text-slate-100 sm:text-xl">
              Full Ranking - {weekOffset === 0 ? "This Week" : weekLabel(weekOffset)}
            </h3>
            <div className="space-y-3">
              {leaderboardWithRank.map((row) => {
                const name = row.fullName || row.username || "Friend";
                const max = Math.max(leaderboardWithRank[0]?.weeklyMinutes || 1, 1);
                const widthPct = Math.max(10, Math.round((row.weeklyMinutes / max) * 100));
                const isMe = row.userId === me?.id;
                return (
                  <div key={row.userId} className={`rounded-2xl p-3 ${isMe ? "bg-primary/5 dark:bg-cyan-400/10" : "bg-muted/30 dark:bg-slate-900/70"}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background text-sm font-bold dark:bg-slate-800 dark:text-slate-100">
                        {row.rank}
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-800">
                        {initials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-base font-semibold text-foreground dark:text-slate-100 sm:text-lg">
                            {name}
                          </p>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-cyan-400/20 dark:text-cyan-300">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-border/70 dark:bg-slate-800">
                          <div className="h-1.5 rounded-full bg-primary dark:bg-cyan-400" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                      <p className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground dark:text-slate-200">
                        {formatDuration(row.weeklyMinutes)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!leaderboardWithRank.length && !loading && <p className="text-sm text-muted-foreground">No ranking data yet.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === "friends" && (
        <section className="mt-6 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
          {friends.map((friend) => {
            const lb = leaderboardWithRank.find((r) => r.userId === friend.id);
            return (
              <article key={friend.id} className="rounded-2xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#081126]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-700">
                    {initials(friend.name || friend.email)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{friend.name || friend.email}</p>
                    <p className="text-xs text-muted-foreground">@{friend.username || "friend"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{lb ? `${formatDuration(lb.weeklyMinutes)} this week` : "No study data yet"}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSessionModal(friend.id)}
                    className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground dark:bg-cyan-400 dark:text-slate-900"
                  >
                    Study Together
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Unfriend flow will be added later")}
                    className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
          {!friends.length && !loading && <p className="text-sm text-muted-foreground">No friends yet.</p>}
        </section>
      )}

      {activeTab === "discover" && (
        <section className="mt-6">
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or handle..."
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm dark:border-slate-800 dark:bg-[#081126] dark:text-slate-200"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
            {discoverUsers.map((u) => (
              <article key={u.id} className="rounded-2xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#081126]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {initials(u.fullName || u.email)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{u.fullName || u.email}</p>
                    <p className="text-xs text-muted-foreground">@{u.username || "new-user"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sendFriendRequest(u.id);
                      toast.success("Friend request sent");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed to send request");
                    }
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground dark:bg-cyan-400 dark:text-slate-900"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Friend
                </button>
              </article>
            ))}
            {!discoverUsers.length && !loading && <p className="text-sm text-muted-foreground">No users found.</p>}
          </div>
        </section>
      )}

      {activeTab === "requests" && (
        <section className="mt-6 space-y-3 sm:space-y-4">
          {incomingRequests.map((request) => {
            const sender = userById.get(request.senderId);
            const senderName = sender?.fullName || sender?.email || "User";
            return (
              <article key={request.id} className="rounded-2xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#081126]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                      {initials(senderName)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{senderName}</p>
                      <p className="text-xs text-muted-foreground">@{sender?.username || "friend"}</p>
                    </div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await acceptFriendRequest(request.id);
                          toast.success("Friend request accepted");
                          await load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Unable to accept request");
                        }
                      }}
                      className="flex-1 rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await rejectFriendRequest(request.id);
                          toast.success("Friend request rejected");
                          await load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Unable to reject request");
                        }
                      }}
                      className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground dark:border-slate-700 dark:text-slate-400"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!incomingRequests.length && <p className="text-sm text-muted-foreground">No pending incoming requests.</p>}

          {!!outgoingRequests.length && (
            <div className="rounded-2xl border border-border bg-background p-4 dark:border-slate-800 dark:bg-[#081126]">
              <h3 className="mb-2 text-sm font-semibold text-foreground dark:text-slate-200">Sent Requests</h3>
              <div className="space-y-2">
                {outgoingRequests.map((request) => {
                  const receiver = userById.get(request.receiverId);
                  return (
                    <div key={request.id} className="rounded-xl bg-muted/30 px-3 py-2 text-sm text-muted-foreground dark:bg-slate-900/70 dark:text-slate-400">
                      @{receiver?.username || receiver?.email || "user"} - pending
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-3">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-background p-4 shadow-2xl sm:max-h-[88vh] sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-purple/15">
                  <Users className="h-5 w-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">Friend Session</p>
                  <p className="text-xs text-muted-foreground">Study together - live timer or log past time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (liveStartedAtMs) {
                    setShowSessionModal(false);
                    return;
                  }
                  setShowSessionModal(false);
                  resetSessionForm();
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setSessionMode("live")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold ${
                  sessionMode === "live" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Clock3 className="h-4 w-4" />
                Live Timer
              </button>
              <button
                type="button"
                onClick={() => setSessionMode("past")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold ${
                  sessionMode === "past" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Edit3 className="h-4 w-4" />
                Log Past
              </button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Study with</p>
            <div className="mb-4 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {friends.map((friend) => {
                const selected = friendIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() =>
                      setFriendIds((prev) => (prev.includes(friend.id) ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]))
                    }
                    className={`flex items-start gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      selected ? "border-primary bg-primary/10" : "border-border bg-background"
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                      {initials(friend.name || friend.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{friend.name || friend.email}</p>
                      <p className="truncate text-xs text-muted-foreground">@{friend.username || "friend"}</p>
                    </div>
                    {selected && <Check className="ml-auto mt-1 h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</label>
            <input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. QUANT"
              className="mb-2 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
            />
            {subjectName.trim().length > 0 && (
              <p className="mb-2 text-[11px] text-muted-foreground">
                {subjectExists ? "✓ Will add to existing subject" : "✨ New subject will be created"}
              </p>
            )}
            <div className="mb-3 flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSubjectName(subject.name)}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {subject.name}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What did you cover?"
              className="mb-4 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
            />

            {sessionMode === "past" ? (
              <>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="mb-2 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"
                />
                <div className="mb-4 flex flex-wrap gap-2">
                  {durationPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDurationMin(preset)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${durationMin === preset ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-4 rounded-2xl border border-border bg-muted/20 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready to start</p>
                <p className="font-mono text-5xl font-bold tracking-tight text-foreground">
                  {new Date(liveElapsedSec * 1000).toISOString().slice(14, 19)}
                </p>
                {selectedFriends.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    With {selectedFriends.map((f) => f.name || f.email).join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-background/95 pt-2 backdrop-blur sm:static sm:bg-transparent sm:pt-0 sm:backdrop-blur-0">
              <button
                type="button"
                onClick={() => {
                  if (liveStartedAtMs) {
                    setShowSessionModal(false);
                    return;
                  }
                  setShowSessionModal(false);
                  resetSessionForm();
                }}
                className="rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              {sessionMode === "past" ? (
                <button
                  type="button"
                  onClick={onLogPast}
                  disabled={!canLogPast}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${
                    !canLogPast ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  Log Friend Session
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLivePrimary}
                  disabled={!canStartOrLog}
                  className={`rounded-xl py-2.5 text-sm font-semibold ${
                    !canStartOrLog
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : liveStartedAtMs
                        ? "inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground"
                        : "inline-flex items-center justify-center gap-2 bg-neon-orange text-white"
                  }`}
                >
                  {liveStartedAtMs ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {liveStartedAtMs ? "Stop & Log" : "Start Timer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


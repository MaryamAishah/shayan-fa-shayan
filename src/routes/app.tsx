import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heatmap } from "@/components/Heatmap";
import { reminderOfTheDay } from "@/lib/quotes";
import { addMonths, startOfMonth, toISODate } from "@/lib/date";
import {
  Moon,
  Plus,
  Check,
  Trash2,
  LogOut,
  BookOpen,
  Clock,
  Link2,
  MapPin,
  HeartHandshake,
  Hand,
  Flame,
  Trophy,
  Info,
  Award,
  Star,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Shay'an Fa Shay'an — Little by Little" },
      { name: "description", content: "An Islamic habit tracker to grow little by little, with sincerity and consistency." },
    ],
  }),
  component: AppPage,
});

interface Habit {
  id: string;
  name: string;
  emoji: string | null;
  scheduled_time: string | null;
  stack_on: string | null;
  reminder: string | null;
  dua: string | null;
  location: string | null;
}

interface Completion {
  id: string;
  habit_id: string;
  completed_date: string;
}

const STREAK_GOAL = 21;

function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function computeCurrentStreak(dates: string[], todayISO: string): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date(todayISO + "T00:00:00");
  if (!set.has(toISODate(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(toISODate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Returns the ISO dates for the last 7 days, oldest first, ending today.
function lastSevenDays(todayISO: string): string[] {
  const out: string[] = [];
  const d = new Date(todayISO + "T00:00:00");
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(toISODate(x));
  }
  return out;
}

function countInMonth(dates: string[], monthDate: Date): number {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  return dates.filter((d) => {
    const dt = new Date(d + "T00:00:00");
    return dt.getFullYear() === y && dt.getMonth() === m;
  }).length;
}

interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  icon: typeof Trophy;
}

function computeBadges(allDates: string[], todayISO: string): Badge[] {
  const longest = computeLongestStreak(allDates);
  const total = new Set(allDates).size;
  const monthCount = countInMonth(allDates, new Date(todayISO + "T00:00:00"));
  return [
    {
      id: "first-step",
      label: "First Step",
      description: "Complete the habit once",
      earned: total >= 1,
      icon: Sparkles,
    },
    {
      id: "week-strong",
      label: "7-Day Streak",
      description: "7 days in a row",
      earned: longest >= 7,
      icon: Flame,
    },
    {
      id: "habit-formed",
      label: "Habit Formed",
      description: "21 consecutive days, ma sha Allah",
      earned: longest >= STREAK_GOAL,
      icon: Trophy,
    },
    {
      id: "forty-days",
      label: "Forty Days",
      description: "40 consecutive days of sincerity",
      earned: longest >= 40,
      icon: Star,
    },
    {
      id: "monthly-15",
      label: "Steady Month",
      description: "15 days this month",
      earned: monthCount >= 15,
      icon: Award,
    },
    {
      id: "monthly-25",
      label: "Devoted Month",
      description: "25 days this month",
      earned: monthCount >= 25,
      icon: Award,
    },
  ];
}

function AppPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [newHabit, setNewHabit] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newStack, setNewStack] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [newDua, setNewDua] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const today = toISODate(new Date());
  const reminder = useMemo(() => reminderOfTheDay(), []);
  const greetedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Assalamu alaikum greeting on first session render
  useEffect(() => {
    if (user && !greetedRef.current) {
      greetedRef.current = true;
      toast(`Assalamu alaikum`, {
        description: "Welcome back. May Allah make your day easy and blessed.",
        duration: 5000,
      });
    }
  }, [user]);

  const habitsQ = useQuery({
    queryKey: ["habits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("id,name,emoji,scheduled_time,stack_on,reminder,dua,location")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const allCompletionsQ = useQuery({
    queryKey: ["completions-all", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Completion[]> => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("id,habit_id,completed_date")
        .order("completed_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addHabit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("habits").insert({
        name: newHabit.trim(),
        user_id: user.id,
        scheduled_time: newTime || null,
        stack_on: newStack.trim() || null,
        reminder: newReminder.trim() || null,
        dua: newDua.trim() || null,
        location: newLocation.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewHabit("");
      setNewTime("");
      setNewStack("");
      setNewReminder("");
      setNewDua("");
      setNewLocation("");
      toast.success("Habit added. Bismillah — little by little.");
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["completions-all"] });
    },
  });

  const toggleToday = useMutation({
    mutationFn: async ({ habitId, done }: { habitId: string; done: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (done) {
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("completed_date", today);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_completions")
          .insert({ habit_id: habitId, user_id: user.id, completed_date: today });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completions-all"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const completions = allCompletionsQ.data ?? [];
  const habits = habitsQ.data ?? [];

  const countsByDate: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of completions) m[c.completed_date] = (m[c.completed_date] ?? 0) + 1;
    return m;
  }, [completions]);

  const datesByHabit: Record<string, string[]> = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of completions) {
      (m[c.habit_id] ??= []).push(c.completed_date);
    }
    return m;
  }, [completions]);

  const todayDoneIds = useMemo(
    () => new Set(completions.filter((c) => c.completed_date === today).map((c) => c.habit_id)),
    [completions, today],
  );

  const doneToday = todayDoneIds.size;

  // 21-day streak celebration (once per habit per milestone) — Ma sha Allah
  useEffect(() => {
    if (!user) return;
    for (const h of habits) {
      const longest = computeLongestStreak(datesByHabit[h.id] ?? []);
      if (longest >= STREAK_GOAL) {
        const key = `shayan-21-${user.id}-${h.id}`;
        if (typeof window !== "undefined" && !localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          toast.success(`Ma sha Allah! 21 days of "${h.name}" — it's now a habit.`, {
            duration: 9000,
          });
        }
      }
    }
  }, [habits, datesByHabit, user]);

  const weekDays = useMemo(() => lastSevenDays(today), [today]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Shay'an Fa Shay'an</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Little by little</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 pb-16">
        {/* Daily reminder */}
        <div className="rounded-3xl border bg-gradient-to-br from-accent/60 to-card/80 p-6 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              {reminder.arabic && (
                <p className="mb-2 text-right text-lg leading-loose text-foreground" dir="rtl">
                  {reminder.arabic}
                </p>
              )}
              <p className="text-base font-medium leading-relaxed text-foreground">
                "{reminder.text}"
              </p>
              <p className="mt-2 text-sm text-muted-foreground">— {reminder.source}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="habits">My habits</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          {/* TODAY */}
          <TabsContent value="today" className="mt-4">
            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Today</h2>
                <span className="text-sm text-muted-foreground">
                  {doneToday} / {habits.length} done
                </span>
              </div>

              {habits.length === 0 ? (
                <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No habits yet. Add one in the "My habits" tab, bi'idhnillah.
                </p>
              ) : (
                <ul className="space-y-2">
                  {habits.map((h) => {
                    const done = todayDoneIds.has(h.id);
                    const streak = computeCurrentStreak(datesByHabit[h.id] ?? [], today);
                    return (
                      <li
                        key={h.id}
                        className="rounded-2xl border bg-background/50 p-3 transition hover:bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleToday.mutate({ habitId: h.id, done })}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${
                              done
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary"
                            }`}
                            aria-label={done ? "Mark not done" : "Mark done"}
                          >
                            {done && <Check className="h-4 w-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              <span className="mr-2">{h.emoji ?? "🌱"}</span>
                              {h.name}
                            </div>
                            {(h.scheduled_time || h.stack_on || h.location) && (
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {h.scheduled_time && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {h.scheduled_time.slice(0, 5)}
                                  </span>
                                )}
                                {h.stack_on && (
                                  <span className="inline-flex items-center gap-1">
                                    <Link2 className="h-3 w-3" />
                                    after {h.stack_on}
                                  </span>
                                )}
                                {h.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {h.location}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {streak > 0 && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                streak >= STREAK_GOAL
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                              title={`${streak}-day streak`}
                            >
                              {streak >= STREAK_GOAL ? (
                                <Trophy className="h-3 w-3" />
                              ) : (
                                <Flame className="h-3 w-3" />
                              )}
                              {streak}d
                            </span>
                          )}
                        </div>
                        {(h.dua || h.reminder) && (
                          <div className="mt-3 space-y-2 rounded-xl bg-muted/50 p-3 text-xs">
                            {h.dua && (
                              <div className="flex gap-2 text-foreground/80">
                                <Hand className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span><span className="font-medium">Du'a:</span> {h.dua}</span>
                              </div>
                            )}
                            {h.reminder && (
                              <div className="flex gap-2 text-foreground/80">
                                <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span><span className="font-medium">Remember:</span> {h.reminder}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* MY HABITS */}
          <TabsContent value="habits" className="mt-4 space-y-6">
            {/* Info / guidance box */}
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-3 text-sm">
                  <h3 className="text-base font-semibold tracking-tight">How to set up a habit</h3>
                  <p className="text-muted-foreground">
                    Build it slowly with sincerity. The Prophet ﷺ said the most beloved deeds to Allah are
                    those that are most consistent, even if they are small. Aim to stick with any new habit
                    for <span className="font-semibold text-foreground">21 consecutive days</span> — that is
                    when, by Allah's permission, it starts to feel natural.
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex gap-2">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-medium text-foreground">Time of day:</span> a specific time anchors the habit so it doesn't drift.</span>
                    </li>
                    <li className="flex gap-2">
                      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-medium text-foreground">Stack on existing habit:</span> attach it to something you already do (e.g. "after Fajr") so the existing habit triggers the new one.</span>
                    </li>
                    <li className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-medium text-foreground">Where:</span> a fixed place trains your mind to associate the spot with the action.</span>
                    </li>
                    <li className="flex gap-2">
                      <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-medium text-foreground">Reminder / reward:</span> write what to tell yourself on weak days — the reward in this life or the next.</span>
                    </li>
                    <li className="flex gap-2">
                      <Hand className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><span className="font-medium text-foreground">Daily du'a:</span> turn to Allah for help. "And whoever relies on Allah, He is sufficient for him." (65:3)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-semibold tracking-tight">Add a habit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Bismillah. Keep it small and steady — 21 days, in sha Allah.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newHabit.trim()) addHabit.mutate();
                }}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Habit</label>
                  <Input
                    value={newHabit}
                    onChange={(e) => setNewHabit(e.target.value)}
                    placeholder="e.g. Read one page of Qur'an"
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Time of day</label>
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Stack on existing habit</label>
                    <Input
                      value={newStack}
                      onChange={(e) => setNewStack(e.target.value)}
                      placeholder="e.g. After Fajr prayer"
                      maxLength={120}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Where will you do it?</label>
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. On the prayer mat, at my desk"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Reminder to yourself / reward
                  </label>
                  <Textarea
                    value={newReminder}
                    onChange={(e) => setNewReminder(e.target.value)}
                    placeholder="What will you tell yourself when you don't feel like it? e.g. 'Every page is a step toward Jannah.'"
                    rows={2}
                    maxLength={400}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Daily du'a for this habit
                  </label>
                  <Textarea
                    value={newDua}
                    onChange={(e) => setNewDua(e.target.value)}
                    placeholder="e.g. Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik."
                    rows={2}
                    maxLength={400}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!newHabit.trim() || addHabit.isPending}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add habit
                </Button>
              </form>
            </div>

            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Your habits</h2>
              {habits.length === 0 ? (
                <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No habits yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {habits.map((h) => {
                    const longest = computeLongestStreak(datesByHabit[h.id] ?? []);
                    const pct = Math.min(100, Math.round((longest / STREAK_GOAL) * 100));
                    return (
                      <li key={h.id} className="rounded-2xl border bg-background/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              <span className="mr-2">{h.emoji ?? "🌱"}</span>
                              {h.name}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {h.scheduled_time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {h.scheduled_time.slice(0, 5)}
                                </span>
                              )}
                              {h.stack_on && (
                                <span className="inline-flex items-center gap-1">
                                  <Link2 className="h-3 w-3" />
                                  after {h.stack_on}
                                </span>
                              )}
                              {h.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {h.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteHabit.mutate(h.id)}
                            className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete habit"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {(h.dua || h.reminder) && (
                          <div className="mt-3 space-y-1.5 rounded-xl bg-muted/40 p-3 text-xs">
                            {h.dua && (
                              <p className="text-foreground/80">
                                <Hand className="mr-1 inline h-3 w-3 text-primary" />
                                <span className="font-medium">Du'a:</span> {h.dua}
                              </p>
                            )}
                            {h.reminder && (
                              <p className="text-foreground/80">
                                <HeartHandshake className="mr-1 inline h-3 w-3 text-primary" />
                                <span className="font-medium">Remember:</span> {h.reminder}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {longest >= STREAK_GOAL ? (
                                <Trophy className="h-3 w-3 text-primary" />
                              ) : (
                                <Flame className="h-3 w-3" />
                              )}
                              Best streak: {longest} / {STREAK_GOAL} days
                            </span>
                            {longest >= STREAK_GOAL && (
                              <span className="font-medium text-primary">Ma sha Allah!</span>
                            )}
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* HEATMAP */}
          <TabsContent value="heatmap" className="mt-4">
            <Heatmap
              counts={countsByDate}
              totalHabits={habits.length}
              monthDate={monthDate}
              onPrev={() => setMonthDate((d) => addMonths(d, -1))}
              onNext={() => setMonthDate((d) => addMonths(d, 1))}
            />
          </TabsContent>

          {/* WEEKLY REVIEW + BADGES */}
          <TabsContent value="review" className="mt-4 space-y-6">
            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-semibold tracking-tight">This week</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Last 7 days, including today. Reflect with gratitude — alhamdulillah for every checkmark.
              </p>
              {habits.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Add a habit to start your weekly review.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {habits.map((h) => {
                    const set = new Set(datesByHabit[h.id] ?? []);
                    const hits = weekDays.filter((d) => set.has(d)).length;
                    const praise =
                      hits === 7
                        ? "Ma sha Allah — every day!"
                        : hits >= 5
                        ? "Ma sha Allah, strong week."
                        : hits >= 3
                        ? "Alhamdulillah, keep going."
                        : hits >= 1
                        ? "A start is a blessing. Tomorrow is a new chance."
                        : "No worries — begin again, in sha Allah.";
                    return (
                      <li key={h.id} className="rounded-2xl border bg-background/50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium">
                            <span className="mr-2">{h.emoji ?? "🌱"}</span>
                            {h.name}
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {hits}/7
                          </span>
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          {weekDays.map((d) => {
                            const done = set.has(d);
                            const day = new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                              weekday: "short",
                            });
                            return (
                              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                                <div
                                  className={`h-7 w-full rounded-md ${
                                    done ? "bg-primary" : "bg-muted"
                                  }`}
                                  title={d}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {day[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          You completed <span className="font-medium text-foreground">{h.name}</span>{" "}
                          for {hits}/7 days this week. {praise}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* BADGES */}
            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-semibold tracking-tight">Badges</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Milestones earned across all your habits. Every step counts, ma sha Allah.
              </p>
              {habits.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Add a habit to start earning badges.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {habits.map((h) => {
                    const badges = computeBadges(datesByHabit[h.id] ?? [], today);
                    return (
                      <div key={h.id} className="rounded-2xl border bg-background/50 p-3">
                        <div className="mb-3 text-sm font-medium">
                          <span className="mr-2">{h.emoji ?? "🌱"}</span>
                          {h.name}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {badges.map((b) => {
                            const Icon = b.icon;
                            return (
                              <div
                                key={b.id}
                                title={b.description}
                                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                                  b.earned
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-dashed bg-muted/30 text-muted-foreground opacity-60"
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="text-[10px] font-medium leading-tight">
                                  {b.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

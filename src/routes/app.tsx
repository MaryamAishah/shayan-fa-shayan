import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heatmap } from "@/components/Heatmap";
import { quoteOfTheDay } from "@/lib/quotes";
import { addMonths, startOfMonth, toISODate } from "@/lib/date";
import { Sparkles, Plus, Check, Trash2, LogOut, Quote, Clock, Link2, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Bloom Habits" },
      { name: "description", content: "Track your habits and watch your calendar bloom." },
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
  // If today not done, start from yesterday so streak is still counted
  if (!set.has(toISODate(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(toISODate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function AppPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [newHabit, setNewHabit] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newStack, setNewStack] = useState("");
  const today = toISODate(new Date());
  const quote = useMemo(() => quoteOfTheDay(), []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const habitsQ = useQuery({
    queryKey: ["habits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("id,name,emoji,scheduled_time,stack_on")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // All completions (for streak math). For very large histories this could be paginated.
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewHabit("");
      setNewTime("");
      setNewStack("");
      toast.success("Habit added — stick with it for 21 days to make it stick!");
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

  // 21-day streak celebration (once per habit per milestone)
  useEffect(() => {
    if (!user) return;
    for (const h of habits) {
      const longest = computeLongestStreak(datesByHabit[h.id] ?? []);
      if (longest >= STREAK_GOAL) {
        const key = `bloom-21-${user.id}-${h.id}`;
        if (typeof window !== "undefined" && !localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          toast.success(`🎉 21-day streak on "${h.name}"! It's officially a habit.`, {
            duration: 8000,
          });
        }
      }
    }
  }, [habits, datesByHabit, user]);

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
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Bloom</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 pb-16">
        {/* Quote */}
        <div className="rounded-3xl border bg-gradient-to-br from-accent/60 to-card/80 p-6 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Quote className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-base font-medium leading-relaxed text-foreground">
                "{quote.text}"
              </p>
              <p className="mt-2 text-sm text-muted-foreground">— {quote.author}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="habits">My habits</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
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
                  No habits yet. Add one in the "My habits" tab.
                </p>
              ) : (
                <ul className="space-y-2">
                  {habits.map((h) => {
                    const done = todayDoneIds.has(h.id);
                    const streak = computeCurrentStreak(datesByHabit[h.id] ?? [], today);
                    return (
                      <li
                        key={h.id}
                        className="flex items-center gap-3 rounded-2xl border bg-background/50 p-3 transition hover:bg-background"
                      >
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
                            <span className="mr-2">{h.emoji ?? "✨"}</span>
                            {h.name}
                          </div>
                          {(h.scheduled_time || h.stack_on) && (
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>

          {/* MY HABITS */}
          <TabsContent value="habits" className="mt-4 space-y-6">
            <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-lg font-semibold tracking-tight">Add a habit</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stick with it for 21 consecutive days and it becomes a habit.
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
                    placeholder="e.g. Drink a glass of water"
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Time of day
                    </label>
                    <Input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Stack on existing habit
                    </label>
                    <Input
                      value={newStack}
                      onChange={(e) => setNewStack(e.target.value)}
                      placeholder="e.g. After morning coffee"
                      maxLength={120}
                    />
                  </div>
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
                      <li
                        key={h.id}
                        className="rounded-2xl border bg-background/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              <span className="mr-2">{h.emoji ?? "✨"}</span>
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
                              <span className="font-medium text-primary">It's a habit! 🎉</span>
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
        </Tabs>
      </main>
    </div>
  );
}

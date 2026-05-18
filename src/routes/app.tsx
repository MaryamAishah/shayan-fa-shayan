import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heatmap } from "@/components/Heatmap";
import { quoteOfTheDay } from "@/lib/quotes";
import { addMonths, startOfMonth, toISODate } from "@/lib/date";
import { Sparkles, Plus, Check, Trash2, LogOut, Quote } from "lucide-react";
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
}

interface Completion {
  id: string;
  habit_id: string;
  completed_date: string;
}

function AppPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [newHabit, setNewHabit] = useState("");
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
        .select("id,name,emoji")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const completionsQ = useQuery({
    queryKey: ["completions", user?.id, monthDate.getFullYear(), monthDate.getMonth()],
    enabled: !!user,
    queryFn: async (): Promise<Completion[]> => {
      // pull a wide window covering the grid (current month +/- a few days)
      const start = new Date(monthDate);
      start.setDate(start.getDate() - 7);
      const end = addMonths(monthDate, 1);
      end.setDate(end.getDate() + 7);
      const { data, error } = await supabase
        .from("habit_completions")
        .select("id,habit_id,completed_date")
        .gte("completed_date", toISODate(start))
        .lte("completed_date", toISODate(end));
      if (error) throw error;
      return data ?? [];
    },
  });

  const addHabit = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("habits")
        .insert({ name: name.trim(), user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewHabit("");
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
      qc.invalidateQueries({ queryKey: ["completions"] });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completions"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const completions = completionsQ.data ?? [];
  const habits = habitsQ.data ?? [];

  // counts per date
  const countsByDate: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of completions) m[c.completed_date] = (m[c.completed_date] ?? 0) + 1;
    return m;
  }, [completions]);

  const todayDoneIds = useMemo(
    () => new Set(completions.filter((c) => c.completed_date === today).map((c) => c.habit_id)),
    [completions, today],
  );

  const doneToday = todayDoneIds.size;

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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Bloom</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1.1fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
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

          {/* Today summary + habits */}
          <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Today</h2>
              <span className="text-sm text-muted-foreground">
                {doneToday} / {habits.length} done
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newHabit.trim()) addHabit.mutate(newHabit);
              }}
              className="mb-4 flex gap-2"
            >
              <Input
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="Add a habit, e.g. Drink water"
              />
              <Button type="submit" disabled={!newHabit.trim() || addHabit.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {habits.length === 0 ? (
              <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                No habits yet. Add your first one above.
              </p>
            ) : (
              <ul className="space-y-2">
                {habits.map((h) => {
                  const done = todayDoneIds.has(h.id);
                  return (
                    <li
                      key={h.id}
                      className="group flex items-center gap-3 rounded-2xl border bg-background/50 p-3 transition hover:bg-background"
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
                      <span className="flex-1 text-sm font-medium">
                        <span className="mr-2">{h.emoji ?? "✨"}</span>
                        {h.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteHabit.mutate(h.id)}
                        className="rounded-full p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete habit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: Heatmap */}
        <div>
          <Heatmap
            counts={countsByDate}
            totalHabits={habits.length}
            monthDate={monthDate}
            onPrev={() => setMonthDate((d) => addMonths(d, -1))}
            onNext={() => setMonthDate((d) => addMonths(d, 1))}
          />
        </div>
      </main>
    </div>
  );
}

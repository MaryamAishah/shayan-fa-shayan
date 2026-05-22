import { Sparkles, Clock, ArrowRight } from "lucide-react";

interface HabitLite {
  id: string;
  name: string;
  emoji: string | null;
  scheduled_time: string | null;
  habit_type?: string | null;
}

interface Props {
  habits: HabitLite[];
  doneTodayIds: Set<string>;
  totalCompletionsAllTime: number;
  longestAnyStreak: number;
}

function parseTimeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return null;
  return h * 60 + (m || 0);
}

export function NextHabitMotivation({
  habits,
  doneTodayIds,
  totalCompletionsAllTime,
  longestAnyStreak,
}: Props) {
  const pending = habits.filter((h) => !doneTodayIds.has(h.id));
  const done = habits.length - pending.length;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Pick next: earliest scheduled time today >= now, else earliest pending without time
  const withTime = pending
    .map((h) => ({ h, mins: parseTimeToMinutes(h.scheduled_time) }))
    .filter((x) => x.mins !== null) as { h: HabitLite; mins: number }[];
  const upcoming = withTime.filter((x) => x.mins >= nowMin).sort((a, b) => a.mins - b.mins)[0];
  const overdue = withTime.filter((x) => x.mins < nowMin).sort((a, b) => b.mins - a.mins)[0];
  const next = upcoming?.h ?? overdue?.h ?? pending.find((h) => !h.scheduled_time) ?? null;

  let title: string;
  let body: string;

  if (habits.length === 0) {
    title = "Plant your first seed";
    body = "Add a habit in 'My habits' to begin, bi'idhnillah.";
  } else if (pending.length === 0) {
    title = "Ma sha Allah, every habit complete today";
    body = `${totalCompletionsAllTime} checkmarks total. Your best streak so far: ${longestAnyStreak} day${longestAnyStreak === 1 ? "" : "s"}. May Allah accept.`;
  } else if (next) {
    const when = next.scheduled_time
      ? upcoming
        ? `at ${next.scheduled_time.slice(0, 5)}`
        : `${next.scheduled_time.slice(0, 5)} (you can still catch this)`
      : "whenever you're ready";
    const left = pending.length;
    title = `Next up: ${next.emoji ?? "🌱"} ${next.name}`;
    body = `${when}. ${left} habit${left === 1 ? "" : "s"} left today. You've already logged ${totalCompletionsAllTime} checkmark${totalCompletionsAllTime === 1 ? "" : "s"} on this journey${longestAnyStreak >= 3 ? ` and your best streak is ${longestAnyStreak} days.` : "."}`;
  } else {
    title = "Keep going";
    body = `${done} of ${habits.length} done today.`;
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-accent/40 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {next?.scheduled_time ? <Clock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            {title}
            {next && pending.length > 0 && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
          </div>
          <p className="mt-1 text-sm text-foreground/80">{body}</p>
        </div>
      </div>
    </div>
  );
}

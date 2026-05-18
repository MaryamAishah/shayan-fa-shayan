import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Flame, Quote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — Habit Tracker" },
      { name: "description", content: "Build daily habits and watch your calendar bloom with progress." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Bloom</span>
        </div>
        <Link to="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Flame className="h-3.5 w-3.5 text-primary" />
            Small habits. Big bloom.
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Watch your calendar <span className="text-primary">bloom</span> with every habit.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Track your habits, complete them daily, and see your progress grow as deeper, larger purple circles on your calendar heatmap.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/login">
              <Button size="lg">Get started</Button>
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Calendar, title: "Visual heatmap", body: "A monthly calendar where each day blooms based on how many habits you completed." },
            { icon: Flame, title: "Daily check-ins", body: "Tap once to mark a habit done. Build streaks effortlessly." },
            { icon: Quote, title: "Daily motivation", body: "Start each day with a fresh quote to keep you moving." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border bg-card/70 p-6 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

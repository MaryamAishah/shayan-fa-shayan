import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Moon, Calendar, Hand, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shay'an Fa Shay'an — Islamic Habit Tracker" },
      { name: "description", content: "Build good habits little by little, with sincerity and consistency, in sha Allah." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Shay'an Fa Shay'an</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Little by little</div>
          </div>
        </div>
        <Link to="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <section className="text-center">
          <p className="text-2xl text-foreground/80" dir="rtl">شَيْئًا فَشَيْئًا</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Build good habits, <span className="text-primary">little by little</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            An Islamic habit tracker rooted in Qur'an and authentic sunnah. Set a du'a, a reminder,
            and a place — then watch your calendar bloom, in sha Allah.
          </p>
          <blockquote className="mx-auto mt-6 max-w-xl text-sm italic text-muted-foreground">
            "The most beloved of deeds to Allah are those that are most consistent, even if they are small."
            <span className="block not-italic">— Sahih al-Bukhari 6464</span>
          </blockquote>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/login">
              <Button size="lg">Get started</Button>
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Calendar, title: "Visual heatmap", body: "A monthly calendar where each day blooms based on how many habits you completed." },
            { icon: Hand, title: "Du'a + intention", body: "Anchor every habit with a du'a and a personal reminder for weak days." },
            { icon: BookOpen, title: "Daily reminders", body: "Start each day with an ayah or authentic hadith to keep your heart focused." },
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

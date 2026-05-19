import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { REMINDERS } from "@/lib/quotes";

const INTERVAL_MS = 20_000;

export function ReminderCarousel() {
  const [idx, setIdx] = useState(() => {
    const d = new Date();
    const doy = Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return doy % REMINDERS.length;
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % REMINDERS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  const r = REMINDERS[idx];
  const prev = () => setIdx((i) => (i - 1 + REMINDERS.length) % REMINDERS.length);
  const next = () => setIdx((i) => (i + 1) % REMINDERS.length);

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-accent/60 via-card/80 to-primary/5 p-6 backdrop-blur-sm transition-shadow hover:shadow-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-start gap-3">
        <BookOpen className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div key={idx} className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {r.arabic && (
            <p
              className="mb-2 text-right text-lg leading-loose text-foreground"
              dir="rtl"
            >
              {r.arabic}
            </p>
          )}
          <p className="text-base font-medium leading-relaxed text-foreground">
            "{r.text}"
          </p>
          <p className="mt-2 text-sm text-muted-foreground">— {r.source}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {REMINDERS.map((_, i) => (
            <button
              key={i}
              aria-label={`Reminder ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={prev}
            aria-label="Previous reminder"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next reminder"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

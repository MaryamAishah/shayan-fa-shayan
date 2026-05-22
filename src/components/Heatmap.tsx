import { useMemo, useState } from "react";
import { addMonths, monthGrid, monthLabel, startOfMonth, toISODate } from "@/lib/date";
import { addHijriMonths, hijriDayLabel, hijriMonthDays, hijriMonthLabel, hijriParts, startOfHijriMonth } from "@/lib/hijri";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  /** map of YYYY-MM-DD => count of habits completed that day */
  counts: Record<string, number>;
  totalHabits: number;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const SIZES = [0, 18, 24, 30, 36, 44];
const HEAT_VARS = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
  "var(--heat-5)",
];

function bucket(count: number, total: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0) return 0;
  if (total <= 0) return 1;
  const ratio = count / total;
  if (ratio >= 1) return 5;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

type Calendar = "greg" | "hijri";
type ViewMode = "month" | "week";

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function weekGrid(weekStart: Date): Date[] {
  const cells: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(weekStart);
    x.setDate(weekStart.getDate() + i);
    cells.push(x);
  }
  return cells;
}

export function Heatmap({ counts, totalHabits }: Props) {
  const [calendar, setCalendar] = useState<Calendar>("greg");
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const todayISO = toISODate(new Date());

  const monthAnchor = useMemo(() => {
    if (view === "week") return startOfWeek(anchor);
    return calendar === "greg" ? startOfMonth(anchor) : startOfHijriMonth(anchor);
  }, [anchor, calendar, view]);

  const cells: Date[] = useMemo(() => {
    if (view === "week") return weekGrid(monthAnchor);
    if (calendar === "greg") return monthGrid(monthAnchor);
    return hijriMonthDays(monthAnchor);
  }, [view, calendar, monthAnchor]);

  const header = useMemo(() => {
    if (view === "week") {
      const end = new Date(monthAnchor);
      end.setDate(monthAnchor.getDate() + 6);
      const sub =
        calendar === "hijri"
          ? `${hijriDayLabel(monthAnchor)} – ${hijriDayLabel(end)} ${hijriMonthLabel(end)}`
          : `${monthAnchor.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      return { title: "This week", sub };
    }
    if (calendar === "hijri") {
      return { title: hijriMonthLabel(monthAnchor), sub: monthLabel(monthAnchor) };
    }
    return { title: monthLabel(monthAnchor), sub: hijriMonthLabel(monthAnchor) };
  }, [view, calendar, monthAnchor]);

  const goPrev = () => {
    if (view === "week") {
      const x = new Date(monthAnchor);
      x.setDate(x.getDate() - 7);
      setAnchor(x);
    } else if (calendar === "hijri") {
      setAnchor(addHijriMonths(monthAnchor, -1));
    } else {
      setAnchor(addMonths(monthAnchor, -1));
    }
  };
  const goNext = () => {
    if (view === "week") {
      const x = new Date(monthAnchor);
      x.setDate(x.getDate() + 7);
      setAnchor(x);
    } else if (calendar === "hijri") {
      setAnchor(addHijriMonths(monthAnchor, 1));
    } else {
      setAnchor(addMonths(monthAnchor, 1));
    }
  };

  // For Hijri month view, lay out cells starting on the weekday of day 1.
  const leadingPad =
    view === "month" && calendar === "hijri" && cells.length > 0 ? cells[0].getDay() : 0;

  return (
    <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{header.title}</h2>
          <p className="truncate text-xs text-muted-foreground">{header.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setView("month")}
              className={`rounded-full px-2.5 py-1 transition ${view === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-full px-2.5 py-1 transition ${view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Week
            </button>
          </div>
          <div className="flex items-center rounded-full border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCalendar("greg")}
              className={`rounded-full px-2.5 py-1 transition ${calendar === "greg" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Greg
            </button>
            <button
              type="button"
              onClick={() => setCalendar("hijri")}
              className={`rounded-full px-2.5 py-1 transition ${calendar === "hijri" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Hijri
            </button>
          </div>
          <Button size="icon" variant="ghost" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingPad }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {cells.map((dt, i) => {
          const iso = toISODate(dt);
          const inRange = view === "week"
            ? true
            : calendar === "greg"
              ? dt.getMonth() === monthAnchor.getMonth()
              : hijriParts(dt).month === hijriParts(monthAnchor).month;
          const count = counts[iso] ?? 0;
          const b = bucket(count, totalHabits);
          const size = SIZES[b];
          const color = HEAT_VARS[b];
          const isToday = iso === todayISO;
          const label = calendar === "hijri" ? hijriDayLabel(dt) : String(dt.getDate());
          return (
            <div
              key={i}
              className="relative flex aspect-square items-center justify-center"
              title={`${iso} · ${hijriMonthLabel(dt)} : ${count} habit${count === 1 ? "" : "s"}`}
            >
              {size > 0 && (
                <span
                  className="absolute rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    opacity: inRange ? 1 : 0.35,
                  }}
                />
              )}
              <span
                className={`relative z-10 text-xs font-medium ${
                  inRange ? (b >= 3 ? "text-primary-foreground" : "text-foreground") : "text-muted-foreground/40"
                } ${isToday ? "underline underline-offset-4" : ""}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {HEAT_VARS.map((c, i) => (
          <span
            key={i}
            className="rounded-full"
            style={{ width: SIZES[i] || 10, height: SIZES[i] || 10, background: c }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

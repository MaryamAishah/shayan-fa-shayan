import { useMemo, useState } from "react";
import { monthGrid, monthLabel, startOfMonth, toISODate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function hijriLabel(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d).replace(" AH", "") + " AH";
  } catch {
    return "";
  }
}

function hijriDay(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", { day: "numeric" }).format(d);
  } catch {
    return String(d.getDate());
  }
}

interface Props {
  /** map of YYYY-MM-DD => count of habits completed that day */
  counts: Record<string, number>;
  /** total habits the user has, used to scale intensity */
  totalHabits: number;
  monthDate: Date;
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

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

const SIZES = [0, 18, 24, 30, 36, 44]; // px diameter per bucket
const HEAT_VARS = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
  "var(--heat-5)",
];

export function Heatmap({ counts, totalHabits, monthDate, onPrev, onNext }: Props) {
  const month = startOfMonth(monthDate);
  const cells = useMemo(() => monthGrid(month), [month]);
  const todayISO = toISODate(new Date());

  return (
    <div className="rounded-3xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{monthLabel(month)}</h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={onPrev} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onNext} aria-label="Next month">
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
        {cells.map((dt, i) => {
          const iso = toISODate(dt);
          const inMonth = dt.getMonth() === month.getMonth();
          const count = counts[iso] ?? 0;
          const b = bucket(count, totalHabits);
          const size = SIZES[b];
          const color = HEAT_VARS[b];
          const isToday = iso === todayISO;
          return (
            <div
              key={i}
              className="relative flex aspect-square items-center justify-center"
              title={`${iso}: ${count} habit${count === 1 ? "" : "s"}`}
            >
              {size > 0 && (
                <span
                  className="absolute rounded-full transition-all"
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    opacity: inMonth ? 1 : 0.35,
                  }}
                />
              )}
              <span
                className={`relative z-10 text-xs font-medium ${
                  inMonth ? (b >= 3 ? "text-primary-foreground" : "text-foreground") : "text-muted-foreground/40"
                } ${isToday ? "underline underline-offset-4" : ""}`}
              >
                {dt.getDate()}
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

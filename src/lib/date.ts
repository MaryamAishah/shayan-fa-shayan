export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Build a 6x7 grid of dates starting on Sunday for the given month. */
export function monthGrid(monthStart: Date): Date[] {
  const first = new Date(monthStart);
  const startWeekday = first.getDay(); // 0=Sun
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(gridStart);
    dt.setDate(gridStart.getDate() + i);
    cells.push(dt);
  }
  return cells;
}

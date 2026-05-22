// Hijri (Umm al-Qura) calendar helpers built on Intl.DateTimeFormat.

const FMT = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function hijriParts(d: Date): { year: number; month: number; day: number } {
  const parts = FMT.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function hijriMonthLabel(d: Date): string {
  const long = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    month: "long",
    year: "numeric",
  }).format(d);
  return long.replace(" AH", "") + " AH";
}

export function hijriDayLabel(d: Date): string {
  return String(hijriParts(d).day);
}

/** Find the Gregorian date that corresponds to day 1 of the Hijri month containing `d`. */
export function startOfHijriMonth(d: Date): Date {
  const { year, month } = hijriParts(d);
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  for (let i = 0; i < 35; i++) {
    const h = hijriParts(x);
    if (h.year === year && h.month === month && h.day === 1) return x;
    x.setDate(x.getDate() - 1);
  }
  return x;
}

/** All Gregorian dates whose Hijri date falls within the Hijri month containing `anchor`. */
export function hijriMonthDays(anchor: Date): Date[] {
  const start = startOfHijriMonth(anchor);
  const { year, month } = hijriParts(start);
  const days: Date[] = [];
  const x = new Date(start);
  for (let i = 0; i < 31; i++) {
    const h = hijriParts(x);
    if (h.year !== year || h.month !== month) break;
    days.push(new Date(x));
    x.setDate(x.getDate() + 1);
  }
  return days;
}

export function addHijriMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + Math.round(29.5 * n));
  return startOfHijriMonth(x);
}

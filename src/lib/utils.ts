export const DAY_MS = 86_400_000;

export function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

export function formatDays(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(" ");
}

// Date-only values ("YYYY-MM-DD") are calendar days, not instants: parse
// them as local midnight so they never shift a day across time zones.
export function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
}

// "19 Oct"; the year is added only outside the current year ("05 Jan 2027").
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDate(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(date.getFullYear() !== new Date().getFullYear() && {
      year: "numeric",
    }),
  });
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Today as "YYYY-MM-DD" in local time, for date-only columns.
export function todayIso(): string {
  return toIsoDate(new Date());
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

// "Sat 24 Oct", with the year outside the current year ("Mon 01 Feb
// 2027"). Composed by hand: en-GB adds a comma after the weekday once a
// year is included.
export function formatDay(value: string): string {
  const weekday = parseDate(value).toLocaleDateString("en-GB", {
    weekday: "short",
  });
  return `${weekday} ${formatDate(value)}`;
}

// "19–25 Oct" within a month, "30 Nov–06 Dec" across months.
export function formatDateRange(start: string, end: string): string {
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${start.slice(8)}–${formatDate(end)}`;
  }
  return `${formatDate(start)}–${formatDate(end)}`;
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Case- and accent-blind, so "flabebe" finds Flabébé and "nidoran" both
// Nidorans.
export const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// "Kanto and Johto", "Kanto, Johto and Hoenn"; with "or": "Kanto or Johto".
const LIST_FORMATS = {
  and: new Intl.ListFormat("en-GB", { type: "conjunction" }),
  or: new Intl.ListFormat("en-GB", { type: "disjunction" }),
};
export const formatList = (items: string[], joiner: "and" | "or" = "and") =>
  LIST_FORMATS[joiner].format(items);

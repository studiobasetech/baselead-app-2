/* Time-zone helpers + slot generation for public booking pages. */

export type Availability = Record<string, [string, string][]>; // "0".."6" (Sun..Sat)

export type BookingPage = {
  id: string;
  user_id: string;
  company_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  days_ahead: number;
  timezone: string;
  availability: Availability;
  active: boolean;
};

/** Offset (ms) of a time zone at a given instant. */
function tzOffset(instant: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - instant;
}

/** "2026-10-20" + "09:30" in a time zone → UTC timestamp (ms). */
export function zonedToUtc(date: string, time: string, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffset(guess, timeZone);
  return guess - tzOffset(first, timeZone);
}

/** Calendar date ("YYYY-MM-DD") of an instant in a time zone. */
export function dateInZone(instant: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

export function computeSlots(
  page: BookingPage,
  busy: { start: number; end: number }[],
  now = Date.now()
) {
  const slots: { start: string; end: string }[] = [];
  const duration = page.duration_minutes * 60000;
  const buffer = page.buffer_minutes * 60000;
  const earliest = now + page.min_notice_hours * 3600000;

  for (let day = 0; day <= page.days_ahead; day++) {
    const date = dateInZone(now + day * 86400000, page.timezone);
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const windows = page.availability?.[String(weekday)] ?? [];

    for (const [from, to] of windows) {
      const windowEnd = zonedToUtc(date, to, page.timezone);

      for (
        let start = zonedToUtc(date, from, page.timezone);
        start + duration <= windowEnd;
        start += duration
      ) {
        const end = start + duration;
        if (start < earliest) continue;

        const clashes = busy.some(
          (block) => start < block.end + buffer && end > block.start - buffer
        );

        if (!clashes) {
          slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
        }
      }
    }
  }

  return slots;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

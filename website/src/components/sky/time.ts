/**
 * Civil-day boundaries in an arbitrary IANA zone.
 *
 * The page always renders times local to the *place* being shown, not to the
 * browser — a sunrise labelled 05:42 has to mean dawn there. That means the
 * scrubber's "day" is a day in `place.tz`, which the Date API cannot express
 * directly.
 */

const PARTS = {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
} as const;

function zonedParts(tz: string, at: Date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...PARTS });
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(at)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p;
}

/** Zone offset at an instant, in ms — positive east of Greenwich. */
function offsetMs(tz: string, at: Date): number {
  const p = zonedParts(tz, at);
  // `hour` is 24 at midnight under hour12:false in some ICU versions.
  const hour = p.hour! % 24;
  const asUtc = Date.UTC(
    p.year!,
    p.month! - 1,
    p.day!,
    hour,
    p.minute!,
    p.second!,
  );
  // Seconds resolution is enough: no IANA zone in use has a sub-minute offset.
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Midnight beginning the civil day that `at` falls in, in `tz`. */
export function startOfZonedDay(tz: string, at: Date): Date {
  const p = zonedParts(tz, at);
  const midnightAsUtc = Date.UTC(p.year!, p.month! - 1, p.day!);
  // First guess uses the offset at `at`; the correction pass fixes the case
  // where a DST transition falls between `at` and the midnight we landed on.
  let ts = midnightAsUtc - offsetMs(tz, at);
  ts = midnightAsUtc - offsetMs(tz, new Date(ts));
  return new Date(ts);
}

/** Stable key for "which civil day is this", for memo dependencies. */
export function zonedDayKey(tz: string, at: Date): string {
  const p = zonedParts(tz, at);
  return `${p.year}-${p.month}-${p.day}`;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

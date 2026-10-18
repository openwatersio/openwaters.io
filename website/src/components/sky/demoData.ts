import {
  moonIllumination,
  searchMoonPhases,
  sunAltAz,
  sunAltitudeEvents,
  sunEvents,
  sunTransits,
  type Observer,
} from "@openwaters/almanac";

import { startOfZonedDay } from "./time.ts";

const DAY_MS = 86_400_000;

export function moonMonth(month: string) {
  if (!/^(19[5-9]\d|20\d\d|2100)-(0[1-9]|1[0-2])$/.test(month)) {
    throw new RangeError(
      "Choose a month between January 1950 and December 2100.",
    );
  }
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  const days = Array.from(
    { length: (end.getTime() - start.getTime()) / DAY_MS },
    (_, day) => {
      const time = new Date(start.getTime() + (day + 0.5) * DAY_MS);
      return { time, ...moonIllumination(time) };
    },
  );
  return { start, end, days, quarters: searchMoonPhases(start, end) };
}

// Before/after each crossing: daylight, civil, nautical, astronomical, night.
const TRANSITIONS = {
  rise: [1, 0],
  set: [0, 1],
  civilDawn: [2, 1],
  civilDusk: [1, 2],
  nauticalDawn: [3, 2],
  nauticalDusk: [2, 3],
  astroDawn: [4, 3],
  astroDusk: [3, 4],
} as const;

type Crossing = { time: Date; kind: "rising" | "falling" };
export type SunSpan = { from: Date; to: Date; morning: boolean };

/**
 * The stretches of `[start, end)` the Sun spends between two altitude
 * crossings. The Sun enters rising through `lower` or falling through
 * `upper`, and leaves the other way. A span cut by the window edge is clipped
 * to it.
 */
function spans(
  start: Date,
  end: Date,
  lower: Crossing[],
  upper: Crossing[],
): SunSpan[] {
  const marks = [
    ...lower.map((c) => ({ ...c, enter: c.kind === "rising" })),
    ...upper.map((c) => ({ ...c, enter: c.kind === "falling" })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());
  // ponytail: a day with no crossing at all counts as outside the band. The
  // Sun can graze inside it all day near the poles; check altitude if a
  // demo ever shows one.
  let from: Date | null = marks[0] && !marks[0].enter ? start : null;
  const out: SunSpan[] = [];
  for (const m of marks) {
    if (m.enter) from = m.time;
    else if (from) {
      out.push({ from, to: m.time, morning: m.kind === "rising" });
      from = null;
    }
  }
  const last = marks.at(-1);
  if (from && last)
    out.push({ from, to: end, morning: last.kind === "rising" });
  return out;
}

/**
 * Golden hour (Sun between the horizon and +6°) and blue hour (−4° to −8°),
 * the definitions the Slackwater app uses, plus solar noon and midnight.
 * Golden hour runs from sunrise or to sunset, so its horizon end is the same
 * upper-limb instant as the sunrise readout.
 */
export function sunHours(start: Date, end: Date, observer: Observer) {
  const at = (deg: number) => sunAltitudeEvents(start, end, observer, deg);
  const horizon = sunEvents(start, end, observer).flatMap(
    ({ time, kind }): Crossing[] =>
      kind === "rise"
        ? [{ time, kind: "rising" }]
        : kind === "set"
          ? [{ time, kind: "falling" }]
          : [],
  );
  return {
    golden: spans(start, end, horizon, at(6)),
    blue: spans(start, end, at(-8), at(-4)),
    transits: sunTransits(start, end, observer),
  };
}

export function twilightDay(
  latitude: number,
  month: 6 | 12,
  longitude = 0,
  timeZone = "UTC",
) {
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    ![6, 12].includes(month)
  ) {
    throw new RangeError(
      "Choose a latitude from 90°S to 90°N and June or December.",
    );
  }
  const start = startOfZonedDay(
    timeZone,
    new Date(Date.UTC(2026, month - 1, 21, 12) - (longitude / 360) * DAY_MS),
  );
  const end = new Date(start.getTime() + DAY_MS);
  const observer = { latitudeDeg: latitude, longitudeDeg: longitude };
  const crossings = sunEvents(start, end, observer).flatMap(({ time, kind }) =>
    kind === "transit" ? [] : [{ time, transition: TRANSITIONS[kind] }],
  );
  // At these solstice dates/latitudes, a whole day without any crossing is polar
  // daylight. The altitude check also distinguishes darkness without inventing a rise.
  let stage: number = crossings.length
    ? crossings[0]!.transition[0]
    : sunAltAz(start, observer).altDeg > 0
      ? 0
      : 4;
  let from = 0;
  const bands: { from: number; to: number; stage: number }[] = [];
  for (const event of crossings) {
    const to = (event.time.getTime() - start.getTime()) / 3_600_000;
    if (to > from) bands.push({ from, to, stage });
    from = to;
    stage = event.transition[1];
  }
  if (from < 24) bands.push({ from, to: 24, stage });
  const hour = (t: Date) => (t.getTime() - start.getTime()) / 3_600_000;
  const span = (s: SunSpan) => ({
    from: hour(s.from),
    to: hour(s.to),
    morning: s.morning,
  });
  const extra = sunHours(start, end, observer);
  return {
    start,
    bands,
    golden: extra.golden.map(span),
    blue: extra.blue.map(span),
    transits: extra.transits.map((t) => ({ hour: hour(t.time), kind: t.kind })),
  };
}

export function sunYear(observer: Observer, year = 2026) {
  if (!Number.isInteger(year) || year < 1951 || year > 2099)
    throw new RangeError("Choose a year from 1951 to 2099.");
  const start = Date.UTC(year, 0, 1);
  const count = (Date.UTC(year + 1, 0, 1) - start) / DAY_MS;
  // Same UTC time each day, near local mean noon. No daylight-saving jump.
  return Array.from({ length: count }, (_, day) => {
    const time = new Date(
      start + (day + 0.5 - observer.longitudeDeg / 360) * DAY_MS,
    );
    return { time, ...sunAltAz(time, observer) };
  });
}

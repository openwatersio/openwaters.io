import {
  moonIllumination,
  searchMoonPhases,
  sunAltAz,
  sunEvents,
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
  return { start, bands };
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

import {
  planetAltAz,
  planetEvents,
  planetHeliocentricPosition,
  planetPosition,
  sunAltAz,
  sunEvents,
  type Planet,
} from "@openwaters/almanac";
import type { Place } from "./LocationPicker.tsx";
import { DAY_MS, startOfZonedDay } from "./time.ts";

export const PLANETS = [
  { id: "mercury", name: "Mercury", color: "#c4c8d0" },
  { id: "venus", name: "Venus", color: "#f3d68a" },
  { id: "mars", name: "Mars", color: "#ff947d" },
  { id: "jupiter", name: "Jupiter", color: "#e5b88e" },
  { id: "saturn", name: "Saturn", color: "#b8a7ef" },
] as const;

export function planetNight(date: string, place: Place) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date < "1951-01-01" ||
    date > "2099-12-30" ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new RangeError("Choose a date from 1951 through 2099.");
  const observer = { latitudeDeg: place.lat, longitudeDeg: place.lon };
  const seed = new Date(
    Date.parse(`${date}T12:00:00Z`) - (place.lon / 360) * DAY_MS,
  );
  const midnight = startOfZonedDay(place.tz, seed);
  const noon = new Date(midnight.getTime() + 12 * 3_600_000);
  const events = sunEvents(
    noon,
    new Date(noon.getTime() + 2 * DAY_MS),
    observer,
  );
  const sunset = events.find(
    (e) => e.kind === "set" && e.time.getTime() < noon.getTime() + DAY_MS,
  )?.time;
  const sunrise =
    sunset && events.find((e) => e.kind === "rise" && e.time > sunset)?.time;
  const start = sunset ?? noon;
  const end = sunrise ?? new Date(start.getTime() + DAY_MS);
  const samples = Array.from({ length: 145 }, (_, i) => {
    const time = new Date(
      start.getTime() + ((end.getTime() - start.getTime()) * i) / 144,
    );
    return {
      time,
      sun: sunAltAz(time, observer).altDeg,
      altitudes: PLANETS.map((p) => planetAltAz(p.id, time, observer).altDeg),
    };
  });
  return {
    start,
    end,
    samples,
    polar: !sunset
      ? samples.every((s) => s.sun > 0)
        ? "The Sun stays above the horizon."
        : "There is no sunset on this date. A full 24 hours is shown."
      : !sunrise
        ? "There is no following sunrise in this window. A full 24 hours is shown."
        : "",
    events: PLANETS.map((p) => planetEvents(p.id, start, end, observer)),
  };
}

export const WANDER_EXAMPLES = {
  mars: { name: "Mars", start: "2022-09-01", end: "2023-03-01" },
  jupiter: { name: "Jupiter", start: "2024-07-01", end: "2025-04-01" },
  saturn: { name: "Saturn", start: "2024-04-01", end: "2025-01-01" },
} as const;

export function wanderTrack(planet: keyof typeof WANDER_EXAMPLES) {
  const example = WANDER_EXAMPLES[planet];
  const start = Date.parse(`${example.start}T00:00:00Z`);
  const end = Date.parse(`${example.end}T00:00:00Z`);
  let previous = 0;
  return Array.from(
    { length: Math.round((end - start) / DAY_MS) + 1 },
    (_, i) => {
      const time = new Date(start + i * DAY_MS);
      const position = planetPosition(planet, time);
      const ra =
        i === 0
          ? position.raDeg
          : previous +
            (((((position.raDeg - previous) % 360) + 540) % 360) - 180);
      previous = ra;
      return {
        time,
        ra,
        dec: position.decDeg,
        earth: planetHeliocentricPosition("earth", time),
        planet: planetHeliocentricPosition(planet as Planet, time),
      };
    },
  );
}

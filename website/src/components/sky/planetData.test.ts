import { test } from "node:test";
import assert from "node:assert/strict";
import { planetNight, wanderTrack, WANDER_EXAMPLES } from "./planetData.ts";

const salish = {
  label: "Salish Sea",
  lat: 48.5,
  lon: -123,
  tz: "America/Vancouver",
};
test("night spans sunset to the following sunrise with finite planet samples", () => {
  const night = planetNight("2026-10-09", salish);
  assert.equal(night.polar, "");
  assert.ok(night.end > night.start);
  assert.equal(
    night.start.toLocaleDateString("en-CA", { timeZone: salish.tz }),
    "2026-10-09",
  );
  assert.ok(Math.abs(night.samples[0]!.sun) < 2);
  assert.ok(Math.abs(night.samples.at(-1)!.sun) < 2);
  assert.ok(
    night.samples.every(
      (s) => s.altitudes.length === 5 && s.altitudes.every(Number.isFinite),
    ),
  );
});
test("polar daylight gives an explicit full-day fallback; invalid dates fail", () => {
  const night = planetNight("2026-06-21", {
    label: "Tromsø",
    lat: 69.65,
    lon: 18.96,
    tz: "Europe/Oslo",
  });
  assert.equal(night.polar, "The Sun stays above the horizon.");
  assert.equal(night.end.getTime() - night.start.getTime(), 86400000);
  for (const date of ["", "2026-02-30", "1949-12-31"])
    assert.throws(() => planetNight(date, salish), RangeError);
});
test("every preset includes direct and retrograde motion with continuous right ascension", () => {
  for (const planet of Object.keys(
    WANDER_EXAMPLES,
  ) as (keyof typeof WANDER_EXAMPLES)[]) {
    const track = wanderTrack(planet);
    const deltas = track.slice(1).map((p, i) => p.ra - track[i]!.ra);
    assert.ok(
      deltas.some((d) => d < 0),
      planet,
    );
    assert.ok(
      deltas.some((d) => d > 0),
      planet,
    );
    assert.ok(
      deltas.every((d) => Math.abs(d) < 2),
      planet,
    );
  }
});

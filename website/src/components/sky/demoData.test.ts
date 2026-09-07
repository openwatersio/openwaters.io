import assert from "node:assert/strict";
import { test } from "node:test";
import { moonMonth, twilightDay, sunYear } from "./demoData.ts";

test("Moon filmstrip respects month lengths, phase instants and supported dates", () => {
  const leap = moonMonth("2028-02");
  assert.equal(leap.days.length, 29);
  assert.equal(
    leap.days.at(-1)!.time.toISOString(),
    "2028-02-29T12:00:00.000Z",
  );
  assert.equal(moonMonth("2026-02").days.length, 28);
  assert.equal(moonMonth("2100-12").days.length, 31);
  for (const phase of leap.quarters) {
    assert.ok(phase.time >= leap.start && phase.time < leap.end);
  }
  assert.ok(leap.quarters.some((phase) => phase.phase === "full"));
  for (const invalid of ["", "2026-13", "1949-12", "2101-01"]) {
    assert.throws(() => moonMonth(invalid), RangeError);
  }
});

test("location changes local twilight and annual Sun positions without DST jumps", () => {
  const salish = { latitudeDeg: 48.5, longitudeDeg: -123 };
  const north = sunYear(salish, 2028);
  const south = sunYear({ latitudeDeg: -33.87, longitudeDeg: 151.21 }, 2028);
  assert.equal(north.length, 366);
  assert.ok(north[180]!.altDeg > north[0]!.altDeg);
  assert.ok(south[180]!.altDeg < south[0]!.altDeg);
  for (let i = 1; i < north.length; i++) {
    assert.equal(
      north[i]!.time.getTime() - north[i - 1]!.time.getTime(),
      86400000,
    );
  }
  const local = twilightDay(48.5, 6, -123, "America/Vancouver");
  assert.equal(local.start.toISOString(), "2026-06-21T07:00:00.000Z");
  assert.notDeepEqual(local.bands, twilightDay(48.5, 6).bands);
});

test("Twilight bands cover the day without gaps, including polar day and night", () => {
  for (const latitude of [-80, 0, 48.5, 80]) {
    for (const month of [6, 12] as const) {
      const { bands } = twilightDay(latitude, month);
      assert.equal(bands[0]!.from, 0);
      assert.equal(bands.at(-1)!.to, 24);
      bands.forEach((band, i) => {
        assert.ok(band.to > band.from);
        if (i) assert.equal(band.from, bands[i - 1]!.to);
      });
    }
  }
  assert.deepEqual(twilightDay(80, 6).bands, [{ from: 0, to: 24, stage: 0 }]);
  assert.ok(twilightDay(80, 12).bands.every((band) => band.stage !== 0));
  assert.deepEqual(twilightDay(-80, 12).bands, [{ from: 0, to: 24, stage: 0 }]);
  assert.equal(
    new Set(twilightDay(0, 6).bands.map((band) => band.stage)).size,
    5,
  );
});

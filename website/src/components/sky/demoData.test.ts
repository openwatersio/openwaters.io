import assert from "node:assert/strict";
import { test } from "node:test";
import { sunAltAz } from "@openwaters/almanac";
import { moonMonth, sunHours, twilightDay, sunYear } from "./demoData.ts";

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

test("golden and blue hour sit at their altitudes, morning and evening", () => {
  const salish = { latitudeDeg: 48.5, longitudeDeg: -123 };
  const start = new Date("2026-06-21T07:00:00Z");
  const end = new Date("2026-06-22T07:00:00Z");
  const { golden, blue, transits } = sunHours(start, end, salish);
  assert.deepEqual(
    golden.map((s) => s.morning),
    [true, false],
  );
  assert.deepEqual(
    blue.map((s) => s.morning),
    [true, false],
  );
  const alt = (t: Date) => sunAltAz(t, salish).altDeg;
  // sunAltAz is refracted; the crossings are geometric, so allow refraction.
  for (const s of golden) {
    const mid = new Date((s.from.getTime() + s.to.getTime()) / 2);
    assert.ok(alt(mid) > 0 && alt(mid) < 6.5, `${alt(mid)}`);
    assert.ok(s.to.getTime() - s.from.getTime() < 60 * 60_000);
  }
  for (const s of blue) {
    const mid = new Date((s.from.getTime() + s.to.getTime()) / 2);
    assert.ok(alt(mid) < -3.8 && alt(mid) > -8, `${alt(mid)}`);
  }
  // Morning blue hour comes before morning golden hour, evening after.
  assert.ok(blue[0]!.to < golden[0]!.from);
  assert.ok(blue[1]!.from > golden[1]!.to);
  assert.deepEqual(
    transits.map((t) => t.kind),
    ["lower", "upper"],
  );
});

test("the ribbon's golden hour clips at midnight under the midnight Sun", () => {
  // Tromsø: the Sun dips to about +3° at midnight, inside golden hour.
  const { golden, blue, bands } = twilightDay(69.65, 6, 18.96, "Europe/Oslo");
  assert.deepEqual(bands, [{ from: 0, to: 24, stage: 0 }]);
  assert.equal(blue.length, 0);
  assert.equal(golden[0]!.from, 0);
  assert.equal(golden.at(-1)!.to, 24);
  assert.ok(golden[0]!.morning && !golden.at(-1)!.morning);
  // Polar night: no golden hour at all, blue hour around noon.
  const winter = twilightDay(69.65, 12, 18.96, "Europe/Oslo");
  assert.equal(winter.golden.length, 0);
  assert.equal(winter.blue.length, 2);
});

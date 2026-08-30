import assert from "node:assert/strict";
import { test } from "node:test";

import { moonPath, phaseName } from "./moonPath.ts";
import { skyColor } from "./skyColor.ts";
import { eclipseAt, eclipseShade } from "./eclipseShade.ts";
import { altitudeToY, azimuthToX, centerAzimuthDeg } from "./projection.ts";

const sweeps = (d: string) =>
  [...d.matchAll(/A [\d.]+ [\d.]+ 0 0 (\d)/g)].map((m) => m[1]);

const terminatorRx = (d: string) =>
  Number(d.split("A")[2]!.trim().split(" ")[0]);

test("moonPath: terminator collapses to a straight line at the quarters", () => {
  assert.equal(terminatorRx(moonPath(0, 0, 10, 0.5, true)), 0);
  assert.equal(terminatorRx(moonPath(0, 0, 10, 0.5, false)), 0);
});

test("moonPath: terminator reaches the limb at new and full", () => {
  assert.equal(terminatorRx(moonPath(0, 0, 10, 0, true)), 10);
  assert.equal(terminatorRx(moonPath(0, 0, 10, 1, true)), 10);
});

test("moonPath: sweep flags flip across the quarter", () => {
  // Crescent and gibbous bow opposite ways; only the terminator flag moves.
  assert.deepEqual(sweeps(moonPath(0, 0, 10, 0.25, true)), ["1", "0"]);
  assert.deepEqual(sweeps(moonPath(0, 0, 10, 0.75, true)), ["1", "1"]);
});

test("moonPath: waning is the mirror image of waxing", () => {
  // Every point on the path shares the disc's vertical axis, so mirroring
  // about it leaves the coordinates alone and inverts both sweep flags.
  for (const f of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const waxing = moonPath(0, 0, 10, f, true);
    const waning = moonPath(0, 0, 10, f, false);
    assert.equal(
      waning,
      waxing.replace(/ 0 0 (\d)/g, (_, s) => ` 0 0 ${s === "1" ? 0 : 1}`),
      `phase ${f}`,
    );
  }
});

test("moonPath: fraction is clamped", () => {
  assert.equal(terminatorRx(moonPath(0, 0, 10, -0.2, true)), 10);
  assert.equal(terminatorRx(moonPath(0, 0, 10, 1.4, true)), 10);
});

test("phaseName: octants land on the right names", () => {
  assert.equal(phaseName(0), "New moon");
  assert.equal(phaseName(0.25), "First quarter");
  assert.equal(phaseName(0.5), "Full moon");
  assert.equal(phaseName(0.75), "Last quarter");
  assert.equal(phaseName(0.99), "New moon"); // wraps, never index 8
  assert.equal(phaseName(1), "New moon");
});

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
};

test("skyColor: darkens monotonically as the Sun sets", () => {
  const lums = [20, 10, 0, -6, -12, -18, -30].map(
    (alt) => luminance(skyColor(alt).top) + luminance(skyColor(alt).bottom),
  );
  for (let i = 1; i < lums.length; i++) {
    assert.ok(lums[i]! <= lums[i - 1]!, `not monotonic at index ${i}`);
  }
  assert.ok(lums[0]! > lums[lums.length - 1]!, "day is no brighter than night");
});

test("skyColor: clamps outside the anchor range", () => {
  assert.deepEqual(skyColor(60), skyColor(10));
  assert.deepEqual(skyColor(-40), skyColor(-18));
});

test("skyColor: stars rise between nautical and astronomical twilight", () => {
  assert.equal(skyColor(5).starOpacity, 0);
  assert.equal(skyColor(-6).starOpacity, 0);
  assert.equal(skyColor(-12).starOpacity, 0.5);
  assert.equal(skyColor(-18).starOpacity, 1);
  assert.equal(skyColor(-30).starOpacity, 1);
});

test("projection: the panorama centres on the transit azimuth", () => {
  assert.equal(centerAzimuthDeg(48.5), 180);
  assert.equal(centerAzimuthDeg(-41.3), 0);
  assert.equal(azimuthToX(180, 48.5), 400);
  assert.equal(azimuthToX(0, -41.3), 400);
});

test("projection: east and west swap sides with the hemisphere", () => {
  // Northern observer faces south: east is to the left, west to the right.
  assert.ok(azimuthToX(90, 48.5) < 400);
  assert.ok(azimuthToX(270, 48.5) > 400);
  // Southern observer faces north, so the Sun rises on their right.
  assert.ok(azimuthToX(90, -41.3) > 400);
  assert.ok(azimuthToX(270, -41.3) < 400);
});

test("projection: azimuth wraps without leaving the viewBox", () => {
  for (let az = 0; az < 360; az += 7) {
    const x = azimuthToX(az, 48.5);
    assert.ok(x >= 0 && x <= 800, `az ${az} → ${x}`);
  }
  // The seam sits behind a northern observer, at due north.
  assert.equal(azimuthToX(0, 48.5), 0);
  assert.ok(azimuthToX(359.9, 48.5) > 799);
});

test("projection: altitude maps horizon, zenith and the bottom of twilight", () => {
  assert.equal(altitudeToY(0), 320);
  assert.equal(altitudeToY(90), 0);
  assert.equal(altitudeToY(-18), 400);
  // Below the twilight floor a body keeps sinking rather than pinning.
  assert.ok(altitudeToY(-40) > 400);
});

// --- eclipse shading -------------------------------------------------------

const min = (n: number) => n * 60_000;
const PEAK = Date.UTC(2026, 7, 27, 21, 12);

/** A total eclipse with symmetric contacts around PEAK. */
const total = {
  kind: "total" as const,
  peak: new Date(PEAK),
  magUmbral: 1.4,
  magPenumbral: 2.4,
  p1: new Date(PEAK - min(180)),
  u1: new Date(PEAK - min(100)),
  u2: new Date(PEAK - min(40)),
  u3: new Date(PEAK + min(40)),
  u4: new Date(PEAK + min(100)),
  p4: new Date(PEAK + min(180)),
};
const partial = {
  ...total,
  kind: "partial" as const,
  magUmbral: 0.6,
  u2: null,
  u3: null,
};
const penumbral = {
  ...total,
  kind: "penumbral" as const,
  magUmbral: -0.2,
  magPenumbral: 0.5,
  u1: null,
  u2: null,
  u3: null,
  u4: null,
};

test("eclipseShade: zero outside the penumbral contacts", () => {
  for (const e of [total, partial, penumbral]) {
    assert.equal(eclipseShade(new Date(PEAK - min(181)), e), 0);
    assert.equal(eclipseShade(new Date(PEAK + min(181)), e), 0);
    assert.equal(eclipseShade(e.p1, e), 0);
    assert.equal(eclipseShade(e.p4, e), 0);
  }
});

test("eclipseShade: peaks at the magnitude the library reports", () => {
  assert.equal(eclipseShade(new Date(PEAK), total), 1);
  // partial: 0.25 + 0.75 * 0.6
  assert.ok(Math.abs(eclipseShade(new Date(PEAK), partial) - 0.7) < 1e-9);
  // penumbral: 0.25 * 0.5, and never near a total's darkness
  assert.ok(Math.abs(eclipseShade(new Date(PEAK), penumbral) - 0.125) < 1e-9);
});

test("eclipseShade: reaches the penumbral shade at first umbral contact", () => {
  assert.ok(Math.abs(eclipseShade(total.u1, total) - 0.25) < 1e-9);
  assert.ok(Math.abs(eclipseShade(total.u4, total) - 0.25) < 1e-9);
});

test("eclipseShade: symmetric about the peak", () => {
  for (const e of [total, partial, penumbral]) {
    for (const d of [10, 50, 90, 130, 170]) {
      const before = eclipseShade(new Date(PEAK - min(d)), e);
      const after = eclipseShade(new Date(PEAK + min(d)), e);
      assert.ok(Math.abs(before - after) < 1e-9, `${e.kind} at ±${d}m`);
    }
  }
});

test("eclipseShade: rises monotonically into the peak", () => {
  let prev = -1;
  for (let d = 180; d >= 0; d -= 5) {
    const s = eclipseShade(new Date(PEAK - min(d)), total);
    assert.ok(s >= prev, `dropped at -${d}m`);
    prev = s;
  }
});

test("eclipseAt: finds the covering eclipse, ignores nulls", () => {
  assert.equal(eclipseAt(new Date(PEAK), [null, total]), total);
  assert.equal(eclipseAt(new Date(PEAK + min(400)), [null, total]), null);
  assert.equal(eclipseAt(new Date(PEAK), [null, null]), null);
});

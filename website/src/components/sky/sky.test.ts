import assert from "node:assert/strict";
import { test } from "node:test";

import { moonPath, phaseName } from "./moonPath.ts";
import { skyColor } from "./skyColor.ts";
import { eclipseAt, eclipseShade, eclipseCoverage } from "./eclipseShade.ts";
import {
  DOME_WIDTH,
  HORIZON_Y,
  MAX_ALT_DEG,
  SPAN_DEG,
  altitudeToY,
  azimuthToX,
  centerAzimuthDeg,
  project,
  signedBearingDeg,
} from "./projection.ts";
import { starAltAz } from "@openwaters/almanac";
import { domeStars, driftOpacity, starRadius } from "./stars.ts";
import catalog from "./stars.json" with { type: "json" };

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

test("projection: the frame centres on the transit azimuth", () => {
  assert.equal(centerAzimuthDeg(48.5), 180);
  assert.equal(centerAzimuthDeg(-41.3), 0);
  assert.equal(azimuthToX(180, 48.5), DOME_WIDTH / 2);
  assert.equal(azimuthToX(0, -41.3), DOME_WIDTH / 2);
});

test("projection: east and west swap sides with the hemisphere", () => {
  // Northern observer faces south: east is to the left, west to the right.
  assert.ok(azimuthToX(90, 48.5) < DOME_WIDTH / 2);
  assert.ok(azimuthToX(270, 48.5) > DOME_WIDTH / 2);
  // Southern observer faces north, so the Sun rises on their right.
  assert.ok(azimuthToX(90, -41.3) > DOME_WIDTH / 2);
  assert.ok(azimuthToX(270, -41.3) < DOME_WIDTH / 2);
});

test("projection: the frame does not wrap, so it has no seam", () => {
  // The old panorama put 360° across the width, which landed its seam on the
  // celestial pole. Here the sky behind the observer leaves the viewBox and
  // stays gone rather than reappearing at the far edge.
  // The span's own edge lands exactly on the frame's edge.
  assert.ok(Math.abs(azimuthToX(180 + SPAN_DEG / 2, 48.5) - DOME_WIDTH) < 1e-9);
  // Due north is behind a northern observer: off one edge or the other, and
  // outside the frame either way. That is the sky the fixed view gives up.
  const offFrame = (x: number) => x < 0 || x > DOME_WIDTH;
  assert.ok(offFrame(azimuthToX(0, 48.5)));
  assert.ok(offFrame(azimuthToX(359.9, 48.5)));
  assert.ok(offFrame(azimuthToX(20, 48.5)));
  // Everything inside the span is inside the frame.
  for (let d = -SPAN_DEG / 2; d <= SPAN_DEG / 2; d += 7) {
    const x = azimuthToX(180 + d, 48.5);
    assert.ok(x >= 0 && x <= DOME_WIDTH, `bearing ${d} → ${x}`);
  }
});

test("projection: altitude maps the horizon and runs off the top", () => {
  assert.equal(altitudeToY(0), HORIZON_Y);
  assert.ok(altitudeToY(-18) > HORIZON_Y);
  assert.ok(altitudeToY(30) < HORIZON_Y);
  // The ceiling clears the noon Sun at every latitude the picker offers:
  // Sydney's solstice Sun is the highest of them, at 79.6°.
  assert.ok(MAX_ALT_DEG > 79.6, `ceiling ${MAX_ALT_DEG}`);
  assert.ok(altitudeToY(MAX_ALT_DEG + 1) < 0);
});

test("projection: the scale is the same on both axes, at every altitude", () => {
  // The property the whole projection exists for. Conformal means a degree of
  // sky measures the same across as it does up, wherever you stand — so shapes
  // survive. The projection this replaced failed exactly here, running 0.63x
  // at the horizon and 35.8x near the zenith.
  for (const alt of [0, 15, 30, 45, 60, 75]) {
    const d = 0.01;
    // A degree of azimuth subtends cos(altitude) degrees of true sky.
    const across =
      (azimuthToX(180 + d, 48.5) - azimuthToX(180, 48.5)) /
      (d * Math.cos((alt * Math.PI) / 180));
    const up = (altitudeToY(alt) - altitudeToY(alt + d)) / d;
    assert.ok(
      Math.abs(across / up - 1) < 0.01,
      `altitude ${alt}°: ${(across / up).toFixed(3)}x`,
    );
  }
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

test("eclipse illustration holds full coverage throughout totality", () => {
  assert.equal(eclipseCoverage(total.u1, total), 0);
  assert.equal(eclipseCoverage(total.u2, total), 1);
  assert.equal(eclipseCoverage(total.peak, total), 1);
  assert.equal(eclipseCoverage(total.u3, total), 1);
  assert.equal(eclipseCoverage(total.u4, total), 0);
  assert.equal(eclipseCoverage(partial.peak, partial), 0.6);
  assert.equal(eclipseCoverage(penumbral.peak, penumbral), 0);
});

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

// The Big Dipper: seven stars everyone can draw from memory, circumpolar at
// 48.5°N so a single day walks the whole asterism from the horizon to high
// overhead and right around the pole. If a projection mangles shape or tears
// at a seam, it shows up here.
const DIPPER: [number, number][] = [
  [165.932, 61.751],
  [165.46, 56.382],
  [178.458, 53.695],
  [183.857, 57.033],
  [193.507, 55.96],
  [200.981, 54.925],
  [206.885, 49.313],
];
const SALISH = { latitudeDeg: 48.5, longitudeDeg: -123 };

const DEG = Math.PI / 180;
const unit = (p: { altDeg: number; azDeg: number }) => [
  Math.cos(p.altDeg * DEG) * Math.cos(p.azDeg * DEG),
  Math.cos(p.altDeg * DEG) * Math.sin(p.azDeg * DEG),
  Math.sin(p.altDeg * DEG),
];
const trueSeparation = (
  a: { altDeg: number; azDeg: number },
  b: { altDeg: number; azDeg: number },
) => {
  const [u, v] = [unit(a), unit(b)];
  return (
    Math.acos(Math.min(1, u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!)) / DEG
  );
};

test("stars: the field is the real sky, not decoration", () => {
  const observer = SALISH;
  const midnight = new Date("2026-10-15T08:00:00Z");
  const stars = domeStars(midnight, observer);

  assert.ok(stars.length > 50, `only ${stars.length} stars above the horizon`);
  assert.ok(stars.every((s) => s.up));
  // Half the sky, give or take: a field ignoring the horizon would be all 288.
  assert.ok(stars.length < 288);

  // Polaris sits a degree off the pole, so it holds the observer's own
  // latitude as an altitude, all night.
  const polaris = starAltAz(37.955, 89.264, midnight, observer);
  assert.ok(Math.abs(polaris.altDeg - 48.5) < 1.5, `Polaris ${polaris.altDeg}`);

  // Twelve hours on the sky has turned, and Sydney is a different sky entirely.
  assert.notDeepEqual(
    stars,
    domeStars(new Date("2026-10-15T20:00:00Z"), observer),
  );
  assert.notDeepEqual(
    stars,
    domeStars(midnight, { latitudeDeg: -33.87, longitudeDeg: 151.21 }),
  );
});

test("stars: the Dipper is drawn with no distortion but the documented one", () => {
  // The regression this projection exists for. The old panorama scored 73x on
  // the spread below against a prediction of about 1.4x, and tore the asterism
  // across both edges six hours in every 24.
  //
  // Mercator magnifies with altitude, by exactly sec(altitude) — the reason
  // Greenland looks large on a world map. So the spread of drawn scale across
  // the asterism is not 1.00x, and should not be: it should be precisely the
  // secant ratio between its lowest and highest star, and nothing more. Any
  // shear or tear would push it off that prediction immediately.
  let hoursChecked = 0;
  for (let hour = 0; hour < 24; hour++) {
    const t = new Date(Date.UTC(2026, 9, 15, hour));
    const sky = DIPPER.map(([ra, dec]) => starAltAz(ra, dec, t, SALISH));
    if (sky.some((p) => p.altDeg < 5)) continue;
    // Only what the frame actually draws. At this latitude the Dipper spends
    // part of the day in the 60° behind the observer, which the fixed south
    // view leaves out, and part above the frame's ceiling.
    if (
      sky.some((p) => Math.abs(signedBearingDeg(p.azDeg, 48.5)) > SPAN_DEG / 2)
    )
      continue;
    if (sky.some((p) => p.altDeg > MAX_ALT_DEG)) continue;
    hoursChecked++;

    const scales: number[] = [];
    for (let i = 0; i < sky.length - 1; i++) {
      const [a, b] = [project(sky[i]!, 48.5), project(sky[i + 1]!, 48.5)];
      scales.push(
        Math.hypot(a.x - b.x, a.y - b.y) / trueSeparation(sky[i]!, sky[i + 1]!),
      );
    }
    const spread = Math.max(...scales) / Math.min(...scales);
    const alts = sky.map((p) => p.altDeg);
    const rad = (d: number) => (d * Math.PI) / 180;
    const predicted =
      Math.cos(rad(Math.min(...alts))) / Math.cos(rad(Math.max(...alts)));
    assert.ok(
      spread <= predicted * 1.02,
      `hour ${hour}: drawn ${spread.toFixed(2)}x against ${predicted.toFixed(2)}x predicted`,
    );
  }
  assert.ok(hoursChecked >= 4, `only ${hoursChecked} hours in frame`);
});

test("stars: nothing visible travels against the Sun", () => {
  // The whole point of the drift fade. Across a day, at three latitudes, every
  // star still drawn must track the same way the Sun and Moon do. Stars beyond
  // the celestial pole run the other way, and on a panorama that reads as a
  // patch of sky sliding backwards.
  for (const [lat, lon] of [
    [48.5, -123],
    [-33.87, 151.21],
    [10, 0],
  ] as const) {
    const observer = { latitudeDeg: lat, longitudeDeg: lon };
    let checked = 0;
    for (let minute = 0; minute < 1440; minute += 20) {
      const t0 = new Date(Date.UTC(2026, 9, 15, 0, minute));
      const t1 = new Date(t0.getTime() + 120_000);
      for (const [ra, dec] of catalog as [number, number, number][]) {
        const a0 = starAltAz(ra, dec, t0, observer);
        if (a0.altDeg < 0) continue;
        if (driftOpacity(a0.altDeg, a0.azDeg, lat) < 0.5) continue;
        if (Math.abs(signedBearingDeg(a0.azDeg, lat)) > SPAN_DEG / 2) continue;
        const a1 = starAltAz(ra, dec, t1, observer);
        const dx = azimuthToX(a1.azDeg, lat) - azimuthToX(a0.azDeg, lat);
        if (Math.abs(dx) > 50) continue; // stepped out of the frame
        checked++;
        // North of the equator the Sun tracks right; south of it, left.
        assert.ok(
          lat >= 0 ? dx >= -0.01 : dx <= 0.01,
          `latitude ${lat}: a visible star drifted ${dx.toFixed(3)}px the wrong way from altitude ${a0.altDeg.toFixed(1)}°, azimuth ${a0.azDeg.toFixed(1)}°`,
        );
      }
    }
    assert.ok(checked > 5000, `latitude ${lat}: only ${checked} stars checked`);
  }
});

test("driftOpacity: fades only beyond the pole, and only above it", () => {
  // Below the pole's own altitude nothing reverses, whatever the bearing.
  assert.equal(driftOpacity(40, 0, 48.5), 1);
  assert.equal(driftOpacity(48, 10, 48.5), 1);
  // Above it, the sky within the elongation boundary of the pole is cut.
  assert.equal(driftOpacity(70, 0, 48.5), 0);
  // Dubhe's greatest elongation: 45.9° from north at altitude 58.4°.
  assert.equal(driftOpacity(58.4, 30, 48.5), 0);
  assert.ok(driftOpacity(58.4, 60, 48.5) > 0.9);
  // The southern hemisphere reverses about its own pole, due south.
  assert.equal(driftOpacity(70, 180, -33.87), 0);
  assert.equal(driftOpacity(70, 0, -33.87), 1);
});

test("starRadius: brighter stars draw bigger", () => {
  assert.ok(starRadius(-1.44) > starRadius(0.03));
  assert.ok(starRadius(0.03) > starRadius(3.5));
  assert.ok(starRadius(3.5) > 0);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { moonPath, phaseName } from "./moonPath.ts";
import { skyColor } from "./skyColor.ts";
import { eclipseAt, eclipseShade, eclipseCoverage } from "./eclipseShade.ts";
import { CENTER, HORIZON_R, project, zenithRadius } from "./projection.ts";
import { starAltAz } from "@openwaters/almanac";
import { domeStars, starRadius } from "./stars.ts";

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

test("projection: the zenith is the centre and the horizon is the rim", () => {
  assert.equal(zenithRadius(90), 0);
  assert.equal(Math.round(zenithRadius(0)), HORIZON_R);
  // Below the horizon is outside the disc, so the clip hides it.
  assert.ok(zenithRadius(-1) > HORIZON_R);
});

test("projection: north is up and east is on the left", () => {
  const at = (azDeg: number) => project({ altDeg: 0, azDeg });
  assert.ok(at(0).y < CENTER - HORIZON_R + 1);
  assert.ok(at(180).y > CENTER + HORIZON_R - 1);
  // East on the left: a planisphere is read looking up, not down.
  assert.ok(at(90).x < CENTER);
  assert.ok(at(270).x > CENTER);
});

test("projection: altitude alone fixes distance from the centre", () => {
  const r = (azDeg: number) => {
    const p = project({ altDeg: 30, azDeg });
    return Math.hypot(p.x - CENTER, p.y - CENTER);
  };
  assert.ok(Math.abs(r(0) - r(137)) < 1e-9);
  assert.ok(Math.abs(r(0) - r(300)) < 1e-9);
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

  // Polaris sits a degree off the pole, so its distance from the centre of the
  // disc is the observer's own latitude read as an altitude.
  const polaris = project(starAltAz(37.955, 89.264, midnight, observer));
  const r = Math.hypot(polaris.x - CENTER, polaris.y - CENTER);
  assert.ok(Math.abs(r - zenithRadius(48.5)) < 6, `Polaris at r=${r}`);

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

test("stars: the Dipper keeps its shape all the way round the pole", () => {
  // The regression this projection exists for. The old panorama scored 73x
  // here, and tore the asterism across both edges six hours in every 24.
  let worstShape = 1;
  let worstGap = 0;
  for (let hour = 0; hour < 24; hour++) {
    const t = new Date(Date.UTC(2026, 9, 15, hour));
    const sky = DIPPER.map(([ra, dec]) => starAltAz(ra, dec, t, SALISH));
    if (sky.some((p) => p.altDeg < 5)) continue;
    const scales: number[] = [];
    for (let i = 0; i < sky.length - 1; i++) {
      const [a, b] = [project(sky[i]!), project(sky[i + 1]!)];
      const px = Math.hypot(a.x - b.x, a.y - b.y);
      scales.push(px / trueSeparation(sky[i]!, sky[i + 1]!));
      worstGap = Math.max(worstGap, px);
    }
    worstShape = Math.max(
      worstShape,
      Math.max(...scales) / Math.min(...scales),
    );
  }
  assert.ok(worstShape < 1.5, `shape distorted ${worstShape.toFixed(2)}x`);
  // A 10° gap between neighbours; a seam tear would throw this across the disc.
  assert.ok(
    worstGap < HORIZON_R / 2,
    `neighbours ${worstGap.toFixed(0)}px apart`,
  );
});

test("starRadius: brighter stars draw bigger", () => {
  assert.ok(starRadius(-1.44) > starRadius(0.03));
  assert.ok(starRadius(0.03) > starRadius(3.5));
  assert.ok(starRadius(3.5) > 0);
});

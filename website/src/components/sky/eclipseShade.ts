import type { LunarEclipse } from "@openwaters/almanac";

/**
 * How dark the Moon is at an instant during a lunar eclipse, 0 to 1.
 *
 * Almanac reports contact times and the magnitude at greatest eclipse; it has
 * no "shadow position at time t" call. So this interpolates *brightness only*
 * between contacts the library did compute, and never invents shadow geometry
 * to draw. The endpoints are real; the curve between them is a straight line.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Linear ramp from `a`→`b` as `t` goes `ta`→`tb`. */
function ramp(t: number, ta: number, tb: number, a: number, b: number): number {
  if (tb <= ta) return b;
  return a + (b - a) * clamp01((t - ta) / (tb - ta));
}

/** How dark the penumbra alone gets, by first umbral contact. */
const PENUMBRAL_SHADE = 0.25;

/** Shade at greatest eclipse, from the kind and magnitude the library reports. */
function peakShade(eclipse: LunarEclipse): number {
  switch (eclipse.kind) {
    case "total":
      return 1;
    case "partial":
      // magUmbral is the fraction of the Moon's diameter inside the umbra.
      return (
        PENUMBRAL_SHADE + (1 - PENUMBRAL_SHADE) * clamp01(eclipse.magUmbral)
      );
    case "penumbral":
      // Never reaches the umbra, so it stays a dimming scaled by how deeply
      // it entered the penumbra.
      return PENUMBRAL_SHADE * clamp01(eclipse.magPenumbral);
  }
}

export function eclipseShade(at: Date, eclipse: LunarEclipse): number {
  const peak = eclipse.peak.getTime();
  const t = at.getTime();
  if (t <= eclipse.p1.getTime() || t >= eclipse.p4.getTime()) return 0;

  // Fold the second half onto the first by reflecting about the peak, so one
  // ramp definition covers both. Eclipse contacts are near enough symmetric in
  // time for a brightness curve; the contact instants themselves stay exact.
  const mirror = (ms: number) => 2 * peak - ms;
  const rising = t <= peak;
  const now = rising ? t : mirror(t);
  const first = rising ? eclipse.p1 : eclipse.p4;
  const umbral = rising ? eclipse.u1 : eclipse.u4;

  const start = rising ? first.getTime() : mirror(first.getTime());
  const max = peakShade(eclipse);

  // Penumbral eclipses have no umbral contact to break the ramp at.
  if (!umbral) return ramp(now, start, peak, 0, max);

  const u = rising ? umbral.getTime() : mirror(umbral.getTime());
  return now <= u
    ? ramp(now, start, u, 0, PENUMBRAL_SHADE)
    : ramp(now, u, peak, PENUMBRAL_SHADE, max);
}

/** The eclipse covering this instant, if either does. */
export function eclipseAt(
  at: Date,
  eclipses: (LunarEclipse | null)[],
): LunarEclipse | null {
  for (const e of eclipses) {
    if (e && at > e.p1 && at < e.p4) return e;
  }
  return null;
}

export const KIND_LABEL: Record<LunarEclipse["kind"], string> = {
  total: "Total",
  partial: "Partial",
  penumbral: "Penumbral",
};

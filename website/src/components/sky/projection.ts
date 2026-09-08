/**
 * Maps an alt/az pair onto the sky dome.
 *
 * Stereographic, centred on the zenith: the whole visible hemisphere on one
 * disc, with the horizon as its rim. Stereographic is conformal, so a
 * constellation keeps its shape wherever it sits — the reason paper
 * planispheres have used it for centuries.
 *
 * The projection this replaced mapped azimuth to x and altitude to y on a
 * rectangle. That is fine for a lone body tracing an arc, which is all the Sun
 * and Moon ever did here, but it fails on a star field two ways. Horizontal
 * scale runs as 1/cos(altitude), so the zenith — a single point of sky —
 * smears across the full width. And a rectangle has to wrap somewhere: centred
 * on the transit azimuth, the seam lands on the celestial pole, tearing the
 * circumpolar constellations across both edges. A disc has no seam to place.
 */

/** Square viewBox: the dome is a circle, not a band. */
export const DOME_SIZE = 440;
export const CENTER = DOME_SIZE / 2;
/** Radius of the horizon circle. */
export const HORIZON_R = 200;
/**
 * Altitudes below this are pushed outside the viewBox rather than drawn.
 * Matches the bottom of astronomical twilight, so the Sun stays placed
 * through the darkening it causes.
 */
export const MIN_ALT_DEG = -18;

const DEG = Math.PI / 180;

/**
 * Distance from the centre of the disc.
 *
 * `tan(zenithDistance / 2)` is the stereographic radius, scaled so the horizon
 * lands exactly on `HORIZON_R` — at the horizon the zenith distance is 90°,
 * and tan(45°) is 1.
 */
export function zenithRadius(altDeg: number): number {
  const alt = Math.max(MIN_ALT_DEG, altDeg);
  return HORIZON_R * Math.tan(((90 - alt) / 2) * DEG);
}

export interface DomePoint {
  x: number;
  y: number;
  /** True when the body's centre is at or above the horizon. */
  up: boolean;
}

/**
 * North at the top, east on the left: the planisphere convention, and what you
 * get holding a chart overhead to compare it with the sky. It reads mirrored
 * against a map for the same reason — you are looking up, not down.
 *
 * Both hemispheres use it unchanged. The old panorama had to swing its centre
 * and its left/right sense with latitude to keep the Sun's arc unbroken; a
 * dome shows every azimuth at once and needs neither.
 */
export function project(altAz: { altDeg: number; azDeg: number }): DomePoint {
  const r = zenithRadius(altAz.altDeg);
  return {
    x: CENTER - r * Math.sin(altAz.azDeg * DEG),
    y: CENTER - r * Math.cos(altAz.azDeg * DEG),
    up: altAz.altDeg >= 0,
  };
}

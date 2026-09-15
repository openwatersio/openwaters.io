/**
 * Maps an alt/az pair onto the sky panorama.
 *
 * A conformal cylindrical projection — Mercator's, with altitude standing in
 * for latitude — at one scale on both axes, so a constellation keeps its shape
 * wherever it sits in the frame, and the Sun and Moon enter at one edge, arc
 * over, and leave at the other.
 *
 * Not a linear altitude axis (plate carrée): horizontal scale would run as
 * 1/cos(altitude), smearing the zenith across the full width, and a 360° frame
 * puts its seam on the celestial pole, tearing circumpolar constellations.
 * Hence the shared scale and a window narrower than a full turn.
 *
 * Not a stereographic dome either: a body arcing across a horizon reads as
 * travel, while on a disc the same motion reads as a wobble near the rim. The
 * frame stays a fixed horizon facing the Sun's transit, with no panning.
 *
 * The accepted cost is Mercator's magnification by sec(altitude), which changes
 * size, not shape. The Big Dipper test in sky.test.ts bounds the drawn scale by
 * that secant ratio, so shear or a tear fails it.
 *
 * Deliberately unlike slackwater-ios's `skyPoint`, whose frame is a timeline
 * (each body's rise-to-set arc stretched across the width), not a compass.
 * Don't unify them.
 */

export const DOME_WIDTH = 800;
export const DOME_HEIGHT = 480;
/** Baseline the horizon is drawn on. */
export const HORIZON_Y = 400;

/**
 * How much of the compass the frame holds, centred on the transit azimuth.
 *
 * Under a full turn on purpose: a window that wraps has to put its seam
 * somewhere, and every candidate is somewhere a constellation lives. At 300°
 * the 60° behind the observer is simply absent — no seam, no tear — and the
 * Sun clears the edges at every latitude these demos offer, solstices included.
 */
export const SPAN_DEG = 300;

const DEG = Math.PI / 180;
/**
 * Pixels per radian, shared by both axes. Sharing it is what makes the
 * projection conformal: change one axis alone and shapes shear.
 */
const SCALE = DOME_WIDTH / (SPAN_DEG * DEG);

/**
 * Altitudes are cut off here, where the frame runs out of height.
 *
 * Mercator puts the zenith at infinity, so some ceiling is unavoidable; the
 * frame is sized so this one clears the noon Sun at every latitude in the
 * picker. ponytail: the Moon reaches 85° in the subtropics and would ride
 * above the top for an hour or so. Raise DOME_HEIGHT if anyone notices.
 */
export const MAX_ALT_DEG =
  (Math.atan(Math.exp(HORIZON_Y / SCALE)) / DEG - 45) * 2;
/** Below this a body is far enough under the horizon to stop tracking it. */
export const MIN_ALT_DEG = -40;

/**
 * The azimuth placed at the centre of the frame: due south in the northern
 * hemisphere, due north in the southern — the direction the Sun transits.
 *
 * The left/right sense reverses with the hemisphere, which is correct: an
 * observer facing north sees the Sun rise on their right.
 */
export function centerAzimuthDeg(latitudeDeg: number): number {
  return latitudeDeg >= 0 ? 180 : 0;
}

/** Signed bearing away from the centre of the frame, in (-180, 180]. */
export function signedBearingDeg(azDeg: number, latitudeDeg: number): number {
  const offset = azDeg - centerAzimuthDeg(latitudeDeg);
  return ((((offset + 180) % 360) + 360) % 360) - 180;
}

/**
 * Horizontal position. Linear in bearing and deliberately unwrapped: sky
 * behind the observer lands outside the viewBox rather than reappearing at the
 * far edge, which is what makes the frame seamless.
 */
export function azimuthToX(azDeg: number, latitudeDeg: number): number {
  return DOME_WIDTH / 2 + signedBearingDeg(azDeg, latitudeDeg) * DEG * SCALE;
}

/**
 * Vertical position, through the Mercator term. Not clamped at the top, so a
 * body above `MAX_ALT_DEG` returns a negative y and is genuinely off the frame
 * rather than pinned to its edge.
 */
export function altitudeToY(altDeg: number): number {
  const alt = Math.max(MIN_ALT_DEG, altDeg);
  return HORIZON_Y - SCALE * Math.log(Math.tan(Math.PI / 4 + (alt * DEG) / 2));
}

export interface DomePoint {
  x: number;
  y: number;
  /** True when the body's centre is at or above the horizon. */
  up: boolean;
}

export function project(
  altAz: { altDeg: number; azDeg: number },
  latitudeDeg: number,
): DomePoint {
  return {
    x: azimuthToX(altAz.azDeg, latitudeDeg),
    y: altitudeToY(altAz.altDeg),
    up: altAz.altDeg >= 0,
  };
}

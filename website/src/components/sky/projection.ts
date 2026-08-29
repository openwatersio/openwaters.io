/**
 * Maps an alt/az pair onto the sky-dome viewBox.
 *
 * The dome is a full 360° panorama, not a half-sky arc, so a body's horizontal
 * position is its real azimuth rather than a fraction of the day.
 */

export const DOME_WIDTH = 800;
export const DOME_HEIGHT = 400;
/** Baseline the horizon is drawn on. */
export const HORIZON_Y = 320;
/** Altitudes below this are off the bottom of the viewBox. */
export const MIN_ALT_DEG = -18;
export const MAX_ALT_DEG = 90;

/**
 * The azimuth placed at the centre of the panorama: due south in the northern
 * hemisphere, due north in the southern — the direction the Sun transits.
 * Centring there keeps the whole daily arc in one unbroken sweep with the seam
 * behind the observer. Centring on 180° unconditionally would park a southern
 * observer's noon Sun at the panorama's edge and split its arc across both
 * ends.
 *
 * The left/right sense reverses with the hemisphere, which is correct: an
 * observer facing north sees the Sun rise on their right.
 */
export function centerAzimuthDeg(latitudeDeg: number): number {
  return latitudeDeg >= 0 ? 180 : 0;
}

/**
 * Horizontal position, wrapped so that the centre azimuth lands mid-viewBox
 * and the seam falls behind the observer.
 */
export function azimuthToX(azDeg: number, latitudeDeg: number): number {
  const offset = azDeg - centerAzimuthDeg(latitudeDeg);
  // Into (-180, 180]: the signed bearing away from the centre.
  const signed = ((((offset + 180) % 360) + 360) % 360) - 180;
  return DOME_WIDTH / 2 + (signed / 360) * DOME_WIDTH;
}

/**
 * Vertical position. Not clamped — a body well below MIN_ALT_DEG returns a y
 * past the bottom of the viewBox, which is what keeps it correctly hidden
 * instead of pinned to the horizon.
 */
export function altitudeToY(altDeg: number): number {
  if (altDeg >= 0) {
    return HORIZON_Y - (altDeg / MAX_ALT_DEG) * HORIZON_Y;
  }
  const belowRange = DOME_HEIGHT - HORIZON_Y;
  return HORIZON_Y + (-altDeg / -MIN_ALT_DEG) * belowRange;
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

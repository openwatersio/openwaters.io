import type { MoonOrientation } from "@openwaters/almanac";

/**
 * The Moon's lit region as a single SVG path.
 *
 * `moonPath` draws the upright calendar disc, lit on the right while waxing.
 * To draw the Moon as it sits in the observer's sky, draw it waxing and
 * rotate it by `moonTiltDeg`.
 */

/**
 * The SVG rotation, in degrees, that turns a disc drawn with
 * `moonPath(…, waxing = true)` (lit limb pointing right) so its lit limb
 * points where Almanac's `moonOrientation` puts it.
 *
 * Bright limb minus parallactic angle is the lit limb's direction from the
 * zenith, counterclockwise as the observer sees the sky. SVG rotates
 * clockwise in a y-down viewBox, so the angle is negated; the extra −90°
 * accounts for the disc starting lit on the right rather than at the top.
 */
export function moonTiltDeg(o: MoonOrientation): number {
  return -(o.brightLimbAngleDeg - o.parallacticAngleDeg) - 90;
}

/**
 * The terminator is a half-ellipse sharing the limb's vertical axis. Its
 * midpoint travels from the lit limb (new) through the centre (quarter) to the
 * dark limb (full), which is exactly `r · (1 − 2·fraction)`.
 *
 * @param fraction illuminated fraction, 0 (new) to 1 (full)
 */
export function moonPath(
  cx: number,
  cy: number,
  r: number,
  fraction: number,
  waxing: boolean,
): string {
  const f = Math.min(1, Math.max(0, fraction));
  const rx = r * Math.abs(1 - 2 * f);

  // Outer limb: down the lit side. Right while waxing, which in a y-down
  // viewBox is the positive sweep direction.
  const sweepOuter = waxing ? 1 : 0;
  // Terminator, drawn back up. It bows toward the lit side below half phase
  // and away from it above, which flips the sweep at exactly the quarters.
  const sweepInner = f < 0.5 === waxing ? 0 : 1;

  const top = cy - r;
  const bottom = cy + r;
  return [
    `M ${cx} ${top}`,
    `A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${bottom}`,
    `A ${rx} ${r} 0 0 ${sweepInner} ${cx} ${top}`,
    "Z",
  ].join(" ");
}

export type PhaseName =
  | "New moon"
  | "Waxing crescent"
  | "First quarter"
  | "Waxing gibbous"
  | "Full moon"
  | "Waning gibbous"
  | "Last quarter"
  | "Waning crescent";

const NAMES: PhaseName[] = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
];

/**
 * Names the octant of the lunation. `phase` is Almanac's Moon–Sun elongation
 * cycle: 0 at new, 0.5 at full.
 */
export function phaseName(phase: number): PhaseName {
  const octant = Math.round(phase * 8) % 8;
  return NAMES[octant]!;
}

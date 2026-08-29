/**
 * The Moon's lit region as a single SVG path.
 *
 * Almanac reports `fraction` and `waxing` but no limb position angle, so the
 * disc uses the conventional upright terminator — lit on the right while
 * waxing. The page does not invent an orientation the library does not compute.
 */

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

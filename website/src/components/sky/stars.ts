/**
 * The naked-eye star field, placed by real astronomy rather than decoration.
 *
 * The catalog is the same one the iOS app ships: J2000 [rightAscension,
 * declination, magnitude] triples down to magnitude 3.5, which is roughly what
 * a dark anchorage shows you.
 */
import { starAltAz } from "@openwaters/almanac";

import { project, type DomePoint } from "./projection.ts";
import catalog from "./stars.json" with { type: "json" };

/** Faintest magnitude in the catalog; the scale below is anchored to it. */
const FAINTEST = 3.5;

/** Brighter stars draw bigger. Vega (0.03) lands near 1.25, Sirius near 1.6. */
export const starRadius = (magnitude: number) =>
  0.45 + (FAINTEST - magnitude) * 0.23;

export interface DomeStar extends DomePoint {
  r: number;
}

/**
 * Every catalog star above the horizon, projected onto the dome.
 *
 * Stars below the horizon are dropped rather than drawn and occluded: the
 * ground would hide them anyway, and the cull is what keeps a full recompute
 * cheap enough to run on every frame of the time scrubber.
 */
export function domeStars(
  instant: Date,
  observer: { latitudeDeg: number; longitudeDeg: number },
): DomeStar[] {
  const stars: DomeStar[] = [];
  for (const [raDeg, decDeg, magnitude] of catalog) {
    const altAz = starAltAz(raDeg, decDeg, instant, observer);
    if (altAz.altDeg < 0) continue;
    stars.push({
      ...project(altAz, observer.latitudeDeg),
      r: starRadius(magnitude),
    });
  }
  return stars;
}

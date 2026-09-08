/**
 * The naked-eye star field, placed by real astronomy rather than decoration.
 *
 * The catalog is the same one the iOS app ships: J2000 [rightAscension,
 * declination, magnitude] triples down to magnitude 3.5, which is roughly what
 * a dark anchorage shows you.
 */
import { starAltAz } from "@openwaters/almanac";

import {
  SPAN_DEG,
  project,
  signedBearingDeg,
  type DomePoint,
} from "./projection.ts";
import catalog from "./stars.json" with { type: "json" };

/** Faintest magnitude in the catalog; the scale below is anchored to it. */
const FAINTEST = 3.5;

/** Brighter stars draw bigger. Vega (0.03) lands near 1.4, Sirius near 1.7. */
export const starRadius = (magnitude: number) =>
  0.5 + (FAINTEST - magnitude) * 0.25;

export interface DomeStar extends DomePoint {
  r: number;
}

/**
 * Every catalog star inside the frame, projected onto the panorama.
 *
 * Stars below the horizon or behind the observer are dropped rather than drawn
 * and hidden: the ground and the frame edge would cover them anyway, and the
 * cull is what keeps a full recompute cheap enough to run on every frame of
 * the time scrubber.
 */
export function domeStars(
  instant: Date,
  observer: { latitudeDeg: number; longitudeDeg: number },
): DomeStar[] {
  const stars: DomeStar[] = [];
  for (const [raDeg, decDeg, magnitude] of catalog) {
    const altAz = starAltAz(raDeg, decDeg, instant, observer);
    if (altAz.altDeg < 0) continue;
    if (
      Math.abs(signedBearingDeg(altAz.azDeg, observer.latitudeDeg)) >
      SPAN_DEG / 2
    )
      continue;
    stars.push({
      ...project(altAz, observer.latitudeDeg),
      r: starRadius(magnitude),
    });
  }
  return stars;
}

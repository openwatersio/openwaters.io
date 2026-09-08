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

const DEG = Math.PI / 180;
/** How wide a band the drift fade is smeared over, in degrees of azimuth. */
const DRIFT_FADE_DEG = 12;

/**
 * How brightly a star shows, given which way it appears to travel.
 *
 * The sky turns about the celestial pole, which sits behind an observer facing
 * the transit direction. Stars on the far side of the pole therefore track
 * across the frame the opposite way to everything else — against the Sun and
 * Moon, and against their own neighbours a few degrees below. On a panorama it
 * reads as a patch of sky sliding backwards, which is exactly what it is.
 *
 * They are faded out rather than drawn. A star reverses only above the pole's
 * own altitude, which is the observer's latitude, and within
 * `acos(tan(latitude) / tan(altitude))` of the pole's bearing — the locus of
 * greatest elongation, where a star's horizontal travel stops and turns round.
 * Verified against Dubhe, whose greatest elongation this puts at 45.9° from
 * north at altitude 58.4°, matching the catalogue position stepped through a
 * day.
 *
 * The cut is small where it matters: 3.8% of star sightings in the Salish Sea,
 * 0.2% at Tromsø, where the pole is nearly overhead and almost nothing gets
 * past it. It grows toward the equator, 11.2% at Sydney and 34.5% on the
 * equator itself, where the pole lies on the horizon and a third of the sky
 * really does pass the wrong way. Fading is honest there rather than tidy: the
 * alternative is a panorama with a third of its stars sliding backwards.
 */
export function driftOpacity(
  altDeg: number,
  azDeg: number,
  latitudeDeg: number,
): number {
  const lat = Math.abs(latitudeDeg);
  if (altDeg <= lat) return 1;
  const ratio = Math.tan(lat * DEG) / Math.tan(altDeg * DEG);
  if (ratio >= 1) return 1;
  const boundaryDeg = Math.acos(ratio) / DEG;
  const poleAz = latitudeDeg >= 0 ? 0 : 180;
  const fromPole = Math.abs(
    ((((azDeg - poleAz + 540) % 360) + 360) % 360) - 180,
  );
  return Math.max(0, Math.min(1, (fromPole - boundaryDeg) / DRIFT_FADE_DEG));
}

/** Brighter stars draw bigger. Vega (0.03) lands near 1.4, Sirius near 1.7. */
export const starRadius = (magnitude: number) =>
  0.5 + (FAINTEST - magnitude) * 0.25;

export interface DomeStar extends DomePoint {
  r: number;
  /** Fades to zero across the pole, where the sky appears to run backwards. */
  opacity: number;
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
    const opacity = driftOpacity(
      altAz.altDeg,
      altAz.azDeg,
      observer.latitudeDeg,
    );
    if (opacity < 0.02) continue;
    stars.push({
      ...project(altAz, observer.latitudeDeg),
      r: starRadius(magnitude),
      opacity,
    });
  }
  return stars;
}

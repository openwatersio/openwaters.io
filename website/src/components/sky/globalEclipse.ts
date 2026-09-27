/**
 * Well-known recent solar eclipses, by the UTC day of greatest eclipse.
 * 2023-04-20 is a hybrid: its central line turns from annular to total and back.
 */
export const RECENT_DAYS = [
  "2017-08-21",
  "2023-04-20",
  "2023-10-14",
  "2024-04-08",
  "2026-08-12",
] as const;

export type GroundPoint = { latitudeDeg: number; longitudeDeg: number };

/**
 * Longitudes made continuous along a path, so a line that crosses the
 * antimeridian runs past ±180° instead of jumping across the whole map.
 * MapLibre draws longitudes outside ±180° on the neighbouring world copy.
 */
export function unwrapLongitudes(points: readonly GroundPoint[]): number[] {
  const unwrapped: number[] = [];
  for (const { longitudeDeg } of points) {
    const previous = unwrapped.at(-1);
    if (previous === undefined) {
      unwrapped.push(longitudeDeg);
      continue;
    }
    unwrapped.push(previous + signedLongitudeDelta(longitudeDeg - previous));
  }
  return unwrapped;
}

const signedLongitudeDelta = (delta: number) =>
  ((((delta + 180) % 360) + 360) % 360) - 180;

/** West, south, east, north of a path, with its longitudes unwrapped. */
export function pathBounds(
  points: readonly GroundPoint[],
): [number, number, number, number] | null {
  if (points.length === 0) return null;
  const longitudes = unwrapLongitudes(points);
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  points.forEach(({ latitudeDeg }, i) => {
    west = Math.min(west, longitudes[i]!);
    east = Math.max(east, longitudes[i]!);
    south = Math.min(south, latitudeDeg);
    north = Math.max(north, latitudeDeg);
  });
  return [west, south, east, north];
}

export const formatLatitude = (deg: number) =>
  `${Math.abs(deg).toFixed(1)}° ${deg >= 0 ? "N" : "S"}`;

export const formatLongitude = (deg: number) =>
  `${Math.abs(deg).toFixed(1)}° ${deg >= 0 ? "E" : "W"}`;

/** The widest longitude step one drawn segment may take, degrees. */
const MAX_SEGMENT_LONGITUDE_DEG = 1;

/**
 * Positions along the great circle from `a` to `b`, both [longitude,
 * latitude] with `b` unwrapped against `a`, ending at `b` and excluding `a`.
 * MapLibre draws a segment straight in longitude and latitude, even on the
 * globe. Near a pole a path sweeps through tens of degrees of longitude a
 * minute, and a straight segment there bows away from the pole, so a long
 * step is halved along the great circle until no piece spans more than a
 * degree of longitude.
 */
function greatCircleSteps(a: number[], b: number[]): number[][] {
  if (Math.abs(b[0]! - a[0]!) <= MAX_SEGMENT_LONGITUDE_DEG) return [b];
  const va = unitVector(a);
  const vb = unitVector(b);
  const mid = [0, 1, 2].map((i) => va[i]! + vb[i]!);
  const length = Math.hypot(mid[0]!, mid[1]!, mid[2]!);
  // Stop halving at about 60 m: a path through the pole itself turns
  // through 180° of longitude in no distance at all.
  if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-5) {
    return [b];
  }
  const longitude = (Math.atan2(mid[1]!, mid[0]!) * 180) / Math.PI;
  const midpoint = [
    a[0]! + signedLongitudeDelta(longitude - a[0]!),
    (Math.asin(mid[2]! / length) * 180) / Math.PI,
  ];
  return [...greatCircleSteps(a, midpoint), ...greatCircleSteps(midpoint, b)];
}

function unitVector([longitude, latitude]: number[]): [number, number, number] {
  const lon = (longitude! * Math.PI) / 180;
  const lat = (latitude! * Math.PI) / 180;
  return [
    Math.cos(lat) * Math.cos(lon),
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
  ];
}

/**
 * The central line as GeoJSON, one LineString per run of the same kind, so a
 * hybrid eclipse can be drawn total in one part and annular in another.
 * Adjacent runs share their boundary point so the line stays unbroken, and
 * every LineString has at least the two positions GeoJSON requires. Long
 * steps near a pole are split along the great circle.
 */
export function centralLineFeatures(
  points: readonly (GroundPoint & { kind: "total" | "annular" })[],
  longitudes: readonly number[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, { kind: string }> {
  const features: GeoJSON.Feature<GeoJSON.LineString, { kind: string }>[] = [];
  points.forEach((point, i) => {
    const coordinate = [longitudes[i]!, point.latitudeDeg];
    const run = features.at(-1);
    if (run && run.properties.kind === point.kind) {
      run.geometry.coordinates.push(coordinate);
      return;
    }
    const previous = run?.geometry.coordinates.at(-1);
    // A LineString needs two positions: a one-point run, such as the first
    // minute of a hybrid path, extends to the next point.
    if (run && run.geometry.coordinates.length === 1) {
      run.geometry.coordinates.push(coordinate);
    }
    features.push({
      type: "Feature",
      properties: { kind: point.kind },
      geometry: {
        type: "LineString",
        coordinates: previous ? [previous, coordinate] : [coordinate],
      },
    });
  });
  return {
    type: "FeatureCollection",
    features: features
      .filter(({ geometry }) => geometry.coordinates.length > 1)
      .map((feature) => {
        const [first, ...rest] = feature.geometry.coordinates;
        const coordinates = [first!];
        for (const position of rest) {
          coordinates.push(...greatCircleSteps(coordinates.at(-1)!, position));
        }
        return { ...feature, geometry: { ...feature.geometry, coordinates } };
      }),
  };
}

/** Index of the point closest in time to `time`, or −1 for no points. */
export function nearestPointIndex(
  points: readonly { time: Date }[],
  time: Date,
): number {
  let best = -1;
  let bestGap = Infinity;
  points.forEach((point, i) => {
    const gap = Math.abs(point.time.getTime() - time.getTime());
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

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

/**
 * The central line as GeoJSON, one LineString per run of the same kind, so a
 * hybrid eclipse can be drawn total in one part and annular in another.
 * Adjacent runs share their boundary point so the line stays unbroken.
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
    features.push({
      type: "Feature",
      properties: { kind: point.kind },
      geometry: {
        type: "LineString",
        coordinates: previous ? [previous, coordinate] : [coordinate],
      },
    });
  });
  return { type: "FeatureCollection", features };
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

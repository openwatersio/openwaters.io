export type Kind = "tide" | "current";

const SLACKWATER = "https://slackwater.xyz";

export interface Route {
  path: string;
  stationIds: string[];
}

interface StationRecord {
  kind?: string;
  license?: { commercial_use?: boolean };
  harmonic_constituents?: unknown[];
  current?: { offsets?: unknown };
  source?: { name?: string };
}

export interface Database {
  stationRoutes: (kind: Kind) => Route[];
  stationsById: Map<string, StationRecord>;
  stations: { id: string }[];
}

const KIND_ROOT: Record<Kind, string> = {
  tide: "/tides/",
  current: "/currents/",
};

// slackwater.xyz names this gate and leaves it unpublished (src/lib/registry.ts EXCLUDED).
const UNPUBLISHED_CHS = new Set(["chs-arran-rapids"]);

/**
 * Whether slackwater.xyz publishes a page at this route's path.
 *
 * Mirrors loadCatalogue in slackwater.xyz src/lib/catalogue.ts and chsStations in
 * src/lib/registry.ts: a provider row (`noaa/…`, `ticon/…`) that the quality pass
 * accepts, is licensed for commercial use, and can be predicted; or a curated CHS
 * current gate. The ten CHS tide ports it publishes all share a route with a TICON
 * row, so the provider rule covers them. If slackwater.xyz changes this rule, a
 * station here redirects to its place page instead, or to a missing page there
 * (`npm run check:station-redirects` catches both).
 */
export function hasPage(
  kind: Kind,
  route: Route,
  db: Database,
  accepted: Set<string>,
): boolean {
  return route.stationIds.some((id) => {
    const record = db.stationsById.get(id);
    if (!record) return false;
    if (!id.includes("/")) {
      return (
        kind === "current" &&
        record.source?.name === "Canadian Hydrographic Service" &&
        !UNPUBLISHED_CHS.has(id)
      );
    }
    const predictable =
      (record.harmonic_constituents ?? []).length > 0 ||
      (kind === "current" && Boolean(record.current?.offsets));
    return (
      accepted.has(id) && Boolean(record.license?.commercial_use) && predictable
    );
  });
}

export interface Targets {
  /** Station id to the station's own page. */
  pages: Record<string, string>;
  /** Station id to the place page or directory standing in for a missing page. */
  fallbacks: Record<string, string>;
}

/**
 * Maps every routed station id to its slackwater.xyz path.
 *
 * A station without a page goes to the nearest place page above it (its
 * subdivision, then its country), which exists exactly when some published station
 * sits under it, and otherwise to the kind's directory.
 */
export function stationTargets(db: Database): Targets {
  const accepted = new Set(db.stations.map((s) => s.id));
  const routes = (["tide", "current"] as Kind[]).flatMap((kind) =>
    db.stationRoutes(kind).map((route) => ({
      kind,
      route,
      page: hasPage(kind, route, db, accepted),
    })),
  );

  const places = new Set<string>();
  for (const { route, page } of routes) {
    if (page) for (const parent of ancestors(route.path)) places.add(parent);
  }

  const targets: Targets = { pages: {}, fallbacks: {} };
  for (const { kind, route, page } of routes) {
    const fallback =
      ancestors(route.path).find((p) => places.has(p)) ?? KIND_ROOT[kind];
    for (const id of route.stationIds) {
      if (page) targets.pages[id] = route.path;
      else targets.fallbacks[id] = fallback;
    }
  }
  return targets;
}

/** "/tides/us/pa/bridesburg/" -> ["/tides/us/pa/", "/tides/us/"], nearest first. */
const ancestors = (path: string) => {
  const parts = path.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = parts.length - 1; i > 1; i--) {
    out.push(`/${parts.slice(0, i).join("/")}/`);
  }
  return out;
};

const STATION_PATH = /^\/tides\/stations(?:\/(.*?))?\/?$/;

const lookup = (map: Record<string, string>, id: string) =>
  Object.hasOwn(map, id) ? map[id] : undefined;

/**
 * Where an openwaters.io station URL goes on slackwater.xyz, or null when the URL is
 * not under /tides/stations.
 *
 * Only a station's own page is permanent, and even that is cached for a day rather
 * than indefinitely: slackwater.xyz deploys from its own copy of the database, so a
 * path can move before this map is rebuilt. A fallback (a place page, or the hub for
 * an unknown id) is temporary, since the station may get a page in a later release.
 */
export function stationRedirect(url: URL, targets: Targets): Response | null {
  const match = STATION_PATH.exec(url.pathname);
  if (!match) return null;
  const to = (path: string, status: 301 | 302) =>
    new Response(null, {
      status,
      headers: {
        location: `${SLACKWATER}${path}${url.search}`,
        ...(status === 301 ? { "cache-control": "public, max-age=86400" } : {}),
      },
    });
  let id: string;
  try {
    id = decodeURIComponent(match[1] ?? "");
  } catch {
    return to("/stations/", 302);
  }
  if (!id) return to("/stations/", 301);
  const page = lookup(targets.pages, id);
  if (page) return to(page, 301);
  return to(lookup(targets.fallbacks, id) ?? "/stations/", 302);
}

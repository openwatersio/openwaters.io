// Turns GitHub Releases from the project repos into changelog entries. Pure functions,
// so the filtering and cleanup rules are testable without Astro; the loader in
// src/content.config.ts does the fetching.

export const PROJECTS = {
  ais: { name: "AIS", href: "/ais/" },
  tides: { name: "Tides & Currents", href: "/tides/" },
  charts: { name: "Charts", href: "/charts/" },
  sky: { name: "Sky", href: "/sky/" },
} as const;

export type Project = keyof typeof PROJECTS;
export const PROJECT_KEYS = Object.keys(PROJECTS) as Project[];

/** URL segment -> entry type. */
export const TYPES = {
  releases: { type: "release", name: "Releases" },
  announcements: { type: "announcement", name: "Announcements" },
} as const;

export type TypeKey = keyof typeof TYPES;
export const TYPE_KEYS = Object.keys(TYPES) as TypeKey[];

/** A changelog view: everything, or narrowed to a project, a type, or both. */
export interface Filter {
  project?: Project;
  type?: TypeKey;
}

// /changelog/, /changelog/ais/, /changelog/announcements/, /changelog/ais/announcements/
export const changelogPath = ({ project, type }: Filter) =>
  `/changelog/${project ? `${project}/` : ""}${type ? `${type}/` : ""}`;

// "New releases from AIS.", "Announcements from Open Waters."
export function filterDescription({ project, type }: Filter) {
  const what = { releases: "New releases", announcements: "Announcements" };
  const from = project ? PROJECTS[project].name : "Open Waters";
  return `${type ? what[type] : "New releases and announcements"} from ${from}.`;
}

// "AIS releases", "Announcements", "Changelog"
export function filterTitle({ project, type }: Filter) {
  if (!type)
    return project ? `${PROJECTS[project].name} changelog` : "Changelog";
  const name = TYPES[type].name;
  return project ? `${PROJECTS[project].name} ${name.toLowerCase()}` : name;
}

export interface Source {
  repo: string;
  project: Project;
  /** Shown before the version: "Almanac" + "v0.8.0" reads "Almanac 0.8.0". */
  name: string;
  /** Only tags starting with this, stripped from the version. */
  prefix?: string;
  /** A changesets monorepo: one publish run tags several packages within seconds. */
  grouped?: boolean;
  /** Drops this section and everything after it, e.g. TestFlight instructions. */
  stripFrom?: RegExp;
}

export const SOURCES: Source[] = [
  { repo: "aiscast", project: "ais", name: "Open Waters AIS", prefix: "ais-" },
  {
    repo: "aiscast",
    project: "ais",
    name: "Signal K AIS plugin",
    prefix: "signalk-plugin-",
  },
  {
    repo: "slackwater-ios",
    project: "tides",
    name: "Slackwater for iOS",
    stripFrom: /^Worth testing:/m,
  },
  // `name` titles the repo's untagged releases (v0.1.0, 2020-2022), which were
  // tide-predictor releases; package tags (neaps@0.8.0) title themselves.
  {
    repo: "slackwater",
    project: "tides",
    name: "Neaps tide predictor",
    grouped: true,
  },
  {
    repo: "slackwater-database",
    project: "tides",
    name: "Slackwater database",
  },
  {
    repo: "signalk-tides",
    project: "tides",
    name: "Signal K tides plugin",
  },
  {
    repo: "chs-constituents",
    project: "tides",
    name: "CHS constituents",
  },
  { repo: "seamap", project: "charts", name: "Seamap" },
  { repo: "seascape", project: "charts", name: "Seascape" },
  { repo: "tile57", project: "charts", name: "tile57" },
  { repo: "crowd-depth", project: "charts", name: "Crowd depth" },
  { repo: "maritime-zones", project: "charts", name: "Maritime zones" },
  { repo: "almanac", project: "sky", name: "Almanac" },
];

/** The fields the changelog reads from GitHub's release API. */
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

export interface Release {
  id: string;
  project: Project;
  repo: string;
  /** Package and version: "Almanac 0.8.0". */
  title: string;
  /** What changed, from the release name when it says more than the version. */
  headline?: string;
  date: Date;
  /** Markdown from GitHub, cleaned up. Untrusted: render with md(). */
  body: string;
  summary: string;
  url: string;
  /** A semver patch (0.6.2): shown smaller in the timeline. */
  patch: boolean;
  /** Every package in a grouped publish run. */
  packages: { name: string; version: string; url: string }[];
}

const BOTS = /@(dependabot|github-actions|renovate)\[bot\]/;

/**
 * Removes the parts of GitHub's and changesets' generated notes that mean nothing to a
 * reader: bot dependency bumps, "Updated dependencies", commit hashes, and the
 * "Full Changelog" compare link. Returns "" when nothing is left.
 */
export function cleanBody(body: string, source?: Source): string {
  let text = body.replace(/\r\n/g, "\n");
  if (source?.stripFrom) {
    const match = source.stripFrom.exec(text);
    if (match) text = text.slice(0, match.index);
  }

  const out: string[] = [];
  let skipping = false; // inside a dropped list item's indented continuation
  let section = ""; // the current heading, to drop "New Contributors"
  // A changeset's PR link goes at the end of the item's first paragraph, which can
  // run over several lines.
  let pr = "";
  const flush = () => {
    if (pr && out.length) out[out.length - 1] += pr;
    pr = "";
  };

  let fenced = false;
  for (let line of text.split("\n")) {
    // Code blocks pass through untouched.
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced || /^\s*```/.test(line)) {
      out.push(line);
      continue;
    }
    if (/^#{1,6} /.test(line)) {
      flush();
      section = line.replace(/^#+ /, "").trim();
      skipping = false;
      if (/^(What's Changed|(Major|Minor|Patch) Changes)$/.test(section))
        continue;
    }
    if (section === "New Contributors") continue;
    if (/^\*\*Full Changelog\*\*/.test(line)) continue;

    // "· " is the iOS App Store notes' bullet; older changesets pad with "-   ".
    line = line.replace(/^[-*·]\s+/, "- ");
    if (/^- /.test(line)) {
      flush();
      skipping = BOTS.test(line) || /^- Updated dependencies/.test(line);
      if (skipping) continue;
      [line, pr] = tidyItem(line);
    } else if (skipping && (/^\s+\S/.test(line) || line === "")) {
      if (line === "") skipping = false;
      continue;
    } else {
      if (!line.trim()) flush();
      skipping = false;
    }
    out.push(line);
  }
  flush();

  return (
    out
      .join("\n")
      // ponytail: GitHub uploads have no alt text and nearly all are screenshots.
      .replace(/!\[\]\(/g, "![Screenshot](")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// "- [#347](…/pull/347) [`d5f2c5e`](…) Thanks [@bkeepers](…)! - Add currents"
//   -> ["- Add currents", " ([#347](…/pull/347))"]
// "- Add currents by @bkeepers in https://github.com/o/r/pull/12"
//   -> ["- Add currents ([#12](https://github.com/o/r/pull/12))", ""]
function tidyItem(line: string): [string, string] {
  const changeset =
    /^- (?:\[(#\d+)\]\((\S+?)\) )?\[`\w+`\]\(\S+?\)(?: Thanks \[@[^\]]+\]\(\S+?\)!)? - /.exec(
      line,
    );
  if (changeset) {
    const rest = line.slice(changeset[0].length);
    const pr = changeset[1] ? ` ([${changeset[1]}](${changeset[2]}))` : "";
    return [`- ${rest}`, pr];
  }
  const generated = line.replace(
    / by @[\w-]+(?:\[bot\])? in (https:\/\/github\.com\/\S+\/pull\/(\d+))$/,
    " ([#$2]($1))",
  );
  return [generated, ""];
}

/** The first paragraph or list item of a body, as plain text, for the timeline row. */
export function summarize(body: string, max = 200): string {
  const lines = body.split("\n").map((l) => l.trim());
  const start = lines.findIndex(
    (l) => l && !/^[#|]/.test(l) && !l.endsWith(":"),
  );
  if (start < 0) return "";
  // Hard-wrapped notes continue on the next lines until a blank line or new item.
  let end = start + 1;
  while (end < lines.length && lines[end] && !/^[-#|]/.test(lines[end])) end++;
  const text = lines
    .slice(start, end)
    .join(" ")
    .replace(/^- /, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s*\(#\d+\)$/, "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// No dots: wrangler.jsonc serves any path with a dot straight from assets, so
// /changelog/almanac-0.8.0/ would never reach the page.
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Date versions (2026.08.17, 0.9.20260923) aren't semver, so neither part may be huge.
export const isPatch = (v: string) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return !!m && +m[1] < 1000 && +m[3] > 0 && +m[3] < 1000;
};

// TEMPORARY: draft headlines for the website preview, keyed by "repo tag". They
// override the release names; delete this once they are applied on GitHub.
const PREVIEW_HEADLINES: Record<string, string> = {
  "almanac v0.8.0":
    "Uranus and Neptune, plus guides for moving from SunCalc and Solar",
  "almanac v0.7.0": "Horizon dip and planetary motion",
  "almanac v0.6.0": "Where each solar eclipse is greatest",
  "almanac v0.5.0": "Solar eclipses anywhere on Earth, with central lines",
  "almanac v0.4.2": "Faster sunrise, sunset, and twilight searches",
  "almanac v0.4.1": "Faster Moon positions and Moon events",
  "almanac v0.4.0": "Solar eclipses visible from a location",
  "almanac v0.3.0": "Positions of fixed stars",
  "almanac v0.2.1": "Faster Moon, Sun, and eclipse calculations",
  "almanac v0.2.0": "Search past lunar eclipses and date ranges",
  "almanac v0.1.0": "Offline Sun and Moon astronomy for TypeScript and Swift",
  "aiscast signalk-plugin-v0.6.3":
    "App Store screenshots in Navionics and Aqua Map",
  "aiscast signalk-plugin-v0.6.2":
    "Accurate course, heading, and turn rate from NMEA 2000 receivers",
  "aiscast signalk-plugin-v0.6.1": "Renamed to Open Waters AIS",
  "aiscast signalk-plugin-v0.6.0":
    "Stations named after your boat, and signed token requests",
  "aiscast signalk-plugin-v0.5.2":
    "Works with the new contributor station names",
  "aiscast signalk-plugin-v0.5.1":
    "Names, call signs, and dimensions on chartplotters",
  "aiscast signalk-plugin-v0.5.0":
    "Open Waters AIS traffic on NMEA 0183 chartplotters",
  "aiscast signalk-plugin-v0.4.0": "Fewer SD card writes while offline",
  "aiscast signalk-plugin-v0.3.1":
    "Offline backlog uploads in full after reconnecting",
  "aiscast signalk-plugin-v0.3.0": "Follow buddy boats beyond VHF range",
  "aiscast signalk-plugin-v0.2.0":
    "Share your position from GPS when there's no AIS transponder",
  "aiscast signalk-plugin-v0.1.4": "Tokens no longer expire",
  "aiscast signalk-plugin-v0.1.3":
    "Connects over Starlink, satellite, and slow cellular links",
  "aiscast signalk-plugin-v0.1.2":
    'Dashboard clears the "No token" error once connected',
  "aiscast signalk-plugin-v0.1.1": "Starts sharing once the network comes up",
  "slackwater-ios v1.13.0":
    "Nearby stations on every station page, and how the Moon shapes tides",
  "slackwater-ios v1.12.0":
    "Nearest tide and current stations, an endless timeline, and sharing",
  "slackwater neaps@0.8.0":
    "ESM-only packages, lower memory use, and edge runtime support",
  "slackwater-database v0.10.20260924":
    "Permanent station slugs, Alaska panhandle gauges, and Dutch tide fits",
  "slackwater-database v0.9.20260923":
    "Swift package by URL and cleaner station names",
  "slackwater-database v0.9.20260921":
    "One-file database with a Swift reader and current stations",
  "slackwater-database v0.9.20260907":
    "LAT and HAT for NOAA stations that don't publish them",
  "slackwater-database v0.9.20260728":
    "Station data read per record from a pack file",
  "slackwater-database v0.8.20260722":
    "Chart datums by country, and the Baltic split by region",
  "slackwater-database v0.8.20260719":
    "Dutch tide phases corrected for daylight saving time",
  "signalk-tides v2.2.0": "Tide widget for chart plotters",
  "chs-constituents v0.3.1": "Published from CI with provenance",
  "chs-constituents v0.2.2": "Repository moves to Open Waters",
  "chs-constituents v0.2.1": "No drift warning for the derived Malibu gate",
  "chs-constituents v0.2.0": "Tide ports and derived slack gates",
  "chs-constituents v0.1.2": "Skipped stations listed in the bundle",
  "chs-constituents v0.1.1": "Station counter in build progress",
  "seamap v0.3.1": "Water body names and boat rentals",
  "seamap v0.3.0": "Dock fuel, wreck buoys, and cleaner zoomed-out charts",
  "seamap v0.2.0": "Lights, buoys, and many more charted features",
  "seascape v2026.08.17": "Unknown-depth water without seams or gaps",
  "seascape v2026.08.16":
    "Six new high-resolution depth sources in four countries",
  "seascape v2026.08.10": "US coastal depths referenced to chart datum",
  "seascape v0.3.0":
    "Every source at its native resolution, and depth areas return",
  "seascape v0.2.0": "Chart-style deep water and sharper shallows",
  "crowd-depth v1.2.6": "New icon and App Store listing",
  "crowd-depth v1.2.5": "Readable device names in the source menus",
  "crowd-depth v1.2.4": "Reports continue after scans with no new data",
  "crowd-depth v1.2.3": "Reports go through during NOAA outages",
  "crowd-depth v1.2.2": "Clearer errors when a report fails",
  "crowd-depth v1.2.1": "Less SD card wear",
  "crowd-depth v1.2.0": "ISO 8601 timestamps in the plugin status",
  "maritime-zones v0.2.0": "Tiles at half the size, with land areas",
  "maritime-zones v0.1.0": "First maritime zone tiles",
};

// "v0.5.0 — the bundle ships" -> "The bundle ships". A name that is only a version,
// or a version with a package or build number ("v0.8.0", "Seascape v0.3.0",
// "signalk-aiscast 0.6.3", "1.13.0 (38)"), has no headline.
export function headline(name: string | null, tag: string, prefix = "") {
  if (!name) return undefined;
  const v = version(tag, prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rest = name
    .replace(tag, "")
    .replace(new RegExp(`v?${v}`), "")
    .replace(/^[\s—–:·|-]+|[\s—–:·|-]+$/g, "");
  return /\s/.test(rest)
    ? rest.charAt(0).toUpperCase() + rest.slice(1)
    : undefined;
}

const version = (tag: string, prefix = "") =>
  tag.slice(prefix.length).replace(/^v(?=\d)/, "");

// "@neaps/api@0.7.0" -> ["@neaps/api", "0.7.0"]; "v0.1.1" -> null
function packageTag(tag: string): [string, string] | null {
  const at = tag.lastIndexOf("@");
  return at > 0 ? [tag.slice(0, at), tag.slice(at + 1)] : null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Published, non-prerelease releases from one source, newest first. */
export function toReleases(
  source: Source,
  releases: GitHubRelease[],
): Release[] {
  const published = releases
    .filter((r) => !r.draft && !r.prerelease && r.published_at)
    .filter((r) => !source.prefix || r.tag_name.startsWith(source.prefix))
    .sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!));

  const groups = source.grouped
    ? groupRuns(published)
    : published.map((r) => [r]);

  return groups.flatMap((group) => {
    const entry = source.grouped
      ? fromGroup(source, group)
      : fromSingle(source, group[0]);
    return entry.body ? [entry] : [];
  });
}

function fromSingle(source: Source, r: GitHubRelease): Release {
  const title = `${source.name} ${version(r.tag_name, source.prefix)}`;
  // iOS notes open with the version and build ("1.13.0 (38)") on a line of their own.
  const body = cleanBody(
    (r.body ?? "").trimStart().replace(/^v?[\d.]+(?: \(\d+\))?\r?\n/, ""),
    source,
  );
  return {
    id: slugify(title),
    project: source.project,
    repo: source.repo,
    title,
    headline:
      PREVIEW_HEADLINES[`${source.repo} ${r.tag_name}`] ??
      headline(r.name, r.tag_name, source.prefix),
    date: new Date(r.published_at!),
    body,
    summary: summarize(body),
    url: r.html_url,
    patch: isPatch(version(r.tag_name, source.prefix)),
    packages: [],
  };
}

// ponytail: a 15-minute gap splits publish runs; changesets tags a run within seconds.
const RUN_GAP_MS = 15 * 60 * 1000;

function groupRuns(releases: GitHubRelease[]): GitHubRelease[][] {
  const groups: GitHubRelease[][] = [];
  const pkg = (r: GitHubRelease) => packageTag(r.tag_name)?.[0];
  for (const r of releases) {
    const last = groups.at(-1);
    const prev = last?.at(-1);
    if (
      prev &&
      // Untagged releases (v0.1.0) predate the monorepo; each stands alone.
      pkg(r) &&
      pkg(prev) &&
      Date.parse(prev.published_at!) - Date.parse(r.published_at!) <
        RUN_GAP_MS &&
      // A run publishes each package once; a second version is another run.
      !last!.some((g) => pkg(g) === pkg(r))
    )
      last!.push(r);
    else groups.push([r]);
  }
  return groups;
}

function fromGroup(source: Source, group: GitHubRelease[]): Release {
  const packages = group.map((r) => {
    const [name, v] = packageTag(r.tag_name) ??
      packageTag(r.name ?? "") ?? [source.name, version(r.tag_name)];
    return { name, version: v, url: r.html_url };
  });
  // The unscoped package (neaps, slackwater) is the umbrella users install.
  const lead = packages.find((p) => !p.name.includes("/")) ?? packages[0];
  const title =
    lead.name.startsWith("@") && packages.length > 1
      ? packages.map((p) => `${p.name} ${p.version}`).join(", ")
      : `${capitalize(lead.name)} ${lead.version}`;

  // The same change is listed under every package it touched; keep the first.
  const seen = new Set<string>();
  const items: string[] = [];
  for (const r of group) {
    for (const item of listItems(cleanBody(r.body ?? "", source))) {
      // One PR can carry several different changes, so match on the whole item.
      if (seen.has(item)) continue;
      seen.add(item);
      items.push(item);
    }
  }
  const body = items.join("\n");
  const leadRelease = group[packages.indexOf(lead)];
  const date = new Date(group.at(-1)!.published_at!);

  return {
    // A package version publishes once, so the lead package names the run uniquely.
    id: slugify(`${lead.name} ${lead.version}`),
    project: source.project,
    repo: source.repo,
    title,
    headline:
      PREVIEW_HEADLINES[`${source.repo} ${leadRelease.tag_name}`] ??
      headline(leadRelease.name, leadRelease.tag_name),
    date,
    body,
    summary: summarize(body),
    url: leadRelease.html_url,
    // A run is a patch only when every package in it is.
    patch: packages.every((p) => isPatch(p.version)),
    packages: packages.length > 1 ? packages : [],
  };
}

// Splits markdown into top-level list items, keeping each item's indented lines.
// Text outside a list becomes its own item.
function listItems(markdown: string): string[] {
  const items: string[] = [];
  let blank = false;
  for (const line of markdown.split("\n")) {
    if (!line.trim()) blank = true;
    else if (/^- /.test(line) || !items.length) items.push(line);
    else items[items.length - 1] += `${blank ? "\n\n" : "\n"}${line}`;
    if (line.trim()) blank = false;
  }
  return items;
}

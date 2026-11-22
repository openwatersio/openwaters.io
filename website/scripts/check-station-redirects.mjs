// Compares the station redirect map with what slackwater.xyz publishes, since the two
// sites deploy from separate copies of @slackwater/database. Run it after bumping the
// database here, or when slackwater.xyz changes which stations get a page.
import { loadStations } from "@slackwater/database";

import { stationTargets } from "../src/utils/station-redirects.ts";

// SLACKWATER_ORIGIN points the check at a preview deploy, for a database release
// that slackwater.xyz has not shipped yet.
const origin = process.env.SLACKWATER_ORIGIN ?? "https://slackwater.xyz";

const sitemap = async (name) => {
  const response = await fetch(`${origin}/sitemap-${name}.xml`);
  if (!response.ok)
    throw new Error(`sitemap-${name}.xml: HTTP ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    ([, loc]) => new URL(loc).pathname,
  );
};

// slackwater.xyz lists station pages in the tides and currents sitemaps, and its
// directory and place pages in the static one.
const stationPages = new Set([
  ...(await sitemap("tides")),
  ...(await sitemap("currents")),
]);
const published = new Set([...stationPages, ...(await sitemap("static"))]);

const { pages, fallbacks } = stationTargets(await loadStations());
const targeted = new Set(Object.values(pages));
const problems = [
  ...Object.entries(pages)
    .filter(([, path]) => !stationPages.has(path))
    .map(([id, path]) => `${id}: ${path} is not a station page there`),
  ...Object.entries(fallbacks)
    .filter(([, path]) => !published.has(path))
    .map(([id, path]) => `${id}: fallback ${path} is not published there`),
  ...[...stationPages]
    .filter((path) => !targeted.has(path))
    .map(
      (path) => `${path}: published there, but no station id redirects to it`,
    ),
];

for (const problem of problems) console.log(problem);
console.log(
  `${Object.keys(pages).length} pages and ${Object.keys(fallbacks).length} fallbacks checked, ${problems.length} problems`,
);
process.exitCode = problems.length ? 1 : 0;

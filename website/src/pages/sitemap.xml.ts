import type { APIRoute } from "astro";
import type { Station } from "@neaps/tide-database";

import { API_HOST } from "../utils/constants";
import { sitemapXml, toUrlPath } from "../utils/sitemap";

// Every page except the dynamic routes, which have no build-time URL of their own —
// globbed rather than listed so a new page is never silently left out of the sitemap.
const staticPaths = Object.keys(import.meta.glob("./**/*.astro"))
  .filter((key) => !key.includes("["))
  .map(toUrlPath)
  .sort();

// Prerendered, so the station list is fetched once at build rather than per request.
export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("sitemap: astro.config `site` is not set");

  const response = await fetch(`${API_HOST}/tides/stations`);
  if (!response.ok) {
    // Loud: a sitemap silently missing 6,000 URLs is worse than a failed build.
    throw new Error(`sitemap: stations API returned ${response.status}`);
  }
  const stations: Station[] = await response.json();

  return new Response(
    sitemapXml(site, [
      ...staticPaths,
      ...stations.map((station) => `/tides/stations/${station.id}/`),
    ]),
    { headers: { "content-type": "application/xml; charset=utf-8" } },
  );
};

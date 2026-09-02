import type { APIRoute } from "astro";

import { sitemapXml, toUrlPath } from "../utils/sitemap";

// Every page except the dynamic routes, which have no build-time URL of their own —
// globbed rather than listed so a new page is never silently left out of the sitemap.
//
// Station pages are deliberately absent. slackwater.xyz is being built to own the
// per-station corpus for tide and current queries; listing openwaters' ~6,100 templated
// station pages here would put the two origins in competition for the same intent, and
// would add thousands of thin near-identical pages to a site whose quality signal is
// carried by a handful of strong ones. See docs/superpowers/specs in slackwater.xyz for
// the station page design.
const staticPaths = Object.keys(import.meta.glob("./**/*.astro"))
  .filter((key) => !key.includes("[") && key !== "./404.astro")
  .map(toUrlPath)
  .sort();

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("sitemap: astro.config `site` is not set");

  return new Response(sitemapXml(site, staticPaths), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};

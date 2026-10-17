import type { APIRoute } from "astro";

import { sitemapXml, toUrlPath } from "../utils/sitemap";

// Every page except the dynamic routes, which have no build-time URL of their own —
// globbed rather than listed so a new page is never silently left out of the sitemap.
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

import type { APIRoute } from "astro";

import { PROJECT_KEYS, TYPE_KEYS, changelogPath } from "../utils/changelog";
import { entryHref, getEntries } from "../utils/changelog-entries";
import { sitemapXml, toUrlPath } from "../utils/sitemap";

// Every page except the dynamic routes (the updates pages are added below) —
// globbed rather than listed so a new page is never silently left out of the sitemap.
const staticPaths = Object.keys(import.meta.glob("./**/*.astro"))
  .filter((key) => !key.includes("[") && key !== "./404.astro")
  .map(toUrlPath)
  .sort();

// The updates pages' dynamic routes are prerendered, so their URLs are known here.
const changelogPaths = async () => [
  ...PROJECT_KEYS.flatMap((project) =>
    TYPE_KEYS.map((type) => changelogPath({ project, type })),
  ),
  ...(await getEntries()).map(entryHref),
];

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("sitemap: astro.config `site` is not set");

  const paths = [...staticPaths, ...(await changelogPaths())].sort();
  return new Response(sitemapXml(site, paths), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};

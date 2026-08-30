// URL serialization percent-encodes everything that would break XML except `&`, which
// it leaves intact — so an ampersand in a station id is the only thing left to escape.
const escape = (value: string) => value.replace(/&/g, "&amp;");

/**
 * Turns an `import.meta.glob` key from src/pages into the path Astro serves it at.
 * "./index.astro" -> "/", "./about.astro" -> "/about/", "./tides/index.astro" -> "/tides/"
 */
export const toUrlPath = (globKey: string) => {
  const path = globKey
    .replace(/^\.\//, "")
    .replace(/\.astro$/, "")
    .replace(/(^|\/)index$/, "");
  return path ? `/${path}/` : "/";
};

// No lastmod, changefreq, or priority: Google ignores the last two outright, and a
// lastmod it doesn't trust is worse than none.
export const sitemapXml = (site: URL, paths: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map((path) => `  <url><loc>${escape(new URL(path, site).href)}</loc></url>`)
  .join("\n")}
</urlset>
`;

import { getImage } from "astro:assets";
import { render } from "astro:content";
import { experimental_AstroContainer } from "astro/container";

import {
  entryHref,
  getEntries,
  releaseHtml,
  type Entry,
} from "./changelog-entries";
import {
  changelogPath,
  filterDescription,
  filterTitle,
  type Filter,
} from "./changelog";

// XML 1.0 forbids most control characters, and one in pasted release notes would
// make a strict reader reject the whole feed.
const escape = (s: string) =>
  s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Feed readers have no base URL for site-relative links.
const absolute = (html: string, site: URL) =>
  html.replace(/(href|src|srcset)="\/(?!\/)/g, `$1="${site.origin}/`);

// An announcement's `rendered.html` leaves local images as placeholders that only
// render() resolves, so the feed renders the full component, cover image first.
async function announcementHtml(
  entry: Extract<Entry, { type: "announcement" }>,
  container: experimental_AstroContainer,
) {
  const { Content } = await render(entry.announcement);
  const image = entry.announcement.data.image;
  const cover = image
    ? `<p><img src="${(await getImage({ src: image })).src}" alt=""></p>`
    : "";
  return cover + (await container.renderToString(Content));
}

// Feed readers and email subjects lose the page's subtitle, so it joins the title.
const feedTitle = (entry: Entry) =>
  entry.type === "release" && entry.subtitle
    ? `${entry.title} (${entry.subtitle})`
    : entry.title;

/**
 * RSS 2.0 for the changelog. Items carry the full entry as HTML, so feed readers and
 * RSS-to-email services can show it without a click-through.
 */
export async function changelogFeed(site: URL, filter: Filter = {}) {
  const entries = (await getEntries(filter)).slice(0, 50);
  const name = filterTitle(filter);
  const link = new URL(changelogPath(filter), site);

  const container = await experimental_AstroContainer.create();
  const items = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entryHref(entry), site).href;
      const html = absolute(
        entry.type === "release"
          ? await releaseHtml(entry.release.data.body)
          : await announcementHtml(entry, container),
        site,
      );
      const category = entry.type === "release" ? "Release" : "Announcement";
      return `    <item>
      <title>${escape(feedTitle(entry))}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${entry.date.toUTCString()}</pubDate>
      <category>${category}</category>
      <description>${escape(html)}</description>
    </item>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Open Waters: ${escape(name)}</title>
    <link>${link.href}</link>
    <atom:link href="${new URL("rss.xml", link).href}" rel="self" type="application/rss+xml" />
    <description>${escape(filterDescription(filter))}</description>
    <language>en</language>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}

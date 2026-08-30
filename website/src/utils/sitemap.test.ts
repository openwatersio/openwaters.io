import assert from "node:assert/strict";
import { test } from "node:test";

import { sitemapXml, toUrlPath } from "./sitemap.ts";

test("toUrlPath: index pages collapse to their directory", () => {
  assert.equal(toUrlPath("./index.astro"), "/");
  assert.equal(toUrlPath("./tides/index.astro"), "/tides/");
  assert.equal(toUrlPath("./tides/stations/index.astro"), "/tides/stations/");
});

test("toUrlPath: named pages keep their name and gain a trailing slash", () => {
  assert.equal(toUrlPath("./about.astro"), "/about/");
  assert.equal(
    toUrlPath("./charts/seamap/viewer.astro"),
    "/charts/seamap/viewer/",
  );
});

test("toUrlPath: 'index' inside a name is not a directory index", () => {
  assert.equal(toUrlPath("./reindex.astro"), "/reindex/");
});

test("sitemapXml: absolute URLs against the site origin", () => {
  const xml = sitemapXml(new URL("https://openwaters.io"), [
    "/",
    "/tides/stations/noaa/1612340/",
  ]);
  assert.match(xml, /<loc>https:\/\/openwaters\.io\/<\/loc>/);
  assert.match(
    xml,
    /<loc>https:\/\/openwaters\.io\/tides\/stations\/noaa\/1612340\/<\/loc>/,
  );
});

test("sitemapXml: station ids from the API cannot break the document", () => {
  const xml = sitemapXml(new URL("https://openwaters.io"), ["/a&b<c/"]);
  // `&` is escaped, `<` is percent-encoded by URL itself; neither survives raw.
  assert.match(xml, /<loc>https:\/\/openwaters\.io\/a&amp;b%3Cc\/<\/loc>/);
  assert.equal(xml.match(/&(?!amp;)/g), null);
  assert.equal(xml.split("<loc>").length - 1, xml.split("</loc>").length - 1);
});

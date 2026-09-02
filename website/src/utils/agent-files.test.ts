import assert from "node:assert/strict";
import { existsSync, globSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Checks the built site, so it only runs after `npm run build`.
const dist = new URL("../../dist/client/", import.meta.url);
const skip = !existsSync(dist) && "no dist/ (run npm run build first)";
const read = (file: string) => readFileSync(new URL(file, dist), "utf8");

test(
  "404 page points agents at the sitemap, llms.txt and API docs",
  { skip },
  () => {
    const html = read("404.html");
    assert.match(html, /<h1[^>]*>Page not found<\/h1>/);
    for (const href of [
      "/sitemap.xml",
      "/llms.txt",
      "/api/",
      "/openapi.json",
    ]) {
      assert.ok(html.includes(`href="${href}"`), `missing link to ${href}`);
    }
  },
);

test("the 404 page is not listed in the sitemap", { skip }, () => {
  assert.doesNotMatch(read("sitemap.xml"), /404/);
});

test(
  "openapi.json is an OpenAPI 3 document served from the site root",
  { skip },
  () => {
    const doc = JSON.parse(read("openapi.json"));
    assert.match(doc.openapi, /^3\./);
    assert.equal(doc.servers[0].url, "https://api.openwaters.io");
    assert.ok(doc.paths["/tides/stations/{source}/{id}"]);
  },
);

test(
  "llms.txt follows llmstxt.org: H1, blockquote summary, H2 link sections",
  { skip },
  () => {
    const [title, , summary, ...rest] = read("llms.txt").split("\n");
    assert.match(title, /^# Open Waters$/);
    assert.match(summary, /^> /);
    assert.ok(rest.some((line) => line.startsWith("## ")));
    assert.ok(
      rest.some((line) =>
        line.includes("(https://openwaters.io/openapi.json)"),
      ),
    );
  },
);

test("homepage nests headings instead of a flat run of h2s", { skip }, () => {
  const levels = [...read("index.html").matchAll(/<h([1-6])[\s>]/g)].map((m) =>
    Number(m[1]),
  );
  assert.equal(levels[0], 1);
  assert.ok(levels.includes(2) && levels.includes(3));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(
      levels[i] <= levels[i - 1] + 1,
      `h${levels[i - 1]} skips to h${levels[i]}`,
    );
  }
});

test(
  "every prerendered page has a Markdown sibling with its h1",
  { skip },
  () => {
    const pages = globSync("**/index.html", { cwd: dist }).filter(
      (f) => f !== "404/index.html",
    );
    assert.ok(pages.length > 10, `only ${pages.length} pages`);
    for (const page of pages) {
      const md = read(page.replace(/index\.html$/, "index.md"));
      assert.match(md, /^# \S/m, `${page}: markdown has no h1`);
      assert.ok(!md.includes("[]("), `${page}: empty link`);
      // Angle brackets in prose are fine (<token>, <https://…>); page chrome is not.
      assert.ok(
        !/<(div|span|section|nav|a|svg|script|h[1-6])[\s>]/.test(md),
        `${page}: HTML leaked into markdown`,
      );
    }
    assert.match(read("404.md"), /^# Page not found/m);
    // Astro's HTML compression can glue trailing text to an inline link; catch regressions.
    for (const page of pages) {
      const md = read(page.replace(/index\.html$/, "index.md"));
      assert.ok(
        !/[a-z,]\[[^\]]+\]\(/.test(md),
        `${page}: text runs into a link without a space`,
      );
    }
    const stations = read("tides/stations/index.md");
    assert.match(stations, /slackwater\.xyz\/stations\/tides\//);
    assert.match(stations, /api\.openwaters\.io\/tides\/stations\?query=/);
  },
);

test(
  "homepage metadata: og:image points at a real 1200x630 image",
  { skip },
  () => {
    const html = read("index.html");
    const src = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    assert.equal(src, "https://openwaters.io/og/openwaters.png");
    assert.ok(existsSync(new URL("og/openwaters.png", dist)));
    assert.match(html, /property="og:type" content="website"/);
    assert.match(html, /<html lang="en">/);
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/openwaters\.io\/">/,
    );
  },
);

test("homepage Organization schema has a contactPoint", { skip }, () => {
  const html = read("index.html");
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g),
  ].map((m) => JSON.parse(m[1]));
  const org = blocks.find((b) => b["@type"] === "Organization");
  assert.ok(org, "no Organization JSON-LD");
  assert.equal(org.contactPoint["@type"], "ContactPoint");
  assert.ok(org.contactPoint.email);
  assert.ok(org.contactPoint.contactType);
});

test(
  "openapi.json operations all carry an operationId and description",
  { skip },
  () => {
    const doc = JSON.parse(read("openapi.json"));
    for (const [path, item] of Object.entries<
      Record<string, { operationId?: string; description?: string }>
    >(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        assert.ok(op.operationId, `${method} ${path}`);
        assert.ok(op.description, `${method} ${path}`);
      }
    }
  },
);

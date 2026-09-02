import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

import assert from "node:assert/strict";
import { test } from "node:test";

import { pageToMarkdown } from "./markdown.ts";

const page = `<!doctype html><html><head><title>t</title><style>x{}</style></head><body>
<header><nav><a href="/tides/">Tides</a></nav></header>
<main class="flex-1">
  <h1>Open Source Marine Software</h1>
  <p>Understand and <em>navigate</em> the sea.</p>
  <h2 class="sr-only">Tools</h2>
  <a href="/viewer/#9/65/-23"><div class="map"></div></a>
  <a href="/tides/"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg><h3>Tides</h3><p>Predictions.</p></a>
  <ul><li>one</li><li>two</li></ul>
  <pre><code>curl https://api.openwaters.io/tides</code></pre>
  <script>alert(1)</script>
</main>
<footer><h3>Open Waters</h3></footer></body></html>`;

test("pageToMarkdown: converts only <main>, dropping chrome and scripts", () => {
  const md = pageToMarkdown(page);
  assert.ok(md.startsWith("# Open Source Marine Software"));
  assert.match(md, /Understand and _navigate_ the sea\./);
  assert.match(md, /^## Tools$/m);
  assert.match(md, /^### Tides\n\n\[Predictions\.\]\(\/tides\/\)$/m);
  assert.match(md, /^-\s+one\n-\s+two$/m);
  assert.match(md, /```\ncurl https:\/\/api\.openwaters\.io\/tides\n```/);
  assert.ok(!md.includes("alert("));
  assert.ok(!md.includes("<svg"));
  assert.ok(!md.includes("[](/viewer"), "empty link leaked");
  assert.ok(!md.includes("x{}"));
  assert.ok(!md.includes("Open Waters\n"), "footer leaked");
  assert.ok(!md.includes("[Tides](/tides/)\n\n#"), "nav leaked");
});

test("pageToMarkdown: a document without <main> converts whole", () => {
  assert.match(pageToMarkdown("<h1>x</h1>"), /^# x/);
});

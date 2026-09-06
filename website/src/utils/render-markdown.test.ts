import assert from "node:assert/strict";
import { test } from "node:test";
import { md, mdInline } from "./render-markdown.ts";

test("raw HTML in a description is shown as text, not rendered", () => {
  const html = md('before <img src=x onerror="alert(1)"> after');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("links keep to http(s), mailto, and same-site paths", () => {
  assert.match(
    mdInline("[a](https://example.com)"),
    /href="https:\/\/example.com"/,
  );
  assert.match(mdInline("[a](mailto:hi@example.com)"), /href="mailto:/);
  assert.match(mdInline("[a](/api/#limits)"), /href="\/api\/#limits"/);
  assert.equal(mdInline("[click](javascript:alert(1))"), "click");
  assert.equal(mdInline("[click](//evil.example/x)"), "click");
  assert.equal(mdInline("![x](javascript:alert(1))"), "x");
});

test("markdown that the specs actually use still renders", () => {
  assert.match(
    mdInline("send `Authorization: Bearer <token>`"),
    /<code>Authorization: Bearer &lt;token&gt;<\/code>/,
  );
  assert.match(
    md("```\nAIS-catcher -u host 10110\n```"),
    /<pre><code>AIS-catcher -u host 10110\n<\/code><\/pre>/,
  );
});

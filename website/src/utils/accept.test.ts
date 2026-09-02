import assert from "node:assert/strict";
import { test } from "node:test";

import { negotiate, quality } from "./accept.ts";

test("negotiate: missing, empty or wildcard Accept serves the default", () => {
  assert.equal(negotiate(null), "text/html");
  assert.equal(negotiate(""), "text/html");
  assert.equal(negotiate("*/*"), "text/html");
  assert.equal(negotiate("text/*"), "text/html");
});

test("negotiate: an explicit markdown request wins", () => {
  assert.equal(negotiate("text/markdown"), "text/markdown");
  assert.equal(negotiate("text/markdown, */*;q=0.1"), "text/markdown");
  assert.equal(negotiate("TEXT/MARKDOWN; charset=utf-8"), "text/markdown");
});

test("negotiate: q-values decide, not listing order", () => {
  assert.equal(negotiate("text/html;q=0.5, text/markdown"), "text/markdown");
  assert.equal(negotiate("text/markdown;q=0.5, text/html"), "text/html");
  assert.equal(negotiate("text/markdown;q=0.8, text/html;q=0.9"), "text/html");
});

test("negotiate: equal q breaks ties by client order", () => {
  assert.equal(negotiate("text/markdown, text/html"), "text/markdown");
  assert.equal(negotiate("text/html, text/markdown"), "text/html");
});

test("negotiate: exact types beat wildcards regardless of order", () => {
  // A browser-style header: html explicitly, everything else at low q.
  assert.equal(
    negotiate(
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ),
    "text/html",
  );
  // */* at q=1 but markdown named explicitly at lower q: markdown's exact entry is
  // its match (q=0.5); html matches */* (q=1) and wins.
  assert.equal(negotiate("*/*, text/markdown;q=0.5"), "text/html");
});

test("negotiate: q=0 is an explicit rejection", () => {
  assert.equal(negotiate("text/markdown;q=0, */*"), "text/html");
  assert.equal(negotiate("text/html;q=0, text/markdown"), "text/markdown");
  assert.equal(negotiate("text/html;q=0, text/markdown;q=0"), null);
});

test("negotiate: nothing we serve is acceptable", () => {
  assert.equal(negotiate("application/pdf"), null);
  assert.equal(negotiate("application/json, image/*"), null);
});

test("negotiate: malformed q-values are tolerated", () => {
  assert.equal(negotiate("text/markdown;q=abc, text/html"), "text/html");
  assert.equal(negotiate("text/markdown;q=5"), "text/markdown");
});

test("quality: the q the client gave a type, by most specific match", () => {
  assert.equal(quality(null, "text/html").q, 1);
  assert.equal(quality("text/markdown, */*;q=0.5", "text/html").q, 0.5);
  assert.equal(quality("text/markdown", "text/html").q, 0);
  assert.equal(quality("text/*;q=0.3, text/html;q=0", "text/html").q, 0);
  assert.equal(quality("text/*;q=0.3, text/html;q=0", "text/markdown").q, 0.3);
});

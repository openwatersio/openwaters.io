import assert from "node:assert/strict";
import { test } from "node:test";

import { isPage, markdownPath, serve } from "./negotiate.ts";

const html = (status = 200) =>
  new Response("<h1>Hi</h1>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

// A fake ASSETS binding: knows one Markdown file.
const assets = async (request: Request) =>
  new URL(request.url).pathname === "/about/index.md"
    ? new Response("# Hi", {
        headers: { "content-type": "text/markdown", etag: '"abc"' },
      })
    : new Response("Not found", { status: 404 });

const get = (path: string, accept?: string, method = "GET") =>
  new Request(`https://openwaters.io${path}`, {
    method,
    headers: accept ? { accept } : {},
  });

test("isPage/markdownPath: directory URLs are pages, files are not", () => {
  assert.equal(isPage("/"), true);
  assert.equal(isPage("/about/"), true);
  assert.equal(isPage("/openapi.json"), false);
  assert.equal(isPage("/about"), false); // the handler redirects to /about/ first
  assert.equal(markdownPath("/about/"), "/about/index.md");
});

test("serve: Accept: text/markdown gets the sibling with the required headers", async () => {
  const res = await serve(
    get("/about/", "text/markdown"),
    async () => html(),
    assets,
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(res.headers.get("vary"), "Accept");
  assert.equal(res.headers.get("etag"), '"abc"');
  assert.equal(await res.text(), "# Hi");
});

test("serve: no Accept header is the default representation", async () => {
  const res = await serve(get("/about/"), async () => html(), assets);
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("vary"), "Accept");
});

test("serve: Vary is appended to an existing value, once", async () => {
  const page = async () => {
    const res = html();
    res.headers.set("vary", "Accept-Encoding");
    return res;
  };
  const res = await serve(get("/about/", "text/html"), page, assets);
  assert.equal(res.headers.get("vary"), "Accept-Encoding, Accept");
  const already = async () => {
    const res = html();
    res.headers.set("vary", "Accept, Accept-Encoding");
    return res;
  };
  assert.equal(
    (await serve(get("/about/"), already, assets)).headers.get("vary"),
    "Accept, Accept-Encoding",
  );
});

test("serve: a page without Markdown falls back to HTML when acceptable", async () => {
  const res = await serve(
    get("/tides/stations/noaa/1/", "text/markdown, */*;q=0.5"),
    async () => html(),
    assets,
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(res.headers.get("vary"), "Accept");
});

test("serve: 406 when nothing we have is acceptable", async () => {
  for (const accept of [
    "application/pdf",
    "text/markdown;q=0, text/html;q=0",
  ]) {
    const res = await serve(get("/about/", accept), async () => html(), assets);
    assert.equal(res.status, 406, accept);
    assert.equal(res.headers.get("vary"), "Accept");
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.match(await res.text(), /text\/html\n- text\/markdown/);
  }
  // Markdown only, and this page has none.
  const res = await serve(
    get("/tides/stations/noaa/1/", "text/markdown"),
    async () => html(),
    assets,
  );
  assert.equal(res.status, 406);
});

test("serve: error pages get Vary, whatever was asked for", async () => {
  for (const accept of ["text/html", "text/markdown"]) {
    const res = await serve(
      get("/nope/", accept),
      async () => html(404),
      assets,
    );
    assert.equal(res.status, 404, accept);
    assert.equal(res.headers.get("vary"), "Accept");
  }
});

test("serve: non-page URLs and non-GET methods are passed through untouched", async () => {
  let calls = 0;
  const page = async () => {
    calls++;
    return new Response("{}", {
      headers: { "content-type": "application/json" },
    });
  };
  const res = await serve(get("/openapi.json", "text/markdown"), page, assets);
  assert.equal(res.headers.get("vary"), null);
  await serve(get("/about/", "text/markdown", "POST"), page, assets);
  assert.equal(calls, 2);
});

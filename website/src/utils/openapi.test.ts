import assert from "node:assert/strict";
import { test } from "node:test";

import { openApiDocument } from "./openapi.ts";

test("openApiDocument: a valid-shaped OpenAPI 3 document addressed at the API host", async () => {
  const doc = await openApiDocument("https://api.openwaters.io");
  assert.match(doc.openapi, /^3\./);
  assert.equal(doc.info.title, "Open Waters API");
  assert.ok(doc.info.version);
  assert.deepEqual(doc.servers, [{ url: "https://api.openwaters.io" }]);
  assert.deepEqual(doc.security, []);
});

test("openApiDocument: every path is mounted under /tides", async () => {
  const { paths } = await openApiDocument("https://api.openwaters.io");
  const keys = Object.keys(paths);
  assert.ok(keys.includes("/tides"));
  assert.ok(keys.includes("/tides/stations/{source}/{id}"));
  assert.ok(
    keys.every((path) => path === "/tides" || path.startsWith("/tides/")),
  );
});

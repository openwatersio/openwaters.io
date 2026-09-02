import assert from "node:assert/strict";
import { test } from "node:test";

import { AIS_OPENAPI_URL, openApiDocument } from "./openapi.ts";

test("openApiDocument: a valid-shaped OpenAPI 3 document addressed at the API host", async () => {
  const doc = await openApiDocument("https://api.openwaters.io");
  assert.match(doc.openapi, /^3\./);
  assert.equal(doc.info.title, "Open Waters API");
  assert.ok(doc.info.version);
  assert.deepEqual(doc.servers, [{ url: "https://api.openwaters.io" }]);
  assert.deepEqual(doc.security, []);
  assert.ok(doc.info.description.includes(AIS_OPENAPI_URL));
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

test("openApiDocument: every operation has a unique operationId and a description", async () => {
  const { paths } = await openApiDocument("https://api.openwaters.io");
  const ids: string[] = [];
  for (const [path, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      assert.match(op.operationId, /^[a-z][A-Za-z]+$/, `${method} ${path}`);
      assert.ok(op.description, `${method} ${path} has no description`);
      ids.push(op.operationId);
    }
  }
  assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids}`);
  assert.equal(
    paths["/tides/stations/{source}/{id}/extremes"].get.operationId,
    "getTidesStationsBySourceAndIdExtremes",
  );
  assert.equal(
    paths["/tides/openapi"]?.get.operationId ??
      paths["/tides/openapi.json"].get.operationId,
    "getTidesOpenapi",
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AIS_OPENAPI_URL,
  getCurrentsOpenAPISpec,
  mergeAgreeing,
  openApiDocument,
} from "./openapi.ts";

test("openApiDocument: a valid-shaped OpenAPI 3 document addressed at the API host", async () => {
  const doc = await openApiDocument("https://api.openwaters.io");
  assert.match(doc.openapi, /^3\./);
  assert.equal(doc.info.title, "Open Waters API");
  assert.ok(doc.info.version);
  assert.deepEqual(doc.servers, [{ url: "https://api.openwaters.io" }]);
  assert.deepEqual(doc.security, []);
  assert.ok(doc.info.description.includes(AIS_OPENAPI_URL));
});

test("openApiDocument: every path is mounted under /tides or /currents", async () => {
  const { paths } = await openApiDocument("https://api.openwaters.io");
  const keys = Object.keys(paths);
  assert.ok(keys.includes("/tides"));
  assert.ok(keys.includes("/tides/stations/{source}/{id}"));
  assert.ok(keys.includes("/currents"));
  assert.ok(keys.includes("/currents/events"));
  assert.ok(keys.includes("/currents/stations/{source}/{id}/events"));
  assert.ok(
    keys.every((path) =>
      ["/tides", "/currents"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      ),
    ),
    keys.join(", "),
  );
});

test("openApiDocument: every $ref resolves to a component in the document", async () => {
  const doc = await openApiDocument("https://api.openwaters.io");
  const refs = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "$ref" && typeof child === "string") refs.add(child);
        else walk(child);
      }
    }
  };
  walk(doc.paths);
  walk(doc.components);
  assert.ok(refs.has("#/components/schemas/CurrentEventsResponse"));
  for (const ref of refs) {
    const [, , kind, name] = ref.split("/");
    const group = (doc.components as Record<string, Record<string, unknown>>)[
      kind
    ];
    assert.ok(group?.[name], `unresolved ${ref}`);
  }
});

test("getCurrentsOpenAPISpec: the currents spec mounted under /currents", async () => {
  const spec = await getCurrentsOpenAPISpec();
  const keys = Object.keys(spec.paths);
  assert.ok(keys.includes("/currents"));
  assert.ok(keys.includes("/currents/openapi.json"));
  assert.ok(keys.includes("/currents/timeline"));
  assert.ok(!keys.some((path) => path.startsWith("/tides")));
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
  assert.equal(
    paths["/currents/stations/{source}/{id}/events"].get.operationId,
    "getCurrentsStationsBySourceAndIdEvents",
  );
  assert.equal(
    paths["/currents/stations/{id}"].get.operationId,
    "getCurrentsStationsById",
  );
});

test("mergeAgreeing: shared names must have identical definitions", () => {
  const start = { name: "start", in: "query" };
  assert.deepEqual(
    mergeAgreeing("parameters", { start }, { start: { ...start }, bin: {} }),
    { start, bin: {} },
  );
  assert.throws(
    () => mergeAgreeing("parameters", { start }, { start: { name: "from" } }),
    /parameters "start"/,
  );
});

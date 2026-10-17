import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";
import { stationStatus } from "./station-status.ts";
import { track } from "./analytics.ts";
import { aiscatcherConfig } from "./aiscatcher-config.ts";

const source = readFileSync(
  new URL("../pages/ais/token.astro", import.meta.url),
  "utf8",
).match(/<script>([\s\S]*?)<\/script>/)![1];
const script = stripTypeScriptTypes(
  source.replace(
    /import \{([^}]+)\} from ([^;]+);/g,
    "const {$1} = require($2);",
  ),
);
const claims = {
  kid: "test",
  sub: `ed25519:${"A".repeat(43)}`,
  role: "personal",
  exp: 0,
};
const token = `ak1.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${"A".repeat(86)}`;
const issued = { token, claims };

function page(
  options: {
    cache?: string;
    response?: unknown;
    httpError?: boolean;
    networkError?: boolean;
    storageError?: boolean;
    status?: unknown;
    statusCode?: number;
    analyticsError?: boolean;
  } = {},
) {
  const events: unknown[] = [];
  const downloads = new Map<string, Blob>();
  const revoked: string[] = [];
  const saved = new Map<string, string>(
    options.cache ? [["aiscast.token", options.cache]] : [],
  );
  const handlers = new Map<string, (event?: unknown) => unknown>();
  const elements = new Map<string, any>();
  const order: string[] = [];
  const polls: (() => unknown)[] = [];
  for (const selector of [
    "data-form",
    "data-token",
    "data-config-download",
    "data-sub",
    "data-stlink",
    "data-cmd-aiscatcher",
    "data-cmd-aiscatcher-http",
    "data-cmd-ws",
    "data-out",
    "data-rx",
    "data-rx-dot",
    "data-rx-ping",
    "data-name",
    "data-status",
    "data-agree",
    "data-go",
    "data-bind",
    "data-go-label",
    "data-copy",
    "data-copy-label",
    "data-regen",
  ]) {
    let text = "";
    elements.set(`[${selector}]`, {
      hidden: true,
      value: "",
      checked: selector === "data-agree",
      disabled: false,
      focus() {},
      scrollIntoView() {},
      addEventListener(type: string, fn: () => unknown) {
        handlers.set(`${selector}:${type}`, fn);
      },
      get textContent() {
        return text;
      },
      set textContent(value: string) {
        text = value;
        if (selector === "data-token") order.push("display");
      },
    });
  }
  const root = {
    dataset: { server: "https://ais.test", stations: "/ais/stations" },
    querySelector: (sel: string) => elements.get(sel),
  };
  let status: unknown = options.status ?? { station: { last_age_s: 600 } };
  let statusCode = options.statusCode ?? 200;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      plausible: (name: string, opts: { props: unknown }) => {
        if (options.analyticsError) throw Error("blocked");
        order.push("event");
        events.push(JSON.parse(JSON.stringify({ name, props: opts.props })));
      },
    },
  });
  const context = createContext({
    exports: {},
    require: (name: string) =>
      name.includes("station-status")
        ? { stationStatus }
        : name.includes("analytics")
          ? { track }
          : name.includes("aiscatcher-config")
            ? { aiscatcherConfig }
            : null,
    document: { querySelector: () => root },
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (options.storageError && key === "aiscast.token")
          throw Error("storage denied");
        saved.set(key, value);
        if (key === "aiscast.token") order.push("save");
      },
    },
    Blob,
    URL: {
      createObjectURL(blob: Blob) {
        const url = `blob:test-${downloads.size}`;
        downloads.set(url, blob);
        return url;
      },
      revokeObjectURL(url: string) {
        revoked.push(url);
      },
    },
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    btoa: (value: string) => Buffer.from(value, "binary").toString("base64"),
    atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
    setInterval: (fn: () => unknown) => {
      polls.push(fn);
      return polls.length;
    },
    clearInterval() {},
    setTimeout() {},
    navigator: { clipboard: { writeText: async () => {} } },
    fetch: async (_url: string, init?: { method: string }) => {
      if (init?.method === "POST") {
        if (options.networkError) throw Error("network");
        return {
          ok: !options.httpError,
          status: options.httpError ? 500 : 200,
          text: async () => "server error",
          json: async () =>
            options.response === undefined ? issued : options.response,
        };
      }
      return {
        ok: statusCode === 200,
        status: statusCode,
        json: async () => status,
      };
    },
  });
  runInContext(script, context);
  return {
    events,
    downloads,
    revoked,
    saved,
    order,
    elements,
    async generate() {
      await handlers.get("data-go:click")!();
      await new Promise((resolve) => setImmediate(resolve));
    },
    async poll(value: unknown, code = 200) {
      status = value;
      statusCode = code;
      await polls.at(-1)?.();
    },
    reopen() {
      handlers.get("data-regen:click")!();
    },
  };
}

test("token issuance is measured after persistence and display, including a name warning", async () => {
  for (const response of [
    issued,
    { ...issued, name_error: "name unavailable" },
  ]) {
    const p = page({ response });
    await p.generate();
    assert.equal(p.saved.get("aiscast.token"), JSON.stringify(issued));
    assert.equal(p.elements.get("[data-out]").hidden, false);
    assert.deepEqual(p.events, [
      { name: "ais_token_issued", props: { operation: "initial" } },
    ]);
    assert.deepEqual(
      p.order.filter((x) => ["save", "display", "event"].includes(x)),
      ["save", "display", "event"],
    );
  }
});

test("cached restore and reopening do not issue tokens; a new response is a reissue", async () => {
  const p = page({ cache: JSON.stringify(issued) });
  assert.deepEqual(p.events, []);
  p.reopen();
  assert.deepEqual(p.events, []);
  await p.generate();
  assert.deepEqual(p.events, [
    { name: "ais_token_issued", props: { operation: "reissue" } },
  ]);
});

test("expired or malformed cached tokens do not break creation or count as reissues", async () => {
  for (const cache of [
    "not-json",
    JSON.stringify({ token, claims: { ...claims, exp: 1 } }),
    JSON.stringify({ token: "", claims }),
    JSON.stringify({ token, claims: { sub: 2 } }),
  ]) {
    const p = page({ cache });
    await p.generate();
    assert.deepEqual(p.events, [
      { name: "ais_token_issued", props: { operation: "initial" } },
    ]);
  }
});

test("failed and malformed responses never issue an event", async () => {
  for (const options of [
    { httpError: true },
    { networkError: true },
    { storageError: true },
    ...[
      null,
      {},
      { token: "", claims },
      { token: "garbage", claims },
      { token: "ak1.a.b", claims },
      { token, claims: { ...claims, sub: "ed25519:x" } },
      { token, claims: { ...claims, sub: `ed25519:${"B".repeat(43)}` } },
      {
        token,
        claims: { ...claims, exp: Math.floor(Date.now() / 1000) + 3600 },
      },
      { token, claims: null },
      { token, claims: { sub: 2 } },
      { token, claims: { ...claims, exp: 1 } },
      { token, claims: { ...claims, exp: "never" } },
    ].map((response) => ({ response })),
  ]) {
    const p = page(options);
    await p.generate();
    assert.deepEqual(p.events, []);
    assert.equal(p.elements.get("[data-out]").hidden, true);
  }
});

test("receiving is observed once, never for failed, missing, stale or invalid status", async () => {
  const p = page();
  await p.generate();
  for (const [age, code] of [
    [0, 500],
    [0, 404],
    [300, 200],
    [-1, 200],
    ["1", 200],
    [null, 200],
    [NaN, 200],
    [Infinity, 200],
  ])
    await p.poll({ station: { last_age_s: age } }, code as number);
  assert.equal(p.events.length, 1);
  await p.poll({ station: { last_age_s: 299 } });
  await p.poll({ station: { last_age_s: 1 } });
  await p.poll({ station: { last_age_s: 0 } });
  assert.deepEqual(p.events, [
    { name: "ais_token_issued", props: { operation: "initial" } },
    { name: "ais_station_receiving_observed", props: {} },
  ]);
});

test("blocked analytics cannot break a saved displayed token", async () => {
  const p = page({ analyticsError: true });
  await p.generate();
  assert.equal(p.elements.get("[data-out]").hidden, false);
  assert.equal(p.saved.get("aiscast.token"), JSON.stringify(issued));
  assert.equal(p.elements.get("[data-status]").textContent, "");
});

test("restored and regenerated tokens have a downloadable config without retaining the old URL", async () => {
  const p = page({ cache: JSON.stringify(issued) });
  const firstUrl = p.elements.get("[data-config-download]").href;
  const firstConfig = p.downloads.get(firstUrl)!;
  assert.equal(firstConfig.type, "application/json");
  assert.equal(await firstConfig.text(), aiscatcherConfig(token));
  await p.generate();
  const nextUrl = p.elements.get("[data-config-download]").href;
  assert.notEqual(nextUrl, firstUrl);
  assert.deepEqual(p.revoked, [firstUrl]);
  assert.equal(await p.downloads.get(nextUrl)!.text(), aiscatcherConfig(token));
});

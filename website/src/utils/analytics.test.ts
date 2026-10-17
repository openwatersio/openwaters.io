import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handoff,
  sanitizePayload,
  startAnalytics,
  track,
} from "./analytics.ts";

const pages = ["/", "/ais/", "/ais/token/", "/api/ais/", "/contact/"];

test("analytics removes unreviewed URL, referrer, property and payload fields", () => {
  const clean = sanitizePayload(
    {
      n: "pageview",
      v: 36,
      d: "evil.example",
      u: "https://openwaters.io/ais/token/?key=SECRET&bbox=48,-123&source=SECRET&utm_source=github&utm_medium=referral&utm_campaign=SECRET#SECRET",
      r: "https://github.com/private/SECRET?token=SECRET#SECRET",
      p: { token: "SECRET" },
      $: { amount: "SECRET" },
      m: "SECRET",
      h: "SECRET",
    },
    pages,
  );
  assert.deepEqual(clean, {
    n: "pageview",
    v: 36,
    d: "openwaters.io",
    u: "https://openwaters.io/ais/token/?utm_source=github&utm_medium=referral",
    r: "https://github.com/",
  });
  assert.doesNotMatch(JSON.stringify(clean), /SECRET|48|-123/);
});

test("analytics groups identifying and unknown paths and drops unapproved referrers", () => {
  for (const [path, expected] of [
    ["/ais/vessels/123456789-private-name", "/ais/vessels/_redacted/"],
    ["/ais/stations/station:ed25519:SECRET", "/ais/stations/_redacted/"],
    ["/tides/stations/noaa/SECRET/", "/tides/stations/_redacted/"],
    ["/SECRET/", "/404/"],
  ]) {
    const clean = sanitizePayload(
      {
        n: "pageview",
        u: `https://openwaters.io${path}?lat=48&lon=-123#SECRET`,
        r: "https://SECRET.example/SECRET",
      },
      pages,
    );
    assert.equal(clean?.u, `https://openwaters.io${expected}`);
    assert.equal(clean?.r, null);
  }
  assert.equal(
    sanitizePayload(
      {
        n: "pageview",
        u: "https://openwaters.io/ais/",
        r: "https://openwaters.io/ais/token/?key=SECRET",
      },
      pages,
    )?.r,
    "https://openwaters.io/ais/token/",
  );
  assert.equal(
    sanitizePayload(
      {
        n: "pageview",
        u: "https://openwaters.io/ais/",
        r: "https://private.google.com/search?q=SECRET",
      },
      pages,
    )?.r,
    "https://google.com/",
  );
});

test("analytics only sends defined events and enumerated properties", () => {
  const base = {
    u: "https://openwaters.io/ais/token/?token=SECRET",
    r: "",
    v: 36,
  };
  assert.equal(sanitizePayload({ ...base, n: "SECRET" }, pages), null);
  assert.equal(
    sanitizePayload(
      {
        ...base,
        n: "Outbound Link: Click",
        p: { url: "https://SECRET.example" },
      },
      pages,
    ),
    null,
  );
  assert.equal(
    sanitizePayload(
      { ...base, n: "ais_token_issued", p: { operation: "SECRET" } },
      pages,
    ),
    null,
  );
  assert.deepEqual(
    sanitizePayload(
      {
        ...base,
        n: "ais_token_issued",
        p: { operation: "initial", token: "SECRET" },
      },
      pages,
    ),
    {
      n: "ais_token_issued",
      v: 36,
      d: "openwaters.io",
      u: "https://openwaters.io/ais/token/",
      r: null,
      p: { operation: "initial" },
    },
  );
  assert.equal(
    sanitizePayload(
      { ...base, n: "pageview", u: "https://evil.example/ais/" },
      pages,
    ),
    null,
  );
});

test("resource and contact handoffs use fixed labels instead of destination strings", () => {
  assert.deepEqual(
    handoff(
      "https://www.npmjs.com/package/signalk-aiscast?token=SECRET#SECRET",
      "/ais/signalk/",
    ),
    {
      name: "resource_handoff",
      props: { resource: "signalk-package", action: "package" },
    },
  );
  assert.deepEqual(
    handoff(
      "https://github.com/openwatersio/slackwater-database/releases",
      "/tides/database/",
    ),
    {
      name: "resource_handoff",
      props: { resource: "tide-database-releases", action: "download" },
    },
  );
  assert.deepEqual(
    handoff(
      "https://tiles.openwaters.io/seascape/manifest.json?bbox=SECRET",
      "/charts/seascape/",
    ),
    {
      name: "resource_handoff",
      props: { resource: "seascape-manifest", action: "manifest" },
    },
  );
  assert.deepEqual(
    handoff("mailto:hello@openwaters.io?body=SECRET", "/ais/token/"),
    { name: "contact_started", props: { context: "ais-token" } },
  );
  for (const href of [
    "/api/ais/",
    "https://evil.example/",
    "javascript:SECRET",
    "mailto:SECRET@example.com",
    "https://SECRET@github.com/openwatersio/aiscast",
    "https://github.com/openwatersio/aiscast/issues/SECRET",
  ]) {
    assert.equal(handoff(href, "/ais/"), null);
  }
});

test("deferred tracking queues early events and installs one privacy-safe set of handlers", () => {
  const listeners = new Map<string, (event: unknown) => void>();
  const scripts: any[] = [];
  class Link {
    href: string;
    constructor(href: string) {
      this.href = href;
    }
    closest() {
      return this;
    }
  }
  const win = {
    location: { hostname: "openwaters.io", pathname: "/ais/token/" },
    plausible: undefined as any,
  };
  const originals = Object.getOwnPropertyDescriptors(globalThis);
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: win },
    document: {
      configurable: true,
      value: {
        createElement: () => ({}),
        head: { append: (script: unknown) => scripts.push(script) },
        addEventListener: (name: string, handler: (event: unknown) => void) => {
          assert.equal(listeners.has(name), false);
          listeners.set(name, handler);
        },
      },
    },
    Element: { configurable: true, value: Link },
    HTMLAnchorElement: { configurable: true, value: Link },
  });
  try {
    track("ais_token_issued", { operation: "initial" });
    startAnalytics(pages);
    startAnalytics(pages);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].referrerPolicy, "no-referrer");
    assert.match(scripts[0].src, /^https:\/\/plausible.io\/js\/pa-[\w-]+\.js$/);
    assert.equal(win.plausible.o.outboundLinks, false);
    assert.equal(win.plausible.o.fileDownloads, false);
    assert.equal(win.plausible.o.formSubmissions, false);
    const event = (href: string, extra = {}) => ({
      type: "click",
      button: 0,
      target: new Link(href),
      defaultPrevented: false,
      ...extra,
    });
    listeners.get("click")!(event("mailto:hello@openwaters.io?body=SECRET"));
    listeners.get("auxclick")!(
      event("https://www.npmjs.com/package/signalk-aiscast", {
        type: "auxclick",
        button: 1,
      }),
    );
    listeners.get("click")!(
      event("https://github.com/openwatersio/aiscast", {
        defaultPrevented: true,
      }),
    );
    listeners.get("auxclick")!(
      event("https://github.com/openwatersio/aiscast", {
        type: "auxclick",
        button: 2,
      }),
    );
    listeners.get("click")!(event("/api/ais/"));
    assert.deepEqual(win.plausible.q, [
      ["ais_token_issued", { props: { operation: "initial" } }],
      ["contact_started", { props: { context: "ais-token" } }],
      [
        "resource_handoff",
        { props: { resource: "signalk-package", action: "package" } },
      ],
    ]);
    const payload = win.plausible.o.transformRequest({
      n: "pageview",
      u: "https://openwaters.io/ais/token/?key=SECRET",
      r: "https://SECRET.example/",
    });
    assert.equal(payload.u, "https://openwaters.io/ais/token/");
    assert.equal(payload.r, null);
    win.plausible = () => {
      throw Error("tracker blocked");
    };
    assert.doesNotThrow(() =>
      track("ais_token_issued", { operation: "initial" }),
    );
  } finally {
    for (const name of ["window", "document", "Element", "HTMLAnchorElement"]) {
      if (originals[name])
        Object.defineProperty(globalThis, name, originals[name]);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

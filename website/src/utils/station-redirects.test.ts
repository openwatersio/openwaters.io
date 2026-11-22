import assert from "node:assert/strict";
import { test } from "node:test";

import { loadStations } from "@slackwater/database";

import {
  type Database,
  type Kind,
  type Route,
  type Targets,
  stationRedirect,
  stationTargets,
} from "./station-redirects.ts";

const published = {
  license: { commercial_use: true },
  harmonic_constituents: [{}],
};

const fixture = (
  routes: Partial<Record<Kind, Route[]>>,
  records: Record<string, object>,
  rejected: string[] = [],
): Database => ({
  stationRoutes: (kind) => routes[kind] ?? [],
  byId: (id) => records[id],
  accepted: Object.keys(records)
    .filter((id) => !rejected.includes(id))
    .map((id) => ({ id })),
});

test("stationTargets: a published station maps to its own path", () => {
  const targets = stationTargets(
    fixture(
      { tide: [{ path: "/tides/us/pa/bridesburg/", stationIds: ["noaa/1"] }] },
      { "noaa/1": published },
    ),
  );
  assert.equal(targets.pages["noaa/1"], "/tides/us/pa/bridesburg/");
});

test("stationTargets: every id on a merged route maps to that route", () => {
  const targets = stationTargets(
    fixture(
      {
        tide: [
          { path: "/tides/us/hi/kahului/", stationIds: ["noaa/1", "ticon/k"] },
        ],
      },
      { "noaa/1": published, "ticon/k": { ...published, license: {} } },
    ),
  );
  assert.equal(targets.pages["ticon/k"], "/tides/us/hi/kahului/");
});

test("stationTargets: an unpublished station falls back to the nearest place page", () => {
  const targets = stationTargets(
    fixture(
      {
        tide: [
          { path: "/tides/ca/bc/victoria/", stationIds: ["ticon/v"] },
          { path: "/tides/ca/bc/rejected/", stationIds: ["ticon/r"] },
          { path: "/tides/ca/ns/withheld/", stationIds: ["ticon/ns"] },
          { path: "/tides/ca/withheld/", stationIds: ["ticon/ca"] },
          { path: "/tides/zz/nowhere/", stationIds: ["ticon/nc"] },
        ],
      },
      {
        "ticon/v": published,
        "ticon/r": published,
        "ticon/ns": published,
        "ticon/ca": published,
        "ticon/nc": { ...published, license: { commercial_use: false } },
      },
      ["ticon/r", "ticon/ns", "ticon/ca"],
    ),
  );
  // Withheld by the quality pass: its subdivision has a page.
  assert.equal(targets.fallbacks["ticon/r"], "/tides/ca/bc/");
  // No published station in Nova Scotia, so the country page.
  assert.equal(targets.fallbacks["ticon/ns"], "/tides/ca/");
  assert.equal(targets.fallbacks["ticon/ca"], "/tides/ca/");
  // Nothing published anywhere above it.
  assert.equal(targets.fallbacks["ticon/nc"], "/tides/");
});

test("stationTargets: every curated CHS gate and tide port has a page", () => {
  const chs = { source: { name: "Canadian Hydrographic Service" } };
  const targets = stationTargets(
    fixture(
      {
        tide: [{ path: "/tides/ca/bc/port/", stationIds: ["chs-port"] }],
        current: [
          { path: "/currents/ca/bc/gate/", stationIds: ["chs-gate"] },
          {
            path: "/currents/ca/bc/arran-rapids/",
            stationIds: ["chs-arran-rapids"],
          },
          { path: "/currents/us/wa/noaa/", stationIds: ["noaa/c"] },
        ],
      },
      {
        "chs-port": chs,
        "chs-gate": chs,
        "chs-arran-rapids": chs,
        "noaa/c": {
          license: { commercial_use: true },
          current: { offsets: {} },
        },
      },
    ),
  );
  assert.equal(targets.pages["chs-gate"], "/currents/ca/bc/gate/");
  assert.equal(
    targets.pages["chs-arran-rapids"],
    "/currents/ca/bc/arran-rapids/",
  );
  assert.equal(targets.pages["chs-port"], "/tides/ca/bc/port/");
  // A NOAA subordinate current is predicted from its reference's offsets.
  assert.equal(targets.pages["noaa/c"], "/currents/us/wa/noaa/");
});

const targets: Targets = {
  pages: { "noaa/1": "/tides/us/pa/bridesburg/" },
  fallbacks: { "chs-a": "/tides/ca/" },
};
const redirect = (path: string) => {
  const res = stationRedirect(new URL(`https://openwaters.io${path}`), targets);
  return (
    res && {
      location: res.headers.get("location"),
      status: res.status,
      cache: res.headers.get("cache-control"),
    }
  );
};

const DAY = "public, max-age=86400";

test("stationRedirect: a station page is a permanent redirect, with or without a slash", () => {
  for (const path of [
    "/tides/stations/noaa/1/",
    "/tides/stations/noaa/1",
    "/tides/stations/noaa%2F1/",
  ]) {
    assert.deepEqual(redirect(path), {
      location: "https://slackwater.xyz/tides/us/pa/bridesburg/",
      status: 301,
      cache: DAY,
    });
  }
});

test("stationRedirect: the query string carries over", () => {
  assert.equal(
    redirect("/tides/stations/noaa/1/?utm_source=x")?.location,
    "https://slackwater.xyz/tides/us/pa/bridesburg/?utm_source=x",
  );
});

test("stationRedirect: the index moves permanently to the station hub", () => {
  for (const path of ["/tides/stations", "/tides/stations/"]) {
    assert.deepEqual(redirect(path), {
      location: "https://slackwater.xyz/stations/",
      status: 301,
      cache: DAY,
    });
  }
});

test("stationRedirect: fallbacks are temporary, so a later page can replace them", () => {
  assert.deepEqual(redirect("/tides/stations/chs-a/"), {
    location: "https://slackwater.xyz/tides/ca/",
    status: 302,
    cache: null,
  });
  for (const path of [
    "/tides/stations/noaa/999/",
    "/tides/stations/toString/",
    "/tides/stations/%E0%A4%A/",
  ]) {
    assert.deepEqual(
      redirect(path),
      {
        location: "https://slackwater.xyz/stations/",
        status: 302,
        cache: null,
      },
      path,
    );
  }
});

test("stationRedirect: other paths are left alone", () => {
  for (const path of ["/tides/", "/tides/stationsx/", "/api/tides/stations/"]) {
    assert.equal(redirect(path), null, path);
  }
});

test("stationTargets: the real database", async () => {
  const database = await loadStations();
  const real = stationTargets(database);
  // A NOAA reference station, a NOAA subordinate, and a CHS current gate.
  assert.equal(real.pages["noaa/8722588"], "/tides/us/fl/port-of-palm-beach/");
  assert.equal(real.pages["noaa/1611401"], "/tides/us/hi/waimea-bay/");
  assert.equal(
    real.pages["chs-seymour-narrows"],
    "/currents/ca/bc/seymour-narrows/",
  );
  // A CHS tide port, published with predictions fetched from CHS in the browser.
  assert.equal(
    real.pages["chs-abbotts-harbour"],
    "/tides/ca/ns/abbotts-harbour/",
  );
  // Every routed id has a target, and every target is a slackwater.xyz path.
  for (const kind of ["tide", "current"] as const) {
    for (const route of database.stationRoutes(kind)) {
      for (const id of route.stationIds) {
        const path = real.pages[id] ?? real.fallbacks[id] ?? "";
        assert.match(path, /^\/(tides|currents)\/([a-z0-9-]+\/)*$/);
      }
    }
  }
});

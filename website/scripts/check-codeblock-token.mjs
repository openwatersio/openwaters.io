// Checks the two behaviours CodeBlock.astro adds, against the real built page:
// the copy button writes the block's current text, and `<token>` is replaced by
// the token /ais/token/ leaves in localStorage.
//
//   node scripts/check-codeblock-token.mjs
//
// Needs a dev server; it starts one itself on a free port. Run from website/.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { once } from "node:events";

const FAKE = "ak1.THIS_IS_A_TEST_TOKEN_NOT_A_REAL_ONE";
const PLACEHOLDER = "<token>";

const server = spawn("npx", ["astro", "dev", "--port", "4399"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let base = "";
const ready = new Promise((resolve, reject) => {
  const onData = (b) => {
    const m = String(b).match(/http:\/\/localhost:\d+/);
    if (m) {
      base = m[0];
      resolve();
    }
  };
  server.stdout.on("data", onData);
  server.stderr.on("data", onData);
  setTimeout(
    () => reject(new Error("dev server did not start in 60s")),
    60_000,
  );
});

const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${what}`);
  if (!ok) fails.push(what);
};

try {
  await ready;
  // playwright-core ships no browser; prefer a Playwright-managed Chromium and
  // fall back to an installed Chrome, same as scripts/og-ais.mjs.
  const browser = await chromium
    .launch()
    .catch(() => chromium.launch({ channel: "chrome" }));
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();

  // 1. No token: the placeholder has to survive, or someone who has not been to
  //    the token page gets a command with nothing where their token goes.
  await page.goto(`${base}/ais/ais-catcher/`, { waitUntil: "networkidle" });
  const bare = await page
    .locator("[data-code][data-token]")
    .first()
    .innerText();
  check(
    bare.includes(PLACEHOLDER),
    `placeholder kept with no token: ${bare.slice(0, 48)}…`,
  );

  // 2. With a token, in the shape the token page actually writes.
  await page.evaluate((t) => {
    localStorage.setItem(
      "aiscast.token",
      JSON.stringify({ token: t, claims: { sub: "test", exp: 0 } }),
    );
  }, FAKE);
  await page.reload({ waitUntil: "networkidle" });

  const filled = await page.locator("[data-code][data-token]").allInnerTexts();
  check(
    filled.length >= 3,
    `found ${filled.length} token-aware blocks (expected the 2 send paths + the bridge)`,
  );
  check(
    filled.every((t) => t.includes(FAKE)),
    "every token-aware block substituted",
  );
  check(
    filled.every((t) => !t.includes(PLACEHOLDER)),
    "no placeholder left behind",
  );

  // 3. Blocks with no token in them must not be flagged, and must not change.
  const plain = await page
    .locator("[data-code]:not([data-token])")
    .allInnerTexts();
  check(
    plain.length > 0 && plain.every((t) => !t.includes(FAKE)),
    `${plain.length} plain blocks untouched`,
  );

  // 4. Copy puts the substituted text on the clipboard, not the template.
  const block = page
    .locator(".group.relative", { has: page.locator("[data-token]") })
    .first();
  await block.locator("[data-copy]").click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(clip.includes(FAKE), "clipboard carries the substituted token");
  check(!clip.includes(PLACEHOLDER), "clipboard carries no placeholder");
  check(
    (await block.locator("[data-copy-label]").innerText()) === "Copied",
    "button confirms the copy",
  );

  // 5. The call to action names the station once there is a token, and offers
  //    the station page. Without one it has to stay a create-a-token prompt.
  await page.evaluate(() => localStorage.setItem("aiscast.name", "Bench rig"));
  await page.reload({ waitUntil: "networkidle" });
  check(
    (await page.locator("[data-cta-title]").innerText()).includes("Bench rig"),
    "CTA names the station",
  );
  check(
    (await page.locator("[data-cta-station]").count()) === 0,
    "CTA does not divert to the station page before setup",
  );
  check(
    (await page.locator("[data-cta-primary]").innerText()) === "Manage token",
    "CTA primary becomes manage, not create",
  );

  // The station card lives further down, past the install steps, and its link
  // is the one that should point at the station.
  const stats = page.locator("[data-stats]");
  await stats.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  check(await stats.isVisible(), "station card appears once there is a token");

  // Stub the station API so the rows are exercised deterministically. The
  // labels matter: `events` is heard-first, `vessels_exclusive_24h` is
  // vessels nobody else heard, and conflating them was a real review finding.
  const stubStation = (station) =>
    page.route("**/v1/stations/station:*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ station }),
      }),
    );

  await stubStation({
    name: "Bench rig",
    events: { last_24h: 1234 },
    vessels_24h: 88,
    vessels_exclusive_24h: 7,
    uptime_7d: 0.5,
    last_age_s: 42,
    near: "Sidney, BC",
  });
  await page.reload({ waitUntil: "networkidle" });
  const list = await page.locator("[data-stats-list]").innerText();
  check(
    /Heard first, 24 h[\s\S]*1,234 messages/.test(list),
    "heard-first row reads from events, not vessels_exclusive",
  );
  check(
    /Of those, only you heard[\s\S]*\b7\b/.test(list),
    "vessels_exclusive_24h is labelled as vessels only you heard",
  );
  check(/Uptime, 7 days[\s\S]*50%/.test(list), "uptime renders as a percent");
  check(
    await page.locator("[data-stats-credit]").isVisible(),
    "GeoNames credit shows when a place name does",
  );

  // uptime_7d is nullable, and 0% would be a lie rather than a gap.
  await page.unroute("**/v1/stations/station:*");
  await stubStation({
    name: "New rig",
    events: { last_24h: 3 },
    vessels_24h: 1,
    vessels_exclusive_24h: 0,
    uptime_7d: null,
    last_age_s: 10,
  });
  await page.reload({ waitUntil: "networkidle" });
  const list2 = await page.locator("[data-stats-list]").innerText();
  check(
    !/Uptime/.test(list2),
    "null uptime omits the row rather than showing 0%",
  );
  check(!/Near/.test(list2), "absent place name omits its row");
  check(
    !(await page.locator("[data-stats-credit]").isVisible()),
    "no GeoNames credit without a place name",
  );
  await page.unroute("**/v1/stations/station:*");
  check(
    (await page.locator("[data-stats-link]").getAttribute("href")) ===
      "/ais/stations/station:test",
    `station card links the station: ${await page.locator("[data-stats-link]").getAttribute("href")}`,
  );
  check(
    (await page.locator("[data-stats-note]").innerText()).length > 20,
    "station card explains what it is showing",
  );

  await page.evaluate(() => localStorage.removeItem("aiscast.name"));
  await page.reload({ waitUntil: "networkidle" });
  check(
    (await page.locator("[data-cta-primary]").innerText()) ===
      "Name your station",
    "unnamed station is invited to pick a name",
  );

  // 6. An expired token is no token.
  await page.evaluate(() => {
    localStorage.setItem(
      "aiscast.token",
      JSON.stringify({
        token: "ak1.EXPIRED",
        claims: { sub: "test", exp: 1 },
      }),
    );
  });
  await page.reload({ waitUntil: "networkidle" });
  const expired = await page
    .locator("[data-code][data-token]")
    .first()
    .innerText();
  check(
    expired.includes(PLACEHOLDER) && !expired.includes("EXPIRED"),
    "expired token leaves the placeholder in the commands",
  );
  check(
    (await page.locator("[data-cta-primary]").innerText()) === "Create a token",
    "expired token puts the CTA back to create",
  );
  check(
    !(await page.locator("[data-stats]").isVisible()),
    "expired token hides the station card",
  );

  await browser.close();
} finally {
  server.kill("SIGTERM");
  // Bounded: astro dev leaves vite workers that can outlive SIGTERM, and a
  // bare await here hangs the script after every check has already passed.
  await Promise.race([
    once(server, "exit").catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
}

console.log(fails.length ? `\n${fails.length} failed` : "\nall checks passed");
process.exit(fails.length ? 1 : 0);

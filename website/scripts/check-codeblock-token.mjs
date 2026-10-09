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
  const stationLink = page.locator("[data-cta-station]");
  check(await stationLink.isVisible(), "CTA offers the station page");
  check(
    (await stationLink.getAttribute("href")) === "/ais/stations/station:test",
    `station link points at the station: ${await stationLink.getAttribute("href")}`,
  );
  check(
    (await page.locator("[data-cta-primary]").innerText()) === "Manage token",
    "CTA primary becomes manage, not create",
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
    !(await page.locator("[data-cta-station]").isVisible()),
    "expired token hides the station link",
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

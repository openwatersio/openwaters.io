// Renders the link-preview cards in public/og/ at 1200x630.
//
//   npm run og -w website ais-signalk      one card
//   npm run og -w website                  every card in CARDS
//
// Each card is laid out in HTML and screenshotted, so it picks up the real Geist
// face and the colour tokens from global.css rather than approximating them.
// sharp is already installed and can rasterise an SVG, but its renderer ignores
// both system-installed and @font-face-embedded Geist and silently falls back to
// a default sans, which is why this drives a browser instead.
//
// A card may sit on top of an existing card (`base`). og/ais.png carries the
// Turku map, its fade, and the OpenStreetMap credit; reusing it whole and
// repainting only the left panel keeps the AIS cards pixel-identical to each
// other. The base images themselves are hand-made and are not regenerated here.

import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const WEBSITE = path.resolve(fileURLToPath(import.meta.url), "../..");
const OG = path.join(WEBSITE, "public/og");
// Resolved rather than joined onto website/node_modules: this is an npm workspace,
// so the dependency hoists to the repository root.
const FONT = createRequire(import.meta.url).resolve(
  "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
);

const WIDTH = 1200;
const HEIGHT = 630;

// Tokens copied from src/styles/global.css. They are duplicated rather than
// parsed out of the stylesheet because a card is rendered off the page, with no
// Tailwind build to resolve them.
const CANVAS = "#05122a";
const ACCENT = "#38bdf8";
const FG_STRONG = "#fcfcfc";
const FG_MUTED = "rgba(228,240,228,0.62)";

const CARDS = {
  "ais-signalk": {
    base: "ais.png",
    eyebrow: "Open Waters · AIS",
    title: ["AIS for", "Signal K"],
    sub: ["Worldwide traffic without a receiver,", "on your chartplotter too."],
  },
};

function html(card, fontDataUri, baseDataUri) {
  const background = baseDataUri
    ? `${CANVAS} url("${baseDataUri}") no-repeat 0 0 / ${WIDTH}px ${HEIGHT}px`
    : CANVAS;

  // Over a base, the panel has to stay opaque across the text and fade out before
  // the map's subject matter; with no base it is simply the canvas colour.
  const panel = baseDataUri
    ? `linear-gradient(to right, ${CANVAS} 0%, ${CANVAS} 44%, rgba(5,18,42,0.92) 54%, rgba(5,18,42,0.55) 66%, rgba(5,18,42,0) 82%)`
    : "transparent";

  const lines = (xs) => xs.join("<br>");

  return `<!doctype html><meta charset="utf-8">
<style>
  @font-face {
    font-family: "Geist Variable";
    src: url("${fontDataUri}") format("woff2");
    font-weight: 100 900;
  }
  * { margin: 0; box-sizing: border-box; }
  body { width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; overflow: hidden;
         background: ${background};
         font-family: "Geist Variable", system-ui, sans-serif; }
  .panel { position: absolute; inset: 0; background: ${panel}; }
  .text { position: absolute; left: 68px; top: 96px; width: 540px; }
  .eyebrow { color: ${ACCENT}; font-size: 15px; font-weight: 700;
             letter-spacing: 0.2em; text-transform: uppercase; }
  h1 { color: ${FG_STRONG}; font-size: 72px; font-weight: 700; line-height: 1.06;
       letter-spacing: -0.025em; margin-top: 30px; }
  .sub { color: ${FG_MUTED}; font-size: 25px; font-weight: 400;
         line-height: 1.35; margin-top: 150px; }
</style>
<div class="panel"></div>
<div class="text">
  <div class="eyebrow">${card.eyebrow}</div>
  <h1>${lines(card.title)}</h1>
  <div class="sub">${lines(card.sub)}</div>
</div>`;
}

const dataUri = async (file, mime) =>
  `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`;

// playwright-core ships no browser of its own, which keeps it out of the deploy
// build's install. Prefer a Playwright-managed Chromium, fall back to Chrome.
async function launch() {
  try {
    return await chromium.launch();
  } catch {
    try {
      return await chromium.launch({ channel: "chrome" });
    } catch {
      throw new Error(
        "No browser found. Install one with `npx playwright install chromium`, " +
          "or install Google Chrome.",
      );
    }
  }
}

const names = process.argv.slice(2);
const todo = names.length ? names : Object.keys(CARDS);

for (const name of todo) {
  if (!CARDS[name]) {
    throw new Error(
      `Unknown card "${name}". Known: ${Object.keys(CARDS).join(", ")}`,
    );
  }
}

const font = await dataUri(FONT, "font/woff2");
const browser = await launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

for (const name of todo) {
  const card = CARDS[name];
  const base = card.base
    ? await dataUri(path.join(OG, card.base), "image/png")
    : null;

  await page.setContent(html(card, font, base));
  await page.evaluate(() => document.fonts.ready);

  const out = path.join(OG, `${name}.png`);
  await page.screenshot({ path: out });
  const { size } = await fs.stat(out);
  console.log(`${name}.png  ${WIDTH}x${HEIGHT}  ${Math.round(size / 1024)} KB`);
}

await browser.close();

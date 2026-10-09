// Renders the AIS link-preview cards in public/og/ at 1200x630.
//
//   npm run og:ais -w website ais-signalk      one card
//   npm run og:ais -w website                  every card in CARDS
//
// Named for the AIS family because that is what the layout is: the background
// colour, the left text block and the panel gradient are all tuned to sit over
// og/ais.png. The browser, font and compositing machinery below is not
// AIS-specific, so when a second template earns its place (og-brand.mjs for
// openwaters.png, say) lift the shared parts out then — with two real cases to
// generalise from rather than one guessed at.
//
// Each card is laid out in HTML and screenshotted, so it picks up the real Geist
// face rather than approximating it. sharp is already installed and can rasterise
// an SVG, but its renderer ignores Geist both system-installed and embedded as an
// @font-face data URI, and silently falls back to a default sans.
//
// A card sits on top of an existing image (`base`). og/ais.png carries the Turku
// map, its fade, and the OpenStreetMap credit; reusing it whole and repainting
// only the left panel keeps the AIS cards identical to each other where it counts.
//
// What is in public/og/, and why only some of it is here:
//
//   ais-signalk, ais-vs-aisstream, ais-alternatives-aisstream
//       Generated. Text over the ais.png base.
//   ais.png
//       Not generated: it is the base the three above sit on, and the panel that
//       hides a base's text would hide its own. Generating it needs a text-free
//       version of the map committed as a separate base image.
//   openwaters.png
//       Not generated: a different template — centred text on a blue gradient
//       with a wave motif and a domain footer. Wants a second layout here.
//   sky.png, moon.png, sun.png
//       Not generated: renderings of the Almanac visuals with a footer bar, not
//       text over a photograph. Reproducing them means driving the site's own sky
//       components, which is a different job from laying out a card.

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

// Measured off the existing cards rather than taken from global.css: the cards
// predate the current tokens and sit on #071421, where --color-canvas is now
// #05122a. Matching the family matters more here than matching the site.
const CANVAS = "#071421";
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
  "ais-ais-catcher": {
    base: "ais.png",
    eyebrow: "Open Waters · AIS",
    title: ["AIS for", "AIS-catcher"],
    sub: ["Feed one line. Read the whole", "network back."],
  },
  "ais-vs-aisstream": {
    base: "ais.png",
    eyebrow: "Open Waters · AIS",
    title: ["Open Waters AIS", "vs aisstream.io"],
    sub: ["Same protocol. Different everything else."],
  },
  "ais-alternatives-aisstream": {
    base: "ais.png",
    eyebrow: "Open Waters · AIS",
    title: ["aisstream.io", "alternatives"],
    sub: ["Free and paid AIS feeds, compared."],
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
  /* Centred as a block: measured on the shipped cards, the eyebrow-to-subhead
     span is centred on the canvas rather than pinned to a top margin. */
  .text { position: absolute; left: 68px; top: calc(50% + 1px); width: 540px;
          transform: translateY(-50%); }
  .eyebrow { color: ${ACCENT}; font-size: 20px; font-weight: 700;
             letter-spacing: 0.2em; text-transform: uppercase; }
  h1 { color: ${FG_STRONG}; font-size: 62px; font-weight: 700; line-height: 1.115;
       letter-spacing: -0.025em; margin-top: 29px; }
  .sub { color: ${FG_MUTED}; font-size: 25px; font-weight: 400;
         line-height: 1.35; margin-top: 32px; }
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

import assert from "node:assert/strict";
import { test } from "node:test";
import { slackwaterLink } from "./slackwater-link.ts";

test("tags a slackwater.xyz path with the placement", () => {
  assert.equal(
    slackwaterLink("/tides/", "tides-button"),
    "https://slackwater.xyz/tides/?utm_source=openwaters.io&utm_medium=referral&utm_content=tides-button",
  );
});

test("tags the home page", () => {
  assert.equal(
    slackwaterLink("/", "footer"),
    "https://slackwater.xyz/?utm_source=openwaters.io&utm_medium=referral&utm_content=footer",
  );
});

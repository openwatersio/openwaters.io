import assert from "node:assert/strict";
import { test } from "node:test";

import { stationStatus } from "./station-status.ts";

test("a station heard less than five minutes ago is receiving", () => {
  assert.equal(stationStatus(0).receiving, true);
  assert.equal(stationStatus(299).receiving, true);
});

test("a station quiet for five minutes or more is not receiving", () => {
  assert.deepEqual(stationStatus(300), {
    receiving: false,
    message: "Not receiving. Last data sent with this token 5 min ago.",
  });
  assert.equal(
    stationStatus(7200).message,
    "Not receiving. Last data sent with this token 2 h ago.",
  );
  assert.equal(
    stationStatus(129600).message,
    "Not receiving. Last data sent with this token 2 days ago.",
  );
});

test("an unknown station is not said to have never sent data", () => {
  const { receiving, message } = stationStatus(null);
  assert.equal(receiving, false);
  assert.doesNotMatch(message, /yet|never/i);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { solarSystemPositions } from "./solarSystemData.ts";

test("six planets stay on readable orbit guides at both slider boundaries", () => {
  for (const date of ["2026-01-01", "2056-01-01"]) {
    const positions = solarSystemPositions(new Date(`${date}T00:00:00Z`));
    assert.equal(positions.length, 6);
    for (const p of positions) {
      assert.ok(Math.abs(Math.hypot(p.x, p.y) - p.radius) < 1e-8);
      assert.ok(Number.isFinite(p.distanceAu) && p.distanceAu > 0);
    }
  }
});
test("Mercury makes four revolutions while Earth makes one and Saturn barely turns in a year", () => {
  const turns = Array(6).fill(0);
  let previous = solarSystemPositions(new Date(Date.UTC(2026, 0, 1))).map((p) =>
    Math.atan2(p.y, p.x),
  );
  for (let day = 3; day <= 366; day += 3) {
    const angles = solarSystemPositions(
      new Date(Date.UTC(2026, 0, 1 + day)),
    ).map((p) => Math.atan2(p.y, p.x));
    angles.forEach((angle, i) => {
      const delta = angle - previous[i]!;
      turns[i] += Math.atan2(Math.sin(delta), Math.cos(delta)) / (2 * Math.PI);
    });
    previous = angles;
  }
  assert.ok(turns[0] > 4 && turns[0] < 4.3);
  assert.ok(turns[2] > 0.99 && turns[2] < 1.02);
  assert.ok(turns[5] > 0 && turns[5] < 0.05);
});

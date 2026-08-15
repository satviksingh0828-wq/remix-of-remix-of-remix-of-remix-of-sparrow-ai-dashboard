import assert from "node:assert/strict";
import test from "node:test";

import { downsampleRouteTrace, type DriverRoutePoint } from "../src/lib/driver-route-utils.ts";

test("route trace sampling keeps the first and latest recorded locations", () => {
  const points: DriverRoutePoint[] = Array.from({ length: 21 }, (_, index) => ({
    latitude: 20 + index / 100,
    longitude: 77 + index / 100,
    accuracyM: 5,
    recordedAt: `2026-08-15T00:00:${String(index).padStart(2, "0")}.000Z`,
  }));
  const sampled = downsampleRouteTrace(points, 5);
  assert.equal(sampled.length, 5);
  assert.deepEqual(sampled[0], points[0]);
  assert.deepEqual(sampled.at(-1), points.at(-1));
});

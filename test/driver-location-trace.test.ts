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

test("route trace sampling keeps checkpoint positions unique and ordered", () => {
  const points: DriverRoutePoint[] = Array.from({ length: 2_001 }, (_, index) => ({
    latitude: 20 + index / 10_000,
    longitude: 77 + index / 10_000,
    accuracyM: null,
    recordedAt: `checkpoint-${index.toString().padStart(5, "0")}`,
  }));
  const sampled = downsampleRouteTrace(points, 500);

  assert.equal(sampled.length, 500);
  assert.equal(new Set(sampled.map((point) => point.recordedAt)).size, sampled.length);
  assert.equal(
    sampled.every(
      (point, index) => index === 0 || point.recordedAt > sampled[index - 1].recordedAt,
    ),
    true,
  );
});

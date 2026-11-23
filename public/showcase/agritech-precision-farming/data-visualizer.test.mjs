import assert from "node:assert/strict";
import test from "node:test";
import { AgritechPrecisionFarmingRadarChart } from "./data-visualizer.js";

const radar = new AgritechPrecisionFarmingRadarChart({ x: 10, y: 20 }, 10);

test("converts polar coordinates relative to the chart center", () => {
  assert.deepEqual(radar.polarToCartesian(4, 0), { x: 14, y: 20 });
  assert.deepEqual(radar.polarToCartesian(4, Math.PI / 2), { x: 10, y: 24 });
});

test("places equally spaced axes starting from the top", () => {
  assert.equal(radar.generatePolygonPoints([100, 100, 100, 100]), "10.00,10.00 20.00,20.00 10.00,30.00 0.00,20.00");
});

test("bounds scores and replaces invalid values with zero", () => {
  assert.equal(radar.generatePolygonPoints([200, -2, NaN, Infinity]), "10.00,10.00 10.00,20.00 10.00,20.00 10.00,20.00");
});

test("computes the full diamond area and the square law for half-scale scores", () => {
  assert.equal(radar.computeEnclosedArea([100, 100, 100, 100]), 200);
  assert.equal(radar.computeEnclosedArea([50, 50, 50, 50]), 50);
});

test("returns zero for too few points or collinear points", () => {
  assert.equal(radar.computeEnclosedArea([]), 0);
  assert.equal(radar.computeEnclosedArea([100, 95]), 0);
  assert.equal(radar.computeEnclosedArea([100, 0, 100, 0]), 0);
});

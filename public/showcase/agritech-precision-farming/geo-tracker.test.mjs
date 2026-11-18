import test from "node:test";
import assert from "node:assert/strict";
import { AgritechPrecisionFarmingGeoRadarEngine as Engine } from "./geo-tracker.js";
const engine = new Engine();
const near = (a, b, tolerance = 0.01) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test("known equatorial quarter and half circumferences are finite", () => {
  near(engine.calculateHaversineDistance(0, 0, 0, 90), (Math.PI * 6371) / 2);
  near(engine.calculateHaversineDistance(0, 0, 0, 180), Math.PI * 6371);
  assert.equal(engine.calculateHaversineDistance(12, 34, 12, 34), 0);
});
test("antimeridian crossing uses the short arc and is symmetric", () => {
  near(engine.calculateHaversineDistance(0, 179, 0, -179), 222.38985);
  near(
    engine.calculateHaversineDistance(5, 179, 8, -179),
    engine.calculateHaversineDistance(8, -179, 5, 179),
  );
});
test("longitude has no meaningful distance at a pole", () => {
  near(engine.calculateHaversineDistance(90, -170, 90, 170), 0, 1e-8);
});
test("bearings follow cardinal directions and wrap at the dateline", () => {
  const start = { lat: 0, lon: 0 };
  for (const [end, bearing] of [
    [{ lat: 1, lon: 0 }, 0],
    [{ lat: 0, lon: 1 }, 90],
    [{ lat: -1, lon: 0 }, 180],
    [{ lat: 0, lon: -1 }, 270],
  ])
    near(engine.computeBearing(start, end), bearing);
  near(engine.computeBearing({ lat: 0, lon: 179 }, { lat: 0, lon: -179 }), 90);
  assert.equal(engine.computeBearing(start, start), 0);
  assert.equal(engine.computeBearing(start, { lat: 0, lon: 180 }), 0);
});
test("invalid coordinates, duplicate IDs and invalid ranges are rejected", () => {
  for (const pair of [
    [91, 0],
    [0, 181],
    [NaN, 0],
    [0, Infinity],
    ["1", 2],
  ])
    assert.throws(
      () => engine.calculateHaversineDistance(...pair, 0, 0),
      RangeError,
    );
  assert.throws(
    () =>
      new Engine([
        { id: "a", lat: 0, lon: 0 },
        { id: "a", lat: 1, lon: 1 },
      ]),
    TypeError,
  );
  assert.throws(() => new Engine([{ id: "a", lat: 0, lon: NaN }]), RangeError);
  assert.throws(
    () => engine.sortNearestNodes({ lat: 0, lon: 0 }, 0),
    RangeError,
  );
  assert.throws(
    () => engine.sortNearestNodes({ lat: 0, lon: 0 }, NaN),
    RangeError,
  );
});
test("range filtering and ties are deterministic and leave source nodes unchanged", () => {
  const nodes = [
    { id: "b", lat: 0, lon: 1 },
    { id: "a", lat: 0, lon: -1 },
    { id: "far", lat: 20, lon: 0 },
  ];
  const radar = new Engine(nodes);
  nodes[0].lon = 5;
  const result = radar.sortNearestNodes({ lat: 0, lon: 0 }, 120);
  assert.deepEqual(
    result.map((n) => n.id),
    ["a", "b"],
  );
  assert.ok(result.every((n) => n.distanceKm <= 120));
  assert.equal(radar.nodes[0].lon, 1);
  assert.equal("distanceKm" in radar.nodes[0], false);
  assert.deepEqual(radar.sortNearestNodes({ lat: 0, lon: 0 }, 1), []);
});

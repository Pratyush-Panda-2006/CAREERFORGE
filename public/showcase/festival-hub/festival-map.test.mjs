import assert from 'node:assert/strict';
import test from 'node:test';
import { findFestivalRoute, gaussianCrowdIntensity, simulateCrowdZones } from './map-model.mjs';

test('crowd intensity follows Gaussian distance attenuation and stays within capacity', () => {
  const zone = { x: 0, y: 0, capacity: 100, attendance: 50, spread: 20 };
  const center = gaussianCrowdIntensity({ x: 0, y: 0 }, zone);
  const oneSpreadAway = gaussianCrowdIntensity({ x: 20, y: 0 }, zone);

  assert.equal(center, 0.5);
  assert.ok(Math.abs(oneSpreadAway - 0.5 * Math.exp(-0.5)) < 1e-12);
  assert.equal(gaussianCrowdIntensity({ x: 0, y: 0 }, { ...zone, attendance: 200 }), 1);
});

test('simulated attendance remains deterministic and within each zone capacity', () => {
  const first = simulateCrowdZones(12345);
  const second = simulateCrowdZones(12345);

  assert.deepEqual(first, second);
  assert.ok(first.every((zone) => zone.attendance >= 0 && zone.attendance <= zone.capacity));
});

test('routes from arbitrary map locations follow walkways to exit and medical hub', () => {
  const start = { x: 130, y: 260 };
  const exitRoute = findFestivalRoute(start, 'exit');
  const medicalRoute = findFestivalRoute(start, 'medical');

  assert.deepEqual(exitRoute[0], start);
  assert.deepEqual(exitRoute.at(-1), { x: 400, y: 455 });
  assert.deepEqual(medicalRoute.at(-1), { x: 400, y: 250 });
  assert.ok(exitRoute.every(({ x, y }) => x >= 0 && x <= 800 && y >= 0 && y <= 480));
  assert.equal(findFestivalRoute(start, 'unknown'), null);
});

test('route selection avoids a heavily crowded center when perimeter paths are clearer', () => {
  const start = { x: 150, y: 250 };
  const clearRoute = findFestivalRoute(start, 'exit');
  const busyCenterRoute = findFestivalRoute(start, 'exit', [
    { x: 400, y: 340, capacity: 100, attendance: 100, spread: 90 }
  ]);

  assert.ok(clearRoute.some((point) => point.x > 300));
  assert.ok(busyCenterRoute.some((point) => point.x === 85));
});

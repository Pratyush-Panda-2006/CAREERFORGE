import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrbitalPeriod, calculateOrbitalVelocity } from './script.js';

test('Orbiter-X calculates LEO orbital period around 400km (ISS altitude)', () => {
  const period = calculateOrbitalPeriod(400);
  assert.ok(period >= 90 && period <= 95, `Expected ~92 mins, got ${period}`);
});

test('Orbiter-X orbital velocity at 400km is approx 7.67 km/s', () => {
  const v = parseFloat(calculateOrbitalVelocity(400));
  assert.ok(v >= 7.6 && v <= 7.8, `Expected ~7.67 km/s, got ${v}`);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDewPoint } from './script.js';

test('Calculate dew point at 20C and 50% relative humidity', () => {
  const dp = calculateDewPoint(20, 50);
  assert.ok(dp >= 9.0 && dp <= 9.6, `Expected ~9.3C, got ${dp}`);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNDVI, evaluateCropVigor } from './script.js';

test('Healthy vegetation gives high positive NDVI', () => {
  const ndvi = calculateNDVI(0.8, 0.1);
  assert.ok(ndvi > 0.7);
  assert.equal(evaluateCropVigor(ndvi), 'EXCELLENT_VIGOR');
});
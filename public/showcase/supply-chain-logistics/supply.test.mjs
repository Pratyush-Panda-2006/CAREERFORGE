import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateVoyageDurationHours } from './script.js';

test('Voyage duration calculates sailing plus port dwell hours', () => {
  const hours = estimateVoyageDurationHours(200, 20, 10);
  assert.equal(hours, 20.0);
});

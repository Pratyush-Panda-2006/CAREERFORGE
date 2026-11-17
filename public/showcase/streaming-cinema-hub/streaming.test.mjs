import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWatchProgress } from './script.js';

test('Watch progress calculates 50% at midpoint', () => {
  assert.equal(calculateWatchProgress(60, 120), 50.0);
});
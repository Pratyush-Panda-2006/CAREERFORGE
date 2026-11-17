import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFocusScore } from './script.js';

test('High beta wave presence indicates high focus score', () => {
  const score = calculateFocusScore(4.0, 1.0, 1.0);
  assert.equal(score, 100);
});
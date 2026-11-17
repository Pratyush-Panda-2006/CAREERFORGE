import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDispatchClearance } from './script.js';

test('Dispatch cleared under safe conditions', () => {
  assert.equal(checkDispatchClearance(15, 3.2).cleared, true);
});

test('Dispatch rejected when overweight', () => {
  assert.equal(checkDispatchClearance(15, 6.0).cleared, false);
});
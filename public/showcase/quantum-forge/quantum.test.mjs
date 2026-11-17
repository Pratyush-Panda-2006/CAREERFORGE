import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHadamard, measureProbabilities } from './script.js';

test('Hadamard gate on |0> produces equal superposition (50/50)', () => {
  const state = applyHadamard([1, 0]);
  const probs = measureProbabilities(state);
  assert.equal(probs.p0, 0.5);
  assert.equal(probs.p1, 0.5);
});
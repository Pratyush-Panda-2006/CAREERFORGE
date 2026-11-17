import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardKinematics } from './script.js';

test('Forward kinematics with zero angles returns collinear arm length', () => {
  const pos = forwardKinematics(10, 10, 0, 0);
  assert.equal(pos.x, 20);
  assert.equal(pos.y, 0);
});
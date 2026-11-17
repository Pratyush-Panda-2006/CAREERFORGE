import test from 'node:test';
import assert from 'node:assert/strict';
import { balancePowerGrid } from './script.js';

test('Grid surplus charges battery correctly up to capacity', () => {
  const res = balancePowerGrid(120, 100, 50, 40);
  assert.equal(res.gridStatus, 'SURPLUS_CHARGING');
  assert.equal(res.newBattery, 50); // capped at capacity
});
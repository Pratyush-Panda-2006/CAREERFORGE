import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEscrowRelease } from './script.js';

test('Escrow releases proportional funds for completed milestones', () => {
  const milestones = [
    { id: 1, amount: 500, approved: true },
    { id: 2, amount: 500, approved: false }
  ];
  const res = calculateEscrowRelease(milestones);
  assert.equal(res.percentComplete, 50);
  assert.equal(res.unlockedAmount, 500);
});
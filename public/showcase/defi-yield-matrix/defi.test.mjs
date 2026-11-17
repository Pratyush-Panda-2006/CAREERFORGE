import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateImpermanentLoss, calculateCompoundedYield } from './script.js';

test('2x price change yields approx 5.72% impermanent loss', () => {
  const il = calculateImpermanentLoss(2.0);
  assert.ok(il >= 5.7 && il <= 5.8, `Expected ~5.72%, got ${il}%`);
});

test('Compounded yield on $1000 at 10% APY after 365 days', () => {
  const val = calculateCompoundedYield(1000, 10, 365);
  assert.ok(val >= 1105 && val <= 1106, `Expected ~1105.16, got ${val}`);
});
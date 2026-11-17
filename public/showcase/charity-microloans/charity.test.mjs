import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonthlyRepayment } from './script.js';

test('Monthly repayment on $1200 loan at 0% for 12 months is $100', () => {
  assert.equal(calculateMonthlyRepayment(1200, 0, 12), 100.0);
});
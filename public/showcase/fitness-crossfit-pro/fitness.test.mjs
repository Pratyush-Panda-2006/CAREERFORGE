import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCaloriesBurned } from './script.js';

test('Calorie burn for 10 MET exercise, 70kg user over 30 mins', () => {
  const cal = calculateCaloriesBurned(10, 70, 30);
  assert.ok(cal >= 360 && cal <= 375, `Expected ~367 kcal, got ${cal}`);
});
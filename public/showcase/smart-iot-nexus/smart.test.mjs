import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSensorAlert, calculateMovingAverage } from './script.js';

test('Sensor alerts triggered when temperature exceeds max limit', () => {
  const result = evaluateSensorAlert(95, 20, 80);
  assert.equal(result.alert, true);
  assert.equal(result.level, 'CRITICAL_HIGH');
});

test('Moving average computes accurately across 5 samples', () => {
  const res = calculateMovingAverage([10, 20, 30, 40], 50);
  assert.equal(res.average, 30);
});
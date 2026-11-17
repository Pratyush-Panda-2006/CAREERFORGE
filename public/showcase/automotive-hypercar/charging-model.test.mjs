import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync(new URL('./charging-model.js', import.meta.url), 'utf8'), context);
const { estimate, BATTERY_KWH } = context.ChargingModel;

test('estimates 10–80% charging from the same 130 kWh pack used by the range demo', () => {
  assert.equal(BATTERY_KWH, 130);
  assert.equal(estimate('ac').energyKwh, 91);
  assert.equal(estimate('dc').energyKwh, 91);
  assert.equal(Math.round(estimate('ac').minutes / 60 * 10) / 10, 8.3);
  assert.equal(Math.round(estimate('dc').minutes), 18);
});

test('faster DC mode reduces time and unknown modes fail closed', () => {
  assert.ok(estimate('dc').minutes < estimate('ac').minutes);
  assert.throws(() => estimate('invalid'), /Unknown charging mode/);
});

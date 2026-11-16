import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync(new URL('./shipping-progress.js', import.meta.url), 'utf8'), context);
const { calculate, THRESHOLD } = context.ShippingProgress;

test('cart below threshold shows exact remaining amount', () => {
  assert.equal(THRESHOLD, 150);
  assert.deepEqual({ ...calculate(125, null) }, { unlocked: false, couponUnlocked: false, remaining: 25, percent: 83 });
  assert.deepEqual({ ...calculate(0, null) }, { unlocked: false, couponUnlocked: false, remaining: 150, percent: 0 });
});

test('threshold unlocks and removal reverses progress', () => {
  assert.deepEqual({ ...calculate(150, null) }, { unlocked: true, couponUnlocked: false, remaining: 0, percent: 100 });
  assert.deepEqual({ ...calculate(151, null) }, { unlocked: true, couponUnlocked: false, remaining: 0, percent: 100 });
  assert.equal(calculate(149, null).unlocked, false);
});

test('free shipping coupon unlocks delivery on nonempty carts only', () => {
  assert.deepEqual({ ...calculate(20, 'FREESHIP') }, { unlocked: true, couponUnlocked: true, remaining: 130, percent: 100 });
  assert.equal(calculate(0, 'FREESHIP').unlocked, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeVipTier, VIP_TIERS } from './vip-fees.js';

const now = Date.UTC(2026, 10, 16);
const trade = (total, ageDays = 0) => ({ price: total, amount: 1, timestamp: now - ageDays * 86400000 });

test('30-day sample volume selects a tier and its next-threshold progress', () => {
  const result = summarizeVipTier([trade(300_000), trade(100_000)], now);
  assert.equal(result.volume, 400_000);
  assert.equal(result.tier.level, 3);
  assert.equal(result.tier.maker, 0.02);
  assert.equal(result.tier.taker, 0.05);
  assert.equal(result.next.level, 4);
  assert.equal(result.progress, 60);
});

test('old or future trades do not inflate the tier', () => {
  const result = summarizeVipTier([trade(500_000, 31), trade(1_000_000, -1), trade(50_000)], now);
  assert.equal(result.volume, 50_000);
  assert.equal(result.tier.level, 1);
});

test('VIP 5 unlocks zero maker fees and finishes the progress bar', () => {
  const result = summarizeVipTier([trade(1_000_000)], now);
  assert.equal(result.tier.level, 5);
  assert.equal(result.tier.maker, 0);
  assert.equal(result.next, null);
  assert.equal(result.progress, 100);
  assert.equal(VIP_TIERS.length, 5);
});

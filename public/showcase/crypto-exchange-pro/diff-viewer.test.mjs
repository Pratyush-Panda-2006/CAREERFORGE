import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProDiffInspector } from './diff-viewer.js';

test('CryptoExchangeProDiffInspector detects identical configs produce zero delta', () => {
  const config = '{"pair":"ETH/USDT","leverage":20}';
  const inspector = new CryptoExchangeProDiffInspector(config, config);

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 1);
  assert.equal(metrics.changePercentage, 0);
});

test('CryptoExchangeProDiffInspector detects insertions and deletions accurately', () => {
  const orig = 'order_type: MARKET\nside: BUY\nquantity: 1.5';
  const mod = 'order_type: LIMIT\nside: BUY\nquantity: 1.5\nlimit_price: 95000\ntime_in_force: GTC';

  const inspector = new CryptoExchangeProDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1); // order_type: MARKET
  assert.equal(metrics.additions, 3); // order_type: LIMIT, limit_price, time_in_force
  assert.equal(metrics.unchanged, 2);

  const unified = inspector.generateUnifiedView();
  const addedLines = unified.filter(l => l.type === 'added');
  assert.equal(addedLines.length, 3);
});

test('CryptoExchangeProDiffInspector handles total replacement', () => {
  const orig = 'PAIR: BTC/USDT';
  const mod = 'PAIR: SOL/USDT';

  const inspector = new CryptoExchangeProDiffInspector(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 1);
  assert.equal(metrics.additions, 1);
  assert.equal(metrics.changePercentage, 100);
});

test('CryptoExchangeProDiffInspector handles empty inputs robustly', () => {
  const inspector = new CryptoExchangeProDiffInspector('', '');
  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.changePercentage, 0);
});

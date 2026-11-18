import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProFilterEngine } from './filter-engine.js';

test('CryptoExchangeProFilterEngine - initial execute returns full default dataset sorted by volume24h desc', () => {
  const engine = new CryptoExchangeProFilterEngine();
  const results = engine.execute();

  assert.equal(results.length, 8);
  assert.equal(results[0].symbol, 'BTC/USDT'); // 4.28B
  assert.equal(results[results.length - 1].symbol, 'AAVE/USDT'); // 275M
});

test('CryptoExchangeProFilterEngine - filterByKeyword matches symbol, base, name, category, and tags case-insensitively', () => {
  const engine = new CryptoExchangeProFilterEngine();

  // Search by ticker base
  engine.filterByKeyword('sol');
  const solResults = engine.execute();
  assert.equal(solResults.length, 1);
  assert.equal(solResults[0].symbol, 'SOL/USDT');

  // Search by category
  engine.filterByKeyword('defi');
  const defiResults = engine.execute();
  assert.ok(defiResults.length >= 2);

  // Search by tag
  engine.filterByKeyword('oracle');
  const oracleResults = engine.execute();
  assert.equal(oracleResults.length, 1);
  assert.equal(oracleResults[0].symbol, 'LINK/USDT');
});

test('CryptoExchangeProFilterEngine - toggleTag and compound tag filtering works accurately', () => {
  const engine = new CryptoExchangeProFilterEngine();

  // Filter by tag 'top-10'
  engine.toggleTag('top-10');
  const top10 = engine.execute();
  assert.equal(top10.length, 3); // BTC, ETH, SOL

  // Compound filter with 'high-liquidity' (AND)
  engine.toggleTag('high-liquidity');
  const compound = engine.execute();
  assert.equal(compound.length, 2); // BTC, ETH

  // Toggle off
  engine.toggleTag('top-10');
  assert.equal(engine.execute().length, 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.execute().length, 8);
});

test('CryptoExchangeProFilterEngine - multi-attribute sorting orders numeric and string fields correctly', () => {
  const engine = new CryptoExchangeProFilterEngine();

  // Sort by change24h desc (top gainers)
  engine.sort('change24h', 'desc');
  const gainers = engine.execute();
  assert.equal(gainers[0].symbol, 'RENDER/USDT'); // +12.4%

  // Sort by change24h asc (top losers)
  engine.sort('change24h', 'asc');
  const losers = engine.execute();
  assert.equal(losers[0].symbol, 'ARB/USDT'); // -3.20%

  // Sort by symbol asc
  engine.sort('symbol', 'asc');
  const sortedSym = engine.execute();
  assert.equal(sortedSym[0].symbol, 'AAVE/USDT');
});

test('CryptoExchangeProFilterEngine - range filters correctly bound numeric price and volume', () => {
  const engine = new CryptoExchangeProFilterEngine();

  // Price between $10 and $200
  engine.setRangeFilter('lastPrice', 10, 200);
  const ranged = engine.execute();
  assert.ok(ranged.length > 0);
  for (const item of ranged) {
    assert.ok(item.lastPrice >= 10 && item.lastPrice <= 200);
  }
});

test('CryptoExchangeProFilterEngine - getAvailableTags and subscribe notifications', () => {
  const engine = new CryptoExchangeProFilterEngine();
  const tags = engine.getAvailableTags();

  assert.ok(tags.includes('l1'));
  assert.ok(tags.includes('defi'));
  assert.ok(tags.includes('ai'));

  let notified = false;
  const unsubscribe = engine.subscribe((results) => {
    notified = true;
    assert.ok(Array.isArray(results));
  });

  engine.filterByKeyword('Bitcoin');
  assert.equal(notified, true);
  unsubscribe();
});

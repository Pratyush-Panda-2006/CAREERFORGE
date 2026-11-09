import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchingEngine } from './matching-engine.js';

const order = (overrides = {}) => ({ side: 'buy', type: 'market', quantity: 1, tolerance: 50, ...overrides });
function engine() {
  const result = new MatchingEngine();
  result.refresh({ bids: [{ price: 99, size: 2 }, { price: 98, size: 3 }], asks: [{ price: 101, size: 2 }, { price: 102, size: 3 }] });
  return result;
}

test('buy walks asks in price order, consumes depth and computes weighted fill/slippage', () => {
  const book = engine();
  const result = book.submit(order({ quantity: 3 }));
  assert.equal(result.filled, 3);
  assert.ok(Math.abs(result.average - 304 / 3) < 1e-10);
  assert.ok(Math.abs(result.slippage - ((304 / 3 - 101) / 101 * 100)) < 1e-10);
  assert.deepEqual(book.levels('sell'), [{ price: 102, size: 2 }]);
});
test('sell consumes highest bids first and reports adverse slippage in the sell direction', () => {
  const result = engine().submit(order({ side: 'sell', quantity: 3 }));
  assert.ok(Math.abs(result.average - 296 / 3) < 1e-10);
  assert.ok(result.slippage > 0);
});
test('market remainder cancels on exhaustion, never rests or fabricates a fill', () => {
  const book = engine();
  const result = book.submit(order({ quantity: 10 }));
  assert.equal(result.filled, 5);
  assert.equal(result.remaining, 5);
  assert.equal(result.status, 'cancelled');
  assert.equal(book.levels('buy').length, 2);
  assert.equal(book.levels('sell').length, 0);
});
test('worst-price tolerance stops before an unsafe level and leaves that liquidity intact', () => {
  const book = engine();
  const result = book.submit(order({ quantity: 4, tolerance: 0.5 }));
  assert.equal(result.filled, 2);
  assert.equal(result.stopReason, 'Slippage tolerance reached');
  assert.deepEqual(book.levels('sell'), [{ price: 102, size: 3 }]);
});
test('zero tolerance permits the best level; equality at the tolerance boundary is accepted', () => {
  assert.equal(engine().submit(order({ quantity: 4, tolerance: 0 })).filled, 2);
  assert.equal(engine().submit(order({ quantity: 4, tolerance: 100 / 101 })).filled, 4);
});
test('limit fills at maker price and rests only the remainder at its own limit', () => {
  const book = engine();
  const result = book.submit(order({ type: 'limit', price: 101, quantity: 3, tolerance: 0 }));
  assert.equal(result.average, 101);
  assert.equal(result.status, 'open');
  assert.equal(result.remaining, 1);
  assert.equal(book.levels('buy')[0].price, 101);
  assert.equal(book.levels('sell')[0].price, 102);
});
test('resting orders execute on a future quote refresh and price/time priority is retained', () => {
  const book = engine();
  const first = book.submit(order({ type: 'limit', price: 100, quantity: 1 }));
  const second = book.submit(order({ type: 'limit', price: 100, quantity: 1 }));
  const better = book.submit(order({ type: 'limit', price: 100.5, quantity: 1 }));
  book.refresh({ bids: [{ price: 98, size: 1 }], asks: [{ price: 100, size: 2.5 }] });
  const info = id => book.summary(book.orders.find(item => item.id === id));
  assert.equal(info(better.id).filled, 1);
  assert.equal(info(first.id).filled, 1);
  assert.equal(info(second.id).filled, 0.5);
  assert.equal(info(better.id).average, 100.5); // resting maker sets the price
});
test('a resting sell executes against a later rising bid without breaching its limit', () => {
  const book = engine();
  const sell = book.submit(order({ side: 'sell', type: 'limit', price: 103, quantity: 2 }));
  book.refresh({ bids: [{ price: 104, size: 1 }], asks: [{ price: 105, size: 1 }] });
  const info = book.summary(book.orders.find(item => item.id === sell.id));
  assert.equal(info.filled, 1);
  assert.equal(info.average, 103);
  assert.equal(info.remaining, 1);
});
test('cancel removes only the unfilled remainder and cannot resurrect on refresh', () => {
  const book = engine();
  const result = book.submit(order({ type: 'limit', price: 101, quantity: 3 }));
  assert.equal(book.cancel(result.id), true);
  assert.equal(book.cancel(result.id), false);
  book.refresh({ bids: [], asks: [{ price: 100, size: 5 }] });
  assert.equal(book.orders[0].filled, 2_000_000);
  assert.equal(book.orders[0].status, 'cancelled');
});
test('empty books produce no NaN, no fictitious average and no market resting order', () => {
  const book = new MatchingEngine();
  assert.equal(book.submit(order()).average, null);
  assert.equal(book.book.length, 0);
  assert.equal(book.submit(order({ type: 'limit', price: 50 })).status, 'open');
});
test('fractional token quantities conserve exact lot units over repeated fills', () => {
  const book = new MatchingEngine();
  book.refresh({ bids: [], asks: [{ price: 10.01, size: 0.000003 }] });
  for (let index = 0; index < 3; index++) assert.equal(book.submit(order({ quantity: 0.000001 })).filled, 0.000001);
  assert.deepEqual(book.levels('sell'), []);
});
test('invalid submissions do not mutate depth, orders or trade history', () => {
  const book = engine();
  const before = JSON.stringify(book.levels('sell'));
  for (const overrides of [{ quantity: 0 }, { quantity: -1 }, { quantity: Infinity }, { quantity: NaN }, { quantity: 0.0000001 },
    { quantity: 1_000_001 }, { type: 'limit', price: 1.001 }, { type: 'limit', price: Infinity }, { side: 'invalid' },
    { type: 'invalid' }, { tolerance: -1 }, { tolerance: NaN }, { tolerance: 51 }]) {
    assert.throws(() => book.submit(order(overrides)));
  }
  assert.equal(JSON.stringify(book.levels('sell')), before);
  assert.equal(book.orders.length, 0);
  assert.equal(book.trades.length, 0);
});
test('an invalid/crossed refresh is atomic and duplicate price levels aggregate', () => {
  const book = engine();
  const before = JSON.stringify(book.levels('buy'));
  assert.throws(() => book.refresh({ bids: [{ price: 102, size: 1 }], asks: [{ price: 101, size: 1 }] }));
  assert.throws(() => book.refresh({ bids: [], asks: [{ price: -1, size: 1 }] }));
  assert.equal(JSON.stringify(book.levels('buy')), before);
  book.refresh({ bids: [], asks: [{ price: 100, size: 1 }, { price: 100, size: 2 }] });
  assert.deepEqual(book.levels('sell'), [{ price: 100, size: 3 }]);
});
test('history and open order caps bound long sessions and engines isolate pairs', () => {
  const first = engine(), second = engine();
  for (let index = 0; index < 150; index++) {
    first.refresh({ bids: [], asks: [{ price: 100, size: 1 }] });
    first.submit(order());
  }
  assert.equal(first.trades.length, 30);
  assert.ok(first.orders.length <= 100);
  assert.equal(second.trades.length, 0);
  for (let index = 0; index < 50; index++) second.submit(order({ type: 'limit', price: 1 }));
  assert.throws(() => second.submit(order({ type: 'limit', price: 1 })), /50 maximum/);
});

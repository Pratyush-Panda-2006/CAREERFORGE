// Run with: node --test public/showcase/fintech-vault/ledger.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./ledger.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.Ledger = Ledger;', ctx);
const L = ctx.Ledger;
const all = L.TRANSACTIONS;

test('search matches merchant case-insensitively and ignores outer whitespace', () => {
  const r = L.filter(all, { query: '  HARBOR ' });
  assert.equal(r.length, 2);
  assert.ok(r.every((t) => t.merchant === 'Harbor Index Fund'));
});

test('empty filters return everything', () => {
  assert.equal(L.filter(all, {}).length, all.length);
  assert.equal(L.filter(all, { category: 'All' }).length, all.length);
});

test('category filter only returns that category', () => {
  const r = L.filter(all, { category: 'Subscriptions' });
  assert.ok(r.length > 0 && r.every((t) => t.category === 'Subscriptions'));
});

test('every listed category has at least one sample transaction', () => {
  for (const c of L.CATEGORIES) assert.ok(L.filter(all, { category: c }).length > 0, c);
});

test('date range is inclusive on both ends', () => {
  const r = L.filter(all, { from: '2026-10-12', to: '2026-10-22' });
  assert.equal(r.map((t) => t.date).sort().join(), ['2026-10-12', '2026-10-15', '2026-10-20', '2026-10-22'].join());
});

test('filters combine', () => {
  const r = L.filter(all, { query: 'vault', category: 'Dividends', from: '2026-10-01' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 2);
});

test('no match gives an empty list', () => {
  assert.equal(L.filter(all, { query: 'zzz' }).length, 0);
});

test('sort by date and amount, and does not mutate input', () => {
  const copy = all.slice();
  assert.equal(L.sort(all, 'date', 'desc')[0].date, '2026-10-27');
  assert.equal(L.sort(all, 'date', 'asc')[0].date, '2026-09-10');
  assert.equal(L.sort(all, 'amount', 'desc')[0].amount, 4200);
  assert.equal(L.sort(all, 'amount', 'asc')[0].amount, -5000);
  assert.equal(JSON.stringify(all), JSON.stringify(copy));
});

test('formatAmount shows sign and two decimals', () => {
  assert.equal(L.formatAmount(4200), '+$4,200.00');
  assert.equal(L.formatAmount(-14.99), '-$14.99');
});

test('summarize totals money in and out', () => {
  const s = L.summarize([{ amount: 100.1 }, { amount: -40.2 }, { amount: 0.2 }]);
  assert.equal(JSON.stringify(s), JSON.stringify({ count: 3, moneyIn: 100.3, moneyOut: 40.2 }));
});

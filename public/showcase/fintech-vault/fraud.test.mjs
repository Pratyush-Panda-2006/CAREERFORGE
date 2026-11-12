// Run with: node --test public/showcase/fintech-vault/fraud.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ledgerSrc = fs.readFileSync(new URL('./ledger.js', import.meta.url), 'utf8');
const scriptSrc = fs.readFileSync(new URL('./script.js', import.meta.url), 'utf8');
// script.js also drives the page, so only the pure engine block is loaded here.
const start = scriptSrc.indexOf('var FraudDetector');
const end = scriptSrc.indexOf('/* END FraudDetector */');
assert.ok(start > -1 && end > start, 'FraudDetector block not found in script.js');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(ledgerSrc + '\nthis.Ledger = Ledger;', ctx);
vm.runInContext(scriptSrc.slice(start, end) + '\nthis.F = FraudDetector;', ctx);
const F = ctx.F;
const L = ctx.Ledger;
const cfg = F.normalizeConfig({});

const NY = { city: 'New York', lat: 40.7128, lon: -74.006 };
const LON = { city: 'London', lat: 51.5074, lon: -0.1278 };
let nextId = 1000;
function tx(over) {
  return Object.assign({ id: nextId++, ts: '2026-10-28T12:00:00Z', merchant: 'Shop', category: 'Transfers', amount: -100, loc: NY }, over);
}

test('velocity fires only when the window count exceeds the limit', () => {
  const base = '2026-10-28T10:';
  const hist = ['00', '05', '10'].map((m) => tx({ ts: base + m + ':00Z' }));
  const fourth = tx({ ts: base + '15:00Z' });
  assert.equal(F.ruleVelocity(tx({ ts: base + '12:00Z' }), hist.slice(0, 2), cfg), null);
  const t = F.ruleVelocity(fourth, hist, cfg);
  assert.equal(t.rule, 'velocity');
  assert.equal(t.weight, 30);
  assert.match(t.explanation, /4 transactions within 60 min/);
});

test('velocity ignores transactions outside the window', () => {
  const hist = ['08:00', '08:10', '08:20'].map((h) => tx({ ts: '2026-10-28T' + h + ':00Z' }));
  assert.equal(F.ruleVelocity(tx({ ts: '2026-10-28T12:00:00Z' }), hist, cfg), null);
});

test('velocity window is configurable', () => {
  const hist = ['11:20', '11:30', '11:40'].map((h) => tx({ ts: '2026-10-28T' + h + ':00Z' }));
  const now = tx({ ts: '2026-10-28T12:00:00Z' });
  assert.equal(F.ruleVelocity(now, hist, cfg).rule, 'velocity');
  assert.equal(F.ruleVelocity(now, hist, F.normalizeConfig({ velocityWindowMinutes: 30 })), null);
});

test('haversine distance between New York and London is about 5570 km', () => {
  const km = F.haversineKm(NY, LON);
  assert.ok(km > 5550 && km < 5590, String(km));
  assert.equal(F.haversineKm(NY, NY), 0);
});

test('geo jump fires for an impossible trip and not for a plausible one', () => {
  const prev = tx({ ts: '2026-10-28T10:00:00Z', loc: NY });
  const fast = tx({ ts: '2026-10-28T11:00:00Z', loc: LON });
  const slow = tx({ ts: '2026-10-28T20:00:00Z', loc: LON });
  const t = F.ruleGeoJump(fast, [prev], cfg);
  assert.equal(t.rule, 'geo');
  assert.match(t.explanation, /New York to London/);
  assert.equal(F.ruleGeoJump(slow, [prev], cfg), null);
});

test('geo jump needs a previous transaction and ignores short distances', () => {
  assert.equal(F.ruleGeoJump(tx({}), [], cfg), null);
  const near = { city: 'Newark', lat: 40.7357, lon: -74.1724 };
  assert.equal(F.ruleGeoJump(tx({ loc: near, ts: '2026-10-28T10:01:00Z' }), [tx({ ts: '2026-10-28T10:00:00Z' })], cfg), null);
});

test('geo jump handles simultaneous timestamps without dividing by zero', () => {
  const a = tx({ ts: '2026-10-28T10:00:00Z', loc: NY });
  const b = tx({ ts: '2026-10-28T10:00:00Z', loc: LON });
  const t = F.ruleGeoJump(b, [a], cfg);
  assert.equal(t.rule, 'geo');
  assert.ok(Number.isFinite(F.scoreTransaction(b, [a], cfg).score));
});

test('amount spike compares against the merchant baseline', () => {
  const hist = [
    tx({ merchant: 'Ledgerly Pro', amount: -15, ts: '2026-09-01T08:00:00Z' }),
    tx({ merchant: 'Ledgerly Pro', amount: -15, ts: '2026-10-01T08:00:00Z' })
  ];
  const t = F.ruleAmountSpike(tx({ merchant: 'Ledgerly Pro', amount: -480 }), hist, cfg);
  assert.equal(t.rule, 'spike');
  assert.match(t.explanation, /32x the Ledgerly Pro baseline of \$15/);
  assert.equal(F.ruleAmountSpike(tx({ merchant: 'Ledgerly Pro', amount: -40 }), hist, cfg), null);
});

test('amount spike falls back to the category baseline and needs enough samples', () => {
  const hist = [
    tx({ merchant: 'A', category: 'Dividends', amount: 100, ts: '2026-09-01T08:00:00Z' }),
    tx({ merchant: 'B', category: 'Dividends', amount: 100, ts: '2026-10-01T08:00:00Z' })
  ];
  const big = tx({ merchant: 'C', category: 'Dividends', amount: 900 });
  assert.match(F.ruleAmountSpike(big, hist, cfg).explanation, /Dividends baseline/);
  assert.equal(F.ruleAmountSpike(big, hist.slice(0, 1), cfg), null);
});

test('amount spike does not mix deposits with withdrawals', () => {
  const hist = [
    tx({ merchant: 'Vault', amount: 200, ts: '2026-09-01T08:00:00Z' }),
    tx({ merchant: 'Vault', amount: 210, ts: '2026-10-01T08:00:00Z' })
  ];
  assert.equal(F.ruleAmountSpike(tx({ merchant: 'Vault', amount: -5000 }), hist, cfg), null);
});

test('blacklist matches category case-insensitively and follows the config', () => {
  assert.equal(F.ruleBlacklist(tx({ category: 'gambling' }), [], cfg).rule, 'blacklist');
  assert.equal(F.ruleBlacklist(tx({ category: 'Transfers' }), [], cfg), null);
  const custom = F.normalizeConfig({ blacklistedCategories: 'Transfers, Dividends' });
  assert.equal(F.ruleBlacklist(tx({ category: 'Transfers' }), [], custom).rule, 'blacklist');
  assert.equal(F.ruleBlacklist(tx({ category: 'Gambling' }), [], custom), null);
});

test('off-hours fires for large night withdrawals only', () => {
  const night = tx({ ts: '2026-10-28T02:30:00Z', amount: -2500 });
  assert.equal(F.ruleOffHours(night, [], cfg).rule, 'offHours');
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T02:30:00Z', amount: -200 }), [], cfg), null);
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T14:30:00Z', amount: -2500 }), [], cfg), null);
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T02:30:00Z', amount: 2500 }), [], cfg), null);
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T05:00:00Z', amount: -2500 }), [], cfg), null);
});

test('off-hours supports a window that wraps past midnight', () => {
  const wrap = F.normalizeConfig({ offHoursStart: 22, offHoursEnd: 4 });
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T23:00:00Z', amount: -2000 }), [], wrap).rule, 'offHours');
  assert.equal(F.ruleOffHours(tx({ ts: '2026-10-28T12:00:00Z', amount: -2000 }), [], wrap), null);
});

test('score bands are Green 0-29, Yellow 30-69, Red 70-100', () => {
  assert.equal(F.band(0).id, 'green');
  assert.equal(F.band(29).id, 'green');
  assert.equal(F.band(30).id, 'yellow');
  assert.equal(F.band(69).id, 'yellow');
  assert.equal(F.band(70).id, 'red');
  assert.equal(F.band(100).id, 'red');
  assert.equal(F.band(250).id, 'red');
  assert.equal(F.band(-5).id, 'green');
});

test('score sums trigger weights and clamps to 100', () => {
  const prev = tx({ ts: '2026-10-30T02:30:00Z', loc: NY });
  const worst = tx({ ts: '2026-10-30T02:45:00Z', category: 'Crypto Mixer', amount: -6000, loc: LON });
  const r = F.scoreTransaction(worst, [prev], cfg);
  assert.equal(r.rawScore, 35 + 45 + 25);
  assert.equal(r.score, 100);
  assert.equal(r.band, 'red');
  assert.equal(r.triggers.map((t) => t.rule).sort().join(), 'blacklist,geo,offHours');
  assert.ok(r.triggers.every((t) => t.explanation.length > 10));
});

test('a clean transaction scores 0 and Green', () => {
  const r = F.scoreTransaction(tx({}), [], cfg);
  assert.equal(r.score, 0);
  assert.equal(r.band, 'green');
  assert.equal(r.triggers.length, 0);
});

test('normalizeConfig falls back on bad input and clamps ranges', () => {
  const c = F.normalizeConfig({ velocityWindowMinutes: 'abc', spikeMultiplier: -3, geoMaxSpeedKmh: '', velocityMaxTransactions: 2.6 });
  assert.equal(c.velocityWindowMinutes, 60);
  assert.equal(c.spikeMultiplier, 1.1);
  assert.equal(c.geoMaxSpeedKmh, 900);
  assert.equal(c.velocityMaxTransactions, 3);
  assert.equal(JSON.stringify(F.normalizeConfig(undefined)), JSON.stringify(F.normalizeConfig(F.DEFAULT_CONFIG)));
});

test('dataset keeps every ledger record, adds fields, and leaves Ledger untouched', () => {
  const before = JSON.stringify(L.TRANSACTIONS);
  const data = F.buildDataset(L.TRANSACTIONS);
  assert.equal(JSON.stringify(L.TRANSACTIONS), before);
  assert.ok(data.length > L.TRANSACTIONS.length);
  assert.ok(data.every((t) => t.ts && t.loc && typeof t.loc.lat === 'number'));
  assert.equal(new Set(data.map((t) => t.id)).size, data.length);
  for (const t of L.TRANSACTIONS) {
    const d = data.find((x) => x.id === t.id);
    assert.equal(d.merchant, t.merchant);
    assert.equal(d.amount, t.amount);
    assert.equal(d.ts.slice(0, 10), t.date);
  }
});

test('demo dataset produces all three bands and every rule at least once', () => {
  const res = F.scoreAll(F.buildDataset(L.TRANSACTIONS));
  const bands = new Set(res.map((r) => r.band));
  assert.equal([...bands].sort().join(), 'green,red,yellow');
  const rules = new Set(res.flatMap((r) => r.triggers.map((t) => t.rule)));
  assert.equal([...rules].sort().join(), 'blacklist,geo,offHours,spike,velocity');
  assert.ok(res.every((r) => r.score >= 0 && r.score <= 100));
});

test('scoreAll is oldest first, does not mutate input, and thresholds change outcomes', () => {
  const data = F.buildDataset(L.TRANSACTIONS);
  const copy = JSON.stringify(data);
  const res = F.scoreAll(data);
  assert.equal(JSON.stringify(data), copy);
  const times = res.map((r) => Date.parse(r.tx.ts));
  assert.equal(times.join(), times.slice().sort((a, b) => a - b).join());
  const loose = F.scoreAll(data, { geoMaxSpeedKmh: 20000, spikeMultiplier: 1000 });
  const geo = (list) => list.filter((r) => r.triggers.some((t) => t.rule === 'geo')).length;
  assert.ok(geo(res) > 0);
  assert.equal(geo(loose), 0);
});

test('rules are pure: same input, same output, no input mutation', () => {
  const hist = [tx({ ts: '2026-10-28T10:00:00Z' })];
  const t = tx({ ts: '2026-10-28T10:05:00Z', loc: LON });
  const snapshot = JSON.stringify([hist, t, cfg]);
  const a = F.scoreTransaction(t, hist, cfg);
  const b = F.scoreTransaction(t, hist, cfg);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify([hist, t, cfg]), snapshot);
});

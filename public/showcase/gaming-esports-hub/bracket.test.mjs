// Run with: node --test public/showcase/gaming-esports-hub/bracket.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./bracket.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.L = BracketLogic;', ctx);
const L = ctx.L;
const res = L.resolve(L.MATCHES, L.TEAMS);
const byId = Object.fromEntries(res.map((m) => [m.id, m]));

test('demo data is valid', () => {
  assert.deepEqual(Array.from(L.validate(L.MATCHES, L.TEAMS)), []);
  assert.equal(res.length, 7);
});

test('kda is (kills + assists) / deaths, rounded, and safe at zero deaths', () => {
  assert.equal(L.kda(10, 5, 5), 3);
  assert.equal(L.kda(7, 3, 0), 2.33);
  assert.equal(L.kda(7, 0, 3), 10);
});

test('winnerIndex picks the higher score and flags ties', () => {
  assert.equal(L.winnerIndex([2, 1]), 0);
  assert.equal(L.winnerIndex([0, 2]), 1);
  assert.equal(L.winnerIndex([1, 1]), -1);
});

test('winners advance to the next round', () => {
  assert.deepEqual(Array.from(byId.sf1.teams), [byId.qf1.winner, byId.qf2.winner]);
  assert.deepEqual(Array.from(byId.sf2.teams), [byId.qf3.winner, byId.qf4.winner]);
  assert.deepEqual(Array.from(byId.gf.teams), [byId.sf1.winner, byId.sf2.winner]);
});

test('each team appears at most once per round and losers never advance', () => {
  for (const r of [0, 1, 2]) {
    const ids = res.filter((m) => m.round === r).flatMap((m) => Array.from(m.teams));
    assert.equal(new Set(ids).size, ids.length);
  }
  assert.ok(!Array.from(byId.gf.teams).includes(byId.qf1.loser));
});

test('stat rows match the roster size of each team', () => {
  for (const m of res) {
    m.teams.forEach((t, i) => assert.equal(m.rows[i].length, L.TEAMS[t].players.length));
  }
});

test('validate reports ties and unknown teams', () => {
  const bad = [{ id: 'x', round: 0, teams: ['nope', 'cyber'], score: [1, 1], stats: [] }];
  assert.equal(L.validate(bad, L.TEAMS).length, 2);
});

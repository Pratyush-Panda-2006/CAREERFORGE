import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateMatch, buyPlan, seededRandom } from './match-model.js';
const config = { seed: 42, ratingA: 1600, ratingB: 1600, firstTo: 7 };
test('seed zero is valid and identical inputs reproduce every event and balance', () => {
  assert.deepEqual(simulateMatch(config), simulateMatch(config));
  assert.notDeepEqual(simulateMatch(config), simulateMatch({ ...config, seed: 0 }));
  const a = seededRandom(0), b = seededRandom(0); for (let i = 0; i < 20; i++) assert.equal(a(), b());
});
test('buy boundaries choose affordable deterministic equipment', () => {
  for (const [credits, name, cost] of [[0, 'Eco', 0], [499, 'Eco', 499], [2199, 'Eco', 500], [2200, 'Force buy', 2200], [4199, 'Force buy', 2200], [4200, 'Full buy', 4200]]) assert.deepEqual(buyPlan(credits), { name, cost, power: name === 'Eco' ? .3 : name === 'Force buy' ? .65 : 1 });
  assert.throws(() => buyPlan(-1));
});
test('500 seeded matches finish at the requested score with bounded budgets and coherent kills/deaths', () => {
  for (let seed = 0; seed < 500; seed++) {
    const match = simulateMatch({ ...config, seed, firstTo: seed % 2 ? 13 : 7 });
    assert.equal(match.teams[match.winner].score, match.firstTo);
    assert.equal(match.teams[0].score + match.teams[1].score, match.rounds.length);
    assert.ok(match.rounds.length >= match.firstTo && match.rounds.length < match.firstTo * 2);
    for (const round of match.rounds) {
      round.credits.forEach(cash => assert.ok(Number.isInteger(cash) && cash >= 0 && cash <= 16000));
      round.plans.forEach((plan, index) => assert.ok(plan.cost <= round.startCredits[index]));
      assert.equal(round.kills[round.winner], 5);
    }
    for (let team = 0; team < 2; team++) {
      assert.equal(match.teams[team].players.reduce((sum, player) => sum + player.kills, 0), match.teams[1 - team].players.reduce((sum, player) => sum + player.deaths, 0));
      assert.ok(match.teams[team].players.every(p => p.momentum >= -.12 && p.momentum <= .12));
    }
  }
});
test('event sequence is ordered and ends with the deciding round result', () => {
  const match = simulateMatch(config); let round = 0; let at = 0;
  for (const event of match.events) {
    if (event.round !== round) { assert.equal(event.round, round + 1); round = event.round; at = 0; }
    assert.ok(event.at >= at); at = event.at;
    if (event.type === 'clutch') assert.ok(event.probability >= .08 - 1e-9 && event.probability <= .92 + 1e-9);
  }
  assert.equal(match.events.at(-1).type, 'round_end');
});
test('large Elo advantage materially increases outcomes over deterministic seed set', () => {
  let wins = 0; for (let seed = 0; seed < 100; seed++) wins += simulateMatch({ ...config, seed, ratingA: 2400, ratingB: 800 }).winner === 0;
  assert.ok(wins > 90);
});
test('bad seed, ratings and match format fail explicitly', () => {
  for (const seed of [-1, 1.5, NaN, 4294967296]) assert.throws(() => simulateMatch({ ...config, seed }));
  for (const ratingA of [0, 2401, Infinity, 1000.5]) assert.throws(() => simulateMatch({ ...config, ratingA }));
  assert.throws(() => simulateMatch({ ...config, firstTo: 9 }));
});

// Run with: node --test public/showcase/edtech-academy/flashcards.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./flashcards.js', import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.S = FlashcardSRS;', ctx);
const S = ctx.S;
const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const ID = S.CARDS[0].id;

test('card ids are unique and every card has text', () => {
  assert.equal(new Set(S.CARDS.map((c) => c.id)).size, S.CARDS.length);
  for (const c of S.CARDS) assert.ok(c.q && c.a && c.topic);
});

test('nextBox: again resets, good +1, easy +2, capped at the top box', () => {
  assert.equal(S.nextBox(4, 'again'), 1);
  assert.equal(S.nextBox(1, 'good'), 2);
  assert.equal(S.nextBox(1, 'easy'), 3);
  assert.equal(S.nextBox(5, 'good'), 5);
  assert.equal(S.nextBox(4, 'easy'), 5);
  assert.throws(() => S.nextBox(1, 'nope'));
});

test('review schedules the next due time and does not mutate the input', () => {
  const s0 = S.newState();
  const s1 = S.review(s0, ID, 'good', NOW);
  assert.equal(JSON.stringify(s0.cards), "{}");
  assert.equal(s1.cards[ID].box, 2);
  assert.equal(s1.cards[ID].due, NOW + S.INTERVALS[1]);
  assert.equal(s1.cards[ID].reviews, 1);
});

test('failing a card sends it back to box 1', () => {
  let s = S.review(S.newState(), ID, 'easy', NOW);
  s = S.review(s, ID, 'again', NOW);
  assert.equal(s.cards[ID].box, 1);
  assert.equal(s.cards[ID].reviews, 2);
});

test('dueIds: new cards are due, reviewed cards wait until due', () => {
  const s = S.review(S.newState(), ID, 'good', NOW);
  assert.equal(S.dueIds(s, NOW).includes(ID), false);
  assert.equal(S.dueIds(s, NOW + S.INTERVALS[1]).includes(ID), true);
  assert.equal(S.dueIds(S.newState(), NOW).length, S.CARDS.length);
});

test('dueIds puts lower boxes first', () => {
  let s = S.review(S.newState(), S.CARDS[0].id, 'good', NOW);
  s = S.review(s, S.CARDS[1].id, 'again', NOW);
  const due = S.dueIds(s, NOW + 100 * DAY);
  assert.ok(due.indexOf(S.CARDS[1].id) < due.indexOf(S.CARDS[0].id));
});

test('stats counts new, learning and mastered cards', () => {
  let s = S.newState();
  s = S.review(s, S.CARDS[0].id, 'easy', NOW);
  s = S.review(s, S.CARDS[0].id, 'easy', NOW);
  s = S.review(s, S.CARDS[1].id, 'again', NOW);
  const st = S.stats(s, NOW);
  assert.equal(st.total, S.CARDS.length);
  assert.equal(st.fresh, S.CARDS.length - 2);
  assert.equal(st.mastered, 1);
  assert.equal(st.learning, 1);
});

test('sanitize drops corrupt or unknown saved data', () => {
  assert.equal(JSON.stringify(S.sanitize(null).cards), "{}");
  assert.equal(JSON.stringify(S.sanitize('x').cards), "{}");
  const bad = { cards: { [ID]: { box: 9, due: 1, reviews: 1 }, ghost: { box: 1, due: 1, reviews: 1 } } };
  assert.equal(JSON.stringify(S.sanitize(bad).cards), "{}");
  const ok = { cards: { [ID]: { box: 2, due: 5, reviews: 1 } } };
  assert.equal(JSON.stringify(S.sanitize(ok).cards[ID]), JSON.stringify({ box: 2, due: 5, reviews: 1 }));
});

test('formatWait', () => {
  assert.equal(S.formatWait(10 * 60 * 1000), '10 min');
  assert.equal(S.formatWait(DAY), '1 day');
  assert.equal(S.formatWait(3 * DAY), '3 days');
});

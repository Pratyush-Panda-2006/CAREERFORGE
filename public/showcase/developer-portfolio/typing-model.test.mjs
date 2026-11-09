import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TypingRound, WORDS, SCORE_KEY, readScores, saveScore } from './typing-model.js';
const round = () => new TypingRound(1000, () => 0);
const memory = () => ({ value: null, getItem() { return this.value; }, setItem(key, value) { assert.equal(key, SCORE_KEY); this.value = value; } });

test('30-second deadline rejects an exact-boundary submission', () => {
  const game = round(); game.type(game.target, 30_999);
  assert.equal(game.submit(31_000), false);
  assert.equal(game.state, 'finished'); assert.equal(game.words, 0);
});
test('accepted targets advance without repeating and score completed letters', () => {
  const game = round(); const first = game.target;
  game.type(first, 1001); assert.equal(game.submit(1002), true);
  assert.notEqual(game.target, first);
  assert.equal(game.result().score, first.length * 10);
  assert.equal(game.result().accuracy, 100);
});
test('wrong characters remain in accuracy after backspace and correction', () => {
  const game = round(); game.type('x', 1001); assert.equal(game.submit(1002), false);
  game.type('', 1003); game.type(game.target, 1004); game.submit(1005);
  assert.equal(game.result().accuracy, Math.round(6 / 7 * 100));
  assert.equal(game.result().score, Math.floor(60 * 6 / 7));
});
test('middle insertions/replacements count only changed characters, not unchanged suffixes', () => {
  const game = round(); game.type('kxrnel', 1001); game.type('kernel', 1002);
  assert.equal(game.typed, 7); assert.equal(game.correct, 6);
  game.type('kerXnel', 1003); assert.equal(game.typed, 8); assert.equal(game.correct, 6);
});
test('empty or incorrect submissions award no score and leave the target unchanged', () => {
  const game = round(); const target = game.target;
  assert.equal(game.submit(1001), false);
  game.type('wrong', 1002); assert.equal(game.submit(1003), false);
  assert.equal(game.target, target); assert.equal(game.result().score, 0);
});
test('clock cannot run backwards and no action mutates a completed/cancelled round', () => {
  const game = round(); game.tick(5000); assert.equal(game.tick(2000), 26000);
  game.cancel(); game.type('kernel', 6000); game.submit(6001);
  assert.equal(game.words, 0); assert.equal(game.typed, 0); assert.equal(game.state, 'cancelled');
  assert.throws(() => game.tick(NaN)); assert.throws(() => new TypingRound(Infinity));
});
test('100-word cap ends a round and input size/RNG edge cases stay bounded', () => {
  const game = round();
  for (let index = 0; index < 100; index++) { game.type(game.target, 1001); game.submit(1002); }
  assert.equal(game.state, 'finished'); assert.equal(game.words, 100);
  assert.ok(game.result().score <= 6000);
  const weird = new TypingRound(0, () => NaN); assert.ok(WORDS.includes(weird.target));
  weird.type('a'.repeat(10000), 1); assert.equal(weird.input.length, 32);
});
test('scores round-trip, rank and retain only five valid entries', () => {
  const storage = memory();
  for (let index = 0; index < 10; index++) saveScore(storage, { state: 'finished', score: index * 10, words: index, accuracy: 100 });
  assert.deepEqual(readScores(storage).map(item => item.score), [90, 80, 70, 60, 50]);
});
test('malformed/unknown storage and hostile fields are discarded safely', () => {
  const storage = memory();
  for (const value of ['not json', 'null', '{}', '{"version":2,"scores":[]}']) { storage.value = value; assert.deepEqual(readScores(storage), []); }
  storage.value = JSON.stringify({ version: 1, scores: [{ score: -1, words: 1, accuracy: 100 }, { score: 10, words: 1, accuracy: 90, name: '<img src=x>' }, { score: 999999, words: 1, accuracy: 100 }] });
  assert.deepEqual(readScores(storage), [{ score: 10, words: 1, accuracy: 90 }]);
});
test('unavailable/quota-limited storage is nonfatal and cancelled/invalid scores never persist', () => {
  const broken = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(readScores(broken), []);
  assert.equal(saveScore(broken, { state: 'finished', score: 60, words: 1, accuracy: 100 }).saved, false);
  const storage = memory();
  for (const value of [{ state: 'cancelled', score: 60, words: 1, accuracy: 100 }, { state: 'finished', score: NaN, words: 1, accuracy: 100 }]) assert.equal(saveScore(storage, value).saved, false);
  assert.equal(storage.value, null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AerospaceOrbiterTokenAnalyzer } from './token-counter.js';

const analyzer = new AerospaceOrbiterTokenAnalyzer();

test('empty text counts as nothing', () => {
  assert.equal(analyzer.estimateTokens(''), 0);
  assert.equal(analyzer.getWordCount(''), 0);
  assert.equal(analyzer.calculateByteSize(''), 0);
});

test('keeps leading spaces and splits punctuation and long numbers', () => {
  assert.deepEqual(analyzer.tokenize('Burn at 35786 km.'), ['Burn', ' at', ' 357', '86', ' km', '.']);
});

test('splits long words into chunks', () => {
  assert.deepEqual(analyzer.tokenize('a telemetry'), ['a', ' tele', 'metr', 'y']);
});

test('tokens always rebuild the original text', () => {
  for (const text of ['  two  spaces\n\nand lines ', "it's 3.14 — ok?", 'こんにちは世界 🚀', 'naïve café']) {
    assert.equal(analyzer.tokenize(text).join(''), text);
  }
});

test('counts characters, words and UTF-8 bytes', () => {
  assert.equal(analyzer.getCharacterCount('é🚀'), 2);
  assert.equal(analyzer.calculateByteSize('é🚀'), 6);
  assert.equal(analyzer.getWordCount("don't re-enter orbit, 2 times!"), 5);
});

test('ranks character frequency ignoring case and whitespace', () => {
  assert.deepEqual(analyzer.getCharacterFrequency('Aa b a', 2), [['a', 3], ['b', 1]]);
});

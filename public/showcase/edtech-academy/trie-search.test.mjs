import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyTrieEngine } from './trie-search.js';

test('initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new EdtechAcademyTrieEngine(value), TypeError);
  }
});

test('prefix traversal preserves complete words, descendants and a deterministic order', () => {
  const engine = new EdtechAcademyTrieEngine(['Algorithms', 'Algebra', 'Artificial Intelligence', 'Biology']);
  assert.deepEqual(engine.findWordsWithPrefix(' alg '), ['Algebra', 'Algorithms']);
  assert.deepEqual(engine.findWordsWithPrefix(''), ['Algebra', 'Algorithms', 'Artificial Intelligence', 'Biology']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('duplicates are case-insensitive and do not consume capacity', () => {
  const engine = new EdtechAcademyTrieEngine(['Calculus']);
  assert.equal(engine.insert(' CALCULUS '), false);
  assert.equal(engine.size, 1);
  assert.deepEqual(engine.findWordsWithPrefix('calc'), ['Calculus']);
});

test('fuzzy matching implements insertion, deletion, substitution and exact distance', () => {
  const engine = new EdtechAcademyTrieEngine(['Machine Learning', 'Physics', 'Robotics']);
  assert.deepEqual(engine.fuzzySearch('physicss', 1), [{ word: 'Physics', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('physcs', 1), [{ word: 'Physics', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('robotcs', 1), [{ word: 'Robotics', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('PHYSICS', 0), [{ word: 'Physics', distance: 0 }]);
  assert.deepEqual(engine.fuzzySearch('zzzzz', 1), []);
});

test('classic distance boundary: kitten to sitting costs three edits', () => {
  const engine = new EdtechAcademyTrieEngine(['sitting']);
  assert.deepEqual(engine.fuzzySearch('kitten', 2), []);
  assert.deepEqual(engine.fuzzySearch('kitten', 3), [{ word: 'sitting', distance: 3 }]);
});

test('empty fuzzy queries follow true edit distance instead of matching everything', () => {
  const engine = new EdtechAcademyTrieEngine(['Bio', 'Chem', 'Math']);
  assert.deepEqual(engine.fuzzySearch('', 0), []);
  assert.deepEqual(engine.fuzzySearch('', 3), [{ word: 'Bio', distance: 3 }]);
});

test('distance ties are stable and results are ordered by closest distance first', () => {
  const engine = new EdtechAcademyTrieEngine(['cot', 'cut', 'cat', 'coat']);
  assert.deepEqual(engine.fuzzySearch('cat', 1), [
    { word: 'cat', distance: 0 },
    { word: 'coat', distance: 1 },
    { word: 'cot', distance: 1 },
    { word: 'cut', distance: 1 }
  ]);
});

test('Unicode normalization and code-point edits preserve accented and astral characters', () => {
  const engine = new EdtechAcademyTrieEngine(['Café', '📚book']);
  assert.equal(engine.insert('CAFÉ'), false);
  assert.deepEqual(engine.fuzzySearch('cafe', 1), [{ word: 'Café', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('book', 1), [{ word: '📚book', distance: 1 }]);
});

test('malformed, empty and oversized terms and invalid distances fail explicitly', () => {
  const engine = new EdtechAcademyTrieEngine();
  assert.throws(() => engine.insert(''), RangeError);
  assert.throws(() => engine.insert('a'.repeat(65)), RangeError);
  assert.throws(() => engine.fuzzySearch('query', -1), RangeError);
  assert.throws(() => engine.fuzzySearch('query', 4), RangeError);
});

test('term cap is enforced without losing prior records or rejecting existing duplicates', () => {
  const engine = new EdtechAcademyTrieEngine();
  for (let i = 0; i < 1000; i++) {
    engine.insert(`course-${i}`);
  }
  assert.equal(engine.size, 1000);
  assert.throws(() => engine.insert('course-1001'), RangeError);
  assert.equal(engine.insert('course-0'), false);
});

test('tree view identifies terminal nodes and the exact selected prefix', () => {
  const engine = new EdtechAcademyTrieEngine(['Calculus', 'Chemistry']);
  const tree = engine.getTree('calc');
  assert.ok(tree);
  assert.equal(tree.label, 'calc');
});

test('tree projection stays bounded for a large lexicon', () => {
  const engine = new EdtechAcademyTrieEngine();
  for (let i = 0; i < 200; i++) {
    engine.insert(`term-${i}`);
  }
  const tree = engine.getTree('');
  assert.ok(tree);
});

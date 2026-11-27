import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactTrieEngine, mountTrieSearch } from './trie-search.js';

test('constructor requires an explicit array of terms', () => {
  assert.equal(new NonprofitImpactTrieEngine().size, 0);
  for (const value of [null, 'water', {}, 42]) {
    assert.throws(() => new NonprofitImpactTrieEngine(value), TypeError);
  }
});

test('insert validates input types, empty terms, length and control characters', () => {
  const engine = new NonprofitImpactTrieEngine();
  for (const value of [null, 7, {}, []]) assert.throws(() => engine.insert(value), TypeError);
  assert.throws(() => engine.insert('   '), RangeError);
  assert.throws(() => engine.insert('x'.repeat(65)), RangeError);
  assert.throws(() => engine.insert('water\u0000well'), RangeError);
  assert.equal(engine.size, 0);
});

test('insert indexes a term and preserves its display casing', () => {
  const engine = new NonprofitImpactTrieEngine();
  assert.equal(engine.insert('  Clean Water Access  '), true);
  assert.equal(engine.size, 1);
  assert.deepEqual(engine.findWordsWithPrefix('clean'), ['Clean Water Access']);
  assert.deepEqual(engine.getAllWords(), ['Clean Water Access']);
});

test('duplicate inserts are case-insensitive, trimmed and Unicode-normalised', () => {
  const engine = new NonprofitImpactTrieEngine(['Café']);
  assert.equal(engine.insert(' CAFÉ '), false);
  assert.equal(engine.insert('Cafe\u0301'), false);
  assert.equal(engine.size, 1);
  assert.deepEqual(engine.findWordsWithPrefix('caf'), ['Café']);
});

test('prefix completion returns every complete word beneath the prefix', () => {
  const engine = new NonprofitImpactTrieEngine(['car', 'carbon', 'cart', 'carpet', 'dog']);
  assert.deepEqual(engine.findWordsWithPrefix('car'), ['car', 'carbon', 'carpet', 'cart']);
  assert.deepEqual(engine.findWordsWithPrefix('cart'), ['cart']);
  assert.deepEqual(engine.findWordsWithPrefix('ca'), ['car', 'carbon', 'carpet', 'cart']);
});

test('empty prefix returns the full lexicon in deterministic order', () => {
  const engine = new NonprofitImpactTrieEngine(['Banana', 'apple', 'Cherry']);
  assert.deepEqual(engine.findWordsWithPrefix(''), ['apple', 'Banana', 'Cherry']);
  assert.deepEqual(engine.findWordsWithPrefix('   '), ['apple', 'Banana', 'Cherry']);
});

test('unknown prefixes return an empty array without throwing', () => {
  const engine = new NonprofitImpactTrieEngine(['Water Wells', 'Wildlife Corridor']);
  assert.deepEqual(engine.findWordsWithPrefix('xyz'), []);
  assert.deepEqual(engine.findWordsWithPrefix('water wells extra'), []);
});

test('prefix search is case-insensitive and trims surrounding whitespace', () => {
  const engine = new NonprofitImpactTrieEngine(['Mangrove Restoration', 'Rainforest Restoration']);
  assert.deepEqual(engine.findWordsWithPrefix('  MANGROVE '), ['Mangrove Restoration']);
  assert.deepEqual(engine.findWordsWithPrefix('ReStOrAtIoN'), []);
});

test('prefix completion honours a positive result limit', () => {
  const engine = new NonprofitImpactTrieEngine(['seed', 'seed bank', 'seedling', 'seeds']);
  assert.deepEqual(engine.findWordsWithPrefix('seed', 2), ['seed', 'seed bank']);
  assert.equal(engine.findWordsWithPrefix('seed', 99).length, 4);
  for (const limit of [0, -1, 1.5, '2']) {
    assert.throws(() => engine.findWordsWithPrefix('seed', limit), RangeError);
  }
});

test('has reports membership case-insensitively and rejects non-strings', () => {
  const engine = new NonprofitImpactTrieEngine(['Biochar Kilns']);
  assert.equal(engine.has(' biochar kilns '), true);
  assert.equal(engine.has('biochar'), false);
  assert.throws(() => engine.has(null), TypeError);
});

test('remove deletes a word, prunes orphan edges and keeps shared paths', () => {
  const engine = new NonprofitImpactTrieEngine(['car', 'carbon', 'cart']);
  assert.equal(engine.remove('car'), true);
  assert.equal(engine.size, 2);
  assert.equal(engine.has('car'), false);
  assert.deepEqual(engine.findWordsWithPrefix('car'), ['carbon', 'cart']);
  assert.equal(engine.remove('missing'), false);
  assert.equal(engine.remove('carbon'), true);
  assert.equal(engine.remove('cart'), true);
  assert.equal(engine.nodeCount, 1);
  assert.deepEqual(engine.getAllWords(), []);
});

test('nodeCount reflects shared prefixes instead of raw character totals', () => {
  const engine = new NonprofitImpactTrieEngine(['cat', 'car', 'dog']);
  // root + c + a + t + r + d + o + g
  assert.equal(engine.nodeCount, 8);
});

test('fuzzy search computes insertion, deletion and substitution distances', () => {
  const engine = new NonprofitImpactTrieEngine(['water', 'winter', 'waiter']);
  const results = engine.fuzzySearch('watr', 2);
  assert.deepEqual(results, [
    { word: 'water', distance: 1 },
    { word: 'waiter', distance: 2 }
  ]);
  assert.deepEqual(engine.fuzzySearch('water', 0), [{ word: 'water', distance: 0 }]);
  assert.deepEqual(engine.fuzzySearch('waters', 1), [{ word: 'water', distance: 1 }]);
});

test('fuzzy search is case-insensitive and trims the query', () => {
  const engine = new NonprofitImpactTrieEngine(['Solar Lanterns']);
  assert.deepEqual(engine.fuzzySearch('  SOLAR LANTERN '), [{ word: 'Solar Lanterns', distance: 1 }]);
});

test('fuzzy search sorts by distance then alphabetically', () => {
  const engine = new NonprofitImpactTrieEngine(['boat', 'coat', 'goat', 'cat']);
  assert.deepEqual(engine.fuzzySearch('oat', 2), [
    { word: 'boat', distance: 1 },
    { word: 'cat', distance: 1 },
    { word: 'coat', distance: 1 },
    { word: 'goat', distance: 1 }
  ]);
});

test('fuzzy search handles an empty query as distance from the empty string', () => {
  const engine = new NonprofitImpactTrieEngine(['a', 'ab', 'abcd']);
  assert.deepEqual(engine.fuzzySearch('', 2), [
    { word: 'a', distance: 1 },
    { word: 'ab', distance: 2 }
  ]);
});

test('fuzzy search validates the edit-distance bound', () => {
  const engine = new NonprofitImpactTrieEngine(['water']);
  for (const distance of [-1, 4, 1.5, '2', NaN]) {
    assert.throws(() => engine.fuzzySearch('water', distance), RangeError);
  }
  assert.throws(() => engine.fuzzySearch(null, 1), TypeError);
});

test('fuzzy search does not scan unrelated branches', () => {
  const engine = new NonprofitImpactTrieEngine(['zzzz', 'water', 'waste']);
  assert.deepEqual(engine.fuzzySearch('wast', 1), [
    { word: 'waste', distance: 1 }
  ]);
});

test('static Levenshtein distance is symmetric and code-point aware', () => {
  assert.equal(NonprofitImpactTrieEngine.levenshteinDistance('kitten', 'sitting'), 3);
  assert.equal(NonprofitImpactTrieEngine.levenshteinDistance('sitting', 'kitten'), 3);
  assert.equal(NonprofitImpactTrieEngine.levenshteinDistance('', 'abc'), 3);
  assert.equal(NonprofitImpactTrieEngine.levenshteinDistance('mañana', 'manana'), 1);
  assert.equal(NonprofitImpactTrieEngine.levenshteinDistance('🌱', '🌳'), 1);
  assert.throws(() => NonprofitImpactTrieEngine.levenshteinDistance('a', null), TypeError);
});

test('getTree projects a prefix subtree with terminal markers', () => {
  const engine = new NonprofitImpactTrieEngine(['car', 'cart', 'cat']);
  const tree = engine.getTree('car');
  assert.equal(tree.label, 'car');
  assert.equal(tree.terminal, true);
  assert.equal(tree.word, 'car');
  assert.deepEqual(tree.children.map((child) => child.label), ['t']);
  assert.equal(tree.children[0].word, 'cart');
  assert.equal(tree.truncated, false);
});

test('getTree returns null for an unknown prefix and labels the root', () => {
  const engine = new NonprofitImpactTrieEngine(['water']);
  assert.equal(engine.getTree('zzz'), null);
  const root = engine.getTree('');
  assert.equal(root.label, 'root');
  assert.deepEqual(root.children.map((child) => child.label), ['w']);
});

test('getTree caps very large projections at the node budget', () => {
  const engine = new NonprofitImpactTrieEngine();
  for (let index = 0; index < 300; index += 1) engine.insert(`a${String(index).padStart(3, '0')}`);
  const tree = engine.getTree('');
  assert.equal(tree.truncated, true);
  let nodes = 0;
  const visit = (node) => {
    nodes += 1;
    node.children.forEach(visit);
  };
  visit(tree);
  assert.ok(nodes <= 240, `expected at most 240 projected nodes, received ${nodes}`);
});

test('clear empties the trie and releases every node', () => {
  const engine = new NonprofitImpactTrieEngine(['water', 'wildlife']);
  engine.clear();
  assert.equal(engine.size, 0);
  assert.equal(engine.nodeCount, 1);
  assert.deepEqual(engine.getAllWords(), []);
  assert.equal(engine.insert('water'), true);
});

test('the lexicon enforces its capacity without dropping existing terms', () => {
  const engine = new NonprofitImpactTrieEngine();
  for (let index = 0; index < 2000; index += 1) engine.insert(`term ${index}`);
  assert.equal(engine.size, 2000);
  assert.equal(engine.insert('TERM 0'), false);
  assert.throws(() => engine.insert('one term too many'), RangeError);
  assert.equal(engine.size, 2000);
});

test('mountTrieSearch is a no-op when the page has no search field', () => {
  const document = { getElementById: () => null };
  assert.equal(mountTrieSearch(document), null);
});

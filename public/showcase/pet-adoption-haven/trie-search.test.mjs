import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenTrieEngine } from './trie-search.js';

test('PetAdoptionHavenTrieEngine - inserts words and finds exact prefix matches', () => {
  const engine = new PetAdoptionHavenTrieEngine();
  engine.insert('golden retriever');
  engine.insert('goldendoodle');
  engine.insert('german shepherd');
  engine.insert('beagle');

  const matches = engine.findWordsWithPrefix('gold');
  assert.equal(matches.length, 2);
  assert.ok(matches.includes('golden retriever'));
  assert.ok(matches.includes('goldendoodle'));
  assert.ok(!matches.includes('beagle'));
});

test('PetAdoptionHavenTrieEngine - handles case-insensitivity and whitespace trimming', () => {
  const engine = new PetAdoptionHavenTrieEngine();
  engine.insert('  Siamese Cat  ');

  const matches = engine.findWordsWithPrefix('SIAM');
  assert.equal(matches.length, 1);
  assert.equal(matches[0], 'siamese cat');
});

test('PetAdoptionHavenTrieEngine - empty prefix returns all indexed terms', () => {
  const engine = new PetAdoptionHavenTrieEngine();
  engine.insert('persian');
  engine.insert('ragdoll');

  const all = engine.findWordsWithPrefix('');
  assert.equal(all.length, 2);
});

test('PetAdoptionHavenTrieEngine - calculates Levenshtein distance and fuzzySearch accurately', () => {
  const engine = new PetAdoptionHavenTrieEngine();
  engine.insert('cockatiel');
  engine.insert('bulldog');
  engine.insert('poodle');

  // Typo 'poodel' -> distance 2 to 'poodle' (substitution or transp)
  const fuzzy = engine.fuzzySearch('poodel', 2);
  assert.ok(fuzzy.length >= 1);
  assert.equal(fuzzy[0].word, 'poodle');
  assert.equal(fuzzy[0].distance, 2);

  // Static Levenshtein check
  assert.equal(PetAdoptionHavenTrieEngine.levenshteinDistance('kitten', 'sitting'), 3);
  assert.equal(PetAdoptionHavenTrieEngine.levenshteinDistance('hound', 'hound'), 0);
});

test('PetAdoptionHavenTrieEngine - findWordsWithPrefix throws TypeError on non-string input', () => {
  const engine = new PetAdoptionHavenTrieEngine();
  assert.throws(() => engine.findWordsWithPrefix(null), TypeError);
  assert.throws(() => engine.findWordsWithPrefix(123), TypeError);
});

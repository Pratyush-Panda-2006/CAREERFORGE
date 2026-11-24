import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeTrieEngine } from './trie-search.js';

test('QuantumForgeTrieEngine - inserts words and finds exact prefix matches', () => {
  const engine = new QuantumForgeTrieEngine();
  engine.insert('irrigation');
  engine.insert('irrigate');
  engine.insert('irrigable');
  engine.insert('sensor');

  const matches = engine.findWordsWithPrefix('irri');
  assert.equal(matches.length, 3);
  assert.ok(matches.includes('irrigation'));
  assert.ok(matches.includes('irrigate'));
  assert.ok(matches.includes('irrigable'));
  assert.ok(!matches.includes('sensor'));
});

test('QuantumForgeTrieEngine - handles case-insensitivity and whitespace trimming', () => {
  const engine = new QuantumForgeTrieEngine();
  engine.insert('  Hydroponics  ');

  const matches = engine.findWordsWithPrefix('HYDRO');
  assert.equal(matches.length, 1);
  assert.equal(matches[0], 'hydroponics');
});

test('QuantumForgeTrieEngine - empty prefix returns all words', () => {
  const engine = new QuantumForgeTrieEngine();
  engine.insert('drone');
  engine.insert('crop');

  const all = engine.findWordsWithPrefix('');
  assert.equal(all.length, 2);
});

test('QuantumForgeTrieEngine - calculates Levenshtein distance and performs fuzzySearch', () => {
  const engine = new QuantumForgeTrieEngine();
  engine.insert('harvest');
  engine.insert('hardy');
  engine.insert('market');

  // Search for typo 'harvst' (distance 1 from 'harvest')
  const fuzzy = engine.fuzzySearch('harvst', 2);
  assert.ok(fuzzy.length >= 1);
  assert.equal(fuzzy[0].word, 'harvest');
  assert.equal(fuzzy[0].distance, 1);

  // Assert static Levenshtein helper
  assert.equal(QuantumForgeTrieEngine.levenshteinDistance('kitten', 'sitting'), 3);
  assert.equal(QuantumForgeTrieEngine.levenshteinDistance('agri', 'agri'), 0);
});

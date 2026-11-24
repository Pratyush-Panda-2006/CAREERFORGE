import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProTrieEngine } from './trie-search.js';

test('CryptoExchangeProTrieEngine - inserts trading pairs and finds exact prefix matches', () => {
  const engine = new CryptoExchangeProTrieEngine();
  engine.insert('BTC/USDT');
  engine.insert('BTC/USDC');
  engine.insert('ETH/USDT');
  engine.insert('SOL/USDT');

  const matches = engine.findWordsWithPrefix('BTC');
  assert.equal(matches.length, 2);
  assert.ok(matches.includes('BTC/USDT'));
  assert.ok(matches.includes('BTC/USDC'));
  assert.ok(!matches.includes('ETH/USDT'));
});

test('CryptoExchangeProTrieEngine - handles case-insensitivity and whitespace trimming', () => {
  const engine = new CryptoExchangeProTrieEngine();
  engine.insert('  sol/usdt  ');

  const matches = engine.findWordsWithPrefix('sol');
  assert.equal(matches.length, 1);
  assert.equal(matches[0], 'SOL/USDT');
});

test('CryptoExchangeProTrieEngine - empty prefix returns all indexed market pairs', () => {
  const engine = new CryptoExchangeProTrieEngine();
  engine.insert('AVAX/USDT');
  engine.insert('DOT/USDT');

  const all = engine.findWordsWithPrefix('');
  assert.equal(all.length, 2);
});

test('CryptoExchangeProTrieEngine - calculates Levenshtein distance and fuzzySearch accurately', () => {
  const engine = new CryptoExchangeProTrieEngine();
  engine.insert('BTC/USDT');
  engine.insert('ETH/USDT');
  engine.insert('SOL/USDT');

  // Typo 'BT/USDT' (distance 1 from 'BTC/USDT')
  const fuzzy = engine.fuzzySearch('BT/USDT', 2);
  assert.ok(fuzzy.length >= 1);
  assert.equal(fuzzy[0].word, 'BTC/USDT');
  assert.equal(fuzzy[0].distance, 1);

  // Static Levenshtein check
  assert.equal(CryptoExchangeProTrieEngine.levenshteinDistance('BITCOIN', 'LITECOIN'), 2);
  assert.equal(CryptoExchangeProTrieEngine.levenshteinDistance('ETH', 'ETH'), 0);
});

test('CryptoExchangeProTrieEngine - findWordsWithPrefix throws TypeError on non-string input', () => {
  const engine = new CryptoExchangeProTrieEngine();
  assert.throws(() => engine.findWordsWithPrefix(null), TypeError);
  assert.throws(() => engine.findWordsWithPrefix(123), TypeError);
});

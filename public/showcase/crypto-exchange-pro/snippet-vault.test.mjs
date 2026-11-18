import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProSnippetVault } from './snippet-vault.js';

test('CryptoExchangeProSnippetVault initializes with trading preset library', () => {
  const vault = new CryptoExchangeProSnippetVault();
  const all = vault.getAll();
  assert.ok(all.length >= 4);

  const twap = vault.getById('cep-twap-execution');
  assert.ok(twap);
  assert.equal(twap.title, 'TWAP Order Execution Routine');
  assert.ok(twap.tags.includes('twap'));
});

test('CryptoExchangeProSnippetVault filters presets by tag correctly', () => {
  const vault = new CryptoExchangeProSnippetVault();
  const arbitrage = vault.filterByTag('arbitrage');
  assert.ok(arbitrage.length >= 1);
  assert.equal(arbitrage[0].id, 'cep-funding-arbitrage');

  const all = vault.filterByTag('all');
  assert.equal(all.length, vault.getAll().length);
});

test('CryptoExchangeProSnippetVault multi-token search functions properly', () => {
  const vault = new CryptoExchangeProSnippetVault();
  const results = vault.searchSnippets('grid bot trading');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'cep-grid-bot');

  const noResults = vault.searchSnippets('random_unknown_token_contract_xyz');
  assert.equal(noResults.length, 0);
});

test('CryptoExchangeProSnippetVault prevents duplicate ID collisions', () => {
  const vault = new CryptoExchangeProSnippetVault();
  assert.throws(() => {
    vault.addSnippet({
      id: 'cep-twap-execution',
      title: 'Duplicate TWAP',
      code: 'function dup() {}'
    });
  }, /already exists/);
});

test('CryptoExchangeProSnippetVault allows adding and deleting snippets', () => {
  const vault = new CryptoExchangeProSnippetVault();
  const created = vault.addSnippet({
    id: 'cep-vwap-routine',
    title: 'VWAP Order Execution',
    code: 'function vwap() {}',
    tags: ['execution', 'vwap']
  });

  assert.ok(created);
  assert.equal(vault.getById('cep-vwap-routine').title, 'VWAP Order Execution');
  const removed = vault.removeSnippet('cep-vwap-routine');
  assert.equal(removed, true);
  assert.equal(vault.getById('cep-vwap-routine'), null);
});

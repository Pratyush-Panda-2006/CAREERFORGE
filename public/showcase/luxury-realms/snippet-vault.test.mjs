import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsSnippetVault } from './snippet-vault.js';

test('LuxuryRealmsSnippetVault loads prime estate presets correctly', () => {
  const vault = new LuxuryRealmsSnippetVault();
  const all = vault.getAll();
  assert.ok(all.length >= 4);

  const island = vault.getById('lr-island-valuation');
  assert.ok(island);
  assert.equal(island.title, 'Private Island Capitalization Valuation Model');
  assert.ok(island.tags.includes('valuation'));
});

test('LuxuryRealmsSnippetVault filters models by tag accurately', () => {
  const vault = new LuxuryRealmsSnippetVault();
  const taxModels = vault.filterByTag('tax');
  assert.ok(taxModels.length >= 1);
  assert.equal(taxModels[0].id, 'lr-stamp-wealth-tax');

  const all = vault.filterByTag('all');
  assert.equal(all.length, vault.getAll().length);
});

test('LuxuryRealmsSnippetVault multi-token search functions properly', () => {
  const vault = new LuxuryRealmsSnippetVault();
  const results = vault.searchSnippets('escrow blind trust');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'lr-anonymous-escrow');

  const empty = vault.searchSnippets('suburban_cookie_cutter_tract_home');
  assert.equal(empty.length, 0);
});

test('LuxuryRealmsSnippetVault protects against duplicate snippet ID', () => {
  const vault = new LuxuryRealmsSnippetVault();
  assert.throws(() => {
    vault.addSnippet({
      id: 'lr-island-valuation',
      title: 'Duplicate Island',
      code: 'function dup() {}'
    });
  }, /already exists/);
});

test('LuxuryRealmsSnippetVault supports adding and removing bespoke models', () => {
  const vault = new LuxuryRealmsSnippetVault();
  const model = vault.addSnippet({
    id: 'lr-superyacht-berth',
    title: 'Superyacht Marina Berth Concession',
    code: 'function berthYield() {}',
    tags: ['marina', 'yacht']
  });

  assert.ok(model);
  assert.equal(vault.getById('lr-superyacht-berth').title, 'Superyacht Marina Berth Concession');
  const removed = vault.removeSnippet('lr-superyacht-berth');
  assert.equal(removed, true);
  assert.equal(vault.getById('lr-superyacht-berth'), null);
});

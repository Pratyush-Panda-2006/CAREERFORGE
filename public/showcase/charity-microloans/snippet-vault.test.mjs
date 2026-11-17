import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansSnippetVault } from './snippet-vault.js';

test('CharityMicroloansSnippetVault - filters loan templates by tag accurately', () => {
  const vault = new CharityMicroloansSnippetVault();
  const loanSnippets = vault.filterByTag('loan');
  const communitySnippets = vault.filterByTag('community');

  assert.ok(loanSnippets.length >= 1);
  assert.strictEqual(loanSnippets[0].id, 'zero-interest-seed-loan');

  assert.ok(communitySnippets.length >= 1);
  assert.strictEqual(communitySnippets[0].id, 'peer-guarantor-circle');
});

test('CharityMicroloansSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new CharityMicroloansSnippetVault();
  const searchResults = vault.searchSnippets('seed agripreneur zero-interest');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'zero-interest-seed-loan');
});

test('CharityMicroloansSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new CharityMicroloansSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Zero-Interest Female Agripreneur Seed Loan', '{}', ['loan']);
  }, /already exists/);
});

test('CharityMicroloansSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new CharityMicroloansSnippetVault();
  const added = vault.addSnippet('Livestock Fodder Community Bank', '{"capacity_tons": 50}', ['livestock', 'drought']);

  assert.strictEqual(added.id, 'livestock-fodder-community-bank');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('livestock'));
  assert.ok(tags.includes('drought'));

  const filtered = vault.filterByTag('livestock');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'livestock-fodder-community-bank');
});

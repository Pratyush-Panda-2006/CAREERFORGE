import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsSnippetVault } from './snippet-vault.js';

test('LegalSmartContractsSnippetVault - filters snippets by tag accurately', () => {
  const vault = new LegalSmartContractsSnippetVault();
  const securitySnippets = vault.filterByTag('security');
  const arbitrationSnippets = vault.filterByTag('arbitration');

  assert.ok(securitySnippets.length >= 2);
  assert.strictEqual(securitySnippets.every(s => s.tags.includes('security')), true);

  assert.strictEqual(arbitrationSnippets.length, 1);
  assert.strictEqual(arbitrationSnippets[0].id, 'arbitration-clause');
});

test('LegalSmartContractsSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new LegalSmartContractsSnippetVault();
  const searchResults = vault.searchSnippets('escrow timelock');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'escrow-timelock');
});

test('LegalSmartContractsSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new LegalSmartContractsSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Timelocked Escrow Release Clause', '// test code', ['test']);
  }, /already exists/);
});

test('LegalSmartContractsSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new LegalSmartContractsSnippetVault();
  const added = vault.addSnippet('MultiSig DAO Voting Gate', 'function vote() public {}', ['dao', 'voting', 'governance']);

  assert.strictEqual(added.id, 'multisig-dao-voting-gate');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('dao'));
  assert.ok(tags.includes('voting'));

  const daoFiltered = vault.filterByTag('dao');
  assert.strictEqual(daoFiltered.length, 1);
  assert.strictEqual(daoFiltered[0].id, 'multisig-dao-voting-gate');
});

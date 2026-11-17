import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioSnippetVault } from './snippet-vault.js';

test('AgencyStudioSnippetVault - filters design templates by tag accurately', () => {
  const vault = new AgencyStudioSnippetVault();
  const typoSnippets = vault.filterByTag('typography');
  const shaderSnippets = vault.filterByTag('shader');

  assert.ok(typoSnippets.length >= 1);
  assert.strictEqual(typoSnippets[0].id, 'kinetic-typography-curve');

  assert.ok(shaderSnippets.length >= 1);
  assert.strictEqual(shaderSnippets[0].id, 'webgl-chromatic-bloom');
});

test('AgencyStudioSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new AgencyStudioSnippetVault();
  const searchResults = vault.searchSnippets('spring typography easing');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'kinetic-typography-curve');
});

test('AgencyStudioSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new AgencyStudioSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Kinetic Spring Typography Easing Curve', '{}', ['typography']);
  }, /already exists/);
});

test('AgencyStudioSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new AgencyStudioSnippetVault();
  const added = vault.addSnippet('Glassmorphic Card Filter Blur', '{"backdrop_filter": "blur(16px)"}', ['glassmorphism', 'card']);

  assert.strictEqual(added.id, 'glassmorphic-card-filter-blur');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('glassmorphism'));
  assert.ok(tags.includes('card'));

  const filtered = vault.filterByTag('glassmorphism');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'glassmorphic-card-filter-blur');
});

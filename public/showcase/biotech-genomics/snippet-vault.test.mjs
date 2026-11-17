import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsSnippetVault } from './snippet-vault.js';

test('BiotechGenomicsSnippetVault - filters genomic presets by tag accurately', () => {
  const vault = new BiotechGenomicsSnippetVault();
  const crisprSnippets = vault.filterByTag('crispr');
  const primerSnippets = vault.filterByTag('primer');

  assert.ok(crisprSnippets.length >= 1);
  assert.strictEqual(crisprSnippets[0].id, 'crispr-cas9-grna-emx1');

  assert.ok(primerSnippets.length >= 1);
  assert.strictEqual(primerSnippets[0].id, 'brca1-exon11-pcr-primers');
});

test('BiotechGenomicsSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new BiotechGenomicsSnippetVault();
  const searchResults = vault.searchSnippets('crispr spcas9-hf1');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'crispr-cas9-grna-emx1');
});

test('BiotechGenomicsSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new BiotechGenomicsSnippetVault();

  assert.throws(() => {
    vault.addSnippet('CRISPR-Cas9 High-Fidelity EMX1 Guide RNA', '{}', ['crispr']);
  }, /already exists/);
});

test('BiotechGenomicsSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new BiotechGenomicsSnippetVault();
  const added = vault.addSnippet('Poly(A) Polymerase Reaction Mix', '{"enzyme_units": 5}', ['mrna', 'tailing']);

  assert.strictEqual(added.id, 'poly-a-polymerase-reaction-mix');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('mrna'));
  assert.ok(tags.includes('tailing'));

  const filtered = vault.filterByTag('mrna');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'poly-a-polymerase-reaction-mix');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenSnippetVault } from './snippet-vault.js';

test('PetAdoptionHavenSnippetVault - filters templates by tag accurately', () => {
  const vault = new PetAdoptionHavenSnippetVault();
  const medicalSnippets = vault.filterByTag('medical');
  const fosterSnippets = vault.filterByTag('foster');

  assert.ok(medicalSnippets.length >= 2);
  assert.strictEqual(medicalSnippets.every(s => s.tags.includes('medical')), true);

  assert.strictEqual(fosterSnippets.length, 1);
  assert.strictEqual(fosterSnippets[0].id, 'foster-home-readiness');
});

test('PetAdoptionHavenSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new PetAdoptionHavenSnippetVault();
  const searchResults = vault.searchSnippets('feline indoor');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'feline-adoption-contract');
});

test('PetAdoptionHavenSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new PetAdoptionHavenSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Rescue Intake 14-Day Quarantine Checklist', '{}', ['intake']);
  }, /already exists/);
});

test('PetAdoptionHavenSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new PetAdoptionHavenSnippetVault();
  const added = vault.addSnippet('Avian Aviary Enrichment Spec', '{"perch_variation": 4}', ['birds', 'enrichment']);

  assert.strictEqual(added.id, 'avian-aviary-enrichment-spec');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('birds'));
  assert.ok(tags.includes('enrichment'));

  const birdsFiltered = vault.filterByTag('birds');
  assert.strictEqual(birdsFiltered.length, 1);
  assert.strictEqual(birdsFiltered[0].id, 'avian-aviary-enrichment-spec');
});

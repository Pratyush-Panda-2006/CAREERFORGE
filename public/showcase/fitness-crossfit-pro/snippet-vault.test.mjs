import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProSnippetVault } from './snippet-vault.js';

test('FitnessCrossfitProSnippetVault - filters WOD templates by tag accurately', () => {
  const vault = new FitnessCrossfitProSnippetVault();
  const weightliftingSnippets = vault.filterByTag('weightlifting');
  const hiitSnippets = vault.filterByTag('hiit');

  assert.ok(weightliftingSnippets.length >= 2);
  assert.strictEqual(weightliftingSnippets.every(s => s.tags.includes('weightlifting')), true);

  assert.strictEqual(hiitSnippets.length, 1);
  assert.strictEqual(hiitSnippets[0].id, 'tabata-hiit-engine');
});

test('FitnessCrossfitProSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new FitnessCrossfitProSnippetVault();
  const searchResults = vault.searchSnippets('hero murph vest');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'hero-wod-murph');
});

test('FitnessCrossfitProSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new FitnessCrossfitProSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Hero WOD "Murph" Standard Benchmark', '{}', ['wod']);
  }, /already exists/);
});

test('FitnessCrossfitProSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new FitnessCrossfitProSnippetVault();
  const added = vault.addSnippet('Kettlebell Sport Long Cycle', '{"kb_weight_kg": 24}', ['kettlebell', 'endurance']);

  assert.strictEqual(added.id, 'kettlebell-sport-long-cycle');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('kettlebell'));
  assert.ok(tags.includes('endurance'));

  const filtered = vault.filterByTag('kettlebell');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'kettlebell-sport-long-cycle');
});

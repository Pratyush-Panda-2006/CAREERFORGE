import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingSnippetVault } from './snippet-vault.js';

test('Initializes with default precision agritech formulas', () => {
  const vault = new AgritechPrecisionFarmingSnippetVault({
    storageKey: 'test_vault_init_' + Date.now()
  });

  const all = vault.searchSnippets('');
  assert.ok(all.length >= 4);
  assert.ok(all.some(s => s.id === 'snip-ndvi-vigor'));
});

test('Tag-based filtering isolates matching presets', () => {
  const vault = new AgritechPrecisionFarmingSnippetVault({
    storageKey: 'test_vault_tags_' + Date.now()
  });

  const ndviOnly = vault.filterByTag('NDVI');
  assert.ok(ndviOnly.length > 0);
  assert.ok(ndviOnly.every(s => s.tags.includes('NDVI')));

  const allTag = vault.filterByTag('ALL');
  assert.equal(allTag.length, vault.searchSnippets('').length);
});

test('Multi-token text query matches title, description and tags', () => {
  const vault = new AgritechPrecisionFarmingSnippetVault({
    storageKey: 'test_vault_search_' + Date.now()
  });

  const queryMatch = vault.searchSnippets('crop vigor');
  assert.ok(queryMatch.length >= 1);
  assert.equal(queryMatch[0].id, 'snip-ndvi-vigor');

  const zeroMatch = vault.searchSnippets('nonexistent_random_phrase_xyz');
  assert.equal(zeroMatch.length, 0);
});

test('Duplicate snippet titles are rejected with clear error', () => {
  const vault = new AgritechPrecisionFarmingSnippetVault({
    storageKey: 'test_vault_dup_' + Date.now()
  });

  vault.addSnippet('Soil Moisture Sensor Calibration', 'const k = 1.2;', ['SENSOR']);

  assert.throws(() => {
    vault.addSnippet('Soil Moisture Sensor Calibration', 'const k = 2.0;', ['SENSOR']);
  }, /already exists/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactSnippetVault } from './snippet-vault.js';

test('NonprofitImpactSnippetVault - initializes with default presets', () => {
  const vault = new NonprofitImpactSnippetVault();
  const list = vault.getSnippets();
  assert.ok(list.length >= 5);
  assert.ok(list.some(s => s.tags.includes('carbon')));
  assert.ok(list.some(s => s.tags.includes('grant')));
});

test('NonprofitImpactSnippetVault - extracts tags and categories', () => {
  const vault = new NonprofitImpactSnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('carbon'));
  assert.ok(tags.includes('mangrove'));
  assert.ok(tags.includes('reforestation'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('Carbon Accounting'));
  assert.ok(categories.includes('Financial Transparency'));
  assert.ok(categories.includes('Biodiversity'));
});

test('NonprofitImpactSnippetVault - search filters correctly', () => {
  const vault = new NonprofitImpactSnippetVault();
  const carbonMatches = vault.search('mangrove', 'carbon');
  assert.ok(carbonMatches.length >= 1);
  assert.ok(carbonMatches[0].title.includes('Mangrove'));

  const empty = vault.search('nonexistent_nonprofit_program_xyz');
  assert.equal(empty.length, 0);
});

test('NonprofitImpactSnippetVault - adds and removes snippets', () => {
  const vault = new NonprofitImpactSnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Solar Microgrid Clean Energy Offset',
    description: 'Avoided grid emissions calculation per kWh generated',
    category: 'Carbon Accounting',
    tags: ['solar', 'offset', 'clean-energy'],
    code: '{"avoided_emissions_kg_kwh": 0.42}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const res = vault.removeSnippet(added.id);
  assert.equal(res, true);
  assert.equal(vault.getSnippets().length, initialCount);
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroSnippetVault } from './snippet-vault.js';

describe('CulinaryBistroSnippetVault', () => {
  let vault;

  beforeEach(() => {
    vault = new CulinaryBistroSnippetVault();
  });

  it('loads default culinary science and kitchen formulas', () => {
    const list = vault.getAllSnippets();
    assert.ok(list.length >= 5);
    const dough = vault.getSnippetById('bakers-percentage');
    assert.ok(dough);
    assert.equal(dough.category, 'Baking Science');
  });

  it('filters presets by query search', () => {
    const results = vault.search('sousvide');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'sousvide-pasteurization');
  });

  it('filters presets by tag', () => {
    const results = vault.search('', 'curing');
    assert.ok(results.length >= 1);
    assert.ok(results.every((s) => s.tags.includes('curing')));
  });

  it('combines text query and tag filtering', () => {
    const results = vault.search('Sorbet', 'dessert');
    assert.ok(results.length >= 1);
    assert.equal(results[0].id, 'brix-refractometry');
  });

  it('adds and retrieves a custom culinary recipe', () => {
    const added = vault.addCustomSnippet({
      id: 'custom-beurre-blanc',
      title: 'Emulsified Classic Beurre Blanc Ratio',
      code: 'function beurreBlanc(wine, shallot, butter) { return butter / wine; }',
      category: 'Classic Sauces',
      tags: ['sauces', 'french']
    });

    assert.equal(added.id, 'custom-beurre-blanc');
    const fetched = vault.getSnippetById('custom-beurre-blanc');
    assert.ok(fetched);
    assert.equal(fetched.title, 'Emulsified Classic Beurre Blanc Ratio');
  });

  it('retrieves copyable code snippet', () => {
    const code = vault.copySnippet('food-cost-percentage');
    assert.ok(code.includes('calculatePlatePrice'));
  });

  it('returns null when copying invalid snippet id', () => {
    assert.equal(vault.copySnippet('non-existent'), null);
  });
});
